import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Theme } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';
import { CourseContext } from '../../context/CourseContext';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import GlassCard from '../../components/GlassCard';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function CoursesScreen() {
    const { setCourse, selectedCourse } = useContext(CourseContext);
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const styles = makeStyles(colors, isDark);
    const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

    const jlptLevels = [
        { id: 'N5', title: 'JLPT N5', desc: 'Beginner Level' },
        { id: 'N4', title: 'JLPT N4', desc: 'Basic Level' },
        { id: 'N3', title: 'JLPT N3', desc: 'Intermediate Level' },
        { id: 'N2', title: 'JLPT N2', desc: 'Pre-Advanced Level' },
        { id: 'N1', title: 'JLPT N1', desc: 'Advanced Level' },
    ];

    const sections = [
        { id: 'Kanji', icon: 'language' },
        { id: 'Vocabulary', icon: 'book' },
        { id: 'Grammar', icon: 'pencil' }
    ];

    const handleSelectCourse = async (level: string, section: string) => {
        await setCourse(level, section);
        router.push('/(tabs)/learn');
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Course Catalog</Text>
                <Text style={styles.headerSubtitle}>Select a course to start learning</Text>
            </View>

            {selectedCourse && (
                <View style={styles.currentCourseContainer}>
                    <Text style={styles.sectionTitle}>Currently Enrolled</Text>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/learn')}>
                        <GlassCard style={styles.activeCourseCard}>
                            <View style={styles.activeCourseInfo}>
                                <View style={styles.activeIconBg}>
                                    <FontAwesome name="play" size={20} color="#fff" />
                                </View>
                                <View style={{ marginLeft: 15 }}>
                                    <Text style={styles.activeCourseTitle}>{selectedCourse.level} {selectedCourse.section}</Text>
                                    <Text style={styles.activeCourseSubtitle}>Continue Learning</Text>
                                </View>
                            </View>
                            <FontAwesome name="chevron-right" size={20} color={colors.primary} />
                        </GlassCard>
                    </TouchableOpacity>
                </View>
            )}

            <Text style={styles.sectionTitle}>JLPT Levels</Text>
            
            <View style={styles.levelsGrid}>
                {jlptLevels.map((level, index) => (
                    <Animated.View key={level.id} entering={FadeInDown.delay(index * 100).duration(500)} style={styles.levelCardWrapper}>
                        <TouchableOpacity 
                            style={styles.levelCard}
                            onPress={() => setSelectedLevel(selectedLevel === level.id ? null : level.id)}
                        >
                            <GlassCard style={[styles.glassCard, selectedLevel === level.id && styles.glassCardActive]}>
                                <Text style={[styles.levelTitle, selectedLevel === level.id && styles.textActive]}>{level.title}</Text>
                                <Text style={styles.levelDesc}>{level.desc}</Text>
                            </GlassCard>
                        </TouchableOpacity>

                        {/* Expandable Sections Menu */}
                        {selectedLevel === level.id && (
                            <Animated.View entering={FadeInDown.duration(300)} style={styles.sectionsContainer}>
                                {sections.map((section) => (
                                    <TouchableOpacity 
                                        key={section.id} 
                                        style={styles.sectionItem}
                                        onPress={() => handleSelectCourse(level.id, section.id)}
                                    >
                                        <View style={styles.sectionIconBg}>
                                            <FontAwesome name={section.icon as any} size={16} color={colors.primary} />
                                        </View>
                                        <Text style={styles.sectionItemText}>{section.id}</Text>
                                        <FontAwesome name="chevron-right" size={12} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                ))}
                            </Animated.View>
                        )}
                    </Animated.View>
                ))}
            </View>
        </ScrollView>
    );
}

function makeStyles(colors: any, isDark: boolean) {
    return StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: colors.background,
        padding: 20,
        paddingBottom: 50,
    },
    header: {
        marginTop: 20,
        marginBottom: 30,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 5,
    },
    headerSubtitle: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 15,
        marginTop: 10,
    },
    currentCourseContainer: {
        marginBottom: 30,
    },
    activeCourseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderColor: 'rgba(230, 57, 70, 0.5)',
        backgroundColor: isDark ? 'rgba(230, 57, 70, 0.1)' : 'rgba(230, 57, 70, 0.05)',
    },
    activeCourseInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    activeIconBg: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 5,
    },
    activeCourseTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    activeCourseSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 2,
    },
    levelsGrid: {
        flexDirection: 'column',
    },
    levelCardWrapper: {
        marginBottom: 15,
    },
    levelCard: {
        width: '100%',
    },
    glassCard: {
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    glassCardActive: {
        borderColor: colors.primary,
        backgroundColor: colors.card,
    },
    levelTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.text,
    },
    textActive: {
        color: colors.primary,
    },
    levelDesc: {
        fontSize: 15,
        fontWeight: '600',
        color: isDark ? '#D4C9B8' : colors.textSecondary,
    },
    sectionsContainer: {
        marginTop: 10,
        paddingHorizontal: 15,
        borderLeftWidth: 2,
        borderLeftColor: colors.border,
        marginLeft: 15,
    },
    sectionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    sectionIconBg: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: isDark ? 'rgba(230, 57, 70, 0.15)' : 'rgba(230, 57, 70, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    sectionItemText: {
        flex: 1,
        fontSize: 16,
        color: colors.text,
    }
    });
}
