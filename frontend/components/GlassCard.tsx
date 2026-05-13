import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Theme } from '../constants/Theme';

interface GlassCardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export default function GlassCard({ children, style }: GlassCardProps) {
    return (
        <View style={[styles.card, style]}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'rgba(26, 26, 26, 0.7)',
        borderRadius: 15,
        padding: 20,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        shadowColor: Theme.colors.neonGlow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 5,
        overflow: 'hidden',
    }
});
