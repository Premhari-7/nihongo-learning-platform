import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, Modal, Pressable
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL, AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';
import ConfirmModal from '../../components/ConfirmModal';

export default function ManageStudents() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [studentToDelete, setStudentToDelete] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentDetail, setStudentDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [levelProgress, setLevelProgress] = useState<any>(null);
  const router = useRouter();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/students`);
      setStudents(res.data);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudent = async (student: any) => {
    setSelectedStudent(student);
    setSelectedLevel(null);
    setLevelProgress(null);
    setLoadingDetail(true);
    try {
      const [progRes, certRes] = await Promise.allSettled([
        axios.get(`${API_URL}/progress/summary/${student._id}`),
        axios.get(`${API_URL}/certificates/my/${student._id}`),
      ]);
      setStudentDetail({
        summary: progRes.status === 'fulfilled' ? progRes.value.data : { completedVideos: 0, totalVideos: 0, percentage: 0 },
        certificates: certRes.status === 'fulfilled' ? certRes.value.data : [],
      });
    } catch (err) {
      console.error('Error loading student detail:', err);
      setStudentDetail({ summary: { completedVideos: 0, totalVideos: 0, percentage: 0 }, certificates: [] });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDeleteClick = (student: any) => {
    setStudentToDelete(student);
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;
    try {
      await axios.delete(`${API_URL}/admin/student/${studentToDelete._id}`);
      setStudents(students.filter(s => s._id !== studentToDelete._id));
      setStudentToDelete(null);
      if (selectedStudent?._id === studentToDelete._id) {
        setSelectedStudent(null);
        setStudentDetail(null);
      }
    } catch (err) {
      console.error('Error deleting student:', err);
      Alert.alert('Error', 'Failed to delete student');
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const completedVideos = studentDetail?.summary?.completedVideos ?? 0;
  const totalVideos = studentDetail?.summary?.totalVideos ?? 0;
  const progressPct = studentDetail?.summary?.percentage ?? 0;
  const certsEarned = studentDetail?.certificates?.length ?? 0;

  // Gather unique levels from certificates and progress
  const certLevels = (studentDetail?.certificates ?? []).map((c: any) => c.jlptLevel).filter(Boolean);
  const progLevels = studentDetail?.summary?.studiedLevels ?? [];
  const studiedLevels = [...new Set([...certLevels, ...progLevels])];

  const handleLevelClick = async (lvl: string | null) => {
    setSelectedLevel(lvl);
    if (!lvl) {
      setLevelProgress(null);
      return;
    }
    setLoadingDetail(true);
    try {
      const res = await axios.get(`${API_URL}/progress/course/${selectedStudent._id}/${lvl}/Kanji`);
      setLevelProgress(res.data);
    } catch (err) {
      console.error('Error fetching level progress:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  let activeCompletedStr = `${completedVideos}/${totalVideos}`;
  let activeProgressStr = `${progressPct}%`;
  
  if (selectedLevel && levelProgress) {
      if (levelProgress.stage === 'certificate' || levelProgress.stage === 'quiz') {
          activeCompletedStr = '✓';
      } else {
          const comp = levelProgress.completedVideos || 0;
          const tot = levelProgress.totalCourseVideos || 0;
          activeCompletedStr = `${comp}/${tot}`;
      }
      activeProgressStr = `${levelProgress.percentage}%`;
  }

  const activeCerts = selectedLevel 
    ? (studentDetail?.certificates || []).filter((c: any) => c.jlptLevel === selectedLevel) 
    : (studentDetail?.certificates || []);
  const activeCertsEarned = activeCerts.length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome name="arrow-left" size={20} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.headerKanji, { color: colors.primary }]}>学生管理</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Manage Students</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <FontAwesome name="search" size={15} color={colors.textSecondary} style={{ marginRight: 10 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.text, outlineStyle: 'none' } as any]}
          placeholder="Search by name or email... (検索)"
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <FontAwesome name="times-circle" size={15} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {filteredStudents.length === 0 ? (
            <View style={styles.emptyWrapper}>
              <Text style={styles.emptyKanji}>学生なし</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No students found</Text>
            </View>
          ) : (
            filteredStudents.map((student) => (
              <TouchableOpacity
                key={student._id}
                style={[styles.studentCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleViewStudent(student)}
                activeOpacity={0.75}
              >
                <View style={[styles.avatar, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
                  <Text style={[styles.avatarLetter, { color: colors.primary }]}>
                    {student.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.studentName, { color: colors.text }]}>{student.name}</Text>
                  <Text style={[styles.studentEmail, { color: colors.textSecondary }]}>{student.email}</Text>
                  <Text style={[styles.studentJoined, { color: colors.textSecondary }]}>
                    参加日: {new Date(student.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.viewBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}
                    onPress={() => handleViewStudent(student)}
                  >
                    <FontAwesome name="eye" size={14} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteClick(student)}
                  >
                    <FontAwesome name="trash" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* ── Student Detail Modal ── */}
      <Modal
        visible={!!selectedStudent}
        transparent
        animationType="fade"
        onRequestClose={() => { setSelectedStudent(null); setStudentDetail(null); }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => { setSelectedStudent(null); setStudentDetail(null); }}
        >
          <Pressable
            style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <TouchableOpacity
              style={[styles.modalClose, { backgroundColor: `${colors.primary}15` }]}
              onPress={() => { setSelectedStudent(null); setStudentDetail(null); }}
            >
              <FontAwesome name="times" size={16} color={colors.primary} />
            </TouchableOpacity>

            {/* Student Header */}
            <View style={styles.modalAvatarRow}>
              <View style={[styles.modalAvatar, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}40` }]}>
                <Text style={[styles.modalAvatarLetter, { color: colors.primary }]}>
                  {selectedStudent?.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={[styles.modalName, { color: colors.text }]}>{selectedStudent?.name}</Text>
                <Text style={[styles.modalEmail, { color: colors.textSecondary }]}>{selectedStudent?.email}</Text>
                <Text style={[styles.modalJoined, { color: colors.textSecondary }]}>
                  参加日: {selectedStudent ? new Date(selectedStudent.createdAt).toLocaleDateString() : ''}
                </Text>
              </View>
            </View>

            <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

            {loadingDetail ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Levels Studied */}
                <Text style={[styles.modalSectionLabel, { color: colors.textSecondary }]}>コース選択 — Levels Studied</Text>
                <View style={styles.levelsRow}>
                  {studiedLevels.length === 0 ? (
                    <Text style={[styles.noDataText, { color: colors.textSecondary }]}>No courses started yet</Text>
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={() => handleLevelClick(null)}
                        style={[styles.levelBadge, { backgroundColor: selectedLevel === null ? colors.primary : `${colors.primary}15`, borderColor: `${colors.primary}40` }]}
                      >
                        <Text style={[styles.levelBadgeText, { color: selectedLevel === null ? '#fff' : colors.primary }]}>Overall</Text>
                      </TouchableOpacity>
                      {studiedLevels.map((lvl: any, i: number) => (
                        <TouchableOpacity 
                          key={i} 
                          onPress={() => handleLevelClick(lvl)}
                          style={[styles.levelBadge, { backgroundColor: selectedLevel === lvl ? colors.primary : `${colors.primary}15`, borderColor: `${colors.primary}40` }]}
                        >
                          <Text style={[styles.levelBadgeText, { color: selectedLevel === lvl ? '#fff' : colors.primary }]}>{lvl}</Text>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                  {[
                    { icon: 'play-circle', label: 'Videos\n完了', value: activeCompletedStr, color: colors.primary },
                    { icon: 'bar-chart', label: 'Progress\n進歩', value: activeProgressStr, color: '#B8860B' },
                    { icon: 'certificate', label: 'Certs\n証明書', value: activeCertsEarned, color: '#2E7D32' },
                  ].map((stat, i) => (
                    <View key={i} style={[styles.statBox, { backgroundColor: `${colors.primary}08`, borderColor: colors.border }]}>
                      <FontAwesome name={stat.icon as any} size={18} color={stat.color} />
                      <Text style={[styles.statBoxValue, { color: colors.text }]}>{stat.value}</Text>
                      <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Certificates */}
                {activeCertsEarned > 0 && (
                  <>
                    <Text style={[styles.modalSectionLabel, { color: colors.textSecondary }]}>証明書 — Certificates</Text>
                    {activeCerts.map((cert: any, i: number) => (
                      <View key={i} style={[styles.certRow, { backgroundColor: `${colors.gold || '#B8860B'}10`, borderColor: `${colors.gold || '#B8860B'}30` }]}>
                        <FontAwesome name="certificate" size={16} color="#B8860B" />
                        <View style={{ marginLeft: 12 }}>
                          <Text style={[styles.certName, { color: colors.text }]}>{cert.courseName}</Text>
                          <Text style={[styles.certDate, { color: colors.textSecondary }]}>
                            {new Date(cert.issuedDate).toLocaleDateString()} · Score: {cert.score}%
                          </Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}

                {/* Delete Button */}
                <TouchableOpacity
                  style={styles.modalDeleteBtn}
                  onPress={() => {
                    setSelectedStudent(null);
                    setStudentDetail(null);
                    handleDeleteClick(selectedStudent);
                  }}
                >
                  <FontAwesome name="trash" size={14} color="#fff" />
                  <Text style={styles.modalDeleteText}>Delete Student (削除)</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmModal
        visible={!!studentToDelete}
        title="削除確認 — Delete Student"
        message={`Are you sure you want to permanently delete ${studentToDelete?.name}? All progress, quizzes, and certificates will be erased. This cannot be undone.`}
        confirmText="Delete Permanently"
        onConfirm={confirmDelete}
        onCancel={() => setStudentToDelete(null)}
        isDestructive={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 8 },
  headerKanji: { fontSize: 11, fontWeight: '800', letterSpacing: 3, marginBottom: 2 },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 14,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 12 },
  emptyWrapper: { alignItems: 'center', marginTop: 60 },
  emptyKanji: { fontSize: 36, fontWeight: '900', color: 'rgba(155,28,28,0.15)', marginBottom: 8 },
  emptyText: { fontSize: 16 },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
  },
  avatarLetter: { fontSize: 20, fontWeight: '900' },
  studentName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  studentEmail: { fontSize: 13, marginBottom: 2 },
  studentJoined: { fontSize: 11 },
  cardActions: { flexDirection: 'column', gap: 8, marginLeft: 10 },
  viewBtn: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1,
  },
  deleteBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(155,28,28,0.85)',
    justifyContent: 'center', alignItems: 'center',
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20,
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalAvatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 8 },
  modalAvatar: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2,
  },
  modalAvatarLetter: { fontSize: 28, fontWeight: '900' },
  modalName: { fontSize: 20, fontWeight: '900', marginBottom: 2 },
  modalEmail: { fontSize: 13, marginBottom: 4 },
  modalJoined: { fontSize: 12 },
  modalDivider: { height: 1, marginBottom: 16 },
  modalSectionLabel: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 1.5, marginBottom: 10, marginTop: 4,
  },
  levelsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  levelBadge: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  levelBadgeText: { fontWeight: '800', fontSize: 13 },
  noDataText: { fontSize: 13, fontStyle: 'italic' },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  statBoxValue: { fontSize: 18, fontWeight: '900', marginTop: 6, marginBottom: 2 },
  statBoxLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center', lineHeight: 14 },
  certRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  certName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  certDate: { fontSize: 12 },
  modalDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(155,28,28,0.85)',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 4,
  },
  modalDeleteText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
