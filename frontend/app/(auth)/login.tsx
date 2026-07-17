import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { FontAwesome } from '@expo/vector-icons';
import AnimatedPopup from '../../components/AnimatedPopup';
import ShineButton from '../../components/ShineButton';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [popupVisible, setPopupVisible] = useState(false);
    const [popupConfig, setPopupConfig] = useState({ type: 'success' as 'success' | 'error', title: '', message: '' });

    const { login } = useContext(AuthContext);
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const styles = makeStyles(colors, isDark);

    const handleLogin = async () => {
        setLoading(true);
        const res = await login(email, password);
        setLoading(false);
        if (res.success) {
            setPopupConfig({ type: 'success', title: 'Login Success', message: 'Welcome back to Nihongo!' });
            setPopupVisible(true);
            setTimeout(() => {
                setPopupVisible(false);
                if (res.role === 'admin') router.replace('/(admin)');
                else router.replace('/(tabs)');
            }, 1500);
        } else {
            setPopupConfig({ type: 'error', title: 'Login Failed', message: res.msg });
            setPopupVisible(true);
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <AnimatedPopup
                    visible={popupVisible}
                    type={popupConfig.type}
                    title={popupConfig.title}
                    message={popupConfig.message}
                    onClose={() => setPopupVisible(false)}
                />
                <View style={styles.card}>
                    <Image source={require('../../assets/images/icon_circle.png')} style={styles.logo} resizeMode="contain" />
                    <View style={styles.titleContainer}>
                        <Text style={styles.platformName}>日本語 </Text>
                        <Text style={styles.title}>LOGIN</Text>
                        <Text style={styles.titleJp}>ログイン — Sign In</Text>
                    </View>

                    <View style={styles.inputWrapper}>
                        <Text style={styles.inputLabel}>Email (メール)</Text>
                        <TextInput
                            style={[styles.input, { outlineStyle: 'none' } as any]}
                            placeholder="your@email.com"
                            placeholderTextColor={colors.textSecondary}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputWrapper}>
                        <Text style={styles.inputLabel}>Password (パスワード)</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={[styles.passwordInput, { outlineStyle: 'none' } as any]}
                                placeholder="Password"
                                placeholderTextColor={colors.textSecondary}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                                <FontAwesome name={showPassword ? 'eye-slash' : 'eye'} size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ShineButton title="LOGIN ログイン" onPress={handleLogin} loading={loading} style={{marginTop: 10}} />

                    <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.linkContainer}>
                        <Text style={styles.linkText}>New here? </Text>
                        <Text style={styles.linkTextBold}>Register (登録)</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function makeStyles(colors: any, isDark: boolean) {
    return StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        paddingVertical: 40,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: colors.surface,
        padding: 40,
        borderRadius: 24,
        alignItems: 'center',
        shadowColor: colors.neonGlow,
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
        elevation: 15,
        borderWidth: 1,
        borderColor: 'rgba(155, 28, 28, 0.2)',
    },
    logo: {
        width: 90,
        height: 90,
        marginBottom: 20,
        borderRadius: 45,
        borderWidth: 3,
        borderColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
    },
    titleContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    platformName: {
        fontSize: 13,
        fontWeight: '900',
        color: colors.primary,
        letterSpacing: 4,
        marginBottom: 6,
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        color: colors.text,
        letterSpacing: 1,
        marginBottom: 4,
    },
    titleJp: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '700',
        letterSpacing: 3,
    },
    inputWrapper: {
        width: '100%',
        marginBottom: 20,
    },
    inputLabel: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        width: '100%',
        height: 55,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        paddingHorizontal: 15,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
        fontSize: 16,
    },
    passwordContainer: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        height: 55,
    },
    passwordInput: {
        flex: 1,
        height: '100%',
        paddingHorizontal: 15,
        color: colors.text,
    },
    eyeIcon: {
        paddingHorizontal: 15,
        height: '100%',
        justifyContent: 'center',
    },
    linkContainer: {
        marginTop: 25,
        flexDirection: 'row',
        alignItems: 'center',
    },
    linkText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    linkTextBold: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: 'bold',
    }
    });
}
