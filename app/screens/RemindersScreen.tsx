import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebase';
import {
  subscribeToReminders,
  deleteReminder,
  markReminderDone,
} from '../services/reminderService';
import { Reminder } from '../types/reminder';

interface Props {
  onClose: () => void;
}

function formatReminderTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();

  if (diff < 0) {
    const ago = Math.abs(diff);
    if (ago < 3600000) return `${Math.floor(ago / 60000)}m ago`;
    if (ago < 86400000) return `${Math.floor(ago / 3600000)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `in ${mins}m`;
  }
  if (diff < 86400000) {
    const hrs = Math.floor(diff / 3600000);
    return `in ${hrs}h`;
  }

  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today ${timeStr}`;
  if (isTomorrow) return `Tomorrow ${timeStr}`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + timeStr;
}

function isOverdue(iso: string): boolean {
  return new Date(iso) < new Date();
}

export default function RemindersScreen({ onClose }: Props) {
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const unsub = subscribeToReminders(user.uid, setReminders);
    return unsub;
  }, []);

  const upcoming = reminders.filter((r) => !r.isDone && !isOverdue(r.scheduledTime));
  const overdue  = reminders.filter((r) => !r.isDone && isOverdue(r.scheduledTime));
  const done     = reminders.filter((r) => r.isDone);

  const handleDelete = (r: Reminder) => {
    // Optimistic: remove from local state immediately so UI updates at once
    setReminders((prev) => prev.filter((x) => x.id !== r.id));
    deleteReminder(r).catch(() => {
      // Roll back if Firestore delete fails
      setReminders((prev) => [...prev, r].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime)));
    });
  };

  const handleDone = (r: Reminder) => {
    // Optimistic: flip isDone locally so the card moves to Completed instantly
    setReminders((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, isDone: true } : x))
    );
    markReminderDone(r.id).catch(() => {
      // Roll back if Firestore update fails
      setReminders((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, isDone: false } : x))
      );
    });
  };

  const renderReminder = (r: Reminder) => {
    const overdue = !r.isDone && isOverdue(r.scheduledTime);
    return (
      <View key={r.id} style={[styles.card, overdue && styles.cardOverdue, r.isDone && styles.cardDone]}>
        <View style={styles.cardLeft}>
          <View style={[styles.bellWrap, overdue && styles.bellWrapOverdue, r.isDone && styles.bellWrapDone]}>
            <Ionicons
              name={r.isDone ? 'checkmark' : overdue ? 'alert' : 'alarm-outline'}
              size={16}
              color={r.isDone ? '#34d399' : overdue ? '#ff6b6b' : '#a78bfa'}
            />
          </View>
          <View style={styles.cardInfo}>
            <View style={styles.titleRow}>
              <Text style={[styles.noteTitle, r.isDone && styles.doneTxt]} numberOfLines={1}>
                {r.noteTitle}
              </Text>
              {r.source === 'team' ? (
                <View style={styles.teamBadge}>
                  <Ionicons name="people-outline" size={10} color="#a78bfa" />
                  <Text style={styles.teamBadgeText}>
                    {r.workspaceName ?? 'Team'}
                  </Text>
                </View>
              ) : (
                <View style={styles.personalBadge}>
                  <Ionicons name="person-outline" size={10} color="#60a5fa" />
                  <Text style={styles.personalBadgeText}>Personal</Text>
                </View>
              )}
            </View>
            {r.message ? (
              <Text style={[styles.message, r.isDone && styles.doneTxt]} numberOfLines={2}>
                {r.message}
              </Text>
            ) : null}
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={11} color={overdue ? '#ff6b6b' : '#555'} />
              <Text style={[styles.timeText, overdue && styles.overdueText]}>
                {formatReminderTime(r.scheduledTime)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardActions}>
          {!r.isDone && (
            <TouchableOpacity style={styles.doneBtn} onPress={() => handleDone(r)}>
              <Ionicons name="checkmark-circle-outline" size={22} color="#34d399" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(r)}>
            <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="alarm-outline" size={20} color="#a78bfa" />
          <Text style={styles.headerTitle}>Reminders</Text>
          {(upcoming.length + overdue.length) > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{upcoming.length + overdue.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Empty state */}
        {reminders.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyTitle}>No reminders yet</Text>
            <Text style={styles.emptySubtitle}>
              Open any note and tap the{' '}
              <Ionicons name="alarm-outline" size={13} color="#666" />{' '}
              bell icon to set a reminder.
            </Text>
          </View>
        )}

        {/* Overdue */}
        {overdue.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="alert-circle-outline" size={14} color="#ff6b6b" />
              <Text style={[styles.sectionTitle, { color: '#ff6b6b' }]}>Overdue</Text>
            </View>
            {overdue.map((r) => renderReminder(r))}
          </View>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time-outline" size={14} color="#a78bfa" />
              <Text style={styles.sectionTitle}>Upcoming</Text>
            </View>
            {upcoming.map((r) => renderReminder(r))}
          </View>
        )}

        {/* Done */}
        {done.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#34d399" />
              <Text style={[styles.sectionTitle, { color: '#34d399' }]}>Completed</Text>
            </View>
            {done.map((r) => renderReminder(r))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#f0f0ff' },
  badge: {
    backgroundColor: '#6c47ff', borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.07)', justifyContent: 'center', alignItems: 'center',
  },
  scroll: { flex: 1 },
  emptyWrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 44, marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#f0f0ff', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 20 },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10,
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#a78bfa', letterSpacing: 0.8 },
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(108,71,255,0.15)',
    padding: 14, marginBottom: 10,
  },
  cardOverdue: {
    borderColor: 'rgba(255,107,107,0.3)',
    backgroundColor: 'rgba(255,107,107,0.05)',
  },
  cardDone: {
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    opacity: 0.6,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 12 },
  bellWrap: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(108,71,255,0.15)', borderWidth: 1, borderColor: 'rgba(108,71,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  bellWrapOverdue: {
    backgroundColor: 'rgba(255,107,107,0.12)', borderColor: 'rgba(255,107,107,0.3)',
  },
  bellWrapDone: {
    backgroundColor: 'rgba(52,211,153,0.12)', borderColor: 'rgba(52,211,153,0.3)',
  },
  cardInfo: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' },
  noteTitle: { fontSize: 14, fontWeight: '600', color: '#e0e0f0', flexShrink: 1 },
  teamBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(108,71,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(108,71,255,0.3)',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  teamBadgeText: { fontSize: 10, color: '#a78bfa', fontWeight: '600' },
  personalBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(96,165,250,0.12)',
    borderWidth: 1, borderColor: 'rgba(96,165,250,0.25)',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  personalBadgeText: { fontSize: 10, color: '#60a5fa', fontWeight: '600' },
  message: { fontSize: 13, color: '#888', marginBottom: 4, lineHeight: 18 },
  doneTxt: { color: '#444', textDecorationLine: 'line-through' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 12, color: '#555' },
  overdueText: { color: '#ff6b6b' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 },
  doneBtn: { padding: 4 },
  deleteBtn: { padding: 4 },
});
