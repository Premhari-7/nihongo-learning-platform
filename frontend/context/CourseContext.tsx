import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from './AuthContext';

export const CourseContext = createContext<any>(null);

export const CourseProvider = ({ children }: { children: React.ReactNode }) => {
    const [selectedCourse, setSelectedCourse] = useState<{ level: string, section: string, id: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCourse();
    }, []);

    const loadCourse = async () => {
        try {
            const courseData = await AsyncStorage.getItem('selectedCourse');
            if (courseData) {
                setSelectedCourse(JSON.parse(courseData));
            }
        } catch (error) {
            console.error('Failed to load course from storage', error);
        } finally {
            setLoading(false);
        }
    };

    const setCourse = async (level: string, section: string) => {
        const courseObj = { level, section, id: `${level}-${section}` };
        setSelectedCourse(courseObj);
        await AsyncStorage.setItem('selectedCourse', JSON.stringify(courseObj));
        
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                const userId = user.id || user._id;
                if (userId) {
                    await axios.post(`${API_URL}/auth/update-level`, {
                        userId,
                        level
                    });
                }
            }
        } catch (error) {
            console.error('Failed to update level on backend', error);
        }
    };

    const clearCourse = async () => {
        setSelectedCourse(null);
        await AsyncStorage.removeItem('selectedCourse');
    };

    return (
        <CourseContext.Provider value={{ selectedCourse, setCourse, clearCourse, loading }}>
            {children}
        </CourseContext.Provider>
    );
};
