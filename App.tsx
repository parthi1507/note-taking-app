import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
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
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);
  const [initialTitle, setInitialTitle] = useState('');
  const [initialContent, setInitialContent] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setScreen(user ? 'home' : 'login');
    });
    return unsub;
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    setScreen('login');
  };

  const handleNewNote = (template?: NoteTemplate) => {
    setEditingNote(undefined);
    setInitialTitle(template?.getTitle() ?? '');
    setInitialContent(template?.getContent() ?? '');
    setScreen('editor');
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setInitialTitle('');
    setInitialContent('');
    setScreen('editor');
  };

  if (screen === 'home') {
    return (
      <>
        <HomeScreen
          onNewNote={handleNewNote}
          onEditNote={handleEditNote}
          onLogout={handleLogout}
        />
        <StatusBar style="light" />
      </>
    );
  }

  if (screen === 'editor') {
    return (
      <>
        <NoteEditorScreen
          note={editingNote}
          initialTitle={initialTitle}
          initialContent={initialContent}
          onBack={() => setScreen('home')}
        />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <>
      {screen === 'login' ? (
        <LoginScreen
          onNavigateToRegister={() => setScreen('register')}
          onLoggedIn={() => setScreen('home')}
        />
      ) : (
        <RegisterScreen
          onNavigateToLogin={() => setScreen('login')}
          onRegistered={() => setScreen('home')}
        />
      )}
      <StatusBar style="light" />
    </>
  );
}
