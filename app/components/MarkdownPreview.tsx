import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  content: string;
}

function parseLine(line: string, index: number) {
  // Heading 1
  if (line.startsWith('# ')) {
    return <Text key={index} style={styles.h1}>{line.slice(2)}</Text>;
  }
  // Heading 2
  if (line.startsWith('## ')) {
    return <Text key={index} style={styles.h2}>{line.slice(3)}</Text>;
  }
  // Heading 3
  if (line.startsWith('### ')) {
    return <Text key={index} style={styles.h3}>{line.slice(4)}</Text>;
  }
  // Bullet point
  if (line.startsWith('- ') || line.startsWith('* ')) {
    return (
      <View key={index} style={styles.bulletRow}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.bulletText}>{parseInline(line.slice(2))}</Text>
      </View>
    );
  }
  // Checkbox unchecked
  if (line.startsWith('- [ ] ')) {
    return (
      <View key={index} style={styles.bulletRow}>
        <Text style={styles.checkbox}>☐</Text>
        <Text style={styles.bulletText}>{parseInline(line.slice(6))}</Text>
      </View>
    );
  }
  // Checkbox checked
  if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
    return (
      <View key={index} style={styles.bulletRow}>
        <Text style={[styles.checkbox, styles.checkboxDone]}>☑</Text>
        <Text style={[styles.bulletText, styles.strikethrough]}>{parseInline(line.slice(6))}</Text>
      </View>
    );
  }
  // Divider
  if (line.startsWith('---')) {
    return <View key={index} style={styles.divider} />;
  }
  // Empty line
  if (!line.trim()) {
    return <View key={index} style={styles.emptyLine} />;
  }
  // Normal paragraph
  return <Text key={index} style={styles.paragraph}>{parseInline(line)}</Text>;
}

function parseInline(text: string): React.ReactNode {
  // Split by bold **text** and italic *text*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <Text key={i} style={styles.bold}>{part.slice(2, -2)}</Text>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <Text key={i} style={styles.italic}>{part.slice(1, -1)}</Text>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <Text key={i} style={styles.code}>{part.slice(1, -1)}</Text>;
    }
    return part;
  });
}

export default function MarkdownPreview({ content }: Props) {
  const lines = content.split('\n');
  return (
    <View style={styles.container}>
      {lines.map((line, i) => parseLine(line, i))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  h1: { color: '#fff', fontSize: 24, fontWeight: '800', marginVertical: 8 },
  h2: { color: '#fff', fontSize: 20, fontWeight: '700', marginVertical: 6 },
  h3: { color: '#ddd', fontSize: 17, fontWeight: '600', marginVertical: 4 },
  paragraph: { color: '#ccc', fontSize: 15, lineHeight: 24 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 2 },
  bullet: { color: '#6c47ff', fontSize: 16, marginRight: 8, lineHeight: 24 },
  bulletText: { color: '#ccc', fontSize: 15, lineHeight: 24, flex: 1 },
  checkbox: { color: '#888', fontSize: 16, marginRight: 8, lineHeight: 24 },
  checkboxDone: { color: '#6c47ff' },
  strikethrough: { textDecorationLine: 'line-through', color: '#666' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 12 },
  emptyLine: { height: 8 },
  bold: { fontWeight: '700', color: '#fff' },
  italic: { fontStyle: 'italic', color: '#ddd' },
  code: {
    fontFamily: 'monospace',
    backgroundColor: 'rgba(108,71,255,0.15)',
    color: '#a78bfa',
    paddingHorizontal: 6,
    borderRadius: 4,
    fontSize: 13,
  },
});
