import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Animated, Image } from 'react-native';
import { Theme } from '../constants/Theme';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { API_URL } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';

export default function ChatScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const styles = makeStyles(colors, isDark);
    const [messages, setMessages] = useState([
        { id: '1', text: 'Konnichiwa! I am your AI Samurai Assistant. How can I help you with your Japanese studies?', sender: 'ai' }
    ]);
    const [inputText, setInputText] = useState('');

    const scrollViewRef = useRef<ScrollView>(null);
    const [isAwake, setIsAwake] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    useEffect(() => {
        // Auto-scroll to bottom on new message with delay so layout completes
        const timer = setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
        return () => clearTimeout(timer);
    }, [messages]);

    const sendMessage = async () => {
        if (!inputText.trim()) return;
        const userText = inputText;
        const newMsg = { id: Date.now().toString(), text: userText, sender: 'user' };
        setMessages(prev => [...prev, newMsg]);
        setInputText('');
        setIsAwake(true);
        setIsTyping(true);
        
        try {
            const res = await axios.post(`${API_URL}/chat`, { message: userText });
            setMessages(prev => [...prev, { id: Date.now().toString(), text: res.data.reply, sender: 'ai' }]);
        } catch (err) {
            setMessages(prev => [...prev, { id: Date.now().toString(), text: 'Connection to Samurai brain failed. Check network.', sender: 'ai' }]);
        } finally {
            setIsTyping(false);
            setTimeout(() => setIsAwake(false), 5000); // Go back to sleep after 5s
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <FontAwesome name="times" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Samurai Assistant</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.canvasContainer}>
                <Animated.Image
                    source={isAwake
                        ? require('../assets/images/jin_sakai_awake.png')
                        : require('../assets/images/jin_sakai_sleep.png')
                    }
                    style={[styles.samuraiImage, { transform: [{ scale: pulseAnim }] }]}
                    resizeMode="contain"
                />
                <Text style={styles.samuraiStatus}>
                    {isAwake ? '⚔️ Alert & Ready' : '😴 Meditating...'}
                </Text>
            </View>

            <ScrollView 
                ref={scrollViewRef} 
                style={{ flex: 1 }} 
                contentContainerStyle={styles.chatArea} 
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
            >
                {messages.map(msg => (
                    <View key={msg.id} style={[styles.bubble, msg.sender === 'user' ? styles.userBubble : styles.aiBubble]}>
                        <Text style={styles.bubbleText}>{msg.text}</Text>
                    </View>
                ))}
                {isTyping && (
                    <View style={[styles.bubble, styles.aiBubble, { width: 60, alignItems: 'center' }]}>
                        <ActivityIndicator color={colors.primary} size="small" />
                    </View>
                )}
            </ScrollView>

            <View style={styles.inputArea}>
                <TextInput
                    style={[styles.input, { paddingVertical: 0 }]}
                    placeholder="Ask a question..."
                    placeholderTextColor={colors.textSecondary}
                    value={inputText}
                    onChangeText={setInputText}
                    multiline={false}
                />
                <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
                    <FontAwesome name="paper-plane" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

function makeStyles(colors: any, isDark: boolean) {
    return StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        color: colors.primary,
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeBtn: {
        padding: 5,
    },
    canvasContainer: {
        height: 200,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderBottomWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    samuraiImage: {
        width: 140,
        height: 140,
    },
    samuraiStatus: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
        marginTop: 4,
    },
    chatArea: {
        padding: 15,
        paddingBottom: 20,
    },
    bubble: {
        maxWidth: '80%',
        padding: 15,
        borderRadius: 20,
        marginBottom: 10,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: colors.primary,
        borderBottomRightRadius: 5,
    },
    aiBubble: {
        alignSelf: 'flex-start',
        backgroundColor: colors.surface,
        borderBottomLeftRadius: 5,
        borderWidth: 1,
        borderColor: colors.border,
    },
    bubbleText: {
        color: colors.text,
        fontSize: 16,
        flexShrink: 1,
    },
    inputArea: {
        flexDirection: 'row',
        padding: 15,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        alignItems: 'center',
    },
    input: {
        flex: 1,
        height: 50,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 25,
        paddingHorizontal: 20,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sendBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    }
    });
}
