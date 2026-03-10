import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebase';
import { createNote, updateNote, deleteNote } from '../services/noteService';
import { createReminder } from '../services/reminderService';
import { extractTextFromPDF, pickAndReadPDF } from '../services/pdfService';
import { structureNoteFromText } from '../services/groqService';
import { useWorkspaceStore } from '../store/workspaceStore';
import { generateSummary, generateTitle, generateTags, transcribeAudio, transcribeAudioNative, transcribeAudioFile, transcribeAudioFileNative, extractBusinessCard } from '../services/groqService';
import { Note, NOTE_COLORS } from '../types/note';
import RichTextEditor from '../components/RichTextEditor';
import { getCurrentLocation, getNearbyPlaces, searchLocations, LocationResult } from '../services/locationService';

const stripHtml = (html: string) =>
  html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

interface Props {
  note?: Note;
  initialTitle?: string;
  initialContent?: string;
  onBack: () => void;
  isModal?: boolean;
  onColorChange?: (color: string) => void;
}

type AiAction = 'summary' | 'title' | 'tags' | 'transcribe' | 'uploadAudio' | 'scanCard' | 'importPDF' | null;

export default function NoteEditorScreen({ note, initialTitle = '', initialContent = '', onBack, isModal = false, onColorChange }: Props) {
  const [title, setTitle] = useState(note?.title ?? initialTitle);
  const [content, setContent] = useState(note?.content ?? initialContent);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(note?.tags ?? []);
  const [color, setColor] = useState(note?.color ?? NOTE_COLORS[0]);

  // Notify parent of the initial color and every change
  const handleColorChange = (c: string) => {
    setColor(c);
    onColorChange?.(c);
  };

  // Sync initial color to parent on mount
  React.useEffect(() => { onColorChange?.(note?.color ?? NOTE_COLORS[0]); }, []);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState<AiAction>(null);
  const [summary, setSummary] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isNearbyResults, setIsNearbyResults] = useState(false);
  const nearbyCache = useRef<LocationResult[]>([]);
  const searchTimer = useRef<any>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [editorFormats, setEditorFormats] = useState<Record<string, boolean>>({});
  const [editorBlock, setEditorBlock] = useState<string | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [reminderCustomDate, setReminderCustomDate] = useState('');
  const [reminderSaving, setReminderSaving] = useState(false);
  const [pdfBanner, setPdfBanner] = useState('');
  // Mobile native date/time picker state
  const [nativePickerDate, setNativePickerDate] = useState(new Date());
  const [showNativeDatePicker, setShowNativeDatePicker] = useState(false);
  const [showNativeTimePicker, setShowNativeTimePicker] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const insertTextRef = useRef<((text: string) => void) | null>(null);
  const applyFormatRef = useRef<((format: string) => void) | null>(null);
  const fileInputRef = useRef<any>(null);
  const audioFileInputRef = useRef<any>(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const nativeRecordingRef = useRef<any>(null);
  const isEditing = !!note;
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);

  const handleEditorSelectionChange = ({ formats, block }: { formats: Record<string, boolean>; block: string | null }) => {
    setEditorFormats(formats);
    setEditorBlock(block);
  };

  const openLocationPicker = () => {
    setShowLocationPicker(true);
    setLocationSearch('');
    setLocationResults([]);
    setIsNearbyResults(false);
    // Silently fetch nearby places in the background
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          const nearby = await getNearbyPlaces(coords.latitude, coords.longitude);
          nearbyCache.current = nearby;
          // Only show if user hasn't typed anything yet
          setLocationResults((prev) => (prev.length === 0 ? nearby : prev));
          setIsNearbyResults((prev) => (locationSearch === '' ? true : prev));
        },
        () => { /* silent fail — GPS not available */ },
        { timeout: 5000, maximumAge: 300000 }
      );
    }
  };

  const handleLocationSearch = (text: string) => {
    setLocationSearch(text);
    clearTimeout(searchTimer.current);
    if (!text.trim()) {
      setLocationResults(nearbyCache.current);
      setIsNearbyResults(nearbyCache.current.length > 0);
      setSearchLoading(false);
      return;
    }
    if (text.length < 2) return;
    setSearchLoading(true);
    searchTimer.current = setTimeout(async () => {
      const results = await searchLocations(text);
      setLocationResults(results);
      setIsNearbyResults(false);
      setSearchLoading(false);
    }, 400);
  };

  const handleUseGPS = async () => {
    setGpsLoading(true);
    try {
      const loc = await getCurrentLocation();
      closePicker();
      if (Platform.OS === 'web') {
        const sel = window.getSelection();
        sel?.removeAllRanges();
        if (savedSelectionRef.current) sel?.addRange(savedSelectionRef.current);
        const safe = loc.address.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        try {
          document.execCommand(
            'insertHTML', false,
            `<span contenteditable="false" style="display:inline-flex;align-items:center;gap:4px;color:#c4b5fd;background:rgba(108,71,255,0.18);border:1px solid rgba(108,71,255,0.4);padding:2px 10px 2px 6px;border-radius:14px;font-size:14px;white-space:nowrap;user-select:none;">📍 ${safe}</span>&#8203;`
          );
        } catch {
          const s = window.getSelection();
          if (s && s.rangeCount > 0) {
            const range = s.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(`📍 ${loc.address}`));
          }
        }
      } else {
        setContent((prev) => {
          const plain = prev.includes('<') ? stripHtml(prev) : prev;
          return plain ? `${plain}\n📍 ${loc.address}` : `📍 ${loc.address}`;
        });
      }
    } catch (err: any) {
      Alert.alert('Location Error', err.message ?? 'Could not get location. Please allow access.');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleSelectLocation = (result: LocationResult) => {
    closePicker();
    if (Platform.OS === 'web') {
      // Restore cursor position saved when the 📍 button was pressed
      const sel = window.getSelection();
      sel?.removeAllRanges();
      if (savedSelectionRef.current) sel?.addRange(savedSelectionRef.current);
      // Insert a styled inline location chip at the cursor
      const safe = result.address.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      try {
        document.execCommand(
          'insertHTML', false,
          `<span contenteditable="false" style="display:inline-flex;align-items:center;gap:4px;color:#c4b5fd;background:rgba(108,71,255,0.18);border:1px solid rgba(108,71,255,0.4);padding:2px 10px 2px 6px;border-radius:14px;font-size:14px;white-space:nowrap;user-select:none;">📍 ${safe}</span>&#8203;`
        );
      } catch {
        // Fallback: append location text directly
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(`📍 ${result.address}`));
        }
      }
    } else {
      // Mobile: append location as plain text
      setContent((prev) => {
        const plain = prev.includes('<') ? stripHtml(prev) : prev;
        return plain ? `${plain}\n📍 ${result.address}` : `📍 ${result.address}`;
      });
    }
  };

  const closePicker = () => {
    setShowLocationPicker(false);
    setLocationSearch('');
    setLocationResults([]);
    clearTimeout(searchTimer.current);
  };

  const handleSave = async () => {
    if (!title.trim() && !stripHtml(content)) {
      Alert.alert('Empty Note', 'Please add a title or content before saving.');
      return;
    }
    setSaving(true);
    try {
      const user = auth.currentUser!;
      const editorName = user.displayName ?? user.email ?? 'Unknown';
      if (isEditing) {
        const updateData: Parameters<typeof updateNote>[1] = { title, content, tags, color };
        if (note.workspaceId) updateData.lastEditedBy = editorName;
        await updateNote(note.id, updateData);
      } else {
        const wsId = activeWorkspace?.id;
        await createNote(user.uid, {
          title,
          content,
          tags,
          color,
          isPinned: false,
          ...(wsId ? { workspaceId: wsId, lastEditedBy: editorName } : {}),
        });
      }
      onBack();
    } catch {
      Alert.alert('Error', 'Failed to save note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteNote(note!.id);
      onBack();
    } catch {
      Alert.alert('Error', 'Failed to delete note. Please try again.');
    }
  };

  const handleSaveReminder = async (scheduledTime: Date) => {
    const user = auth.currentUser;
    if (!user) return;
    const noteTitle = title.trim() || 'Untitled Note';
    setReminderSaving(true);
    try {
      const isTeam = !!(note?.workspaceId || activeWorkspace);
      await createReminder({
        userId: user.uid,
        noteId: note?.id ?? '',
        noteTitle,
        message: reminderMessage.trim() || `Reminder for: ${noteTitle}`,
        scheduledTime: scheduledTime.toISOString(),
        source: isTeam ? 'team' : 'personal',
        ...(isTeam && (note?.workspaceId || activeWorkspace)
          ? { workspaceName: activeWorkspace?.name ?? 'Team' }
          : {}),
      });
      setShowReminderModal(false);
      setReminderMessage('');
      setReminderCustomDate('');
      Alert.alert('Reminder Set!', `You'll be reminded ${formatReminderLabel(scheduledTime)}.`);
    } catch {
      Alert.alert('Error', 'Failed to set reminder. Please try again.');
    } finally {
      setReminderSaving(false);
    }
  };

  const formatReminderLabel = (d: Date): string => {
    const diff = d.getTime() - Date.now();
    if (diff < 3600000) return `in ${Math.floor(diff / 60000)} minutes`;
    if (diff < 86400000) return `in ${Math.floor(diff / 3600000)} hours`;
    return `on ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getQuickTimes = () => {
    const now = new Date();
    const in1h = new Date(now.getTime() + 3600000);
    const in3h = new Date(now.getTime() + 3 * 3600000);
    const tomorrow9am = new Date(now);
    tomorrow9am.setDate(tomorrow9am.getDate() + 1);
    tomorrow9am.setHours(9, 0, 0, 0);
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(9, 0, 0, 0);
    return [
      { label: 'In 1 hour', date: in1h },
      { label: 'In 3 hours', date: in3h },
      { label: 'Tomorrow 9am', date: tomorrow9am },
      { label: 'Next week', date: nextWeek },
    ];
  };

  const handleAiSummary = async () => {
    if (!stripHtml(content)) {
      Alert.alert('No content', 'Write some content first to summarize.');
      return;
    }
    setAiLoading('summary');
    try {
      const result = await generateSummary(stripHtml(content));
      setSummary(result);
    } catch {
      Alert.alert('AI Error', 'Failed to generate summary. Try again.');
    } finally {
      setAiLoading(null);
    }
  };

  const handleAiTitle = async () => {
    if (!stripHtml(content)) {
      Alert.alert('No content', 'Write some content first to generate a title.');
      return;
    }
    setAiLoading('title');
    try {
      const result = await generateTitle(stripHtml(content));
      setTitle(result);
    } catch {
      Alert.alert('AI Error', 'Failed to generate title. Try again.');
    } finally {
      setAiLoading(null);
    }
  };

  const handleAiTags = async () => {
    if (!stripHtml(content)) {
      Alert.alert('No content', 'Write some content first to generate tags.');
      return;
    }
    setAiLoading('tags');
    try {
      const result = await generateTags(stripHtml(content));
      const merged = [...new Set([...tags, ...result])].slice(0, 5);
      setTags(merged);
    } catch {
      Alert.alert('AI Error', 'Failed to generate tags. Try again.');
    } finally {
      setAiLoading(null);
    }
  };

  const handleImportPDF = async () => {
    setAiLoading('importPDF');
    try {
      const picked = await pickAndReadPDF();
      if (!picked) { setAiLoading(null); return; }

      const rawText = await extractTextFromPDF(picked.buffer);
      if (!rawText || rawText.length < 10 || rawText.startsWith('Could not extract')) {
        if (Platform.OS === 'web') {
          setPdfBanner('✗ No readable text found in this PDF (may be a scanned image).');
          setTimeout(() => setPdfBanner(''), 4000);
        } else {
          Alert.alert('No Text Found', 'This PDF does not contain readable text. It may use compressed or image-based content.');
        }
        return;
      }

      const structured = await structureNoteFromText(rawText, picked.name);
      setTitle(structured.title);
      setTags((prev) => [...new Set([...prev, ...structured.tags])].slice(0, 5));

      if (Platform.OS === 'web' && insertTextRef.current) {
        insertTextRef.current(structured.content);
        // Re-focus editor after insertion so the user can type immediately.
        // Do NOT use Alert.alert here — window.alert() steals focus from
        // the contentEditable and the editor becomes unresponsive.
        setPdfBanner(`✓ "${structured.title}" imported from PDF`);
        setTimeout(() => setPdfBanner(''), 3500);
      } else {
        setContent(structured.content);
        Alert.alert('PDF Imported!', `"${structured.title}" has been created from your PDF.`);
      }
    } catch (err: any) {
      const msg = err?.message ?? 'Could not read the PDF. Please try another file.';
      if (Platform.OS === 'web') {
        setPdfBanner(`✗ ${msg}`);
        setTimeout(() => setPdfBanner(''), 4000);
      } else {
        Alert.alert('Import Failed', msg);
      }
    } finally {
      setAiLoading(null);
    }
  };

  const processScanResult = async (base64: string, mimeType = 'image/jpeg') => {
    setAiLoading('scanCard');
    try {
      const extracted = await extractBusinessCard(base64, mimeType);
      if (!extracted || extracted.trim() === '📇 Business Card') {
        Alert.alert('No Data Found', 'Could not extract any information from the card. Make sure the image is clear and well-lit.');
        return;
      }
      if (Platform.OS === 'web' && insertTextRef.current) {
        // On web the editor is a contentEditable div that ignores value prop changes
        // after initialization — use insertTextRef to write directly into the DOM.
        insertTextRef.current(extracted);
      } else {
        // On mobile the editor is a TextInput driven by the content state.
        setContent((prev) => {
          const plain = prev.includes('<') ? stripHtml(prev) : prev;
          return plain ? `${plain}\n\n${extracted}` : extracted;
        });
      }
    } catch (err: any) {
      Alert.alert('Scan Error', err.message ?? 'Failed to scan card. Try again.');
    } finally {
      setAiLoading(null);
    }
  };

  // Compress image to max 1024px on web using canvas before sending to AI
  const compressImageWeb = (dataUrl: string, mimeType: string): Promise<string> =>
    new Promise((resolve) => {
      const img = new (window as any).Image();
      img.onload = () => {
        const MAX = 1024;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL(mimeType, 0.82).split(',')[1];
        resolve(compressed);
      };
      img.onerror = () => resolve(dataUrl.split(',')[1]);
      img.src = dataUrl;
    });

  const handleScanCard = () => {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }
    // Native: show choice — camera or gallery
    Alert.alert('Scan Business Card', 'Choose an option', [
      {
        text: '📷 Take Photo',
        onPress: () => launchNativePicker('camera'),
      },
      {
        text: '🖼️ Choose from Gallery',
        onPress: () => launchNativePicker('gallery'),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const launchNativePicker = async (source: 'camera' | 'gallery') => {
    try {
      const ImagePicker = require('expo-image-picker');

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Camera access is needed to take a photo.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.85,
          base64: true,
        });
        if (!result.canceled && result.assets[0]?.base64) {
          await processScanResult(result.assets[0].base64, result.assets[0].mimeType ?? 'image/jpeg');
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Photo library access is needed to scan a business card.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.85,
          base64: true,
        });
        if (!result.canceled && result.assets[0]?.base64) {
          await processScanResult(result.assets[0].base64, result.assets[0].mimeType ?? 'image/jpeg');
        }
      }
    } catch (err: any) {
      Alert.alert('Scan Error', err.message ?? 'Could not open image picker.');
    }
  };

  const handleWebFileChange = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    // Reset early so the same file can be re-selected
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataUrl = evt.target?.result as string;
        // Compress to max 1024px to keep payload small for the AI
        const base64 = await compressImageWeb(dataUrl, file.type || 'image/jpeg');
        await processScanResult(base64, file.type || 'image/jpeg');
      } catch (err: any) {
        Alert.alert('Scan Error', err.message ?? 'Failed to read image.');
      }
    };
    reader.onerror = () => Alert.alert('Scan Error', 'Failed to read the image file.');
    reader.readAsDataURL(file);
  };

  const handleUploadAudio = () => {
    if (Platform.OS === 'web') {
      audioFileInputRef.current?.click();
      return;
    }
    // Native: use expo-document-picker
    handleNativeAudioUpload();
  };

  const handleWebAudioUpload = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    e.target.value = '';
    setAiLoading('uploadAudio');
    setUploadProgress('Preparing…');
    try {
      const transcript = await transcribeAudioFile(file, (msg) => setUploadProgress(msg));
      if (transcript) {
        if (insertTextRef.current) {
          insertTextRef.current(transcript);
        } else {
          setContent((prev) => (prev ? `${prev}\n\n${transcript}` : transcript));
        }
      } else {
        Alert.alert('No Speech Found', 'Could not detect any speech in this audio file.');
      }
    } catch (err: any) {
      Alert.alert('Transcription Error', err.message ?? 'Failed to transcribe. Try again.');
    } finally {
      setAiLoading(null);
      setUploadProgress('');
    }
  };

  const handleNativeAudioUpload = async () => {
    try {
      const DocumentPicker = require('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const fileSize = asset.size ?? 0;
      setAiLoading('uploadAudio');
      setUploadProgress('Preparing…');
      try {
        // transcribeAudioFileNative handles any file size via 20 MB byte-range chunks
        const transcript = await transcribeAudioFileNative(
          asset.uri,
          fileSize,
          (msg) => setUploadProgress(msg),
        );
        if (transcript) {
          setContent((prev) => (prev ? `${prev}\n\n${transcript}` : transcript));
        } else {
          Alert.alert('No Speech Found', 'Could not detect any speech in this audio file.');
        }
      } catch (err: any) {
        Alert.alert('Transcription Error', err.message ?? 'Failed to transcribe. Try again.');
      } finally {
        setAiLoading(null);
        setUploadProgress('');
      }
    } catch (err: any) {
      Alert.alert('File Error', err.message ?? 'Could not open file picker.');
    }
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t) && tags.length < 5) setTags([...tags, t]);
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleVoiceRecord = async () => {
    if (Platform.OS !== 'web') {
      // Native: use expo-av
      if (isRecording) {
        try {
          await nativeRecordingRef.current?.stopAndUnloadAsync();
          const uri = nativeRecordingRef.current?.getURI();
          nativeRecordingRef.current = null;
          setIsRecording(false);
          if (uri) {
            setAiLoading('transcribe');
            try {
              const transcript = await transcribeAudioNative(uri);
              if (transcript) {
                setContent((prev) => (prev ? `${prev}\n${transcript}` : transcript));
              }
            } catch (err: any) {
              Alert.alert('Transcription Error', err.message ?? 'Failed to transcribe audio. Try again.');
            } finally {
              setAiLoading(null);
            }
          }
        } catch {
          setIsRecording(false);
        }
        return;
      }
      try {
        const { Audio } = require('expo-av');
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          Alert.alert('Permission required', 'Microphone access is needed for voice recording.');
          return;
        }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        nativeRecordingRef.current = recording;
        setIsRecording(true);
      } catch {
        Alert.alert('Microphone Error', 'Could not access microphone. Please grant permission.');
      }
      return;
    }

    // Web: MediaRecorder
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await (navigator as any).mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new (window as any).MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e: any) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t: any) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAiLoading('transcribe');
        try {
          const transcript = await transcribeAudio(audioBlob);
          if (transcript) {
            if (insertTextRef.current) {
              insertTextRef.current(transcript);
            } else {
              setContent((prev) => (prev ? `${prev}\n${transcript}` : transcript));
            }
          }
        } catch (err: any) {
          Alert.alert('Transcription Error', err.message ?? 'Failed to transcribe audio. Try again.');
        } finally {
          setAiLoading(null);
        }
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      Alert.alert('Microphone Error', 'Could not access microphone. Please grant permission.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, isModal && styles.containerModal]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Bar */}
      <View style={[styles.topBar, isModal && styles.topBarModal]}>
        <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
          <Ionicons name={isModal ? 'close' : 'arrow-back'} size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.topTitleRow}>
          <Text style={styles.topTitle}>{isEditing ? 'Edit Note' : 'New Note'}</Text>
          {(note?.workspaceId || (!isEditing && activeWorkspace)) && (
            <View style={styles.teamBadge}>
              <Ionicons name="people-outline" size={12} color="#a78bfa" />
              <Text style={styles.teamBadgeText}>Team</Text>
            </View>
          )}
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity onPress={() => setShowReminderModal(true)} style={styles.iconBtn}>
            <Ionicons name="alarm-outline" size={20} color="#a78bfa" />
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

      {note?.workspaceId && note?.lastEditedBy ? (
        <View style={styles.lastEditedBar}>
          <Ionicons name="pencil-outline" size={12} color="#555" />
          <Text style={styles.lastEditedText}>Last edited by {note.lastEditedBy}</Text>
        </View>
      ) : null}

      {/* PDF import success/error banner — non-blocking, no focus steal */}
      {pdfBanner ? (
        <View style={[styles.pdfBanner, pdfBanner.startsWith('✗') && styles.pdfBannerError]}>
          <Text style={[styles.pdfBannerText, pdfBanner.startsWith('✗') && styles.pdfBannerTextError]}>
            {pdfBanner}
          </Text>
        </View>
      ) : null}

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
                onPress={() => handleColorChange(c)}
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

            <TouchableOpacity
              style={styles.aiBtn}
              onPress={handleScanCard}
              disabled={!!aiLoading}
            >
              {aiLoading === 'scanCard' ? (
                <ActivityIndicator size="small" color="#6c47ff" />
              ) : (
                <Text style={styles.aiBtnText}>📇 Scan Card</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.aiBtn, styles.aiBtnPDF]}
              onPress={handleImportPDF}
              disabled={!!aiLoading}
            >
              {aiLoading === 'importPDF' ? (
                <ActivityIndicator size="small" color="#f59e0b" />
              ) : (
                <Text style={[styles.aiBtnText, { color: '#f59e0b' }]}>📄 Import PDF</Text>
              )}
            </TouchableOpacity>

          </View>
        </View>

        {/* Hidden file input for web card scanning */}
        {Platform.OS === 'web' && React.createElement('input', {
          ref: fileInputRef,
          type: 'file',
          accept: 'image/*',
          style: { display: 'none' },
          onChange: handleWebFileChange,
        })}

        {/* Hidden file input for web audio upload */}
        {Platform.OS === 'web' && React.createElement('input', {
          ref: audioFileInputRef,
          type: 'file',
          accept: 'audio/*',
          style: { display: 'none' },
          onChange: handleWebAudioUpload,
        })}

        {/* Voice + Formatting toolbar row */}
        <View style={styles.toolbarRow}>
          {/* Voice button */}
          <TouchableOpacity
            style={[styles.voiceBtn, isRecording && styles.voiceBtnRecording]}
            onPress={handleVoiceRecord}
            disabled={aiLoading === 'transcribe'}
          >
            {aiLoading === 'transcribe' ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.voiceBtnText}>Transcribing...</Text>
              </>
            ) : isRecording ? (
              <>
                <Ionicons name="stop-circle" size={18} color="#fff" />
                <Text style={styles.voiceBtnText}>Stop</Text>
              </>
            ) : (
              <Ionicons name="mic" size={18} color="#a78bfa" />
            )}
          </TouchableOpacity>

          {/* Upload Audio button */}
          <TouchableOpacity
            style={[styles.voiceBtn, aiLoading === 'uploadAudio' && styles.voiceBtnRecording]}
            onPress={handleUploadAudio}
            disabled={!!aiLoading || isRecording}
          >
            {aiLoading === 'uploadAudio' ? (
              <ActivityIndicator size="small" color="#a78bfa" />
            ) : (
              <Ionicons name="cloud-upload-outline" size={18} color="#a78bfa" />
            )}
          </TouchableOpacity>

          {/* Formatting toolbar — web */}
          {Platform.OS === 'web' && (() => {
            const btn = (label: string, isActive: boolean, onMouseDown: (e: any) => void, extra: object = {}) =>
              React.createElement('button', {
                onMouseDown,
                style: {
                  background: isActive ? 'rgba(108,71,255,0.35)' : 'rgba(108,71,255,0.08)',
                  border: `1px solid ${isActive ? 'rgba(108,71,255,0.65)' : 'rgba(108,71,255,0.28)'}`,
                  borderRadius: '6px',
                  color: '#a78bfa',
                  cursor: 'pointer',
                  padding: '5px 10px',
                  fontSize: '13px',
                  lineHeight: '1.2',
                  fontFamily: 'inherit',
                  minWidth: '30px',
                  ...extra,
                },
              }, label);

            const sep = () => React.createElement('div', {
              style: { width: '1px', height: '20px', background: 'rgba(108,71,255,0.25)', margin: '0 2px' },
            });

            return React.createElement(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' } },
              btn('B', !!editorFormats['bold'], (e) => { e.preventDefault(); try { document.execCommand('bold', false, undefined); } catch {} }, { fontWeight: 'bold' }),
              btn('I', !!editorFormats['italic'], (e) => { e.preventDefault(); try { document.execCommand('italic', false, undefined); } catch {} }, { fontStyle: 'italic' }),
              btn('U', !!editorFormats['underline'], (e) => { e.preventDefault(); try { document.execCommand('underline', false, undefined); } catch {} }, { textDecoration: 'underline' }),
              btn('S', !!editorFormats['strikeThrough'], (e) => { e.preventDefault(); try { document.execCommand('strikeThrough', false, undefined); } catch {} }, { textDecoration: 'line-through' }),
              sep(),
              btn('H1', editorBlock === 'H1', (e) => { e.preventDefault(); try { document.execCommand('formatBlock', false, editorBlock === 'H1' ? 'P' : 'H1'); } catch {} setEditorBlock(editorBlock === 'H1' ? null : 'H1'); }, { fontWeight: 'bold', fontSize: '15px' }),
              btn('H2', editorBlock === 'H2', (e) => { e.preventDefault(); try { document.execCommand('formatBlock', false, editorBlock === 'H2' ? 'P' : 'H2'); } catch {} setEditorBlock(editorBlock === 'H2' ? null : 'H2'); }, { fontWeight: 'bold', fontSize: '13px' }),
              sep(),
              btn('📍', showLocationPicker, (e) => {
                e.preventDefault();
                const sel = window.getSelection();
                if (sel && sel.rangeCount > 0) savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
                openLocationPicker();
              }),
            );
          })()}

          {/* Formatting toolbar — mobile */}
          {Platform.OS !== 'web' && (
            <View style={styles.mobileToolbar}>
              {([
                { label: 'B', format: 'bold', extra: { fontWeight: '700' as const } },
                { label: 'I', format: 'italic', extra: { fontStyle: 'italic' as const } },
                { label: 'U', format: 'underline', extra: { textDecorationLine: 'underline' as const } },
                { label: 'S', format: 'strikeThrough', extra: { textDecorationLine: 'line-through' as const } },
              ] as const).map(({ label, format, extra }) => (
                <TouchableOpacity
                  key={format}
                  style={styles.mobileToolbarBtn}
                  onPress={() => applyFormatRef.current?.(format)}
                >
                  <Text style={[styles.mobileToolbarBtnText, extra]}>{label}</Text>
                </TouchableOpacity>
              ))}
              <View style={styles.mobileToolbarSep} />
              <TouchableOpacity style={styles.mobileToolbarBtn} onPress={() => applyFormatRef.current?.('h1')}>
                <Text style={[styles.mobileToolbarBtnText, { fontWeight: '700', fontSize: 15 }]}>H1</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mobileToolbarBtn} onPress={() => applyFormatRef.current?.('h2')}>
                <Text style={[styles.mobileToolbarBtnText, { fontWeight: '700', fontSize: 13 }]}>H2</Text>
              </TouchableOpacity>
              <View style={styles.mobileToolbarSep} />
              <TouchableOpacity style={styles.mobileToolbarBtn} onPress={openLocationPicker}>
                <Text style={styles.mobileToolbarBtnText}>📍</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Upload progress indicator */}
        {aiLoading === 'uploadAudio' && uploadProgress ? (
          <Text style={styles.uploadProgressText}>{uploadProgress}</Text>
        ) : null}

        {/* Location picker — appears inline when 📍 button is pressed */}
        {showLocationPicker && (
          <View style={styles.locationPicker}>
            <View style={styles.locationSearchRow}>
              <Ionicons name="search-outline" size={15} color="#555" />
              <TextInput
                style={styles.locationSearchInput}
                placeholder="Search any location..."
                placeholderTextColor="#555"
                value={locationSearch}
                onChangeText={handleLocationSearch}
                autoFocus
              />
              <TouchableOpacity onPress={handleUseGPS} style={styles.locationGpsBtn} disabled={gpsLoading}>
                {gpsLoading
                  ? <ActivityIndicator size="small" color="#6c47ff" />
                  : <Ionicons name="locate-outline" size={18} color="#a78bfa" />
                }
              </TouchableOpacity>
            </View>

            {locationResults.length > 0 && (
              <Text style={styles.locationResultsLabel}>
                {isNearbyResults ? 'NEARBY' : 'RESULTS'}
              </Text>
            )}

            {searchLoading && (
              <View style={styles.locationSpinner}>
                <ActivityIndicator size="small" color="#6c47ff" />
              </View>
            )}

            {!searchLoading && locationResults.map((result, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.locationResultItem, i === locationResults.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => handleSelectLocation(result)}
              >
                <Ionicons name={isNearbyResults ? 'location-outline' : 'navigate-outline'} size={14} color="#6c47ff" />
                <Text style={styles.locationResultText} numberOfLines={2}>{result.address}</Text>
              </TouchableOpacity>
            ))}

            {!searchLoading && locationSearch.length >= 2 && locationResults.length === 0 && (
              <Text style={styles.locationNoResults}>No results found</Text>
            )}

            <TouchableOpacity style={styles.locationCancelBtn} onPress={closePicker}>
              <Text style={styles.locationCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

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

        {/* Title */}
        <TextInput
          style={styles.titleInput}
          placeholder="Note title..."
          placeholderTextColor="#444"
          value={title}
          onChangeText={setTitle}
          multiline
        />

        {/* Content Editor */}
        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder="Start writing..."
          insertTextRef={insertTextRef}
          onSelectionChange={handleEditorSelectionChange}
          applyFormatRef={applyFormatRef}
        />

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

      {/* ── Reminder Modal ── */}
      <Modal
        visible={showReminderModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReminderModal(false)}
      >
        <TouchableOpacity
          style={reminderStyles.backdrop}
          activeOpacity={1}
          onPress={() => setShowReminderModal(false)}
        />
        <View style={reminderStyles.sheet}>
          <View style={reminderStyles.handle} />

          <View style={reminderStyles.sheetHeader}>
            <Ionicons name="alarm-outline" size={20} color="#a78bfa" />
            <Text style={reminderStyles.sheetTitle}>Set Reminder</Text>
          </View>

          {/* Quick presets */}
          <Text style={reminderStyles.sectionLabel}>QUICK SELECT</Text>
          <View style={reminderStyles.quickRow}>
            {getQuickTimes().map((q) => (
              <TouchableOpacity
                key={q.label}
                style={reminderStyles.quickBtn}
                onPress={() => handleSaveReminder(q.date)}
                disabled={reminderSaving}
              >
                <Text style={reminderStyles.quickBtnText}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom date/time */}
          <Text style={reminderStyles.sectionLabel}>CUSTOM DATE & TIME</Text>
          {Platform.OS === 'web' ? (
            <>
              {React.createElement('input', {
                type: 'datetime-local',
                value: reminderCustomDate,
                min: new Date(Date.now() + 60000).toISOString().slice(0, 16),
                onChange: (e: any) => setReminderCustomDate(e.target.value),
                style: {
                  backgroundColor: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(108,71,255,0.3)',
                  borderRadius: 10, color: '#fff',
                  padding: '12px 14px', fontSize: 14,
                  width: '100%', marginBottom: 12,
                  colorScheme: 'dark',
                },
              })}
              {reminderCustomDate ? (
                <TouchableOpacity
                  style={[reminderStyles.setBtn, reminderSaving && { opacity: 0.6 }]}
                  onPress={() => {
                    const d = new Date(reminderCustomDate);
                    if (isNaN(d.getTime()) || d <= new Date()) {
                      Alert.alert('Invalid Date', 'Please pick a future date and time.');
                      return;
                    }
                    handleSaveReminder(d);
                  }}
                  disabled={reminderSaving}
                >
                  {reminderSaving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={reminderStyles.setBtnText}>Set Custom Reminder</Text>
                  )}
                </TouchableOpacity>
              ) : null}
            </>
          ) : (
            /* Mobile: native date + time picker */
            <>
              <View style={reminderStyles.nativePickerRow}>
                <TouchableOpacity
                  style={reminderStyles.nativePickerBtn}
                  onPress={() => { setShowNativeDatePicker(true); setShowNativeTimePicker(false); }}
                >
                  <Ionicons name="calendar-outline" size={16} color="#a78bfa" />
                  <Text style={reminderStyles.nativePickerBtnText}>
                    {nativePickerDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={reminderStyles.nativePickerBtn}
                  onPress={() => { setShowNativeTimePicker(true); setShowNativeDatePicker(false); }}
                >
                  <Ionicons name="time-outline" size={16} color="#a78bfa" />
                  <Text style={reminderStyles.nativePickerBtnText}>
                    {nativePickerDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              </View>

              {showNativeDatePicker && (() => {
                try {
                  const DateTimePicker = require('@react-native-community/datetimepicker').default;
                  return (
                    <DateTimePicker
                      value={nativePickerDate}
                      mode="date"
                      minimumDate={new Date()}
                      display="default"
                      onChange={(_: any, selected?: Date) => {
                        setShowNativeDatePicker(false);
                        if (selected) setNativePickerDate(selected);
                      }}
                    />
                  );
                } catch { return null; }
              })()}

              {showNativeTimePicker && (() => {
                try {
                  const DateTimePicker = require('@react-native-community/datetimepicker').default;
                  return (
                    <DateTimePicker
                      value={nativePickerDate}
                      mode="time"
                      display="default"
                      onChange={(_: any, selected?: Date) => {
                        setShowNativeTimePicker(false);
                        if (selected) {
                          const merged = new Date(nativePickerDate);
                          merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
                          setNativePickerDate(merged);
                        }
                      }}
                    />
                  );
                } catch { return null; }
              })()}

              <TouchableOpacity
                style={[reminderStyles.setBtn, reminderSaving && { opacity: 0.6 }]}
                onPress={() => {
                  if (nativePickerDate <= new Date()) {
                    Alert.alert('Invalid Time', 'Please pick a future date and time.');
                    return;
                  }
                  handleSaveReminder(nativePickerDate);
                }}
                disabled={reminderSaving}
              >
                {reminderSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={reminderStyles.setBtnText}>Set Custom Reminder</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Optional message */}
          <Text style={reminderStyles.sectionLabel}>NOTE (OPTIONAL)</Text>
          <TextInput
            style={reminderStyles.msgInput}
            placeholder="e.g. Review before the meeting"
            placeholderTextColor="#555"
            value={reminderMessage}
            onChangeText={setReminderMessage}
            multiline
          />

          <TouchableOpacity
            style={reminderStyles.cancelBtn}
            onPress={() => { setShowReminderModal(false); setReminderMessage(''); setReminderCustomDate(''); }}
          >
            <Text style={reminderStyles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const reminderStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#12121f',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: 'rgba(108,71,255,0.25)',
    padding: 24, paddingBottom: 36,
  },
  handle: {
    width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#f0f0ff' },
  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: '#555', letterSpacing: 1.2,
    marginBottom: 10,
  },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  quickBtn: {
    backgroundColor: 'rgba(108,71,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(108,71,255,0.3)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  quickBtnText: { color: '#a78bfa', fontSize: 14, fontWeight: '500' },
  customInput: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(108,71,255,0.3)',
    borderRadius: 10, color: '#fff', fontSize: 14,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  nativePickerRow: {
    flexDirection: 'row', gap: 10, marginBottom: 14,
  },
  nativePickerBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(108,71,255,0.3)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
  },
  nativePickerBtnText: { color: '#a78bfa', fontSize: 13, fontWeight: '500', flex: 1 },
  setBtn: {
    backgroundColor: '#6c47ff', borderRadius: 12,
    paddingVertical: 13, alignItems: 'center', marginBottom: 20,
  },
  setBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  msgInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10, color: '#ccc', fontSize: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    minHeight: 60, marginBottom: 16,
  },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelBtnText: { color: '#666', fontSize: 14 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a', paddingTop: 56 },
  containerModal: { paddingTop: 0 },
  topBarModal: { paddingTop: 16 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  iconBtn: { padding: 6 },
  topTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  teamBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(108,71,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(108,71,255,0.4)',
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
  },
  teamBadgeText: { color: '#a78bfa', fontSize: 11, fontWeight: '600' },
  lastEditedBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  lastEditedText: { color: '#555', fontSize: 12 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveBtn: {
    backgroundColor: '#6c47ff', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: {
    color: '#666', fontSize: 12, fontWeight: '600',
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
  aiBtnText: { color: '#a78bfa', fontSize: 13, fontWeight: '600' },
  aiBtnPDF: { borderColor: 'rgba(245,158,11,0.35)', backgroundColor: 'rgba(245,158,11,0.08)' },
  pdfBanner: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(16,185,129,0.25)',
    paddingHorizontal: 20, paddingVertical: 8,
  },
  pdfBannerError: {
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderBottomColor: 'rgba(255,107,107,0.25)',
  },
  pdfBannerText: { color: '#34d399', fontSize: 13, fontWeight: '500' },
  pdfBannerTextError: { color: '#ff6b6b' },
  summaryBox: {
    backgroundColor: 'rgba(108,71,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(108,71,255,0.2)',
    borderRadius: 12, padding: 14, gap: 8,
  },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: '#a78bfa', fontSize: 13, fontWeight: '600' },
  summaryText: { color: '#ccc', fontSize: 15, lineHeight: 24 },
  titleInput: {
    color: '#fff', fontSize: 26, fontWeight: '700',
    lineHeight: 34, outlineWidth: 0,
  } as any,
  tagSection: { gap: 10 },
  tagInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12,
  },
  tagInput: {
    flex: 1, color: '#fff', fontSize: 15,
    paddingVertical: 10, outlineWidth: 0,
  } as any,
  tagAddBtn: { padding: 4 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(108,71,255,0.2)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  tagChipText: { color: '#a78bfa', fontSize: 14 },
  locationPicker: {
    backgroundColor: 'rgba(18,18,30,0.98)',
    borderWidth: 1, borderColor: 'rgba(108,71,255,0.3)',
    borderRadius: 14, overflow: 'hidden',
  },
  locationSearchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 4,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  locationSearchInput: {
    flex: 1, color: '#fff', fontSize: 15,
    paddingVertical: 12, outlineWidth: 0,
  } as any,
  locationGpsBtn: { padding: 6 },
  locationResultsLabel: {
    color: '#555', fontSize: 11, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase',
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4,
  },
  locationSpinner: { padding: 14, alignItems: 'center' },
  locationResultItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  locationResultText: { color: '#ccc', fontSize: 13, flex: 1, lineHeight: 20 },
  locationNoResults: {
    color: '#555', fontSize: 13, textAlign: 'center',
    paddingVertical: 16,
  },
  locationCancelBtn: {
    alignItems: 'center', paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  locationCancelText: { color: '#666', fontSize: 14 },
  toolbarRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap',
  },
  voiceBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(108,71,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(108,71,255,0.3)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
  },
  voiceBtnRecording: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderColor: 'rgba(239,68,68,0.5)',
  },
  voiceBtnText: { color: '#a78bfa', fontSize: 13, fontWeight: '600' },
  mobileToolbar: {
    flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap',
  },
  mobileToolbarBtn: {
    backgroundColor: 'rgba(108,71,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(108,71,255,0.28)',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5,
    minWidth: 30, alignItems: 'center',
  },
  mobileToolbarBtnText: { color: '#a78bfa', fontSize: 13 },
  mobileToolbarSep: {
    width: 1, height: 20, backgroundColor: 'rgba(108,71,255,0.25)', marginHorizontal: 2,
  },
  uploadProgressText: {
    color: '#a78bfa',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: -8,
  },

});
