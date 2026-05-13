import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
