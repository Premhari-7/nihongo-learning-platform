import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, FlatList, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Theme } from '../constants/Theme';
import { useTheme } from '../context/ThemeContext';
import { AuthContext, API_URL } from '../context/AuthContext';
import axios from 'axios';
import { FontAwesome } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import Animated, { FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function CertificateScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const styles = makeStyles(colors, isDark);
    const { user } = useContext(AuthContext);
    const [certificates, setCertificates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchCertificates();
        }
    }, [user]);

    const fetchCertificates = async () => {
        try {
            const userId = user?.id || user?._id;
            const res = await axios.get(`${API_URL}/certificates/my/${userId}`);
            setCertificates(res.data);
        } catch (err) {
            console.error('Error fetching certificates:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleViewCertificate = async (certId: string, courseName: string) => {
        try {
            if (Platform.OS === 'web') {
                const url = `${API_URL}/certificates/preview/${certId}`;
                const response = await fetch(url);
                const htmlContent = await response.text();
                const blob = new Blob([htmlContent], { type: 'text/html' });
                const blobUrl = URL.createObjectURL(blob);
                
                // Open in a new tab instead of downloading
                window.open(blobUrl, '_blank');
            } else {
                const url = `${API_URL}/certificates/preview/${certId}`;
                await WebBrowser.openBrowserAsync(url);
            }
        } catch (err) {
            console.error('Download failed:', err);
        }
    };

    const renderCertificateItem = ({ item, index }: { item: any, index: number }) => (
        <Animated.View 
            entering={FadeInUp.delay(index * 100).duration(500)}
            style={styles.certCard}
        >
            <View style={styles.certHeader}>
                <View style={styles.iconContainer}>
                    <FontAwesome name="certificate" size={24} color="#d4af37" />
                </View>
                <View style={styles.certTitleContainer}>
                    <Text style={styles.certTitle}>{item.courseName}</Text>
                    <Text style={styles.certDate}>Issued on {new Date(item.issuedDate).toLocaleDateString()}</Text>
                </View>
                <View style={styles.scoreBadge}>
                    <Text style={styles.scoreText}>{item.score}%</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.certFooter}>
                <View>
                    <Text style={styles.idLabel}>Certificate ID</Text>
                    <Text style={styles.idValue}>{item.certificateId}</Text>
                </View>
                <TouchableOpacity 
                    style={styles.viewBtn}
                    onPress={() => handleViewCertificate(item.certificateId, item.courseName)}
                >
                    <Text style={styles.viewBtnText}>View Certificate</Text>
                    <FontAwesome name="eye" size={14} color="#fff" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <FontAwesome name="arrow-left" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>My Certificates</Text>
                <View style={{ width: 40 }} />
            </View>

            {certificates.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <FontAwesome name="mortar-board" size={80} color="rgba(255,255,255,0.1)" />
                    <Text style={styles.emptyText}>No certificates earned yet.</Text>
                    <Text style={styles.emptySubText}>Pass quizzes with 80% or more to earn your official certificates!</Text>
                    <TouchableOpacity 
                        style={styles.exploreBtn}
                        onPress={() => router.push('/(tabs)/learn')}
                    >
                        <Text style={styles.exploreBtnText}>Start Learning</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={certificates}
                    renderItem={renderCertificateItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

function makeStyles(colors: any, isDark: boolean) {
    return StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: colors.card,
    },
    backBtn: {
        padding: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
    },
    listContent: {
        padding: 20,
        paddingBottom: 40,
    },
    certCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,215,0,0.15)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    certHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    certTitleContainer: {
        flex: 1,
    },
    certTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    certDate: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
    },
    scoreBadge: {
        backgroundColor: 'rgba(76, 175, 80, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(76, 175, 80, 0.3)',
    },
    scoreText: {
        color: '#4caf50',
        fontWeight: 'bold',
        fontSize: 14,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 15,
    },
    certFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    idLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    idValue: {
        fontSize: 13,
        color: colors.text,
        fontWeight: '600',
        marginTop: 2,
    },
    viewBtn: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 10,
    },
    viewBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: 20,
    },
    emptySubText: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 22,
    },
    exploreBtn: {
        marginTop: 30,
        backgroundColor: colors.primary,
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 12,
    },
    exploreBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    });
}
