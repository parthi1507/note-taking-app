import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './app/services/firebase';
import { logoutUser } from './app/services/authService';
import LoginScreen from './app/screens/LoginScreen';
import RegisterScreen from './app/screens/RegisterScreen';
import HomeScreen from './app/screens/HomeScreen';
import NoteEditorScreen from './app/screens/NoteEditorScreen';
import { Note } from './app/types/note';
import { NoteTemplate } from './app/data/templates';

type Screen = 'login' | 'register' | 'home' | 'editor';

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [authReady, setAuthReady] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);
  const [initialTitle, setInitialTitle] = useState('');
  const [initialContent, setInitialContent] = useState('');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setScreen(user ? 'home' : 'login');
      setAuthReady(true);
    });
    return unsub;
  }, []);

  const navigateTo = (next: Screen) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setScreen(next);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleLogout = async () => {
    await logoutUser();
    navigateTo('login');
  };

  const handleNewNote = (template?: NoteTemplate) => {
    setEditingNote(undefined);
    setInitialTitle(template?.getTitle() ?? '');
    setInitialContent(template?.getContent() ?? '');
    navigateTo('editor');
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setInitialTitle('');
    setInitialContent('');
    navigateTo('editor');
  };

  if (!authReady) {
    return <View style={{ flex: 1, backgroundColor: '#0a0a14' }} />;
  }

  if (screen === 'home') {
    return (
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <HomeScreen
          onNewNote={handleNewNote}
          onEditNote={handleEditNote}
          onLogout={handleLogout}
        />
        <StatusBar style="light" />
      </Animated.View>
    );
  }

  if (screen === 'editor') {
    return (
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <NoteEditorScreen
          note={editingNote}
          initialTitle={initialTitle}
          initialContent={initialContent}
          onBack={() => navigateTo('home')}
        />
        <StatusBar style="light" />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      {screen === 'login' ? (
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
      <StatusBar style="light" />
    </Animated.View>
  );
}
