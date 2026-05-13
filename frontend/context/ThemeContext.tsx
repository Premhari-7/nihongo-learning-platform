import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark';

interface ThemeColors {
    background: string;
    surface: string;
    card: string;
    text: string;
    textSecondary: string;
    primary: string;
    border: string;
    success: string;
    error: string;
    gold: string;
    sakura: string;
}

const lightColors: ThemeColors = {
    background: '#F8F5F0',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    text: '#1E1E1E',
    textSecondary: '#6B5E52',
    primary: '#9B1C1C',
    border: '#E8D9C5',
    success: '#2E7D32',
    error: '#C62828',
    gold: '#B8860B',
    sakura: '#F2A0A0',
};

const darkColors: ThemeColors = {
    background: '#0D0A08',
    surface: '#1A1410',
    card: '#211A14',
    text: '#F0E6D3',
    textSecondary: '#9A8878',
    primary: '#C0392B',
    border: '#3A2E25',
    success: '#388E3C',
    error: '#E53935',
    gold: '#D4AF37',
    sakura: '#C06060',
};

interface ThemeContextType {
    mode: ThemeMode;
    colors: ThemeColors;
    toggleTheme: () => void;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
    mode: 'light',
    colors: lightColors,
    toggleTheme: () => {},
    isDark: false,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [mode, setMode] = useState<ThemeMode>('light');

    useEffect(() => {
        AsyncStorage.getItem('themeMode').then(saved => {
            if (saved === 'dark') setMode('dark');
        });
    }, []);

    const toggleTheme = async () => {
        const next: ThemeMode = mode === 'light' ? 'dark' : 'light';
        setMode(next);
        await AsyncStorage.setItem('themeMode', next);
    };

    const colors = mode === 'light' ? lightColors : darkColors;

    return (
        <ThemeContext.Provider value={{ mode, colors, toggleTheme, isDark: mode === 'dark' }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
