import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { FontAwesome } from '@expo/vector-icons';
import ConfirmModal from '../../components/ConfirmModal';
import ShineButton from '../../components/ShineButton';

export default function RegisterScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState('user');
    const [adminCode, setAdminCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [popupVisible, setPopupVisible] = useState(false);
    const [popupConfig, setPopupConfig] = useState({ type: 'success' as 'success'|'error', title: '', message: '' });
    
    const { register } = useContext(AuthContext);
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const styles = makeStyles(colors, isDark);

    const handleRegister = async () => {
        setLoading(true);
        const res = await register(name, email, password, role, adminCode);
        setLoading(false);
        if (res.success) {
            setPopupConfig({ type: 'success', title: 'Registration Success', message: 'Your account has been created!' });
            setPopupVisible(true);
            setTimeout(() => {
                setPopupVisible(false);
                if (res.role === 'admin') router.replace('/(admin)');
                else router.replace('/(tabs)');
            }, 1500);
        } else {
            setPopupConfig({ type: 'error', title: 'Registration Failed', message: res.msg });
            setPopupVisible(true);
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <ConfirmModal 
                visible={popupVisible}
                title={popupConfig.title}
                message={popupConfig.message}
                hideCancel={true}
                isSuccess={popupConfig.type === 'success'}
                isDestructive={popupConfig.type === 'error'}
                confirmText="OK"
                onConfirm={() => setPopupVisible(false)}
            />
            <View style={styles.card}>
                <Image source={require('../../assets/images/red_samurai_logo.png')} style={styles.logo} resizeMode="contain" />
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>Register</Text>
                    <Text style={styles.titleJp}>登録</Text>
                </View>

                <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Full Name (氏名)</Text>
                    <TextInput
                        style={[styles.input, { outlineStyle: 'none' } as any]}
                        placeholder="John Doe"
                        placeholderTextColor={colors.textSecondary}
                        value={name}
                        onChangeText={setName}
                    />
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

                <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Role (役割)</Text>
                    <View style={styles.roleContainer}>
                        <TouchableOpacity 
                            style={[styles.roleButton, role === 'user' && styles.roleButtonActive]} 
                            onPress={() => setRole('user')}
                        >
                            <Text style={[styles.roleText, role === 'user' && styles.roleTextActive]}>User</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.roleButton, role === 'admin' && styles.roleButtonActive]} 
                            onPress={() => setRole('admin')}
                        >
                            <Text style={[styles.roleText, role === 'admin' && styles.roleTextActive]}>Admin</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {role === 'admin' && (
                    <View style={styles.inputWrapper}>
                        <Text style={styles.inputLabel}>Admin Code (管理者コード)</Text>
                        <TextInput
                            style={[styles.input, { outlineStyle: 'none' } as any]}
                            placeholder="Secret Code"
                            placeholderTextColor={colors.textSecondary}
                            value={adminCode}
                            onChangeText={setAdminCode}
                            secureTextEntry
                        />
                    </View>
                )}
                
                <ShineButton title="REGISTER 登録" onPress={handleRegister} loading={loading} style={{marginTop: 10}} />

                <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.linkContainer}>
                    <Text style={styles.linkText}>Already have an account? </Text>
                    <Text style={styles.linkTextBold}>Login (ログイン)</Text>
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
        marginBottom: 35,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: colors.text,
        letterSpacing: 2,
    },
    titleJp: {
        fontSize: 16,
        color: colors.primary,
        fontWeight: 'bold',
        marginTop: 5,
        letterSpacing: 4,
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
    roleContainer: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
    },
    roleButton: {
        flex: 1,
        height: 45,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 5,
        borderRadius: 12,
    },
    roleButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    roleText: {
        color: colors.textSecondary,
        fontWeight: 'bold',
    },
    roleTextActive: {
        color: '#FFFFFF',
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
