import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './app/services/firebase';
import LoginScreen from './app/screens/LoginScreen';
import RegisterScreen from './app/screens/RegisterScreen';

type Screen = 'login' | 'register' | 'home';

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setScreen('home');
      } else {
        setScreen('login');
      }
    });
    return unsubscribe;
  }, []);

  if (screen === 'home') {
    return (
      <View style={styles.container}>
        <Text style={styles.logoIcon}>📝</Text>
        <Text style={styles.title}>NoteApp</Text>
        <Text style={styles.subtitle}>Notes screen coming soon...</Text>
        <StatusBar style="light" />
      </View>
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
      <StatusBar style="auto" />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    fontSize: 52,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 8,
  },
});
