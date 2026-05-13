import React, { useState, useContext } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, ScrollView, Platform
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { FontAwesome } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL, AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import AnimatedPopup from '../../components/AnimatedPopup';

const jlptLevels = ['N5', 'N4', 'N3', 'N2', 'N1'];
const sections = ['Kanji', 'Vocabulary'];

export default function UploadVideoScreen() {
  const { user } = useContext(AuthContext);
  const { colors, isDark } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('N5');
  const [section, setSection] = useState('Kanji');
  const [order, setOrder] = useState('');
  const [videoFile, setVideoFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupConfig, setPopupConfig] = useState<{ type: 'error' | 'success'; title: string; message: string }>({
    type: 'error', title: '', message: '',
  });

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'video/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      setVideoFile(result.assets[0]);
    } catch (err) {
      console.error('Error picking video:', err);
    }
  };

  const handleUpload = async () => {
    if (!title.trim() || !videoFile) {
      setPopupConfig({ type: 'error', title: '未入力 (Missing Info)', message: 'Please provide a title and select a video file.' });
      setPopupVisible(true);
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('jlptLevel', level);
    formData.append('section', section);
    if (order.trim()) formData.append('order', order);
    if (user?._id) formData.append('uploadedBy', user._id);
    if (Platform.OS === 'web' && videoFile.file) {
      formData.append('video', videoFile.file);
    } else {
      formData.append('video', { uri: videoFile.uri, name: videoFile.name || 'video.mp4', type: videoFile.mimeType || 'video/mp4' } as any);
    }
    try {
      await axios.post(`${API_URL}/videos/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPopupConfig({ type: 'success', title: '成功 (Success)', message: 'Video uploaded successfully!' });
      setPopupVisible(true);
      setTitle(''); setDescription(''); setOrder(''); setVideoFile(null);
    } catch (err: any) {
      setPopupConfig({ type: 'error', title: '失敗 (Failed)', message: err.response?.data?.msg || 'Failed to upload video' });
      setPopupVisible(true);
    } finally {
      setUploading(false);
    }
  };

  const inputStyle = [styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', borderColor: colors.border, color: colors.text }];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
      <AnimatedPopup visible={popupVisible} type={popupConfig.type} title={popupConfig.title} message={popupConfig.message} onClose={() => setPopupVisible(false)} />

      {/* Header */}
      <View style={styles.pageHeader}>
        <Text style={[styles.pageKanji, { color: colors.primary }]}>動画アップロード</Text>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Upload Video Lesson</Text>
      </View>

      {/* Form Card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          style={[inputStyle, { outlineStyle: 'none' } as any]}
          placeholder="Video Title (タイトル) *"
          placeholderTextColor={colors.textSecondary}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[inputStyle, styles.textArea, { outlineStyle: 'none' } as any]}
          placeholder="Description (説明) — optional"
          placeholderTextColor={colors.textSecondary}
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <TextInput
          style={[inputStyle, { outlineStyle: 'none' } as any]}
          placeholder="Order Number (順番) — auto if empty"
          placeholderTextColor={colors.textSecondary}
          value={order}
          onChangeText={setOrder}
          keyboardType="numeric"
        />

        {/* JLPT Level */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>レベル — Select JLPT Level</Text>
        <View style={styles.levelsRow}>
          {jlptLevels.map(lvl => (
            <TouchableOpacity
              key={lvl}
              style={[
                styles.levelBtn,
                { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' },
                level === lvl && { borderColor: colors.primary, backgroundColor: `${colors.primary}18` },
              ]}
              onPress={() => setLevel(lvl)}
            >
              <Text style={[styles.levelBtnText, { color: level === lvl ? colors.primary : colors.textSecondary }]}>{lvl}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>セクション — Select Section</Text>
        <View style={styles.sectionsRow}>
          {sections.map(sec => (
            <TouchableOpacity
              key={sec}
              style={[
                styles.sectionBtn,
                { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' },
                section === sec && { borderColor: colors.primary, backgroundColor: colors.primary },
              ]}
              onPress={() => setSection(sec)}
            >
              <Text style={[styles.sectionBtnText, { color: section === sec ? '#fff' : colors.textSecondary }]}>{sec}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* File Picker */}
        <TouchableOpacity
          style={[styles.filePicker, { borderColor: videoFile ? colors.primary : colors.border, backgroundColor: videoFile ? `${colors.primary}08` : 'transparent' }]}
          onPress={pickDocument}
        >
          <FontAwesome name="cloud-upload" size={28} color={videoFile ? colors.primary : colors.textSecondary} />
          <Text style={[styles.filePickerText, { color: videoFile ? colors.primary : colors.textSecondary }]}>
            {videoFile ? videoFile.name : 'タップしてMP4を選択 — Tap to select video (MP4)'}
          </Text>
          {videoFile && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); setVideoFile(null); }}
              style={styles.removeFileBtn}
            >
              <FontAwesome name="times-circle" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Upload Button — compact, professional, no ShineButton */}
        <TouchableOpacity
          style={[styles.uploadBtn, { backgroundColor: colors.primary, opacity: uploading ? 0.75 : 1 }]}
          onPress={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <FontAwesome name="upload" size={15} color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.uploadBtnText}>アップロード — Upload Video</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pageHeader: { marginBottom: 20 },
  pageKanji: { fontSize: 12, fontWeight: '800', letterSpacing: 3, marginBottom: 4 },
  pageTitle: { fontSize: 22, fontWeight: '900' },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  input: {
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: 13,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
  levelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 6,
  },
  levelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  levelBtnText: { fontSize: 13, fontWeight: '700' },
  sectionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  sectionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  sectionBtnText: { fontSize: 13, fontWeight: '700' },
  filePicker: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  filePickerText: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
  removeFileBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: 'flex-end', // compact — not full width
    minWidth: 220,
  },
  uploadBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
