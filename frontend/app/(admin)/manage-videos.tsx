import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, TextInput, Modal, RefreshControl
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL, AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import AnimatedPopup from '../../components/AnimatedPopup';
import ConfirmModal from '../../components/ConfirmModal';

const jlptLevels = ['N5', 'N4', 'N3', 'N2', 'N1'];
const sections = ['Kanji', 'Vocabulary'];

export default function ManageVideosScreen() {
  const { user } = useContext(AuthContext);
  const { colors, isDark } = useTheme();
  const s = makeStyles(colors, isDark);

  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterLevel, setFilterLevel] = useState('');
  const [filterSection, setFilterSection] = useState('');

  // Edit modal
  const [editModal, setEditModal] = useState(false);
  const [editVideo, setEditVideo] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editLevel, setEditLevel] = useState('N5');
  const [editSection, setEditSection] = useState('Kanji');
  const [editOrder, setEditOrder] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  // Popup
  const [popup, setPopup] = useState({ visible: false, type: 'success' as 'success' | 'error', title: '', message: '' });

  // Double-click prevention
  const busyRef = useRef(false);

  const fetchVideos = useCallback(async () => {
    try {
      let url = `${API_URL}/videos?`;
      if (filterLevel) url += `level=${filterLevel}&`;
      if (filterSection) url += `section=${filterSection}&`;
      const res = await axios.get(url);
      setVideos(res.data);
    } catch (err) {
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterLevel, filterSection]);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  const onRefresh = () => { setRefreshing(true); fetchVideos(); };

  // --- Edit ---
  const openEdit = (video: any) => {
    setEditVideo(video);
    setEditTitle(video.title);
    setEditDesc(video.description || '');
    setEditLevel(video.jlptLevel);
    setEditSection(video.section);
    setEditOrder(String(video.order));
    setEditModal(true);
  };

  const saveEdit = async () => {
    if (!editTitle.trim()) {
      setPopup({ visible: true, type: 'error', title: 'エラー', message: 'Title is required' });
      return;
    }
    if (saving) return; // prevent double-click
    setSaving(true);

    const sectionChanged = editLevel !== editVideo.jlptLevel || editSection !== editVideo.section;
    const oldLevel = editVideo.jlptLevel;
    const oldSection = editVideo.section;

    // Optimistic state update for instant UI response
    setVideos(prev => {
      let next = [...prev];
      if (sectionChanged) {
        next = next.filter(v => v._id !== editVideo._id);
        const oldGroup = next.filter(v => v.jlptLevel === oldLevel && v.section === oldSection).sort((a, b) => a.order - b.order);
        oldGroup.forEach((v, i) => { v.order = i + 1; });

        const newGroup = next.filter(v => v.jlptLevel === editLevel && v.section === editSection);
        const newOrder = parseInt(editOrder) || (newGroup.length + 1);

        next.push({
          ...editVideo,
          title: editTitle,
          description: editDesc,
          jlptLevel: editLevel,
          section: editSection,
          order: newOrder
        });
      } else {
        next = next.map(v => v._id === editVideo._id ? {
          ...v,
          title: editTitle,
          description: editDesc,
          order: parseInt(editOrder) || v.order
        } : v);
      }
      return next;
    });

    setEditModal(false);

    try {
      const res = await axios.put(`${API_URL}/videos/${editVideo._id}`, {
        title: editTitle, description: editDesc,
        jlptLevel: editLevel, section: editSection, order: parseInt(editOrder) || undefined
      });
      // Replace optimistic entry with backend absolute truth silently
      setVideos(prev => prev.map(v => v._id === editVideo._id ? res.data : v));
      
      if (sectionChanged) {
        // Silently fetch in background to ensure total consistency for other shifted videos
        fetchVideos();
      }
      setPopup({ visible: true, type: 'success', title: '成功', message: 'Video updated successfully!' });
    } catch (err: any) {
      fetchVideos(); // rollback
      setPopup({ visible: true, type: 'error', title: '失敗', message: err.response?.data?.msg || 'Update failed' });
    } finally { setSaving(false); }
  };

  // --- Delete ---
  const confirmDelete = (video: any) => { setDeleteTarget(video); setDeleteConfirm(true); };

  const executeDelete = async () => {
    if (deleting) return;
    setDeleteConfirm(false);
    setDeleting(true);
    const targetId = deleteTarget._id;
    const targetTitle = deleteTarget.title;
    const targetLevel = deleteTarget.jlptLevel;
    const targetSection = deleteTarget.section;

    // Optimistic: remove from UI instantly and normalize remaining visually
    setVideos(prev => {
      const filtered = prev.filter(v => v._id !== targetId);
      const group = filtered.filter(v => v.jlptLevel === targetLevel && v.section === targetSection).sort((a,b) => a.order - b.order);
      group.forEach((v, i) => { v.order = i + 1; });
      return filtered;
    });

    try {
      await axios.delete(`${API_URL}/videos/${targetId}`);
      setPopup({ visible: true, type: 'success', title: '削除完了', message: `"${targetTitle}" deleted successfully.` });
    } catch (err: any) {
      // Rollback: re-add video on failure
      fetchVideos();
      setPopup({ visible: true, type: 'error', title: '失敗', message: err.response?.data?.msg || 'Delete failed' });
    } finally { setDeleting(false); setDeleteTarget(null); }
  };

  // --- Reorder ---
  const moveVideo = async (video: any, direction: 'up' | 'down') => {
    if (busyRef.current) return; // prevent rapid clicks
    busyRef.current = true;

    const sameGroup = videos
      .filter(v => v.jlptLevel === video.jlptLevel && v.section === video.section)
      .sort((a, b) => a.order - b.order);
    const idx = sameGroup.findIndex(v => v._id === video._id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sameGroup.length) { busyRef.current = false; return; }

    const myOrder = sameGroup[idx].order;
    const theirOrder = sameGroup[swapIdx].order;

    // Optimistic UI: swap orders instantly
    setVideos(prev => prev.map(v => {
      if (v._id === sameGroup[idx]._id) return { ...v, order: theirOrder };
      if (v._id === sameGroup[swapIdx]._id) return { ...v, order: myOrder };
      return v;
    }));

    try {
      await axios.put(`${API_URL}/videos/reorder/batch`, {
        updates: [
          { id: sameGroup[idx]._id, order: theirOrder },
          { id: sameGroup[swapIdx]._id, order: myOrder }
        ]
      });
    } catch (err) {
      // Rollback on failure
      fetchVideos();
      setPopup({ visible: true, type: 'error', title: 'エラー', message: 'Reorder failed' });
    } finally {
      setTimeout(() => { busyRef.current = false; }, 200); // 200ms debounce
    }
  };

  // Group videos by level+section (sorted)
  const sortedVideos = [...videos].sort((a, b) => {
    if (a.jlptLevel !== b.jlptLevel) return a.jlptLevel < b.jlptLevel ? -1 : 1;
    if (a.section !== b.section) return a.section < b.section ? -1 : 1;
    return a.order - b.order;
  });

  const grouped: Record<string, any[]> = {};
  sortedVideos.forEach(v => {
    const key = `${v.jlptLevel} — ${v.section}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(v);
  });

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <AnimatedPopup visible={popup.visible} type={popup.type} title={popup.title} message={popup.message} onClose={() => setPopup(p => ({ ...p, visible: false }))} />

      <ScrollView contentContainerStyle={s.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {/* Header */}
        <View style={s.pageHeader}>
          <Text style={[s.pageKanji, { color: colors.primary }]}>動画管理</Text>
          <Text style={[s.pageTitle, { color: colors.text }]}>Manage Videos</Text>
          <Text style={[s.pageSubtitle, { color: colors.textSecondary }]}>{videos.length} videos total</Text>
        </View>

        {/* Filters */}
        <View style={[s.filterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.filterLabel, { color: colors.textSecondary }]}>Filter by Level</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            <TouchableOpacity style={[s.filterChip, !filterLevel && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setFilterLevel('')}>
              <Text style={[s.filterChipText, !filterLevel && { color: '#fff' }]}>All</Text>
            </TouchableOpacity>
            {jlptLevels.map(lvl => (
              <TouchableOpacity key={lvl} style={[s.filterChip, { borderColor: colors.border }, filterLevel === lvl && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setFilterLevel(filterLevel === lvl ? '' : lvl)}>
                <Text style={[s.filterChipText, { color: colors.textSecondary }, filterLevel === lvl && { color: '#fff' }]}>{lvl}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={[s.filterLabel, { color: colors.textSecondary }]}>Filter by Section</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[s.filterChip, !filterSection && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setFilterSection('')}>
              <Text style={[s.filterChipText, !filterSection && { color: '#fff' }]}>All</Text>
            </TouchableOpacity>
            {sections.map(sec => (
              <TouchableOpacity key={sec} style={[s.filterChip, { borderColor: colors.border }, filterSection === sec && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setFilterSection(filterSection === sec ? '' : sec)}>
                <Text style={[s.filterChipText, { color: colors.textSecondary }, filterSection === sec && { color: '#fff' }]}>{sec}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Video Groups */}
        {Object.keys(grouped).length === 0 ? (
          <View style={s.emptyState}>
            <FontAwesome name="film" size={60} color={colors.textSecondary} style={{ opacity: 0.3 }} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>No videos found</Text>
          </View>
        ) : (
          Object.entries(grouped).map(([groupKey, groupVideos]) => (
            <View key={groupKey} style={[s.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={s.groupHeader}>
                <FontAwesome name="folder-open" size={16} color={colors.primary} />
                <Text style={[s.groupTitle, { color: colors.text }]}>{groupKey}</Text>
                <View style={[s.countBadge, { backgroundColor: `${colors.primary}20` }]}>
                  <Text style={[s.countText, { color: colors.primary }]}>{groupVideos.length}</Text>
                </View>
              </View>

              {groupVideos.map((video, idx) => (
                <View key={video._id} style={[s.videoItem, { borderColor: colors.border }]}>
                  <View style={s.videoInfo}>
                    <View style={[s.orderBadge, { backgroundColor: `${colors.primary}15` }]}>
                      <Text style={[s.orderText, { color: colors.primary }]}>#{video.order}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.videoTitle, { color: colors.text }]} numberOfLines={1}>{video.title}</Text>
                      {video.description ? <Text style={[s.videoDesc, { color: colors.textSecondary }]} numberOfLines={1}>{video.description}</Text> : null}
                    </View>
                  </View>

                  <View style={s.actionRow}>
                    <TouchableOpacity style={[s.actionBtn, s.reorderBtn, { borderColor: colors.border }]} onPress={() => moveVideo(video, 'up')} disabled={idx === 0}>
                      <FontAwesome name="arrow-up" size={12} color={idx === 0 ? colors.border : colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, s.reorderBtn, { borderColor: colors.border }]} onPress={() => moveVideo(video, 'down')} disabled={idx === groupVideos.length - 1}>
                      <FontAwesome name="arrow-down" size={12} color={idx === groupVideos.length - 1 ? colors.border : colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }]} onPress={() => openEdit(video)}>
                      <FontAwesome name="pencil" size={13} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: 'rgba(142,0,28,0.08)', borderColor: '#8e001c' }]} onPress={() => confirmDelete(video)} disabled={deleting}>
                      <FontAwesome name="trash" size={13} color="#8e001c" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Delete Confirmation */}
      <ConfirmModal
        visible={deleteConfirm}
        title="動画を削除"
        message="Are you sure you want to delete this video?"
        confirmText="Delete"
        onConfirm={executeDelete}
        onCancel={() => { setDeleteConfirm(false); setDeleteTarget(null); }}
        isDestructive={true}
      />

      {/* Edit Modal */}
      <Modal visible={editModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.editModalContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={s.editModalHeader}>
              <Text style={[s.editModalTitle, { color: colors.text }]}>編集 — Edit Video</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <FontAwesome name="times" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <Text style={[s.editLabel, { color: colors.textSecondary }]}>Title *</Text>
              <TextInput style={[s.editInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border, color: colors.text }]} value={editTitle} onChangeText={setEditTitle} placeholder="Video title" placeholderTextColor={colors.textSecondary} />

              <Text style={[s.editLabel, { color: colors.textSecondary }]}>Description</Text>
              <TextInput style={[s.editInput, s.editTextArea, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border, color: colors.text }]} value={editDesc} onChangeText={setEditDesc} placeholder="Description" placeholderTextColor={colors.textSecondary} multiline />

              <Text style={[s.editLabel, { color: colors.textSecondary }]}>JLPT Level</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                {jlptLevels.map(lvl => (
                  <TouchableOpacity key={lvl} style={[s.editChip, { borderColor: colors.border }, editLevel === lvl && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setEditLevel(lvl)}>
                    <Text style={[s.editChipText, { color: colors.textSecondary }, editLevel === lvl && { color: '#fff' }]}>{lvl}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[s.editLabel, { color: colors.textSecondary }]}>Section</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {sections.map(sec => (
                  <TouchableOpacity key={sec} style={[s.editChip, { borderColor: colors.border, paddingHorizontal: 16 }, editSection === sec && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setEditSection(sec)}>
                    <Text style={[s.editChipText, { color: colors.textSecondary }, editSection === sec && { color: '#fff' }]}>{sec}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[s.editLabel, { color: colors.textSecondary }]}>Order</Text>
              <TextInput style={[s.editInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border, color: colors.text, width: 80 }]} value={editOrder} onChangeText={setEditOrder} keyboardType="numeric" />
            </ScrollView>

            <View style={s.editModalActions}>
              <TouchableOpacity style={[s.editCancelBtn, { borderColor: colors.border }]} onPress={() => setEditModal(false)} disabled={saving}>
                <Text style={[s.editCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.editSaveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]} onPress={saveEdit} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.editSaveText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: 20, paddingBottom: 60 },
    pageHeader: { marginBottom: 16 },
    pageKanji: { fontSize: 12, fontWeight: '800', letterSpacing: 3, marginBottom: 2 },
    pageTitle: { fontSize: 22, fontWeight: '900' },
    pageSubtitle: { fontSize: 13, marginTop: 4 },
    filterCard: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 20 },
    filterLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
    filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.border, marginRight: 6 },
    filterChipText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    emptyState: { alignItems: 'center', paddingTop: 60 },
    emptyText: { marginTop: 16, fontSize: 16, fontWeight: '600' },
    groupCard: { borderRadius: 14, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
    groupHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    groupTitle: { fontSize: 15, fontWeight: '800', flex: 1 },
    countBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
    countText: { fontSize: 12, fontWeight: '800' },
    videoItem: { padding: 14, borderBottomWidth: 1 },
    videoInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    orderBadge: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    orderText: { fontSize: 11, fontWeight: '900' },
    videoTitle: { fontSize: 14, fontWeight: '700' },
    videoDesc: { fontSize: 11, marginTop: 2 },
    actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
    actionBtn: { width: 34, height: 34, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    reorderBtn: { backgroundColor: 'transparent' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    editModalContainer: { width: '100%', maxWidth: 480, borderRadius: 16, padding: 20, borderWidth: 1 },
    editModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    editModalTitle: { fontSize: 18, fontWeight: '800' },
    editLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
    editInput: { height: 44, borderRadius: 10, paddingHorizontal: 12, fontSize: 14, borderWidth: 1, marginBottom: 12 },
    editTextArea: { height: 80, textAlignVertical: 'top', paddingTop: 10 },
    editChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
    editChipText: { fontSize: 12, fontWeight: '700' },
    editModalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
    editCancelBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
    editCancelText: { fontWeight: '600', fontSize: 14 },
    editSaveBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, minWidth: 130, alignItems: 'center' },
    editSaveText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  });
}
