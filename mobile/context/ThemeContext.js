import React, { createContext, useState, useContext } from 'react';

const ThemeContext = createContext();

export const THEMES = {
    dark: {
        name: 'dark',
        bg: '#0F172A',
        card: '#1E293B',
        text: '#FFFFFF',
        subtext: '#94A3B8',
        muted: '#64748B',
        border: '#334155',
        accent: '#3B82F6',
        error: '#EF4444',
        success: '#10B981',
        tabBar: '#1E293B',
        tabBorder: '#334155',
        inputBg: '#334155',
        statusBar: 'light',
    },
    light: {
        name: 'light',
        bg: '#F8FAFC',
        card: '#FFFFFF',
        text: '#0F172A',
        subtext: '#64748B',
        muted: '#94A3B8',
        border: '#E2E8F0',
        accent: '#3B82F6',
        error: '#EF4444',
        success: '#10B981',
        tabBar: '#FFFFFF',
        tabBorder: '#E2E8F0',
        inputBg: '#F1F5F9',
        statusBar: 'dark',
    },
};

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('dark');

    const toggleTheme = () => {
        setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
    };

    const colors = THEMES[theme];

    return (
        <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}

export default ThemeContext;
