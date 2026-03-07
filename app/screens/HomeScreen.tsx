import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { subscribeToNotes, deleteNote, updateNote } from '../services/noteService';
import { useNoteStore } from '../store/noteStore';
import { useResponsive } from '../hooks/useResponsive';
import NoteCard from '../components/NoteCard';
import EmptyState from '../components/EmptyState';
import { Note } from '../types/note';

interface Props {
  onNewNote: () => void;
  onEditNote: (note: Note) => void;
  onLogout: () => void;
}

export default function HomeScreen({ onNewNote, onEditNote, onLogout }: Props) {
  const { notes, searchQuery, setNotes, setSearchQuery, filteredNotes } = useNoteStore();
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const { isMobile } = useResponsive();

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserName(user.displayName?.split(' ')[0] ?? 'there');
      const unsub = subscribeToNotes(user.uid, (data) => {
        setNotes(data);
        setLoading(false);
      });
      return unsub;
    }
  }, []);

  const handleDelete = (note: Note) => {
    Alert.alert('Delete Note', `Delete "${note.title || 'Untitled'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteNote(note.id),
      },
    ]);
  };

  const handlePin = (note: Note) => {
    updateNote(note.id, { isPinned: !note.isPinned });
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: onLogout },
    ]);
  };

  const displayed = filteredNotes();
  const numColumns = isMobile ? 1 : 2;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {userName} 👋</Text>
          <Text style={styles.noteCount}>{notes.length} notes</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.avatarBtn}>
          <Ionicons name="log-out-outline" size={22} color="#888" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={18} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes, tags..."
          placeholderTextColor="#555"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#555" />
          </TouchableOpacity>
        )}
      </View>

      {/* Pinned section */}
      {!searchQuery && displayed.some((n) => n.isPinned) && (
        <Text style={styles.sectionLabel}>📌 Pinned</Text>
      )}

      {/* Notes list */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#6c47ff" size="large" />
        </View>
      ) : displayed.length === 0 ? (
        <EmptyState query={searchQuery} />
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          key={numColumns}
          contentContainerStyle={styles.list}
          columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={numColumns > 1 ? styles.cardWrapper : styles.cardFull}>
              <NoteCard
                note={item}
                onPress={() => onEditNote(item)}
                onPin={() => handlePin(item)}
                onDelete={() => handleDelete(item)}
              />
            </View>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={onNewNote}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    paddingTop: 56,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  greeting: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  noteCount: {
    color: '#666',
    fontSize: 13,
    marginTop: 2,
  },
  avatarBtn: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 13,
    outlineWidth: 0,
  } as any,
  sectionLabel: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 12,
  },
  row: {
    gap: 12,
  },
  cardWrapper: {
    flex: 1,
  },
  cardFull: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    backgroundColor: '#6c47ff',
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6c47ff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
});
