import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Note } from '../types/note';

interface Props {
  note: Note;
  onPress: () => void;
  onPin: () => void;
  onDelete: () => void;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NoteCard({ note, onPress, onPin, onDelete }: Props) {
  const preview = note.content.replace(/\n/g, ' ').slice(0, 100);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: note.color }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {note.title || 'Untitled'}
        </Text>
        <TouchableOpacity onPress={onPin} style={styles.iconBtn}>
          <Ionicons
            name={note.isPinned ? 'bookmark' : 'bookmark-outline'}
            size={16}
            color={note.isPinned ? '#6c47ff' : '#666'}
          />
        </TouchableOpacity>
      </View>

      {/* Content preview */}
      {preview ? (
        <Text style={styles.preview} numberOfLines={3}>
          {preview}
        </Text>
      ) : null}

      {/* Tags */}
      {note.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {note.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.date}>{formatDate(note.updatedAt)}</Text>
        <TouchableOpacity onPress={onDelete} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={15} color="#555" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  preview: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 19,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: 'rgba(108,71,255,0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    color: '#a78bfa',
    fontSize: 11,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  date: {
    color: '#555',
    fontSize: 11,
  },
  iconBtn: {
    padding: 4,
  },
});
