import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebase';
import { subscribeToNotes, deleteNote, updateNote } from '../services/noteService';
import { subscribeToWorkspaceNotes } from '../services/noteService';
import {
  createWorkspace,
  joinWorkspaceByCode,
  generateWorkspaceInviteCode,
  subscribeToUserWorkspaces,
} from '../services/workspaceService';
import { useNoteStore } from '../store/noteStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useResponsive } from '../hooks/useResponsive';
import NoteCard from '../components/NoteCard';
import SkeletonCard from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';
import TemplatePickerModal from '../components/TemplatePickerModal';
import { Note } from '../types/note';
import { Workspace } from '../types/workspace';
import { NoteTemplate } from '../data/templates';

interface Props {
  onNewNote: (template?: NoteTemplate) => void;
  onEditNote: (note: Note) => void;
  onLogout: () => void;
  onOpenChat: (notes: Note[], context: string) => void;
}

type ActiveTab = 'personal' | 'team';

export default function HomeScreen({ onNewNote, onEditNote, onLogout, onOpenChat }: Props) {
  const { notes, searchQuery, setNotes, setSearchQuery, filteredNotes } = useNoteStore();
  const {
    workspaces, activeWorkspace, workspaceNotes, workspaceSearchQuery,
    setWorkspaces, setActiveWorkspace, setWorkspaceNotes, setWorkspaceSearchQuery,
    filteredWorkspaceNotes,
  } = useWorkspaceStore();

  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('personal');
  const [workspacesLoading, setWorkspacesLoading] = useState(false);
  const [workspaceNotesLoading, setWorkspaceNotesLoading] = useState(false);

  // Create workspace modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Join workspace modal
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  // Invite code session
  const [inviteCodeData, setInviteCodeData] = useState<{ code: string; expiresAt: Date } | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [generatingCode, setGeneratingCode] = useState(false);

  const { isMobile, isTablet, numColumns, noteCardWidth, width } = useResponsive();
  const insets = useSafeAreaInsets();

  // Subscribe to personal notes on mount
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

  // Subscribe to user's workspaces when Team tab is active
  useEffect(() => {
    if (activeTab !== 'team') return;
    const user = auth.currentUser;
    if (!user) return;
    setWorkspacesLoading(true);
    const unsub = subscribeToUserWorkspaces(user.uid, (wsList) => {
      setWorkspaces(wsList);
      setWorkspacesLoading(false);
    });
    return unsub;
  }, [activeTab]);

  // Subscribe to workspace notes when a workspace is selected
  useEffect(() => {
    if (!activeWorkspace) {
      setWorkspaceNotes([]);
      return;
    }
    setWorkspaceNotesLoading(true);
    const unsub = subscribeToWorkspaceNotes(activeWorkspace.id, (notes) => {
      setWorkspaceNotes(notes);
      setWorkspaceNotesLoading(false);
    });
    return unsub;
  }, [activeWorkspace?.id]);

  // Countdown ticker for invite code session
  useEffect(() => {
    if (!inviteCodeData) { setCountdown(0); return; }
    const tick = () => {
      const remaining = Math.max(0, Math.floor((inviteCodeData.expiresAt.getTime() - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining === 0) setInviteCodeData(null);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [inviteCodeData]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleGenerateInviteCode = async () => {
    if (!activeWorkspace) return;
    setGeneratingCode(true);
    try {
      const { code, expiresAt } = await generateWorkspaceInviteCode(activeWorkspace.id);
      setInviteCodeData({ code, expiresAt: new Date(expiresAt) });
    } catch {
      Alert.alert('Error', 'Failed to generate invite code. Try again.');
    } finally {
      setGeneratingCode(false);
    }
  };

  const switchTab = (tab: ActiveTab) => {
    if (tab === 'personal') { setActiveWorkspace(null); setInviteCodeData(null); }
    setActiveTab(tab);
  };

  const handleDelete = (note: Note) => {
    deleteNote(note.id);
  };

  const handlePin = (note: Note) => {
    updateNote(note.id, { isPinned: !note.isPinned });
  };

  const handleSelectWorkspace = (ws: Workspace) => {
    setActiveWorkspace(ws);
  };

  const handleBackFromWorkspace = () => {
    setActiveWorkspace(null);
    setWorkspaceSearchQuery('');
    setInviteCodeData(null);
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      Alert.alert('Name required', 'Please enter a workspace name.');
      return;
    }
    setCreateLoading(true);
    try {
      const user = auth.currentUser!;
      const displayName = user.displayName ?? user.email ?? 'Unknown';
      const ws = await createWorkspace(user.uid, displayName, newWorkspaceName.trim());
      setShowCreateModal(false);
      setNewWorkspaceName('');
      setActiveWorkspace(ws);
    } catch {
      Alert.alert('Error', 'Failed to create workspace. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinWorkspace = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Code required', 'Please enter an invite code.');
      return;
    }
    setJoinLoading(true);
    try {
      const user = auth.currentUser!;
      const displayName = user.displayName ?? user.email ?? 'Unknown';
      const ws = await joinWorkspaceByCode(user.uid, displayName, joinCode.trim());
      setShowJoinModal(false);
      setJoinCode('');
      setActiveWorkspace(ws);
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') {
        Alert.alert('Invalid Code', 'No workspace found with that code.');
      } else if (err.message === 'EXPIRED') {
        Alert.alert('Code Expired', 'This invite code has expired. Ask the admin to generate a new one.');
      } else {
        Alert.alert('Error', 'Failed to join workspace. Please try again.');
      }
    } finally {
      setJoinLoading(false);
    }
  };

  const copyCode = (code: string) => {
    if (Platform.OS === 'web') {
      (navigator as any).clipboard?.writeText(code)
        .then(() => Alert.alert('Copied!', `Code "${code}" copied to clipboard.`))
        .catch(() => Alert.alert('Invite Code', code));
    } else {
      Alert.alert('Invite Code', `Share this code with your team:\n\n${code}`);
    }
  };

  // --- Personal notes view ---
  const displayed = filteredNotes();
  const pinnedNotes = displayed.filter((n) => n.isPinned);
  const unpinnedNotes = displayed.filter((n) => !n.isPinned);
  const pinnedCount = notes.filter((n) => n.isPinned).length;

  // --- Workspace notes view ---
  const displayedWsNotes = filteredWorkspaceNotes();
  const pinnedWsNotes = displayedWsNotes.filter((n) => n.isPinned);
  const unpinnedWsNotes = displayedWsNotes.filter((n) => !n.isPinned);

  const renderNoteGrid = (items: Note[], startIndex = 0) => (
    <View style={styles.grid}>
      {items.map((item, index) => (
        <View key={item.id} style={{ width: noteCardWidth }}>
          <NoteCard
            note={item}
            index={startIndex + index}
            onPress={() => onEditNote(item)}
            onPin={() => handlePin(item)}
            onDelete={() => handleDelete(item)}
          />
        </View>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      {/* Background orbs */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />
      <View style={styles.orb3} />

      {/* Decorative corner lines */}
      <View style={styles.cornerTL} pointerEvents="none" />
      <View style={styles.cornerBR} pointerEvents="none" />

      {/* Header */}
      <View style={styles.header}>
        {activeTab === 'team' && activeWorkspace ? (
          <>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={handleBackFromWorkspace} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={20} color="#a78bfa" />
              </TouchableOpacity>
              <View>
                <Text style={styles.appLabel}>✦ TEAM WORKSPACE</Text>
                <Text style={styles.greeting} numberOfLines={1}>{activeWorkspace.name}</Text>
              </View>
            </View>
          </>
        ) : (
          <View>
            <Text style={styles.appLabel}>
              {activeTab === 'team' ? '✦ TEAM WORKSPACES' : '✦ MY WORKSPACE'}
            </Text>
            <Text style={styles.greeting}>
              {activeTab === 'team' ? 'Your Teams' : `Hello, ${userName}`}
            </Text>
          </View>
        )}
        <View style={styles.headerActions}>
          {(activeTab === 'personal' || (activeTab === 'team' && activeWorkspace)) && (
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => {
                const isInsideWorkspace = activeTab === 'team' && activeWorkspace;
                const chatNotes = isInsideWorkspace ? workspaceNotes : notes;
                const context = isInsideWorkspace ? activeWorkspace.name : 'Personal Notes';
                onOpenChat(chatNotes, context);
              }}
            >
              <Ionicons name="sparkles-outline" size={20} color="#a78bfa" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onLogout} style={styles.avatarBtn}>
            <Ionicons name="log-out-outline" size={20} color="#a78bfa" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'personal' && styles.tabBtnActive]}
          onPress={() => switchTab('personal')}
        >
          <Ionicons
            name="person-outline"
            size={14}
            color={activeTab === 'personal' ? '#a78bfa' : '#555'}
          />
          <Text style={[styles.tabBtnText, activeTab === 'personal' && styles.tabBtnTextActive]}>
            Personal
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'team' && styles.tabBtnActive]}
          onPress={() => switchTab('team')}
        >
          <Ionicons
            name="people-outline"
            size={14}
            color={activeTab === 'team' ? '#a78bfa' : '#555'}
          />
          <Text style={[styles.tabBtnText, activeTab === 'team' && styles.tabBtnTextActive]}>
            Team
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── PERSONAL TAB ── */}
      {activeTab === 'personal' && (
        <>
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
            <View style={[styles.searchWrapper, { width: isMobile ? width - 48 : isTablet ? 560 : 660 }]}>
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

          {/* Personal notes list */}
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
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
              {pinnedNotes.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionRow}>
                    <Ionicons name="bookmark" size={13} color="#6c47ff" />
                    <Text style={styles.sectionLabel}>PINNED</Text>
                    <View style={styles.sectionLine} />
                  </View>
                  {renderNoteGrid(pinnedNotes)}
                </View>
              )}
              {unpinnedNotes.length > 0 && (
                <View style={styles.section}>
                  {pinnedNotes.length > 0 && (
                    <View style={styles.sectionRow}>
                      <Ionicons name="document-text-outline" size={13} color="#555" />
                      <Text style={[styles.sectionLabel, { color: '#555' }]}>NOTES</Text>
                      <View style={[styles.sectionLine, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
                    </View>
                  )}
                  {renderNoteGrid(unpinnedNotes, pinnedNotes.length)}
                </View>
              )}
            </ScrollView>
          )}
        </>
      )}

      {/* ── TEAM TAB — workspace list ── */}
      {activeTab === 'team' && !activeWorkspace && (
        <>
          {/* Create / Join buttons */}
          <View style={styles.wsActionRow}>
            <TouchableOpacity style={styles.wsActionBtn} onPress={() => setShowCreateModal(true)}>
              <Ionicons name="add-circle-outline" size={18} color="#a78bfa" />
              <Text style={styles.wsActionBtnText}>Create Workspace</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.wsActionBtn} onPress={() => setShowJoinModal(true)}>
              <Ionicons name="enter-outline" size={18} color="#a78bfa" />
              <Text style={styles.wsActionBtnText}>Join with Code</Text>
            </TouchableOpacity>
          </View>

          {workspacesLoading ? (
            <View style={styles.centerLoader}>
              <ActivityIndicator size="large" color="#6c47ff" />
            </View>
          ) : workspaces.length === 0 ? (
            <View style={styles.wsEmptyState}>
              <Ionicons name="people-outline" size={52} color="rgba(108,71,255,0.25)" />
              <Text style={styles.wsEmptyTitle}>No Workspaces Yet</Text>
              <Text style={styles.wsEmptySubtitle}>Create a workspace or join one with an invite code.</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.wsList}>
              {workspaces.map((ws) => (
                <TouchableOpacity
                  key={ws.id}
                  style={styles.wsCard}
                  onPress={() => handleSelectWorkspace(ws)}
                >
                  <View style={styles.wsCardAccent} />
                  <View style={styles.wsCardBody}>
                    <View style={styles.wsCardHeader}>
                      <View style={styles.wsIconWrap}>
                        <Ionicons name="people" size={22} color="#a78bfa" />
                      </View>
                      <View style={styles.wsCardInfo}>
                        <Text style={styles.wsCardName}>{ws.name}</Text>
                        <Text style={styles.wsCardMeta}>
                          {ws.members.length} member{ws.members.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#444" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </>
      )}

      {/* ── TEAM TAB — workspace notes ── */}
      {activeTab === 'team' && activeWorkspace && (
        <>
          {/* Workspace member count + admin invite button */}
          <View style={styles.wsMembersBar}>
            <Ionicons name="people-outline" size={14} color="#555" />
            <Text style={styles.wsMembersText}>
              {activeWorkspace.members.length} member{activeWorkspace.members.length !== 1 ? 's' : ''}
            </Text>
            {auth.currentUser?.uid === activeWorkspace.createdBy && (
              <TouchableOpacity
                style={styles.inviteBtn}
                onPress={handleGenerateInviteCode}
                disabled={generatingCode}
              >
                {generatingCode ? (
                  <ActivityIndicator size="small" color="#a78bfa" />
                ) : (
                  <>
                    <Ionicons name="link-outline" size={14} color="#a78bfa" />
                    <Text style={styles.inviteBtnText}>Generate Invite</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Invite code panel — shown only after admin generates code */}
          {inviteCodeData && (
            <View style={styles.invitePanel}>
              <View style={styles.invitePanelHeader}>
                <Ionicons name="timer-outline" size={14} color="#a78bfa" />
                <Text style={styles.invitePanelTitle}>Active Invite Code</Text>
                <Text style={[
                  styles.inviteCountdown,
                  countdown <= 30 && styles.inviteCountdownWarning,
                ]}>
                  {formatCountdown(countdown)}
                </Text>
              </View>
              <View style={styles.inviteCodeDisplayRow}>
                <Text style={styles.inviteCodeBig}>{inviteCodeData.code}</Text>
                <TouchableOpacity onPress={() => copyCode(inviteCodeData.code)} style={styles.wsCopyBtn}>
                  <Ionicons name="copy-outline" size={20} color="#6c47ff" />
                </TouchableOpacity>
              </View>
              <Text style={styles.invitePanelHint}>
                Share this code — valid for {formatCountdown(countdown)}
              </Text>
            </View>
          )}

          {/* Search */}
          <View style={styles.searchOuter}>
            <View style={[styles.searchWrapper, { width: isMobile ? width - 48 : isTablet ? 560 : 660 }]}>
              <Ionicons name="search-outline" size={17} color="#6c47ff" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search team notes..."
                placeholderTextColor="#444"
                value={workspaceSearchQuery}
                onChangeText={setWorkspaceSearchQuery}
              />
              {workspaceSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setWorkspaceSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#555" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {workspaceNotesLoading ? (
            <View style={styles.list}>
              {Array.from({ length: 3 }).map((_, i) => (
                <View key={i} style={styles.cardFull}>
                  <SkeletonCard />
                </View>
              ))}
            </View>
          ) : displayedWsNotes.length === 0 ? (
            <View style={styles.wsEmptyState}>
              <Ionicons name="document-text-outline" size={52} color="rgba(108,71,255,0.25)" />
              <Text style={styles.wsEmptyTitle}>No Team Notes Yet</Text>
              <Text style={styles.wsEmptySubtitle}>Tap + to add the first shared note.</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
              {pinnedWsNotes.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionRow}>
                    <Ionicons name="bookmark" size={13} color="#6c47ff" />
                    <Text style={styles.sectionLabel}>PINNED</Text>
                    <View style={styles.sectionLine} />
                  </View>
                  {renderNoteGrid(pinnedWsNotes)}
                </View>
              )}
              {unpinnedWsNotes.length > 0 && (
                <View style={styles.section}>
                  {pinnedWsNotes.length > 0 && (
                    <View style={styles.sectionRow}>
                      <Ionicons name="document-text-outline" size={13} color="#555" />
                      <Text style={[styles.sectionLabel, { color: '#555' }]}>TEAM NOTES</Text>
                      <View style={[styles.sectionLine, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
                    </View>
                  )}
                  {renderNoteGrid(unpinnedWsNotes, pinnedWsNotes.length)}
                </View>
              )}
            </ScrollView>
          )}
        </>
      )}

      {/* FAB — shown on personal tab and inside a workspace */}
      {(activeTab === 'personal' || (activeTab === 'team' && activeWorkspace)) && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowTemplates(true)}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Background watermark */}
      <View style={styles.watermarkWrap} pointerEvents="none">
        <Text style={styles.watermarkSymbol}>✦</Text>
        <Text style={styles.watermarkText}>
          {activeTab === 'team' ? 'TEAM' : 'MY NOTES'}
        </Text>
      </View>

      {/* Template Picker */}
      <TemplatePickerModal
        visible={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={(template) => {
          setShowTemplates(false);
          onNewNote(template);
        }}
      />

      {/* ── CREATE WORKSPACE MODAL ── */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Workspace</Text>
            <Text style={styles.modalSubtitle}>
              A workspace lets your team share and edit notes together.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Workspace name (e.g. PM Team)"
              placeholderTextColor="#555"
              value={newWorkspaceName}
              onChangeText={setNewWorkspaceName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreateWorkspace}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowCreateModal(false); setNewWorkspaceName(''); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, createLoading && styles.modalBtnDisabled]}
                onPress={handleCreateWorkspace}
                disabled={createLoading}
              >
                {createLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.modalConfirmText}>Create</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── JOIN WORKSPACE MODAL ── */}
      <Modal
        visible={showJoinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Join Workspace</Text>
            <Text style={styles.modalSubtitle}>
              Enter the 6-character invite code shared by your team.
            </Text>
            <TextInput
              style={[styles.modalInput, styles.modalInputCode]}
              placeholder="e.g. AB1C2D"
              placeholderTextColor="#555"
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
              autoCapitalize="characters"
              autoFocus
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={handleJoinWorkspace}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowJoinModal(false); setJoinCode(''); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, joinLoading && styles.modalBtnDisabled]}
                onPress={handleJoinWorkspace}
                disabled={joinLoading}
              >
                {joinLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.modalConfirmText}>Join</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a14',
    overflow: 'hidden',
    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
    backgroundSize: '28px 28px',
  } as any,

  // Watermark
  watermarkWrap: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  watermarkSymbol: {
    fontSize: 100, color: 'rgba(108,71,255,0.15)', fontWeight: '900', lineHeight: 100,
  } as any,
  watermarkText: {
    fontSize: 36, color: 'rgba(108,71,255,0.12)', fontWeight: '900', letterSpacing: 18,
  } as any,

  // Decorative corners
  cornerTL: {
    position: 'absolute', top: 36, left: 16, width: 40, height: 40,
    borderTopWidth: 2, borderLeftWidth: 2, borderColor: 'rgba(108,71,255,0.15)', borderRadius: 4,
  },
  cornerBR: {
    position: 'absolute', bottom: 32, left: 16, width: 40, height: 40,
    borderBottomWidth: 2, borderLeftWidth: 2, borderColor: 'rgba(108,71,255,0.1)', borderRadius: 4,
  },

  // Background orbs
  orb1: {
    position: 'absolute', width: 320, height: 320, borderRadius: 160,
    backgroundColor: 'rgba(108,71,255,0.13)', top: -100, right: -80,
  },
  orb2: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(59,130,246,0.09)', bottom: 250, left: -80,
  },
  orb3: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(167,139,250,0.07)', bottom: 60, right: 40,
  },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, marginBottom: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  backBtn: {
    backgroundColor: 'rgba(108,71,255,0.15)', borderRadius: 10, padding: 8,
    borderWidth: 1, borderColor: 'rgba(108,71,255,0.3)',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appLabel: { color: '#6c47ff', fontSize: 13, fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
  greeting: { color: '#fff', fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  avatarBtn: {
    backgroundColor: 'rgba(108,71,255,0.15)', borderRadius: 14, padding: 11,
    borderWidth: 1, borderColor: 'rgba(108,71,255,0.3)',
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row', marginHorizontal: 24, marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    padding: 4,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(108,71,255,0.25)',
    borderWidth: 1, borderColor: 'rgba(108,71,255,0.4)',
  },
  tabBtnText: { color: '#555', fontSize: 14, fontWeight: '600' },
  tabBtnTextActive: { color: '#a78bfa' },

  // Stats
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 24, marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 14, paddingHorizontal: 20,
  },
  statCard: { flex: 1, alignItems: 'center', gap: 2 },
  statNum: { color: '#a78bfa', fontSize: 26, fontWeight: '800' },
  statLabel: {
    color: '#555', fontSize: 13, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase',
  },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.07)' },

  // Search
  searchOuter: { paddingHorizontal: 24, marginBottom: 20, alignItems: 'flex-start' },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, paddingHorizontal: 16,
    borderWidth: 1, borderColor: 'rgba(108,71,255,0.25)',
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1, color: '#fff', fontSize: 17, paddingVertical: 14, outlineWidth: 0,
  } as any,

  // Section label
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionLine: { flex: 1, height: 1, backgroundColor: 'rgba(108,71,255,0.2)' },
  sectionLabel: { color: '#6c47ff', fontSize: 13, fontWeight: '700', letterSpacing: 2 },

  // List
  list: { paddingHorizontal: 24, paddingBottom: 110, gap: 16 },
  section: { gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cardFull: { width: '100%' },

  // FAB
  fab: {
    position: 'absolute', bottom: 36, right: 28,
    backgroundColor: '#6c47ff', width: 62, height: 62, borderRadius: 31,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6c47ff', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7, shadowRadius: 20, elevation: 12,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.4)',
  },

  // Workspace list
  wsActionRow: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginBottom: 16,
  },
  wsActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(108,71,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(108,71,255,0.3)',
    borderRadius: 14, paddingVertical: 13,
  },
  wsActionBtnText: { color: '#a78bfa', fontSize: 14, fontWeight: '600' },
  wsList: { paddingHorizontal: 24, paddingBottom: 110, gap: 12 },
  wsCard: {
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(108,71,255,0.25)',
    backgroundColor: 'rgba(18,18,30,0.95)', overflow: 'hidden',
  },
  wsCardAccent: { height: 2, backgroundColor: '#6c47ff', opacity: 0.7 },
  wsCardBody: { padding: 16, gap: 10 },
  wsCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wsIconWrap: {
    backgroundColor: 'rgba(108,71,255,0.15)',
    borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: 'rgba(108,71,255,0.3)',
  },
  wsCardInfo: { flex: 1 },
  wsCardName: { color: '#f0f0ff', fontSize: 17, fontWeight: '700' },
  wsCardMeta: { color: '#555', fontSize: 13, marginTop: 2 },
  wsCopyBtn: { padding: 4 },

  // Workspace notes header bar
  wsMembersBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, marginBottom: 12,
  },
  wsMembersText: { color: '#555', fontSize: 13, flex: 1 },
  inviteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(108,71,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(108,71,255,0.3)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  inviteBtnText: { color: '#a78bfa', fontSize: 15, fontWeight: '600' },
  invitePanel: {
    marginHorizontal: 24, marginBottom: 12,
    backgroundColor: 'rgba(108,71,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(108,71,255,0.35)',
    borderRadius: 14, padding: 16, gap: 10,
  },
  invitePanelHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  invitePanelTitle: { color: '#a78bfa', fontSize: 13, fontWeight: '600', flex: 1 },
  inviteCountdown: { color: '#a78bfa', fontSize: 14, fontWeight: '800' },
  inviteCountdownWarning: { color: '#ef4444' },
  inviteCodeDisplayRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  inviteCodeBig: {
    color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: 10,
  },
  invitePanelHint: { color: '#555', fontSize: 12 },

  // Empty states
  wsEmptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40,
  },
  wsEmptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  wsEmptySubtitle: { color: '#555', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  centerLoader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modalCard: {
    width: '100%', maxWidth: 420,
    backgroundColor: '#0f0f1a',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(108,71,255,0.3)',
    padding: 24, gap: 16,
  },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  modalSubtitle: { color: '#555', fontSize: 14, lineHeight: 20 },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(108,71,255,0.3)',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    color: '#fff', fontSize: 16, outlineWidth: 0,
  } as any,
  modalInputCode: {
    textAlign: 'center', fontSize: 22, fontWeight: '700', letterSpacing: 6,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalCancelBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 13,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  modalCancelText: { color: '#888', fontSize: 15, fontWeight: '600' },
  modalConfirmBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 13,
    backgroundColor: '#6c47ff', borderRadius: 12,
  },
  modalBtnDisabled: { opacity: 0.5 },
  modalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
