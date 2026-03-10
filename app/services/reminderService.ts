import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from './firebase';
import { Reminder } from '../types/reminder';

// ─── Notification setup (mobile only) ───────────────────────────────────────

export async function registerForNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
    }
  } catch {
    // expo-notifications not available
  }
}

async function scheduleLocalNotification(
  title: string,
  body: string,
  scheduledTime: Date
): Promise<string | undefined> {
  if (Platform.OS === 'web') return undefined;
  try {
    const Notifications = require('expo-notifications');
    const seconds = Math.floor((scheduledTime.getTime() - Date.now()) / 1000);
    if (seconds <= 0) return undefined;
    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: { type: 'timeInterval', seconds, repeats: false },
    });
    return id;
  } catch {
    return undefined;
  }
}

async function cancelLocalNotification(notificationId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = require('expo-notifications');
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // ignore
  }
}

// ─── Firestore CRUD ──────────────────────────────────────────────────────────

export async function createReminder(
  data: Omit<Reminder, 'id' | 'createdAt' | 'isDone' | 'notificationId'>
): Promise<Reminder> {
  const scheduledDate = new Date(data.scheduledTime);
  const notificationId = await scheduleLocalNotification(
    `⏰ ${data.noteTitle}`,
    data.message,
    scheduledDate
  );

  const payload = {
    ...data,
    createdAt: new Date().toISOString(),
    isDone: false,
    ...(notificationId ? { notificationId } : {}),
  };

  const ref = await addDoc(collection(db, 'reminders'), payload);
  return { id: ref.id, ...payload };
}

export async function deleteReminder(reminder: Reminder): Promise<void> {
  if (reminder.notificationId) {
    await cancelLocalNotification(reminder.notificationId);
  }
  await deleteDoc(doc(db, 'reminders', reminder.id));
}

export async function markReminderDone(reminderId: string): Promise<void> {
  await updateDoc(doc(db, 'reminders', reminderId), { isDone: true });
}

export function subscribeToReminders(
  userId: string,
  callback: (reminders: Reminder[]) => void
): () => void {
  // No orderBy — avoids requiring a composite index which breaks onSnapshot on web.
  // Sorting is done client-side instead.
  const q = query(
    collection(db, 'reminders'),
    where('userId', '==', userId)
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Reminder))
      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    callback(items);
  });
}

// Check and auto-mark past reminders as done (called on app open for web)
export async function checkAndMarkDueReminders(userId: string): Promise<Reminder[]> {
  const q = query(
    collection(db, 'reminders'),
    where('userId', '==', userId),
    where('isDone', '==', false)
  );
  const snap = await getDocs(q);
  const due: Reminder[] = [];
  const now = new Date();
  for (const d of snap.docs) {
    const r = { id: d.id, ...d.data() } as Reminder;
    if (new Date(r.scheduledTime) <= now) {
      due.push(r);
    }
  }
  return due;
}
