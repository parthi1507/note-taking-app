import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import {
  Animated,
  View,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './app/services/firebase';
import { logoutUser } from './app/services/authService';
import LoginScreen from './app/screens/LoginScreen';
import RegisterScreen from './app/screens/RegisterScreen';
import HomeScreen from './app/screens/HomeScreen';
import NoteEditorScreen from './app/screens/NoteEditorScreen';
import AIChatScreen from './app/screens/AIChatScreen';
import ForgotPasswordScreen from './app/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './app/screens/ResetPasswordScreen';
import RemindersScreen from './app/screens/RemindersScreen';
import { Note, NOTE_COLORS } from './app/types/note';
import { NoteTemplate } from './app/data/templates';
import { registerForNotifications, subscribeToReminders, checkAndMarkDueReminders } from './app/services/reminderService';

type Screen = 'login' | 'register' | 'home' | 'forgotPassword' | 'resetPassword';

export default function App() {
  const { width, height } = useWindowDimensions();
  const isMobile = width < 768;

  const [screen, setScreen] = useState<Screen>('login');
  const [authReady, setAuthReady] = useState(false);
  const [resetOobCode, setResetOobCode] = useState('');
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);
  const [initialTitle, setInitialTitle] = useState('');
  const [initialContent, setInitialContent] = useState('');
  const [editorVisible, setEditorVisible] = useState(false);
  const [activeNoteColor, setActiveNoteColor] = useState<string>(NOTE_COLORS[0]);

  const [chatVisible, setChatVisible] = useState(false);
  const [chatNotes, setChatNotes] = useState<Note[]>([]);
  const [chatContext, setChatContext] = useState('Personal Notes');
  const chatAnim = useRef(new Animated.Value(0)).current;

  const [remindersVisible, setRemindersVisible] = useState(false);
  const [pendingRemindersCount, setPendingRemindersCount] = useState(0);
  const remindersAnim = useRef(new Animated.Value(0)).current;

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Handle Firebase password-reset redirect on web
    if (Platform.OS === 'web') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      const oobCode = params.get('oobCode');
      if (mode === 'resetPassword' && oobCode) {
        setResetOobCode(oobCode);
        setScreen('resetPassword');
        setAuthReady(true);
        window.history.replaceState({}, '', window.location.pathname);
        return () => {};
      }
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      setScreen(user ? 'home' : 'login');
      setAuthReady(true);
      if (user) {
        registerForNotifications();
        // Subscribe to pending reminder count
        const unsubReminders = subscribeToReminders(user.uid, (reminders) => {
          const now = new Date();
          const pending = reminders.filter(
            (r) => !r.isDone && new Date(r.scheduledTime) > now
          );
          const overdue = reminders.filter(
            (r) => !r.isDone && new Date(r.scheduledTime) <= now
          );
          setPendingRemindersCount(pending.length + overdue.length);
        });
        // On web, check for any overdue reminders to alert user
        if (Platform.OS === 'web') {
          checkAndMarkDueReminders(user.uid).then((due) => {
            if (due.length > 0) {
              // Will show badge in header; user opens reminders screen to see them
            }
          });
        }
        return unsubReminders;
      }
    });
    return unsub;
  }, []);

  const navigateTo = (next: Screen) => {
    Animated.timing(fadeAnim, {
      toValue: 0, duration: 150, useNativeDriver: true,
    }).start(() => {
      setScreen(next);
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 220, useNativeDriver: true,
      }).start();
    });
  };

  const handleLogout = () => {
    Animated.timing(fadeAnim, {
      toValue: 0, duration: 150, useNativeDriver: true,
    }).start(async () => {
      try {
        await logoutUser();
      } finally {
        setScreen('login');
        Animated.timing(fadeAnim, {
          toValue: 1, duration: 220, useNativeDriver: true,
        }).start();
      }
    });
  };

  const openEditor = () => {
    modalAnim.setValue(0);
    setEditorVisible(true);
    setTimeout(() => {
      Animated.spring(modalAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 58,
        friction: 12,
      }).start();
    }, 10);
  };

  const closeEditor = () => {
    Animated.timing(modalAnim, {
      toValue: 0, duration: 220, useNativeDriver: true,
    }).start(() => setEditorVisible(false));
  };

  const openReminders = () => {
    remindersAnim.setValue(0);
    setRemindersVisible(true);
    setTimeout(() => {
      Animated.spring(remindersAnim, {
        toValue: 1, useNativeDriver: true, tension: 58, friction: 12,
      }).start();
    }, 10);
  };

  const closeReminders = () => {
    Animated.timing(remindersAnim, {
      toValue: 0, duration: 220, useNativeDriver: true,
    }).start(() => setRemindersVisible(false));
  };

  const openChat = (notes: Note[], context: string) => {
    setChatNotes(notes);
    setChatContext(context);
    chatAnim.setValue(0);
    setChatVisible(true);
    setTimeout(() => {
      Animated.spring(chatAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 58,
        friction: 12,
      }).start();
    }, 10);
  };

  const closeChat = () => {
    Animated.timing(chatAnim, {
      toValue: 0, duration: 220, useNativeDriver: true,
    }).start(() => setChatVisible(false));
  };

  const handleNewNote = (template?: NoteTemplate) => {
    setEditingNote(undefined);
    setInitialTitle(template?.getTitle() ?? '');
    setInitialContent(template?.getContent() ?? '');
    setActiveNoteColor(NOTE_COLORS[0]);
    openEditor();
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setInitialTitle('');
    setInitialContent('');
    setActiveNoteColor(note.color ?? NOTE_COLORS[0]);
    openEditor();
  };

  if (!authReady) {
    return <View style={{ flex: 1, backgroundColor: '#0a0a14' }} />;
  }

  const cardHeight = isMobile ? height * 0.92 : height * 0.88;
  const cardWidth = isMobile ? width : Math.min(780, width - 80);

  const slideUp = modalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [cardHeight, 0],
  });
  const scaleIn = modalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1],
  });

  return (
    <SafeAreaProvider>
    <View style={{ flex: 1 }}>
      {/* Main screens */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {screen === 'home' ? (
          <HomeScreen
            onNewNote={handleNewNote}
            onEditNote={handleEditNote}
            onLogout={handleLogout}
            onOpenChat={openChat}
            onOpenReminders={openReminders}
            pendingRemindersCount={pendingRemindersCount}
          />
        ) : screen === 'login' ? (
          <LoginScreen
            onNavigateToRegister={() => navigateTo('register')}
            onLoggedIn={() => navigateTo('home')}
            onNavigateToForgotPassword={() => navigateTo('forgotPassword')}
          />
        ) : screen === 'register' ? (
          <RegisterScreen
            onNavigateToLogin={() => navigateTo('login')}
            onRegistered={() => navigateTo('home')}
          />
        ) : screen === 'forgotPassword' ? (
          <ForgotPasswordScreen
            onNavigateToLogin={() => navigateTo('login')}
          />
        ) : screen === 'resetPassword' ? (
          <ResetPasswordScreen
            oobCode={resetOobCode}
            onSuccess={() => navigateTo('login')}
            onNavigateToLogin={() => navigateTo('login')}
          />
        ) : null}
      </Animated.View>

      {/* Editor modal overlay */}
      {editorVisible && (
        <>
          {/* Backdrop — tap outside card to close */}
          <TouchableOpacity
            style={[StyleSheet.absoluteFill, styles.backdropTouch]}
            activeOpacity={1}
            onPress={closeEditor}
          >
            <Animated.View
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.72)', opacity: modalAnim }]}
            />
          </TouchableOpacity>

          {/* Card container — box-none so taps on empty space fall through to backdrop */}
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.cardContainer,
              { justifyContent: isMobile ? 'flex-end' : 'center', alignItems: 'center' },
            ]}
            pointerEvents="box-none"
          >
            <Animated.View
              style={[
                styles.card,
                isMobile ? styles.cardMobile : styles.cardDesktop,
                {
                  width: cardWidth,
                  height: cardHeight,
                  borderColor: activeNoteColor + '55',
                  shadowColor: activeNoteColor,
                  transform: isMobile ? [{ translateY: slideUp }] : [{ scale: scaleIn }],
                  opacity: isMobile ? 1 : modalAnim,
                },
              ]}
            >
              {/* Top accent line */}
              <View style={[styles.accentLine, { backgroundColor: activeNoteColor }]} />

              {/* Drag handle on mobile (below accent line) */}
              {isMobile && <View style={styles.dragHandle} />}

              <NoteEditorScreen
                note={editingNote}
                initialTitle={initialTitle}
                initialContent={initialContent}
                onBack={closeEditor}
                isModal
                onColorChange={setActiveNoteColor}
              />
            </Animated.View>
          </View>
        </>
      )}

      {/* AI Chat modal overlay */}
      {chatVisible && (
        <>
          <TouchableOpacity
            style={[StyleSheet.absoluteFill, styles.backdropTouch]}
            activeOpacity={1}
            onPress={closeChat}
          >
            <Animated.View
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.72)', opacity: chatAnim }]}
            />
          </TouchableOpacity>

          <View
            style={[
              StyleSheet.absoluteFill,
              styles.cardContainer,
              { justifyContent: isMobile ? 'flex-end' : 'center', alignItems: 'center' },
            ]}
            pointerEvents="box-none"
          >
            <Animated.View
              style={[
                styles.card,
                isMobile ? styles.cardMobile : styles.cardDesktop,
                {
                  width: isMobile ? width : Math.min(560, width - 80),
                  height: isMobile ? height * 0.88 : height * 0.82,
                  borderColor: 'rgba(108,71,255,0.4)',
                  shadowColor: '#6c47ff',
                  transform: isMobile
                    ? [{ translateY: chatAnim.interpolate({ inputRange: [0, 1], outputRange: [height * 0.88, 0] }) }]
                    : [{ scale: chatAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
                  opacity: isMobile ? 1 : chatAnim,
                },
              ]}
            >
              <View style={[styles.accentLine, { backgroundColor: '#6c47ff' }]} />
              {isMobile && <View style={styles.dragHandle} />}
              <AIChatScreen notes={chatNotes} context={chatContext} onClose={closeChat} />
            </Animated.View>
          </View>
        </>
      )}

      {/* Reminders modal overlay */}
      {remindersVisible && (
        <>
          <TouchableOpacity
            style={[StyleSheet.absoluteFill, styles.backdropTouch]}
            activeOpacity={1}
            onPress={closeReminders}
          >
            <Animated.View
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.72)', opacity: remindersAnim }]}
            />
          </TouchableOpacity>

          <View
            style={[
              StyleSheet.absoluteFill,
              styles.cardContainer,
              { justifyContent: isMobile ? 'flex-end' : 'center', alignItems: 'center' },
            ]}
            pointerEvents="box-none"
          >
            <Animated.View
              style={[
                styles.card,
                isMobile ? styles.cardMobile : styles.cardDesktop,
                {
                  width: isMobile ? width : Math.min(480, width - 80),
                  height: isMobile ? height * 0.82 : height * 0.78,
                  borderColor: 'rgba(108,71,255,0.4)',
                  shadowColor: '#6c47ff',
                  transform: isMobile
                    ? [{ translateY: remindersAnim.interpolate({ inputRange: [0, 1], outputRange: [height * 0.82, 0] }) }]
                    : [{ scale: remindersAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
                  opacity: isMobile ? 1 : remindersAnim,
                },
              ]}
            >
              <View style={[styles.accentLine, { backgroundColor: '#a78bfa' }]} />
              {isMobile && <View style={styles.dragHandle} />}
              <RemindersScreen onClose={closeReminders} />
            </Animated.View>
          </View>
        </>
      )}

      <StatusBar style="light" />
    </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  backdropTouch: {
    zIndex: 10,
  },
  cardContainer: {
    zIndex: 11,
  },
  card: {
    backgroundColor: '#0f0f1a',
    borderWidth: 1,
    borderColor: 'rgba(108,71,255,0.3)',
    overflow: 'hidden',
    shadowColor: '#6c47ff',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.35,
    shadowRadius: 40,
    elevation: 24,
  } as any,
  cardMobile: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  cardDesktop: {
    borderRadius: 24,
  },
  accentLine: {
    height: 3,
    width: '100%',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 2,
  },
});
