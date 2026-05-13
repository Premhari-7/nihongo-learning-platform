import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import { Theme } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';
import { API_URL } from '../../context/AuthContext';
import axios from 'axios';
import { FontAwesome } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

export default function AdminCertificates() {
    const { colors, isDark } = useTheme();
    const styles = makeStyles(colors, isDark);
    const [certificates, setCertificates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [stats, setStats] = useState({ total: 0, revoked: 0 });

    useEffect(() => {
        fetchCertificates();
    }, [search]);

    const fetchCertificates = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/certificates/admin/all?search=${search}`);
            setCertificates(res.data);
            setStats({
                total: res.data.length,
                revoked: 0 // We no longer support revoking
            });
        } catch (err) {
            console.error('Error fetching certificates:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePreview = async (certId: string, courseName: string = 'Course') => {
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
            console.error('Preview/Download failed:', err);
            Alert.alert('Error', 'Failed to open certificate preview.');
        }
    };

    const renderHeader = () => (
        <View style={styles.headerSection}>
            <View style={styles.statsContainer}>
                <View style={[styles.statCard, { borderLeftColor: '#d4af37' }]}>
                    <Text style={styles.statLabel}>Total Issued (発行済み)</Text>
                    <Text style={styles.statValue}>{stats.total}</Text>
                </View>
            </View>

            <View style={styles.searchBar}>
                <FontAwesome name="search" size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
                <TextInput
                    style={[styles.searchInput, { outlineStyle: 'none' } as any]}
                    placeholder="Search by student name, email, or ID... (検索)"
                    placeholderTextColor={colors.textSecondary}
                    value={search}
                    onChangeText={setSearch}
                />
            </View>
        </View>
    );

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.row}>
            <View style={{ flex: 2 }}>
                <Text style={styles.studentName}>{item.userName}</Text>
                <Text style={styles.studentEmail}>{item.userEmail}</Text>
                <Text style={styles.certId}>ID: {item.certificateId}</Text>
            </View>
            <View style={{ flex: 1.5 }}>
                <Text style={styles.courseName}>{item.courseName}</Text>
                <Text style={styles.issuedDate}>{new Date(item.issuedDate).toLocaleDateString()}</Text>
            </View>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <View style={[styles.scoreBadge, { backgroundColor: item.score >= 90 ? 'rgba(76,175,80,0.1)' : 'rgba(212,175,55,0.1)' }]}>
                    <Text style={[styles.scoreText, { color: item.score >= 90 ? '#4caf50' : '#d4af37' }]}>{item.score}%</Text>
                </View>
            </View>
            <View style={styles.actionCell}>
                <TouchableOpacity 
                    style={styles.iconBtn}
                    onPress={() => handlePreview(item.certificateId, item.courseName)}
                >
                    <FontAwesome name="eye" size={18} color={colors.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {renderHeader()}
            
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={styles.tableHeader}>
                    <Text style={[styles.columnHeader, { flex: 2 }]}>Student / Email</Text>
                    <Text style={[styles.columnHeader, { flex: 1.5 }]}>Course</Text>
                    <Text style={[styles.columnHeader, { flex: 1, textAlign: 'center' }]}>Score</Text>
                    <Text style={[styles.columnHeader, { flex: 1, textAlign: 'right' }]}>Actions</Text>
                </View>
                
                {loading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : certificates.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No certificates found.</Text>
                    </View>
                ) : (
                    certificates.map((item) => (
                        <View key={item._id} style={styles.row}>
                            <View style={{ flex: 2, paddingRight: 8 }}>
                                <Text style={styles.studentName} numberOfLines={1}>{item.userName}</Text>
                                <Text style={styles.studentEmail} numberOfLines={1}>{item.userEmail}</Text>
                                <Text style={styles.certId} numberOfLines={1}>ID: {item.certificateId}</Text>
                            </View>
                            <View style={{ flex: 1.5, paddingRight: 8 }}>
                                <Text style={styles.courseName} numberOfLines={1}>{item.courseName}</Text>
                                <Text style={styles.issuedDate}>{new Date(item.issuedDate).toLocaleDateString()}</Text>
                            </View>
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <View style={[styles.scoreBadge, { backgroundColor: item.score >= 90 ? 'rgba(76,175,80,0.1)' : 'rgba(212,175,55,0.1)' }]}>
                                    <Text style={[styles.scoreText, { color: item.score >= 90 ? '#4caf50' : '#d4af37' }]}>{item.score}%</Text>
                                </View>
                            </View>
                            <View style={styles.actionCell}>
                                <TouchableOpacity 
                                    style={styles.iconBtn}
                                    onPress={() => handlePreview(item.certificateId, item.courseName)}
                                >
                                    <FontAwesome name="eye" size={18} color={colors.primary} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
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
    },
    headerSection: {
        padding: 20,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 15,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.background,
        padding: 20,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    statLabel: {
        color: colors.textSecondary,
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    statValue: {
        color: colors.text,
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 5,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 50,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: {
        flex: 1,
        color: colors.text,
        fontSize: 14,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 2,
        borderBottomColor: colors.border,
    },
    columnHeader: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    row: {
        flexDirection: 'row',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        alignItems: 'center',
        backgroundColor: colors.card,
    },
    studentName: {
        color: colors.primary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    studentEmail: {
        color: colors.textSecondary,
        fontSize: 11,
    },
    certId: {
        color: '#d4af37',
        fontSize: 10,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        marginTop: 2,
    },
    courseName: {
        color: colors.text,
        fontSize: 13,
        fontWeight: '600',
    },
    issuedDate: {
        color: colors.textSecondary,
        fontSize: 11,
        marginTop: 2,
    },
    scoreBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    scoreText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    actionCell: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 15,
    },
    iconBtn: {
        padding: 5,
    },
    revokedTag: {
        backgroundColor: 'rgba(230, 57, 70, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(230, 57, 70, 0.2)',
    },
    revokedText: {
        color: '#e63946',
        fontSize: 9,
        fontWeight: 'bold',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: colors.textSecondary,
        fontSize: 16,
    },
    });
}
