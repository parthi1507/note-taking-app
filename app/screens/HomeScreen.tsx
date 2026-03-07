import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebase';
import { subscribeToNotes, deleteNote, updateNote } from '../services/noteService';
import { useNoteStore } from '../store/noteStore';
import { useResponsive } from '../hooks/useResponsive';
import NoteCard from '../components/NoteCard';
import SkeletonCard from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';
import TemplatePickerModal from '../components/TemplatePickerModal';
import { Note } from '../types/note';
import { NoteTemplate } from '../data/templates';

interface Props {
  onNewNote: (template?: NoteTemplate) => void;
  onEditNote: (note: Note) => void;
  onLogout: () => void;
}

export default function HomeScreen({ onNewNote, onEditNote, onLogout }: Props) {
  const { notes, searchQuery, setNotes, setSearchQuery, filteredNotes } = useNoteStore();
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const { isMobile, isTablet, numColumns, noteCardWidth, width } = useResponsive();

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
    deleteNote(note.id);
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
  const pinnedNotes = displayed.filter((n) => n.isPinned);
  const unpinnedNotes = displayed.filter((n) => !n.isPinned);
  const pinnedCount = notes.filter((n) => n.isPinned).length;


  return (
    <View style={styles.container}>
      {/* Background orbs */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />
      <View style={styles.orb3} />

      {/* Background watermark */}
      <View style={styles.watermarkWrap} pointerEvents="none">
        <Text style={styles.watermarkSymbol}>✦</Text>
        <Text style={styles.watermarkText}>MY NOTES</Text>
      </View>

      {/* Decorative corner lines */}
      <View style={styles.cornerTL} pointerEvents="none" />
      <View style={styles.cornerBR} pointerEvents="none" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appLabel}>✦ MY WORKSPACE</Text>
          <Text style={styles.greeting}>Hello, {userName}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.avatarBtn}>
          <Ionicons name="log-out-outline" size={20} color="#a78bfa" />
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{notes.length}</Text>
          <Text style={styles.statLabel}>Total Notes</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{pinnedCount}</Text>
          <Text style={styles.statLabel}>Pinned</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{notes.filter((n) => n.tags.length > 0).length}</Text>
          <Text style={styles.statLabel}>Tagged</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchOuter}>
        <View style={[
          styles.searchWrapper,
          { width: isMobile ? width - 48 : isTablet ? 560 : 660 },
        ]}>
          <Ionicons name="search-outline" size={17} color="#6c47ff" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notes, tags..."
            placeholderTextColor="#444"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#555" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Notes */}
      {loading ? (
        <View style={styles.list}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={styles.cardFull}>
              <SkeletonCard />
            </View>
          ))}
        </View>
      ) : displayed.length === 0 ? (
        <EmptyState query={searchQuery} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        >
          {/* Pinned section */}
          {pinnedNotes.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <Ionicons name="bookmark" size={13} color="#6c47ff" />
                <Text style={styles.sectionLabel}>PINNED</Text>
                <View style={styles.sectionLine} />
              </View>
              <View style={styles.grid}>
                {pinnedNotes.map((item, index) => (
                  <View key={item.id} style={{ width: noteCardWidth }}>
                    <NoteCard
                      note={item}
                      index={index}
                      onPress={() => onEditNote(item)}
                      onPin={() => handlePin(item)}
                      onDelete={() => handleDelete(item)}
                    />
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Unpinned section */}
          {unpinnedNotes.length > 0 && (
            <View style={styles.section}>
              {pinnedNotes.length > 0 && (
                <View style={styles.sectionRow}>
                  <Ionicons name="document-text-outline" size={13} color="#555" />
                  <Text style={[styles.sectionLabel, { color: '#555' }]}>NOTES</Text>
                  <View style={[styles.sectionLine, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
                </View>
              )}
              <View style={styles.grid}>
                {unpinnedNotes.map((item, index) => (
                  <View key={item.id} style={{ width: noteCardWidth }}>
                    <NoteCard
                      note={item}
                      index={index}
                      onPress={() => onEditNote(item)}
                      onPin={() => handlePin(item)}
                      onDelete={() => handleDelete(item)}
                    />
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowTemplates(true)}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Template Picker */}
      <TemplatePickerModal
        visible={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={(template) => {
          setShowTemplates(false);
          onNewNote(template);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a14',
    paddingTop: 56,
    overflow: 'hidden',
    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
    backgroundSize: '28px 28px',
  } as any,

  // Watermark
  watermarkWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  watermarkSymbol: {
    fontSize: 100,
    color: 'rgba(108,71,255,0.15)',
    fontWeight: '900',
    lineHeight: 100,
  } as any,
  watermarkText: {
    fontSize: 36,
    color: 'rgba(108,71,255,0.12)',
    fontWeight: '900',
    letterSpacing: 18,
  } as any,

  // Decorative corners
  cornerTL: {
    position: 'absolute',
    top: 36,
    left: 16,
    width: 40,
    height: 40,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: 'rgba(108,71,255,0.15)',
    borderRadius: 4,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    width: 40,
    height: 40,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: 'rgba(108,71,255,0.1)',
    borderRadius: 4,
  },

  // Background orbs
  orb1: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(108,71,255,0.13)',
    top: -100,
    right: -80,
  },
  orb2: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(59,130,246,0.09)',
    bottom: 250,
    left: -80,
  },
  orb3: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(167,139,250,0.07)',
    bottom: 60,
    right: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  appLabel: {
    color: '#6c47ff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 4,
  },
  greeting: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  avatarBtn: {
    backgroundColor: 'rgba(108,71,255,0.15)',
    borderRadius: 14,
    padding: 11,
    borderWidth: 1,
    borderColor: 'rgba(108,71,255,0.3)',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statNum: {
    color: '#a78bfa',
    fontSize: 26,
    fontWeight: '800',
  },
  statLabel: {
    color: '#555',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },

  // Search
  searchOuter: {
    paddingHorizontal: 24,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(108,71,255,0.25)',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 17,
    paddingVertical: 14,
    outlineWidth: 0,
  } as any,

  // Section label
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(108,71,255,0.2)',
  },
  sectionLabel: {
    color: '#6c47ff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
  },

  // List
  list: {
    paddingHorizontal: 24,
    paddingBottom: 110,
    gap: 16,
  },
  section: {
    gap: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardFull: { width: '100%' },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 36,
    right: 28,
    backgroundColor: '#6c47ff',
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6c47ff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.4)',
  },
});
