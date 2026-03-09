import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Note } from '../types/note';
import { chatWithNotes } from '../services/groqService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: string[];
  loading?: boolean;
}

interface Props {
  notes: Note[];
  context: string; // 'Personal Notes' or workspace name
  onClose: () => void;
}

export default function AIChatScreen({ notes, context, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Hi! I can answer questions about your ${context}. Try asking:\n• "What are my action items?"\n• "Summarize my meeting notes"\n• "Do I have any notes about Firebase?"`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: question };
    const loadingMsg: Message = { id: 'loading', role: 'assistant', text: '', loading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput('');
    setLoading(true);

    try {
      const { answer, sources } = await chatWithNotes(question, notes);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== 'loading'),
        { id: Date.now().toString() + '_ai', role: 'assistant', text: answer, sources },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== 'loading'),
        {
          id: Date.now().toString() + '_err',
          role: 'assistant',
          text: err.message ?? 'Something went wrong. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.aiIconWrap}>
            <Ionicons name="sparkles" size={18} color="#a78bfa" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Ask AI</Text>
            <Text style={styles.headerSub}>{context} · {notes.length} notes</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color="#888" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageRow,
              msg.role === 'user' ? styles.messageRowUser : styles.messageRowAI,
            ]}
          >
            {msg.role === 'assistant' && (
              <View style={styles.aiBubbleIcon}>
                <Ionicons name="sparkles" size={14} color="#a78bfa" />
              </View>
            )}
            <View
              style={[
                styles.bubble,
                msg.role === 'user' ? styles.bubbleUser : styles.bubbleAI,
              ]}
            >
              {msg.loading ? (
                <View style={styles.loadingDots}>
                  <ActivityIndicator size="small" color="#a78bfa" />
                  <Text style={styles.loadingText}>Thinking...</Text>
                </View>
              ) : (
                <>
                  <Text style={[styles.bubbleText, msg.role === 'user' && styles.bubbleTextUser]}>
                    {msg.text}
                  </Text>
                  {msg.sources && msg.sources.length > 0 && (
                    <View style={styles.sourcesWrap}>
                      <Text style={styles.sourcesLabel}>Sources</Text>
                      <View style={styles.sourceChips}>
                        {msg.sources.map((s, i) => (
                          <View key={i} style={styles.chip}>
                            <Ionicons name="document-text-outline" size={11} color="#6c47ff" />
                            <Text style={styles.chipText} numberOfLines={1}>{s}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask anything about your notes..."
          placeholderTextColor="#444"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || loading}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(108,71,255,0.2)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiIconWrap: {
    backgroundColor: 'rgba(108,71,255,0.2)',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(108,71,255,0.4)',
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  headerSub: { color: '#555', fontSize: 12, marginTop: 2 },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 8,
  },

  // Messages
  messageList: { flex: 1 },
  messageListContent: { padding: 16, gap: 16, paddingBottom: 8 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowAI: { justifyContent: 'flex-start' },
  aiBubbleIcon: {
    backgroundColor: 'rgba(108,71,255,0.15)',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(108,71,255,0.3)',
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 18,
    padding: 14,
  },
  bubbleUser: {
    backgroundColor: '#6c47ff',
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderBottomLeftRadius: 4,
  },
  bubbleText: { color: '#e0e0f0', fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },

  // Loading
  loadingDots: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { color: '#a78bfa', fontSize: 14 },

  // Sources
  sourcesWrap: { marginTop: 10, gap: 6 },
  sourcesLabel: { color: '#555', fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  sourceChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(108,71,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(108,71,255,0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 180,
  },
  chipText: { color: '#a78bfa', fontSize: 11, fontWeight: '600', flexShrink: 1 },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    backgroundColor: '#0f0f1a',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(108,71,255,0.3)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    maxHeight: 100,
    outlineWidth: 0,
  } as any,
  sendBtn: {
    backgroundColor: '#6c47ff',
    borderRadius: 14,
    padding: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
