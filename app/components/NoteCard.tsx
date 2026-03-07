import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Note } from '../types/note';

interface Props {
  note: Note;
  onPress: () => void;
  onPin: () => void;
  onDelete: () => void;
  index?: number;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getAccentColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.25 ? '#6c47ff' : hex;
}

export default function NoteCard({ note, onPress, onPin, onDelete, index = 0 }: Props) {
  const preview = note.content.replace(/[#*`\-\[\]]/g, '').replace(/\n/g, ' ').trim().slice(0, 110);
  const accentColor = getAccentColor(note.color);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: index * 55,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        delay: index * 55,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  };

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Glow layer */}
        <View style={[styles.glow, { backgroundColor: accentColor }]} />

        {/* Card */}
        <View style={[styles.card, { borderColor: accentColor + '40' }] as any}>
          {/* Top accent line */}
          <View style={[styles.accentLine, { backgroundColor: accentColor }]} />

          <View style={styles.body}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={1}>
                {note.title || 'Untitled'}
              </Text>
              <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); onPin(); }} style={styles.iconBtn}>
                <Ionicons
                  name={note.isPinned ? 'bookmark' : 'bookmark-outline'}
                  size={15}
                  color={note.isPinned ? accentColor : '#444'}
                />
              </TouchableOpacity>
            </View>

            {/* Preview */}
            {preview ? (
              <Text style={styles.preview} numberOfLines={3}>
                {preview}
              </Text>
            ) : null}

            {/* Tags */}
            {note.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {note.tags.slice(0, 3).map((tag) => (
                  <View key={tag} style={[styles.tag, { backgroundColor: accentColor + '55', borderColor: accentColor }]}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.date}>{formatDate(note.updatedAt)}</Text>
              <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); onDelete(); }} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={14} color="#444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    top: 8,
    left: 16,
    right: 16,
    bottom: -4,
    borderRadius: 16,
    opacity: 0.12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(18,18,30,0.95)',
    overflow: 'hidden',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  } as any,
  accentLine: {
    height: 2,
    width: '100%',
    opacity: 0.8,
  },
  body: {
    padding: 16,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#f0f0ff',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.2,
  },
  preview: {
    color: '#888',
    fontSize: 15,
    lineHeight: 23,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  date: {
    color: '#444',
    fontSize: 13,
    fontWeight: '500',
  },
  iconBtn: {
    padding: 4,
  },
});
