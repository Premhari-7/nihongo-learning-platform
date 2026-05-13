import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Theme } from '../constants/Theme';
import { useTheme } from '../context/ThemeContext';
import { AuthContext, API_URL } from '../context/AuthContext';
import axios from 'axios';
import AnimatedRN, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { FontAwesome } from '@expo/vector-icons';
import GlassCard from '../components/GlassCard';
import QuizResult from '../components/QuizResult';

export default function QuizScreen() {
  const { level, section } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const st = makeStyles(colors, isDark);
  const { user } = useContext(AuthContext);

  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers]     = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult]       = useState<any>(null);
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);

  const cleanLevel   = typeof level   === 'string' ? level.replace('JLPT', '').trim()   : String(level).replace('JLPT', '').trim();
  const cleanSection = typeof section === 'string' ? section.trim() : String(section).trim();

  useEffect(() => { fetchQuiz(); }, []);

  const fetchQuiz = async () => {
    try {
      const res = await axios.get(`${API_URL}/quizzes/${cleanLevel}/${cleanSection}`);
      setQuestions(res.data.questions);
      setAnswers(new Array(res.data.questions.length).fill(-1));
    } catch {
      setErrorMsg('Failed to load quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitQuiz = async () => {
    setIsSubmitting(true);
    try {
      const userId = user?.id || user?._id;
      const res = await axios.post(`${API_URL}/quizzes/submit`, {
        userId, level: cleanLevel, section: cleanSection, answers
      });
      setResult(res.data);
    } catch {
      setErrorMsg('Failed to submit quiz.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setCurrentIndex(0);
    setAnswers(new Array(questions.length).fill(-1));
  };

  // ── Loading ─────────────────────────────────────────────────────
  if (loading) return (
    <View style={[st.container, st.centered]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={st.loadingText}>Preparing your quest...</Text>
    </View>
  );

  // ── Error ───────────────────────────────────────────────────────
  if (errorMsg) return (
    <View style={[st.container, st.centered, { padding: 24 }]}>
      <FontAwesome name="exclamation-triangle" size={54} color={colors.error} style={{ marginBottom: 18 }} />
      <Text style={st.errorText}>{errorMsg}</Text>
      <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
        <Text style={st.backBtnText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Result ──────────────────────────────────────────────────────
  if (result) return (
    <QuizResult
      result={result}
      questions={questions}
      answers={answers}
      level={cleanLevel}
      section={cleanSection}
      onRetry={handleRetry}
      onHome={() => router.replace('/(tabs)')}
    />
  );

  // ── Quiz UI ─────────────────────────────────────────────────────
  const currentQ = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <View style={st.container}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={st.backIconBtn}>
          <FontAwesome name="arrow-left" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={st.headerTitle}>{level} {section} Quiz</Text>
          <Text style={st.headerSub}>Question {currentIndex + 1} of {questions.length}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress */}
      <View style={st.progressBg}>
        <Animated.View style={[st.progressFill, { width: `${progress}%` }]} />
      </View>

      {/* Question */}
      <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent}>
        <AnimatedRN.View key={currentIndex} entering={FadeInRight.duration(380)} exiting={FadeOutLeft.duration(280)}>
          <GlassCard style={st.questionCard}>
            <Text style={st.questionText}>{currentQ.question}</Text>
          </GlassCard>
          <View style={st.optionsWrap}>
            {currentQ.options.map((opt: string, idx: number) => {
              const sel = answers[currentIndex] === idx;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[st.optionBtn, sel && st.optionBtnSel]}
                  onPress={() => { const a = [...answers]; a[currentIndex] = idx; setAnswers(a); }}
                >
                  <View style={[st.radio, sel && st.radioSel]}>
                    {sel && <View style={st.radioDot} />}
                  </View>
                  <Text style={[st.optionText, sel && st.optionTextSel]}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </AnimatedRN.View>
      </ScrollView>

      {/* Footer */}
      <View style={st.footer}>
        <TouchableOpacity
          style={[st.navBtn, currentIndex === 0 && st.navDisabled]}
          disabled={currentIndex === 0 || isSubmitting}
          onPress={() => setCurrentIndex(i => i - 1)}
        >
          <Text style={st.navText}>Previous</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[st.navBtn, st.navPrimary, answers[currentIndex] === -1 && st.navDisabled]}
          disabled={answers[currentIndex] === -1 || isSubmitting}
          onPress={() => {
            if (currentIndex < questions.length - 1) setCurrentIndex(i => i + 1);
            else submitQuiz();
          }}
        >
          {isSubmitting
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={st.navTextPrimary}>{currentIndex === questions.length - 1 ? 'Submit Quiz' : 'Next'}</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered:  { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary, marginTop: 14, fontSize: 15 },
  errorText:   { color: colors.text, fontSize: 16, textAlign: 'center', marginBottom: 24 },
  backBtn:     { backgroundColor: colors.primary, paddingHorizontal: 30, paddingVertical: 13, borderRadius: 12 },
  backBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  backIconBtn: { padding: 10 },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
  headerSub:   { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  progressBg:  { height: 4, backgroundColor: colors.border },
  progressFill:{ height: '100%', backgroundColor: colors.primary },
  scroll:      { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 50 },
  questionCard:  { padding: 24, marginBottom: 26, borderLeftWidth: 4, borderLeftColor: colors.primary, backgroundColor: colors.card },
  questionText:  { color: colors.text, fontSize: 19, lineHeight: 29, fontWeight: 'bold' },
  optionsWrap:   { marginTop: 6 },
  optionBtn:     { flexDirection: 'row', alignItems: 'center', padding: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginBottom: 12 },
  optionBtnSel:  { borderColor: colors.primary, backgroundColor: 'rgba(230,57,70,0.07)' },
  radio:         { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.textSecondary, marginRight: 13, justifyContent: 'center', alignItems: 'center' },
  radioSel:      { borderColor: colors.primary },
  radioDot:      { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  optionText:    { color: colors.text, fontSize: 15, flex: 1 },
  optionTextSel: { color: colors.primary, fontWeight: 'bold' },
  footer:        { flexDirection: 'row', padding: 16, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
  navBtn:        { flex: 1, padding: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.card, marginHorizontal: 5 },
  navPrimary:    { backgroundColor: colors.primary },
  navDisabled:   { opacity: 0.4 },
  navText:       { color: colors.text, fontSize: 15, fontWeight: 'bold' },
  navTextPrimary:{ color: '#fff', fontSize: 15, fontWeight: 'bold' },
  });
}
