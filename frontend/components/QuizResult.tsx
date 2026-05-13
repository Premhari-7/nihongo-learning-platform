import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Platform, Image, ScrollView, Dimensions } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Theme } from '../constants/Theme';
import { API_URL } from '../context/AuthContext';
import * as WebBrowser from 'expo-web-browser';

const { width: SW, height: SH } = Dimensions.get('window');
const KANJI = ['漢','字','学','日','本','語','合','格','武','士','道','剣','心','力','気','魂','戦','勝','極','技'];

// Inject CSS once for web animations
function injectCSS() {
  if (Platform.OS !== 'web') return;
  if (document.getElementById('quiz-anim-css')) return;
  const el = document.createElement('style');
  el.id = 'quiz-anim-css';
  el.innerHTML = `
    @keyframes kanjiRain {
      0%   { transform: translateY(-60px); opacity: 0; }
      6%   { opacity: 0.85; }
      88%  { opacity: 0.85; }
      100% { transform: translateY(105vh); opacity: 0; }
    }
    @keyframes samuraiRise {
      0%   { transform: translateY(110vh); opacity: 0; }
      20%  { opacity: 1; }
      60%  { transform: translateY(8vh); opacity: 1; }
      85%  { transform: translateY(8vh); opacity: 0.8; }
      100% { transform: translateY(-30vh); opacity: 0; }
    }
    @keyframes bubblePop {
      0%   { opacity: 0; transform: scale(0.8); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes auraPulse {
      0%, 100% { opacity: 0.3; transform: scale(1); }
      50%       { opacity: 0.8; transform: scale(1.08); }
    }
    .kanji-char { pointer-events: none; user-select: none; position: absolute; top: 0; font-weight: bold; z-index: 8; }
    .samurai-wrap { position: absolute; left: 50%; transform: translateX(-50%); z-index: 15; display: flex; flex-direction: column; align-items: center; animation: samuraiRise 6.5s cubic-bezier(.22,1,.36,1) 0.5s forwards; }
    .samurai-img { width: 180px; height: 320px; object-fit: contain; mix-blend-mode: screen; filter: brightness(1.6) contrast(1.4) saturate(1.8); }
    .samurai-aura { position: absolute; top: 20px; width: 160px; height: 300px; border-radius: 80px; background: radial-gradient(ellipse, rgba(200,0,0,0.45) 0%, transparent 70%); animation: auraPulse 1.4s ease-in-out infinite; pointer-events: none; }
    .speech-bubble { margin-top: 12px; background: rgba(0,0,0,0.88); border: 1px solid rgba(200,0,0,0.55); border-radius: 14px; padding: 10px 16px; max-width: 200px; text-align: center; animation: bubblePop 0.4s ease 2s both; }
    .speech-text-pass { color: #ffd700; font-size: 13px; font-weight: 700; line-height: 1.5; letter-spacing: 0.5px; }
    .speech-text-fail { color: #ff6060; font-size: 13px; font-weight: 700; line-height: 1.5; letter-spacing: 0.5px; }
  `;
  document.head.appendChild(el);
}

// Web kanji rain
function WebKanjiRain() {
  const cols = useRef(
    Array.from({ length: 22 }, (_, i) => ({
      id: i,
      char: KANJI[i % KANJI.length],
      left: `${(100 / 22) * i + Math.random() * 3}vw`,
      fontSize: `${18 + Math.floor(Math.random() * 22)}px`,
      duration: `${2800 + Math.random() * 2800}ms`,
      delay: `${Math.random() * 2000}ms`,
      color: Math.random() > 0.3 ? '#cc0000' : '#ff3333',
      glow: Math.random() > 0.5 ? '0 0 14px rgba(255,20,20,0.9),0 0 28px rgba(200,0,0,0.6)' : '0 0 10px rgba(255,0,0,0.7)',
    }))
  ).current;

  return (
    <>
      {cols.map(c =>
        React.createElement('div', {
          key: c.id,
          className: 'kanji-char',
          style: {
            left: c.left,
            fontSize: c.fontSize,
            color: c.color,
            textShadow: c.glow,
            animation: `kanjiRain ${c.duration} linear ${c.delay} infinite`,
          },
        }, c.char)
      )}
    </>
  );
}



// Score ring
function ScoreRing({ score, passed }: { score: number; passed: boolean }) {
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, tension: 65, friction: 6, useNativeDriver: true }).start();
  }, []);
  const color = passed ? '#ffd700' : '#e63946';
  return (
    <Animated.View style={[s.scoreRing, { borderColor: color, transform: [{ scale }] }]}>
      <Text style={[s.scoreNum, { color }]}>{score}%</Text>
      <Text style={s.scoreLabel}>{passed ? 'PASSED' : 'FAILED'}</Text>
    </Animated.View>
  );
}

// Mistake review
function MistakeReview({ questions, answers, onClose }: { questions: any[]; answers: number[]; onClose: () => void }) {
  const wrong = questions
    .map((q, i) => ({ q, user: answers[i], correct: q.correctAnswerIndex }))
    .filter(x => x.user !== x.correct);
  return (
    <View style={s.reviewOverlay}>
      <View style={s.reviewPanel}>
        <Text style={s.reviewTitle}>Mistake Review</Text>
        <Text style={s.reviewSub}>{wrong.length} mistake{wrong.length !== 1 ? 's' : ''}</Text>
        <ScrollView style={{ maxHeight: SH * 0.5 }} showsVerticalScrollIndicator={false}>
          {wrong.length === 0
            ? <Text style={{ color: '#ffd700', textAlign: 'center', marginTop: 20 }}>Perfect score!</Text>
            : wrong.map((item, i) => (
              <View key={i} style={s.mistakeCard}>
                <Text style={s.mistakeQ}>{item.q.question}</Text>
                <View style={s.mistakeRow}>
                  <FontAwesome name="times-circle" size={13} color="#e63946" style={{ marginRight: 6 }} />
                  <Text style={s.mistakeWrong}>Your: {item.q.options[item.user] ?? 'Skipped'}</Text>
                </View>
                <View style={s.mistakeRow}>
                  <FontAwesome name="check-circle" size={13} color="#4caf50" style={{ marginRight: 6 }} />
                  <Text style={s.mistakeCorrect}>Correct: {item.q.options[item.correct]}</Text>
                </View>
                {item.q.explanation ? <Text style={s.mistakeExplain}>{item.q.explanation}</Text> : null}
              </View>
            ))
          }
        </ScrollView>
        <TouchableOpacity style={s.closeBtn} onPress={onClose}>
          <Text style={s.closeBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main export ────────────────────────────────────────────────────
export default function QuizResult({
  result, questions, answers, level, section, onRetry, onHome
}: {
  result: any; questions: any[]; answers: number[];
  level: string; section: string;
  onRetry: () => void; onHome: () => void;
}) {
  useEffect(() => { injectCSS(); }, []);

  const [showReview, setShowReview] = useState(false);
  const popupScale = useRef(new Animated.Value(0.7)).current;
  const popupOp    = useRef(new Animated.Value(0)).current;
  const trophyY    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(popupScale, { toValue: 1, tension: 70, friction: 7, useNativeDriver: true }),
      Animated.timing(popupOp, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
    Animated.loop(Animated.sequence([
      Animated.timing(trophyY, { toValue: -10, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(trophyY, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, []);

  const handleClaimCertificate = async () => {
    if (result.certificateId) {
      const url = `${API_URL}/certificates/preview/${result.certificateId}`;
      await WebBrowser.openBrowserAsync(url);
    } else {
      // Fallback: If for some reason certId is missing, go to profile/certs
      onHome();
    }
  };

  return (
    <View style={s.container}>
      {/* Dark backdrop */}
      <View style={s.backdrop} />

      {/* Kanji rain — web only */}
      {Platform.OS === 'web' && <WebKanjiRain />}



      {/* Mistake review */}
      {showReview && (
        <MistakeReview questions={questions} answers={answers} onClose={() => setShowReview(false)} />
      )}

      {/* Popup card */}
      {!showReview && (
        <View style={s.popupWrapper}>
          <Animated.View style={[s.popup, {
            transform: [{ scale: popupScale }], opacity: popupOp,
            borderColor: result.passed ? 'rgba(255,215,0,0.4)' : 'rgba(230,57,70,0.4)',
          }]}>
            {result.passed && (
              <Text style={s.congratsText}>Congratulations, Warrior!</Text>
            )}
            <Animated.View style={{ transform: [{ translateY: trophyY }], marginBottom: 12 }}>
              <FontAwesome
                name={result.passed ? 'trophy' : 'times-circle'}
                size={52} color={result.passed ? '#ffd700' : '#e63946'}
              />
            </Animated.View>

            <ScoreRing score={result.score} passed={result.passed} />

            <Text style={[s.popupTitle, { color: result.passed ? '#ffd700' : '#e63946' }]}>
              {result.passed ? 'The Blade is Sharp' : 'Train Harder, Warrior'}
            </Text>
            <Text style={s.popupDetails}>{result.correctCount} / {result.totalQuestions} correct</Text>

            {result.passed && (
              <View style={s.certBadge}>
                <FontAwesome name="certificate" size={13} color="#ffd700" style={{ marginRight: 7 }} />
                <Text style={s.certText}>{level} {section} Certificate Earned!</Text>
              </View>
            )}

            <View style={s.divider} />
              <View style={s.btns}>
                <TouchableOpacity style={s.reviewBtn} onPress={() => setShowReview(true)}>
                  <FontAwesome name="search" size={13} color="#a0a8ff" style={{ marginRight: 7 }} />
                  <Text style={s.reviewBtnText}>Review Mistakes</Text>
                </TouchableOpacity>

                {result.passed && (
                  <TouchableOpacity 
                    style={[s.reviewBtn, { backgroundColor: 'rgba(212,175,55,0.1)', borderColor: 'rgba(212,175,55,0.3)' }]} 
                    onPress={handleClaimCertificate}
                  >
                    <FontAwesome name="certificate" size={13} color="#d4af37" style={{ marginRight: 7 }} />
                    <Text style={[s.reviewBtnText, { color: '#d4af37' }]}>Claim Certificate</Text>
                  </TouchableOpacity>
                )}

                {!result.passed && (
                  <TouchableOpacity style={s.retryBtn} onPress={onRetry}>
                    <FontAwesome name="refresh" size={13} color="#fff" style={{ marginRight: 7 }} />
                    <Text style={s.btnText}>Retry Quiz</Text>
                  </TouchableOpacity>
                )}
              <TouchableOpacity style={[s.continueBtn, !result.passed && { backgroundColor: 'rgba(255,255,255,0.08)' }]} onPress={onHome}>
                <FontAwesome name={result.passed ? 'arrow-right' : 'home'} size={13} color="#fff" style={{ marginRight: 7 }} />
                <Text style={s.btnText}>{result.passed ? 'Continue Journey' : 'Back to Home'}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.78)', zIndex: 2 },
  popupWrapper: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: '5%' },
  popup: { width: '100%', maxWidth: 460, backgroundColor: 'rgba(8,8,18,0.97)', borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, shadowColor: '#c8002a', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 40, elevation: 24 },
  congratsText: { color: 'rgba(255,215,0,0.9)', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', fontWeight: '700', marginBottom: 10 },
  scoreRing: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, alignItems: 'center', justifyContent: 'center', marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.03)' },
  scoreNum: { fontSize: 24, fontWeight: 'bold' },
  scoreLabel: { fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  popupTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 5, letterSpacing: 0.5 },
  popupDetails: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 14 },
  certBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,215,0,0.07)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.22)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 14, width: '100%' },
  certText: { color: '#ffd700', fontSize: 12, flex: 1 },
  divider: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 14 },
  btns: { width: '100%', gap: 9 },
  reviewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 11, backgroundColor: 'rgba(80,80,200,0.12)', borderWidth: 1, borderColor: 'rgba(130,130,255,0.25)' },
  reviewBtnText: { color: '#a0a8ff', fontSize: 14, fontWeight: '600' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)' },
  continueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 11, backgroundColor: Theme.colors.primary },
  btnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  reviewOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 30, backgroundColor: 'rgba(0,0,0,0.93)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  reviewPanel: { width: '100%', maxWidth: 500, backgroundColor: 'rgba(12,12,22,0.99)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(100,100,255,0.2)' },
  reviewTitle: { color: '#fff', fontSize: 19, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  reviewSub: { color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', marginBottom: 14 },
  mistakeCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 11, padding: 13, marginBottom: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  mistakeQ: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 7, lineHeight: 20 },
  mistakeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  mistakeWrong: { color: '#e63946', fontSize: 13, flex: 1 },
  mistakeCorrect: { color: '#4caf50', fontSize: 13, flex: 1 },
  mistakeExplain: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 5, fontStyle: 'italic' },
  closeBtn: { marginTop: 13, padding: 13, borderRadius: 11, backgroundColor: Theme.colors.primary, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
