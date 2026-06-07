import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Text, View, ActivityIndicator, Modal, Pressable } from 'react-native';
import { AuthContext, API_URL } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import GlassCard from '../../components/GlassCard';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import ChatbotWidget from '../../components/ChatbotWidget';
import ConfirmModal from '../../components/ConfirmModal';

export default function AdminDashboard() {
  const { user, logout } = useContext(AuthContext);
  const { colors, toggleTheme, isDark } = useTheme();
  const router = useRouter();
  const [stats, setStats] = useState({ totalUsers: 0, activeStudents: 0, certificates: 0 });
  const [chartData, setChartData] = useState<{ level: string; count: number }[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchChartData();
    fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    const userId = user?.id || user?._id;
    if (!userId) return;
    try {
      const res = await axios.get(`${API_URL}/notifications?userId=${userId}&role=admin`);
      const now = new Date().getTime();
      const validNotifications = res.data.filter((n: any) => {
          const notifTime = new Date(n.createdAt).getTime();
          return (now - notifTime) < (24 * 60 * 60 * 1000);
      });
      setNotifications(validNotifications);
    } catch (err) {
      console.error('Error fetching admin notifications:', err);
    }
  };

  const hideNotification = async (id: string) => {
    const userId = user?.id || user?._id;
    if (!userId) return;
    try {
      await axios.post(`${API_URL}/notifications/${id}/hide`, { userId });
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error('Error hiding notification:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/stats`);
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchChartData = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/chart-data`);
      
      // Ensure all 5 levels are always displayed, even if the backend is outdated
      const defaultLevels = ['N5', 'N4', 'N3', 'N2', 'N1'];
      const mergedData = defaultLevels.map(level => {
        const found = res.data.find((d: any) => d.level === level);
        return { level, count: found ? found.count : 0 };
      });
      
      setChartData(mergedData);
    } catch (err) {
      console.error('Failed to load chart data:', err);
      // Fallback: display all empty bars
      setChartData([
        { level: 'N5', count: 0 }, { level: 'N4', count: 0 },
        { level: 'N3', count: 0 }, { level: 'N2', count: 0 }, { level: 'N1', count: 0 }
      ]);
    }
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    router.replace('/(auth)/login');
  };

  const maxCount = Math.max(...chartData.map(d => d.count), 1);

  const s = makeStyles(colors, isDark);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={s.container}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.welcomeKanji}>管理者様、ようこそ</Text>
          <Text style={s.welcomeSub}>Welcome back, Admin</Text>
          <Text style={s.nameText}>{user?.name}</Text>
        </View>
        <View style={s.headerActions}>
          {/* Day/Night Toggle */}
          <TouchableOpacity style={s.iconBtn} onPress={toggleTheme}>
            <FontAwesome name={isDark ? 'sun-o' : 'moon-o'} size={18} color={colors.primary} />
          </TouchableOpacity>

          {/* Bell */}
          <View style={{ position: 'relative' }}>
            <TouchableOpacity style={s.iconBtn} onPress={() => setShowNotifs(!showNotifs)}>
              <FontAwesome name="bell" size={18} color={colors.primary} />
              {notifications.length > 0 && <View style={s.badgeDot} />}
            </TouchableOpacity>
            {showNotifs && (
              <Modal transparent={true} visible={showNotifs} onRequestClose={() => setShowNotifs(false)} animationType="fade">
                <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowNotifs(false)}>
                  <View style={s.notifDropdownContainer}>
                    <View style={s.notifDropdown}>
                      <Text style={[s.notifHeader, { color: colors.text }]}>通知 (Alerts)</Text>
                      <ScrollView style={{ maxHeight: 200 }}>
                        {notifications.length === 0 ? (
                          <Text style={[s.noNotifs, { color: colors.textSecondary }]}>No new alerts</Text>
                        ) : (
                          notifications.map(notif => (
                            <View key={notif._id} style={s.notifItem}>
                              <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text style={[s.notifText, { color: colors.text }]}>{notif.message}</Text>
                                <Text style={[s.notifTime, { color: colors.textSecondary }]}>
                                  {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                              </View>
                              <TouchableOpacity onPress={() => hideNotification(notif._id)}>
                                <FontAwesome name="times-circle" size={18} color={colors.textSecondary} />
                              </TouchableOpacity>
                            </View>
                          ))
                        )}
                      </ScrollView>
                    </View>
                  </View>
                </TouchableOpacity>
              </Modal>
            )}
          </View>

          {/* Logout */}
          <TouchableOpacity style={s.logoutBtn} onPress={() => setShowLogoutConfirm(true)}>
            <FontAwesome name="sign-out" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Decorative Kanji strip ── */}
      <View style={s.kanjiStrip}>
        {['道', '学', '知', '力', '書', '語', '文', '武'].map((k, i) => (
          <Text key={i} style={[s.kanjiChar, { opacity: 0.08 + (i % 3) * 0.04 }]}>{k}</Text>
        ))}
      </View>

      {/* ── Stats ── */}
      <Text style={[s.sectionTitle, { color: colors.text }]}>分析の概要 — Analytics</Text>
      {loadingStats ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
      ) : (
        <View style={s.statsGrid}>
          {[
            { icon: 'users', label: 'Students\n学生', value: stats.totalUsers, color: colors.primary },
            { icon: 'graduation-cap', label: 'Active\nアクティブ', value: stats.activeStudents, color: '#2E7D32' },
            { icon: 'certificate', label: 'Certificates\n証明書', value: stats.certificates, color: '#B8860B' },
          ].map((card, i) => (
            <View key={i} style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <FontAwesome name={card.icon as any} size={22} color={card.color} />
              <Text style={[s.statValue, { color: colors.text }]}>{card.value}</Text>
              <Text style={[s.statLabel, { color: colors.textSecondary }]}>{card.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Real Chart ── */}
      <View style={[s.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[s.cardTitle, { color: colors.text }]}>進歩チャート — Student Enrollment by Level</Text>
        <View style={s.chartArea}>
          {chartData.length === 0 ? (
            <ActivityIndicator color={colors.primary} />
          ) : chartData.map((item, i) => {
            const barHeight = maxCount > 0 ? Math.max(((item.count / maxCount) * 180), 8) : 8;
            const barColors = [colors.primary, colors.gold, '#4CAF50', '#2196F3', '#9C27B0'];
            return (
              <View key={i} style={s.barWrapper}>
                <Text style={[s.barValueLabel, { color: colors.textSecondary }]}>{item.count}</Text>
                <View style={[s.barFill, { height: barHeight, backgroundColor: barColors[i] || colors.primary }]} />
                <Text style={[s.barLabel, { color: colors.textSecondary }]}>{item.level}</Text>
              </View>
            );
          })}
        </View>
        <Text style={[s.chartNote, { color: colors.textSecondary }]}>* Based on active progress records</Text>
      </View>

      {/* ── Quick Actions ── */}
      <Text style={[s.sectionTitle, { color: colors.text }]}>クイックアクション — Quick Actions</Text>
      <View style={s.actionGrid}>
        {[
          { icon: 'users', label: 'Manage Students\n学生管理', route: '/(admin)/students' },
          { icon: 'certificate', label: 'Certificates\n証明書', route: '/(admin)/certificates' },
          { icon: 'upload', label: 'Upload Video\nアップロード', route: '/(admin)/upload-video' },
          { icon: 'film', label: 'Manage Videos\n動画管理', route: '/(admin)/manage-videos' },
        ].map((btn, i) => (
          <TouchableOpacity
            key={i}
            style={[s.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(btn.route as any)}
          >
            <View style={[s.actionIconWrap, { backgroundColor: `${colors.primary}18` }]}>
              <FontAwesome name={btn.icon as any} size={20} color={colors.primary} />
            </View>
            <Text style={[s.actionBtnText, { color: colors.text }]}>{btn.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ChatbotWidget />

      <ConfirmModal
        visible={showLogoutConfirm}
        title="ログアウト"
        message="Are you sure you want to log out of the admin panel?"
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
      padding: 24,
      paddingBottom: 60,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
      marginTop: 16,
      zIndex: 1000,
    },
    welcomeKanji: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '700',
      letterSpacing: 2,
      marginBottom: 2,
    },
    welcomeSub: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    nameText: {
      color: colors.text,
      fontSize: 26,
      fontWeight: '900',
      letterSpacing: 1,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${colors.primary}12`,
      borderWidth: 1,
      borderColor: `${colors.primary}30`,
      justifyContent: 'center',
      alignItems: 'center',
    },
    badgeDot: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.error,
    },
    logoutBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${colors.primary}12`,
      borderWidth: 1,
      borderColor: `${colors.primary}30`,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.1)',
    },
    notifDropdownContainer: {
      position: 'absolute',
      top: 65,
      right: 20,
      width: 300,
      zIndex: 9999,
    },
    notifDropdown: {
      padding: 15,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 20,
    },
    notifHeader: {
      fontSize: 15,
      fontWeight: 'bold',
      marginBottom: 10,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    noNotifs: {
      fontStyle: 'italic',
      textAlign: 'center',
      paddingVertical: 10,
    },
    notifItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      padding: 10,
      backgroundColor: `${colors.primary}08`,
      borderRadius: 8,
    },
    notifText: { fontSize: 13 },
    notifTime: { fontSize: 10, marginTop: 3 },
    kanjiStrip: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 28,
      marginTop: 8,
      overflow: 'hidden',
    },
    kanjiChar: {
      fontSize: 48,
      fontWeight: '900',
      color: colors.primary,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 16,
      letterSpacing: 0.5,
    },
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 28,
      flexWrap: 'wrap',
    },
    statCard: {
      flex: 1,
      minWidth: '30%',
      alignItems: 'center',
      padding: 20,
      borderRadius: 16,
      borderWidth: 1,
    },
    statValue: {
      fontSize: 30,
      fontWeight: '900',
      marginTop: 12,
    },
    statLabel: {
      fontSize: 10,
      marginTop: 4,
      fontWeight: '700',
      textTransform: 'uppercase',
      textAlign: 'center',
      lineHeight: 14,
    },
    chartCard: {
      padding: 24,
      marginBottom: 28,
      borderRadius: 16,
      borderWidth: 1,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: 'bold',
      marginBottom: 20,
    },
    chartArea: {
      height: 220,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-around',
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 8,
    },
    barWrapper: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    barValueLabel: {
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 6,
    },
    barFill: {
      width: '60%',
      maxWidth: 36,
      borderRadius: 8,
      minHeight: 8,
    },
    barLabel: {
      marginTop: 10,
      fontSize: 12,
      fontWeight: '700',
    },
    chartNote: {
      fontSize: 11,
      fontStyle: 'italic',
      textAlign: 'center',
    },
    actionGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 32,
      flexWrap: 'wrap',
    },
    actionBtn: {
      flex: 1,
      minWidth: '30%',
      padding: 18,
      borderRadius: 16,
      alignItems: 'center',
      borderWidth: 1,
    },
    actionIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },
    actionBtnText: {
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 18,
    },
  });
}
