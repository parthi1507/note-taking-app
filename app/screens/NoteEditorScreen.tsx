import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebase';
import { createNote, updateNote, deleteNote } from '../services/noteService';
import { generateSummary, generateTitle, generateTags } from '../services/geminiService';
import { Note, NOTE_COLORS } from '../types/note';
import MarkdownPreview from '../components/MarkdownPreview';
import { useVoiceInput } from '../hooks/useVoiceInput';

interface Props {
  note?: Note;
  initialTitle?: string;
  initialContent?: string;
  onBack: () => void;
}

type AiAction = 'summary' | 'title' | 'tags' | null;

export default function NoteEditorScreen({ note, initialTitle = '', initialContent = '', onBack }: Props) {
  const [title, setTitle] = useState(note?.title ?? initialTitle);
  const [content, setContent] = useState(note?.content ?? initialContent);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(note?.tags ?? []);
  const [color, setColor] = useState(note?.color ?? NOTE_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState<AiAction>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [summary, setSummary] = useState('');
  const isEditing = !!note;

  const { isListening, isSupported, toggleListening } = useVoiceInput({
    onResult: (text) => setContent((prev) => prev + text),
    onError: () => Alert.alert('Voice Error', 'Could not capture voice. Please try again.'),
  });

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      Alert.alert('Empty Note', 'Please add a title or content before saving.');
      return;
    }
    setSaving(true);
    try {
      const userId = auth.currentUser!.uid;
      if (isEditing) {
        await updateNote(note.id, { title, content, tags, color });
      } else {
        await createNote(userId, { title, content, tags, color, isPinned: false });
      }
      onBack();
    } catch {
      Alert.alert('Error', 'Failed to save note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Note', 'This note will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteNote(note!.id);
          onBack();
        },
      },
    ]);
  };

  const handleAiSummary = async () => {
    if (!content.trim()) {
      Alert.alert('No content', 'Write some content first to summarize.');
      return;
    }
    setAiLoading('summary');
    try {
      const result = await generateSummary(content);
      setSummary(result);
    } catch {
      Alert.alert('AI Error', 'Failed to generate summary. Try again.');
    } finally {
      setAiLoading(null);
    }
  };

  const handleAiTitle = async () => {
    if (!content.trim()) {
      Alert.alert('No content', 'Write some content first to generate a title.');
      return;
    }
    setAiLoading('title');
    try {
      const result = await generateTitle(content);
      setTitle(result);
    } catch {
      Alert.alert('AI Error', 'Failed to generate title. Try again.');
    } finally {
      setAiLoading(null);
    }
  };

  const handleAiTags = async () => {
    if (!content.trim()) {
      Alert.alert('No content', 'Write some content first to generate tags.');
      return;
    }
    setAiLoading('tags');
    try {
      const result = await generateTags(content);
      const merged = [...new Set([...tags, ...result])].slice(0, 5);
      setTags(merged);
    } catch {
      Alert.alert('AI Error', 'Failed to generate tags. Try again.');
    } finally {
      setAiLoading(null);
    }
  };

  const insertMarkdown = (syntax: string) => {
    setContent((prev) => prev + syntax);
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t) && tags.length < 5) setTags([...tags, t]);
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.topTitle}>{isEditing ? 'Edit Note' : 'New Note'}</Text>

        <View style={styles.topActions}>
          <TouchableOpacity
            onPress={() => setPreviewMode((p) => !p)}
            style={[styles.previewBtn, previewMode && styles.previewBtnActive]}
          >
            <Ionicons
              name={previewMode ? 'create-outline' : 'eye-outline'}
              size={18}
              color={previewMode ? '#6c47ff' : '#888'}
            />
          </TouchableOpacity>
          {isEditing && (
            <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Color picker */}
        <View style={styles.row}>
          <Text style={styles.label}>Color</Text>
          <View style={styles.colors}>
            {NOTE_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotSelected]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>
        </View>

        {/* AI Actions */}
        <View style={styles.aiRow}>
          <Text style={styles.label}>✨ AI</Text>
          <View style={styles.aiButtons}>
            <TouchableOpacity
              style={styles.aiBtn}
              onPress={handleAiTitle}
              disabled={!!aiLoading}
            >
              {aiLoading === 'title' ? (
                <ActivityIndicator size="small" color="#6c47ff" />
              ) : (
                <Text style={styles.aiBtnText}>Auto Title</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.aiBtn}
              onPress={handleAiTags}
              disabled={!!aiLoading}
            >
              {aiLoading === 'tags' ? (
                <ActivityIndicator size="small" color="#6c47ff" />
              ) : (
                <Text style={styles.aiBtnText}>Auto Tags</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.aiBtn}
              onPress={handleAiSummary}
              disabled={!!aiLoading}
            >
              {aiLoading === 'summary' ? (
                <ActivityIndicator size="small" color="#6c47ff" />
              ) : (
                <Text style={styles.aiBtnText}>Summarize</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Summary result */}
        {summary ? (
          <View style={styles.summaryBox}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryLabel}>✨ AI Summary</Text>
              <TouchableOpacity onPress={() => setSummary('')}>
                <Ionicons name="close" size={16} color="#888" />
              </TouchableOpacity>
            </View>
            <Text style={styles.summaryText}>{summary}</Text>
          </View>
        ) : null}

        {/* Markdown toolbar (edit mode only) */}
        {!previewMode && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.toolbar}
            contentContainerStyle={styles.toolbarContent}
          >
            {[
              { label: 'H1', syntax: '\n# ' },
              { label: 'H2', syntax: '\n## ' },
              { label: 'B', syntax: '**text**' },
              { label: 'I', syntax: '*text*' },
              { label: '•', syntax: '\n- ' },
              { label: '☐', syntax: '\n- [ ] ' },
              { label: '`code`', syntax: '`code`' },
              { label: '---', syntax: '\n---\n' },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.toolbarBtn}
                onPress={() => insertMarkdown(item.syntax)}
              >
                <Text style={styles.toolbarBtnText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            {isSupported && (
              <TouchableOpacity
                style={[styles.toolbarBtn, isListening && styles.toolbarBtnActive]}
                onPress={toggleListening}
              >
                <Ionicons
                  name={isListening ? 'stop-circle' : 'mic-outline'}
                  size={16}
                  color={isListening ? '#ff6b6b' : '#aaa'}
                />
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        {/* Title */}
        <TextInput
          style={styles.titleInput}
          placeholder="Note title..."
          placeholderTextColor="#444"
          value={title}
          onChangeText={setTitle}
          multiline
        />

        {/* Content — Edit or Preview */}
        {previewMode ? (
          <View style={styles.previewContainer}>
            <MarkdownPreview content={content} />
          </View>
        ) : (
          <TextInput
            style={styles.contentInput}
            placeholder={`Start writing...\n\nMarkdown supported:\n# Heading\n**bold** *italic*\n- bullet list\n- [ ] checkbox`}
            placeholderTextColor="#444"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
        )}

        {/* Tags */}
        <View style={styles.tagSection}>
          <Text style={styles.label}>Tags</Text>
          <View style={styles.tagInputRow}>
            <TextInput
              style={styles.tagInput}
              placeholder="Add a tag..."
              placeholderTextColor="#555"
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={addTag}
              returnKeyType="done"
            />
            <TouchableOpacity onPress={addTag} style={styles.tagAddBtn}>
              <Ionicons name="add" size={18} color="#6c47ff" />
            </TouchableOpacity>
          </View>
          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.map((tag) => (
                <TouchableOpacity key={tag} style={styles.tagChip} onPress={() => removeTag(tag)}>
                  <Text style={styles.tagChipText}>#{tag}</Text>
                  <Ionicons name="close" size={12} color="#a78bfa" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a', paddingTop: 56 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  iconBtn: { padding: 6 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewBtn: {
    padding: 8, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  previewBtnActive: { backgroundColor: 'rgba(108,71,255,0.15)' },
  saveBtn: {
    backgroundColor: '#6c47ff', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: {
    color: '#666', fontSize: 11, fontWeight: '600',
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  colors: { flexDirection: 'row', gap: 8 },
  colorDot: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: 'transparent',
  },
  colorDotSelected: { borderColor: '#6c47ff', transform: [{ scale: 1.2 }] },
  aiRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  aiButtons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  aiBtn: {
    backgroundColor: 'rgba(108,71,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(108,71,255,0.3)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    minWidth: 80, alignItems: 'center',
  },
  aiBtnText: { color: '#a78bfa', fontSize: 12, fontWeight: '600' },
  summaryBox: {
    backgroundColor: 'rgba(108,71,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(108,71,255,0.2)',
    borderRadius: 12, padding: 14, gap: 8,
  },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: '#a78bfa', fontSize: 12, fontWeight: '600' },
  summaryText: { color: '#ccc', fontSize: 14, lineHeight: 22 },
  toolbar: { marginHorizontal: -20 },
  toolbarContent: {
    paddingHorizontal: 20, gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  toolbarBtn: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  toolbarBtnActive: {
    backgroundColor: 'rgba(255,107,107,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,107,107,0.4)',
  },
  toolbarBtnText: { color: '#aaa', fontSize: 13, fontWeight: '600' },
  titleInput: {
    color: '#fff', fontSize: 24, fontWeight: '700',
    lineHeight: 32, outlineWidth: 0,
  } as any,
  contentInput: {
    color: '#ccc', fontSize: 15, lineHeight: 24,
    minHeight: 240, outlineWidth: 0,
  } as any,
  previewContainer: { minHeight: 240 },
  tagSection: { gap: 10 },
  tagInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12,
  },
  tagInput: {
    flex: 1, color: '#fff', fontSize: 14,
    paddingVertical: 10, outlineWidth: 0,
  } as any,
  tagAddBtn: { padding: 4 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(108,71,255,0.2)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  tagChipText: { color: '#a78bfa', fontSize: 13 },
});
