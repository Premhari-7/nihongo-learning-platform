import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, useWindowDimensions, ScrollView } from 'react-native';
import { Theme } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';
import { AuthContext, API_URL } from '../../context/AuthContext';
import { CourseContext } from '../../context/CourseContext';
import axios from 'axios';
import { FontAwesome } from '@expo/vector-icons';
import GlassCard from '../../components/GlassCard';
import SecureVideoPlayer from '../../components/SecureVideoPlayer';
import { useRouter } from 'expo-router';

export default function LearnDashboard() {
    const { user } = useContext(AuthContext);
    const { selectedCourse } = useContext(CourseContext);
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const styles = makeStyles(colors, isDark);
    const { width } = useWindowDimensions();
    const isDesktop = width >= 768;

    const [videos, setVideos] = useState<any[]>([]);
    const [progress, setProgress] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);

    useEffect(() => {
        if (selectedCourse && user) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [selectedCourse, user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch all videos, then filter by course (or fetch specific course)
            const videoRes = await axios.get(`${API_URL}/videos`);
            const filteredVideos = videoRes.data.filter((v: any) => 
                v.jlptLevel === selectedCourse.level && v.section === selectedCourse.section
            );
            
            // Assuming videos need to be sorted by some order or just by creation
            setVideos(filteredVideos);

            // Fetch progress
            const userId = user.id || user._id;
            const progRes = await axios.get(`${API_URL}/progress/${userId}/${selectedCourse.id}`);
            setProgress(progRes.data);
            
            // Find first uncompleted video
            let firstUncompletedIdx = 0;
            for (let i = 0; i < filteredVideos.length; i++) {
                const vidProg = progRes.data.find((p: any) => p.videoId === filteredVideos[i]._id);
                if (!vidProg || !vidProg.isCompleted) {
                    firstUncompletedIdx = i;
                    break;
                }
            }
            setSelectedVideoIndex(firstUncompletedIdx);
        } catch (err) {
            console.error('Error fetching learn data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleVideoComplete = () => {
        // Refresh progress
        fetchData();
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!selectedCourse) {
        return (
            <View style={styles.noCourseContainer}>
                <FontAwesome name="graduation-cap" size={60} color={colors.textSecondary} style={{ marginBottom: 20 }} />
                <Text style={styles.noCourseTitle}>Ready to Learn?</Text>
                <Text style={styles.noCourseSubtitle}>Please select a course from the Courses catalog to unlock your dashboard.</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(tabs)/two')}>
                    <Text style={styles.primaryBtnText}>Browse Courses</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (videos.length === 0) {
        return (
            <View style={styles.noCourseContainer}>
                <FontAwesome name="file-video-o" size={60} color={colors.textSecondary} style={{ marginBottom: 20 }} />
                <Text style={styles.noCourseTitle}>No Videos Yet</Text>
                <Text style={styles.noCourseSubtitle}>There are no lessons available for {selectedCourse.level} {selectedCourse.section} yet.</Text>
            </View>
        );
    }

    const currentVideo = videos[selectedVideoIndex];
    const currentVideoProgress = progress.find(p => p.videoId === currentVideo?._id);
    const isCurrentVideoCompleted = currentVideoProgress?.isCompleted || false;

    // Quiz unlocks only when ALL videos in the course are completed
    const allVideosCompleted = videos.length > 0 && videos.every(
        (v: any) => progress.find((p: any) => p.videoId === v._id)?.isCompleted
    );

    return (
        <View style={[styles.dashboardContainer, isDesktop ? { flexDirection: 'row' } : { flexDirection: 'column' }]}>
            {/* Left Sidebar: Lesson List */}
            <View style={[styles.sidebar, isDesktop ? { width: 350, borderRightWidth: 1 } : { width: '100%', height: 300, borderBottomWidth: 1 }]}>
                <View style={styles.sidebarHeader}>
                    <Text style={styles.courseTitle}>{selectedCourse.level} {selectedCourse.section}</Text>
                    <Text style={styles.courseSubtitle}>{videos.length} Modules</Text>
                </View>
                
                <FlatList
                    data={videos}
                    keyExtractor={item => item._id}
                    renderItem={({ item, index }) => {
                        const isUnlocked = index === 0 || progress.find(p => p.videoId === videos[index - 1]?._id)?.isCompleted;
                        const isCompleted = progress.find(p => p.videoId === item._id)?.isCompleted;
                        const isActive = selectedVideoIndex === index;

                        return (
                            <TouchableOpacity 
                                disabled={!isUnlocked}
                                onPress={() => setSelectedVideoIndex(index)}
                                style={[
                                    styles.lessonItem,
                                    isActive && styles.lessonItemActive,
                                    !isUnlocked && styles.lessonItemLocked
                                ]}
                            >
                                <View style={styles.lessonItemLeft}>
                                    <View style={[
                                        styles.lessonNumberBg,
                                        isCompleted && { backgroundColor: `${colors.success}20`, borderColor: colors.success, borderWidth: 1 }
                                    ]}>
                                        <Text style={[styles.lessonNumberText, isCompleted && { color: colors.success }]}>{index + 1}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.lessonTitle, !isUnlocked && styles.lessonTitleLocked]} numberOfLines={1}>{item.title}</Text>
                                        <Text style={styles.lessonDuration}>Video Lesson</Text>
                                    </View>
                                </View>
                                
                                <View style={styles.lessonItemIcon}>
                                    {isCompleted ? (
                                        <FontAwesome name="check-circle" size={18} color={colors.success} />
                                    ) : !isUnlocked ? (
                                        <FontAwesome name="lock" size={16} color={colors.textSecondary} />
                                    ) : isActive ? (
                                        <FontAwesome name="play-circle" size={18} color={colors.primary} />
                                    ) : null}
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>

            {/* Right Content Area: Video Player & Info */}
            <ScrollView style={styles.contentArea} contentContainerStyle={{ paddingBottom: 50 }}>
                {currentVideo && (
                    <>
                        <View style={styles.videoHeader}>
                            <Text style={styles.contentTitle}>Module {selectedVideoIndex + 1}: {currentVideo.title}</Text>
                            {isCurrentVideoCompleted && (
                                <View style={styles.badgeSuccess}>
                                    <FontAwesome name="check" size={12} color="#fff" style={{ marginRight: 5 }} />
                                    <Text style={styles.badgeSuccessText}>Completed</Text>
                                </View>
                            )}
                        </View>

                        {currentVideo.url && currentVideo.url.startsWith('http') ? (
                            <SecureVideoPlayer
                                key={currentVideo._id}
                                videoUri={currentVideo.url}
                                videoId={currentVideo._id}
                                onComplete={handleVideoComplete}
                            />
                        ) : (
                            <View style={{ width: '100%', aspectRatio: 16/9, backgroundColor: '#1a1a1a', borderRadius: 16, borderWidth: 2, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                                <FontAwesome name="exclamation-triangle" size={36} color="#E63946" style={{ marginBottom: 10 }} />
                                <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 6 }}>Video Unavailable</Text>
                                <Text style={{ color: '#aaa', fontSize: 13, textAlign: 'center', paddingHorizontal: 30 }}>
                                    This video was uploaded before cloud storage was enabled. Please ask admin to re-upload it.
                                </Text>
                            </View>
                        )}

                        <View style={styles.notesSection}>
                            <Text style={styles.notesTitle}>Instructor Notes</Text>
                            <GlassCard style={styles.notesCard}>
                                <Text style={styles.notesText}>
                                    {currentVideo.description || "No specific notes provided for this module. Please pay close attention to the video and practice the kanji patterns."}
                                </Text>
                            </GlassCard>
                        </View>

                        <View style={[styles.quizSection, !isDesktop && { flexDirection: 'column', alignItems: 'flex-start' }]}>
                            <View style={[styles.quizInfo, !isDesktop && { marginRight: 0, marginBottom: 20 }]}>
                                <FontAwesome name="question-circle" size={24} color={colors.primary} style={{ marginRight: 15 }} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.notesTitle}>{selectedCourse.level} {selectedCourse.section} Final Quiz</Text>
                                    <Text style={styles.notesText}>Complete all videos to unlock the final quiz for this section.</Text>
                                </View>
                            </View>
                            
                            <TouchableOpacity 
                                style={[styles.quizBtn, !allVideosCompleted && styles.quizBtnDisabled, !isDesktop && { alignSelf: 'stretch', justifyContent: 'center' }]}
                                disabled={!allVideosCompleted}
                                onPress={() => router.push(`/quiz?level=${selectedCourse.level}&section=${selectedCourse.section}`)}
                            >
                                <Text style={styles.quizBtnText}>
                                    {allVideosCompleted ? "Take Quiz" : "Complete all videos to unlock quiz"}
                                </Text>
                                <FontAwesome name={allVideosCompleted ? "arrow-right" : "lock"} size={16} color={!allVideosCompleted ? colors.textSecondary : "#fff"} style={{ marginLeft: 10 }} />
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

function makeStyles(colors: any, isDark: boolean) {
    return StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        flexDirection: 'row',
    },
    noCourseContainer: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    noCourseTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 10,
    },
    noCourseSubtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 24,
    },
    primaryBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    primaryBtnText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    dashboardContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    sidebar: {
        width: 320,
        backgroundColor: colors.card,
        borderRightWidth: 1,
        borderRightColor: colors.border,
    },
    sidebarHeader: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: isDark ? '#1A1410' : '#F8F5F0',
    },
    courseTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
    },
    courseSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 5,
    },
    videoItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
    },
    videoItemActive: {
        backgroundColor: 'rgba(155, 28, 28, 0.05)',
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },
    // Lesson item styles (sidebar)
    lessonItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    lessonItemActive: {
        backgroundColor: 'rgba(155, 28, 28, 0.06)',
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    lessonItemLocked: {
        opacity: 0.45,
    },
    lessonItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    lessonItemIcon: {
        width: 24,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    lessonNumberBg: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: isDark ? '#2E2218' : '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    lessonNumberText: {
        color: colors.text,
        fontSize: 12,
        fontWeight: 'bold',
    },
    lessonTitle: {
        color: colors.text,
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 3,
        paddingRight: 10,
    },
    lessonTitleLocked: {
        color: colors.textSecondary,
    },
    lessonDuration: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    contentArea: {
        flex: 1,
        padding: 30,
    },
    videoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    contentTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: colors.text,
        flex: 1,
    },
    badgeSuccess: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.success,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    badgeSuccessText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    notesSection: {
        marginTop: 20,
        marginBottom: 30,
    },
    notesTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 15,
    },
    notesCard: {
        padding: 25,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
    },
    notesText: {
        color: colors.textSecondary,
        fontSize: 15,
        lineHeight: 24,
    },
    quizSection: {
        backgroundColor: colors.card,
        padding: 25,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    quizInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 20,
    },
    quizBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: 25,
        paddingVertical: 15,
        borderRadius: 25,
    },
    quizBtnDisabled: {
        backgroundColor: isDark ? '#3D2F22' : '#E8D9C5',
    },
    quizBtnText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14,
    }
    });
}
