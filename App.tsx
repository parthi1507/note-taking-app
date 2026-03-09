import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import {
  Animated,
  View,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './app/services/firebase';
import { logoutUser } from './app/services/authService';
import LoginScreen from './app/screens/LoginScreen';
import RegisterScreen from './app/screens/RegisterScreen';
import HomeScreen from './app/screens/HomeScreen';
import NoteEditorScreen from './app/screens/NoteEditorScreen';
import { Note, NOTE_COLORS } from './app/types/note';
import { NoteTemplate } from './app/data/templates';

type Screen = 'login' | 'register' | 'home';

export default function App() {
  const { width, height } = useWindowDimensions();
  const isMobile = width < 768;

  const [screen, setScreen] = useState<Screen>('login');
  const [authReady, setAuthReady] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);
  const [initialTitle, setInitialTitle] = useState('');
  const [initialContent, setInitialContent] = useState('');
  const [editorVisible, setEditorVisible] = useState(false);
  const [activeNoteColor, setActiveNoteColor] = useState<string>(NOTE_COLORS[0]);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setScreen(user ? 'home' : 'login');
      setAuthReady(true);
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
          />
        ) : screen === 'login' ? (
          <LoginScreen
            onNavigateToRegister={() => navigateTo('register')}
            onLoggedIn={() => navigateTo('home')}
          />
        ) : (
          <RegisterScreen
            onNavigateToLogin={() => navigateTo('login')}
            onRegistered={() => navigateTo('home')}
          />
        )}
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
