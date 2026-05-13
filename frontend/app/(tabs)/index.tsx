import React, { useContext, useState, useRef, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Text, View, TextInput, Animated, Image, Modal, Dimensions } from 'react-native';
import { AuthContext, API_URL } from '../../context/AuthContext';
import { Theme } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';
import GlassCard from '../../components/GlassCard';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ChatbotWidget from '../../components/ChatbotWidget';
import axios from 'axios';
import { CourseContext } from '../../context/CourseContext';
import ConfirmModal from '../../components/ConfirmModal';

export default function StudentDashboard() {
  const { user, logout } = useContext(AuthContext);
  const { selectedCourse, setCourse } = useContext(CourseContext);
  const { colors, toggleTheme, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const router = useRouter();

  const [userProgress, setUserProgress] = useState({ percentage: 0 });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [certCount, setCertCount] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    fetchNotifications();
    fetchCertificates();
    fetchUserProgress();
  }, [user, selectedCourse]);

  const fetchUserProgress = async () => {
    const userId = user?.id || user?._id;
    if (!userId) return;
    try {
      if (selectedCourse) {
        const res = await axios.get(`${API_URL}/progress/course/${userId}/${selectedCourse.level}/${selectedCourse.section}`);
        setUserProgress({ percentage: res.data.percentage });
      } else {
        const res = await axios.get(`${API_URL}/progress/summary/${userId}`);
        setUserProgress({ percentage: res.data.percentage });
      }
    } catch (err) {
      console.error('Error fetching progress:', err);
    }
  };

  const fetchCertificates = async () => {
    const userId = user?.id || user?._id;
    if (!userId) return;
    try {
      // Use the actual certificates endpoint, not the quiz pass count
      const res = await axios.get(`${API_URL}/certificates/my/${userId}`);
      const certs = Array.isArray(res.data) ? res.data : [];
      setCertCount(certs.length);
    } catch (err) {
      console.error('Error fetching certificates:', err);
    }
  };

  const fetchNotifications = async () => {
    const userId = user?.id || user?._id;
    if (!userId) return;
    try {
      const res = await axios.get(`${API_URL}/notifications?userId=${userId}&role=${user?.role || 'user'}`);
      // Auto-delete on frontend: Filter out notifications older than 24 hours
      const now = new Date().getTime();
      const validNotifications = res.data.filter((n: any) => {
          const notifTime = new Date(n.createdAt).getTime();
          return (now - notifTime) < (24 * 60 * 60 * 1000);
      });
      setNotifications(validNotifications);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const hideNotification = async (id: string) => {
    const userId = user?.id || user?._id;
    if (!userId) return;
    try {
      await axios.post(`${API_URL}/notifications/${id}/hide`, { userId: userId });
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error('Error hiding notification:', err);
    }
  };
  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    router.replace('/(auth)/login');
  };

  const startLevel = async (level: string) => {
    // Default to 'Kanji' section for now as it's the main path
    await setCourse(level, 'Kanji');
    router.push('/(tabs)/learn');
  };

  const jlptLevels = [
    { name: 'N5', unlocked: true, modules: 12 },
    { name: 'N4', unlocked: true, modules: 15 },
    { name: 'N3', unlocked: false, modules: 20 },
    { name: 'N2', unlocked: false, modules: 25 },
    { name: 'N1', unlocked: false, modules: 30 },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>ようこそ (Welcome),</Text>
          <Text style={styles.nameText}>{user?.name}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {/* Theme toggle */}
          <TouchableOpacity style={styles.iconButton} onPress={toggleTheme}>
            <FontAwesome name={isDark ? 'sun-o' : 'moon-o'} size={18} color={colors.primary} />
          </TouchableOpacity>
          <View style={{ position: 'relative' }}>
            <TouchableOpacity style={styles.iconButton} onPress={() => setShowNotifs(!showNotifs)}>
              <FontAwesome name="bell" size={20} color={colors.textSecondary} />
              {notifications.length > 0 && <View style={styles.badge} />}
            </TouchableOpacity>

            {/* Notifications Dropdown */}
            {showNotifs && (
              <Modal transparent={true} visible={showNotifs} onRequestClose={() => setShowNotifs(false)} animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowNotifs(false)}>
                  <View style={styles.notifDropdownContainer}>
                    <GlassCard style={styles.notifDropdown}>
                      <Text style={styles.notifHeader}>Notifications</Text>
                      <ScrollView style={{ maxHeight: 200 }}>
                        {notifications.length === 0 ? (
                          <Text style={styles.noNotifs}>You're all caught up!</Text>
                        ) : (
                          notifications.map(notif => (
                            <View key={notif._id} style={styles.notifItem}>
                              <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text style={styles.notifText}>{notif.message}</Text>
                                <Text style={styles.notifTime}>{new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                              </View>
                              <TouchableOpacity onPress={() => hideNotification(notif._id)}>
                                <FontAwesome name="times-circle" size={20} color={colors.textSecondary} />
                              </TouchableOpacity>
                            </View>
                          ))
                        )}
                      </ScrollView>
                    </GlassCard>
                  </View>
                </TouchableOpacity>
              </Modal>
            )}
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutClick}>
            <FontAwesome name="sign-out" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Decorative Kanji strip ── */}
      <View style={styles.kanjiStrip}>
        {['道', '学', '知', '力', '書', '語', '文', '武'].map((k, i) => (
          <Text key={i} style={[styles.kanjiChar, { opacity: 0.08 + (i % 3) * 0.04 }]}>{k}</Text>
        ))}
      </View>

      <GlassCard style={styles.progressCard}>
        <Text style={styles.cardTitle}>
          {selectedCourse ? `${selectedCourse.level} ${selectedCourse.section} Mastery (習熟度)` : 'Overall Mastery (総合習熟度)'}
        </Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${userProgress.percentage || 0}%` }]} />
        </View>
        <Text style={styles.progressText}>{userProgress.percentage || 0}% Completed (完了)</Text>
      </GlassCard>

      <Text style={styles.sectionTitle}>Learning Paths (学習コース)</Text>
      <View style={styles.levelsGrid}>
        {jlptLevels.map(level => (
          <TouchableOpacity 
            key={level.name} 
            style={[styles.levelCard, !level.unlocked && { opacity: 0.7 }]}
            onPress={() => level.unlocked && startLevel(level.name)}
            disabled={!level.unlocked}
          >
            <GlassCard style={styles.levelGlass}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={styles.levelText}>{level.name}</Text>
                <Text style={styles.levelSubtext}> ({level.modules} Modules)</Text>
              </View>
              {level.unlocked ? (
                <View style={styles.startBadge}>
                  <Text style={styles.startBadgeText}>Start</Text>
                  <FontAwesome name="chevron-right" size={10} color="#fff" style={{ marginLeft: 5 }} />
                </View>
              ) : (
                <FontAwesome name="lock" size={20} color={colors.textSecondary} />
              )}
            </GlassCard>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity onPress={() => router.push('/certificate')}>
        <GlassCard style={styles.certCard}>
          <View style={styles.certRow}>
            <FontAwesome name="certificate" size={30} color="#d4af37" />
            <View style={{ marginLeft: 15 }}>
              <Text style={styles.cardTitle}>Certificates (証明書)</Text>
              <Text style={styles.certText}>{certCount} Earned (取得済み)</Text>
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>

      {/* Floating Samurai Assistant */}
      <ChatbotWidget />

      <ConfirmModal
        visible={showLogoutConfirm}
        title="ログアウト"
        message="Are you sure you want to log out of your account?"
        confirmText="Logout"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
        isDestructive={true}
      />
    </ScrollView>
  );
}

function makeStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
    zIndex: 1000, // Higher z-index for the header container
  },
  welcomeText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  nameText: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}12`,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    backgroundColor: colors.error,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  logoutButton: {
    padding: 12,
    backgroundColor: 'rgba(155, 28, 28, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(155, 28, 28, 0.2)',
  },
  kanjiStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 20,
    marginTop: -10,
  },
  kanjiChar: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textSecondary,
  },
  progressCard: {
    padding: 25,
    marginBottom: 35,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: 'rgba(155, 28, 28, 0.1)',
    borderRadius: 6,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    letterSpacing: 1,
  },
  levelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  levelCard: {
    width: '48%',
    marginBottom: 15,
  },
  levelGlass: {
    padding: 20,
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  levelText: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '900',
  },
  levelSubtext: {
    color: isDark ? '#D4C9B8' : colors.textSecondary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  startBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 15,
  },
  startBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  certCard: {
    padding: 25,
    marginBottom: 40,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  certRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  certText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  iconButton: {
    padding: 10,
    marginRight: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  notifDropdownContainer: {
    position: 'absolute',
    top: 70,
    right: 20,
    width: 300,
    zIndex: 9999,
  },
  notifDropdown: {
    padding: 15,
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  notifHeader: {
    color: '#fff', // Pure white for better visibility
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 8,
  },
  noNotifs: {
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  notifItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 10,
    borderRadius: 8,
  },
  notifText: {
    color: '#fff', // Pure white
    fontSize: 14,
    fontWeight: '500',
  },
  notifTime: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 5,
  }
  });
}
