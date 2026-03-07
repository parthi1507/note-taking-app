import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  query?: string;
}

export default function EmptyState({ query }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📭</Text>
      <Text style={styles.title}>
        {query ? 'No results found' : 'No notes yet'}
      </Text>
      <Text style={styles.subtitle}>
        {query
          ? `Nothing matched "${query}"`
          : 'Tap the + button to create your first note'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 10,
  },
  icon: { fontSize: 52 },
  title: { color: '#fff', fontSize: 18, fontWeight: '600' },
  subtitle: { color: '#666', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
