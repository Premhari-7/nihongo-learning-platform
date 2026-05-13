import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, ImageBackground } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { FontAwesome } from '@expo/vector-icons';
import { Theme } from '../constants/Theme';

interface AnimatedPopupProps {
    visible: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
    onClose: () => void;
}

export default function AnimatedPopup({ visible, type, title, message, onClose }: AnimatedPopupProps) {
    const scale = useSharedValue(0.5);
    const opacity = useSharedValue(0);
    const rotateY = useSharedValue('90deg');

    useEffect(() => {
        if (visible) {
            scale.value = withSpring(1, { damping: 10, stiffness: 80 });
            opacity.value = withTiming(1, { duration: 300 });
            rotateY.value = withSpring('0deg', { damping: 15, stiffness: 60 });
        } else {
            scale.value = withTiming(0.8, { duration: 200 });
            opacity.value = withTiming(0, { duration: 200 });
            rotateY.value = withTiming('90deg', { duration: 200 });
        }
    }, [visible]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { scale: scale.value },
                { perspective: 1000 },
                { rotateY: rotateY.value }
            ],
            opacity: opacity.value,
        };
    });

    const isSuccess = type === 'success';
    const color = isSuccess ? Theme.colors.success : Theme.colors.error;
    const iconName = isSuccess ? 'check-circle' : 'times-circle';

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="none">
            <View style={styles.overlay}>
                <Animated.View style={[styles.popupCard, animatedStyle, { shadowColor: color }]}>
                    {/* Simulated Japanese art background pattern using a gradient/border style */}
                    <View style={styles.artBorder}>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <FontAwesome name="times" size={20} color={Theme.colors.textSecondary} />
                        </TouchableOpacity>
                        
                        <View style={styles.iconContainer}>
                            <FontAwesome name={iconName} size={70} color={color} style={styles.icon} />
                        </View>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.message}>{message}</Text>
                        
                        <TouchableOpacity style={[styles.button, { backgroundColor: color }]} onPress={onClose}>
                            <Text style={styles.buttonText}>承知 (Understood)</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(10, 10, 10, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    popupCard: {
        width: '100%',
        maxWidth: 350,
        backgroundColor: Theme.colors.surface,
        borderRadius: 25,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Theme.colors.border,
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.8,
        shadowRadius: 30,
        elevation: 20,
        overflow: 'hidden',
    },
    artBorder: {
        width: '100%',
        padding: 30,
        borderWidth: 1,
        borderColor: 'rgba(230, 57, 70, 0.3)', // Japanese red accent
        alignItems: 'center',
    },
    closeBtn: {
        position: 'absolute',
        top: 15,
        right: 15,
        padding: 5,
        zIndex: 10,
    },
    iconContainer: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 50,
        padding: 10,
        marginBottom: 15,
    },
    icon: {
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 5 },
        textShadowRadius: 10,
    },
    title: {
        color: Theme.colors.text,
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    message: {
        color: Theme.colors.textSecondary,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 24,
    },
    button: {
        width: '100%',
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    }
});
