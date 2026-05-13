import React, { useEffect } from 'react';
import { StyleSheet, Text, Pressable, ViewStyle, StyleProp, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring } from 'react-native-reanimated';
import { Theme } from '../constants/Theme';

interface ShineButtonProps {
    title: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
    style?: StyleProp<ViewStyle>;
}

export default function ShineButton({ title, onPress, disabled, loading, style }: ShineButtonProps) {
    const shinePosition = useSharedValue(-500);
    const scale = useSharedValue(1);
    const hoverOpacity = useSharedValue(0);

    const handleHoverIn = () => {
        scale.value = withSpring(1.03);
        hoverOpacity.value = withTiming(1, { duration: 200 });
        // Trigger a smooth sweep on hover
        shinePosition.value = withSequence(
            withTiming(-300, { duration: 0 }),
            withTiming(800, { duration: 800 })
        );
    };

    const handleHoverOut = () => {
        scale.value = withSpring(1);
        hoverOpacity.value = withTiming(0, { duration: 200 });
    };

    const handlePressIn = () => {
        scale.value = withSpring(0.95);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1.03); // Return to hover scale
    };

    const handlePress = () => {
        onPress();
    };

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
            shadowOpacity: 0.3 + (hoverOpacity.value * 0.4),
            shadowRadius: 10 + (hoverOpacity.value * 5),
        };
    });

    const shineStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: shinePosition.value }, { skewX: '-20deg' }],
        };
    });

    return (
        <Animated.View style={[styles.container, animatedStyle, style]}>
            <Pressable 
                style={styles.button} 
                onPress={handlePress} 
                onPressIn={handlePressIn} 
                onPressOut={handlePressOut}
                // @ts-ignore - RN Web specific prop
                onHoverIn={handleHoverIn}
                onHoverOut={handleHoverOut}
                disabled={disabled || loading}
            >
                {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.text}>{title}</Text>
                )}
                {/* The shine element */}
                <Animated.View style={[styles.shine, shineStyle]} />
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginTop: 10,
    },
    button: {
        width: '100%',
        height: 50,
        backgroundColor: Theme.colors.primary,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Theme.colors.primary,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 5,
        overflow: 'hidden', 
    },
    text: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 2,
        zIndex: 2,
    },
    shine: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '50%',
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        zIndex: 1,
    }
});
