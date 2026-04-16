import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

const SLIDES = [
    {
        emoji: '💰',
        title: 'Track Your Expenses',
        description: 'Automatically extract transaction details from your bank SMS messages using AI.',
    },
    {
        emoji: '📱',
        title: 'Add via SMS',
        description: 'Just paste a bank SMS and our NLP model extracts amount, type, date, and more.',
    },
    {
        emoji: '📊',
        title: 'Visualize Spending',
        description: 'See charts, ledgers, and patterns to understand where your money goes.',
    },
];

export default function OnboardingScreen({ onFinish }) {
    const [currentSlide, setCurrentSlide] = useState(0);

    const handleNext = () => {
        if (currentSlide < SLIDES.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            onFinish();
        }
    };

    const handleSkip = () => {
        onFinish();
    };

    const slide = SLIDES[currentSlide];

    return (
        <View style={styles.container}>
            {/* Skip Button */}
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>

            {/* Slide Content */}
            <View style={styles.content}>
                <Text style={styles.emoji}>{slide.emoji}</Text>
                <Text style={styles.title}>{slide.title}</Text>
                <Text style={styles.description}>{slide.description}</Text>
            </View>

            {/* Dots */}
            <View style={styles.dotsContainer}>
                {SLIDES.map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.dot,
                            i === currentSlide && styles.dotActive,
                        ]}
                    />
                ))}
            </View>

            {/* Next / Get Started */}
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                <Text style={styles.nextText}>
                    {currentSlide === SLIDES.length - 1 ? 'Get Started 🚀' : 'Next →'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    skipBtn: {
        position: 'absolute',
        top: 60,
        right: 24,
    },
    skipText: {
        color: '#64748B',
        fontSize: 16,
    },
    content: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    emoji: {
        fontSize: 80,
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 16,
    },
    description: {
        fontSize: 16,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    dotsContainer: {
        flexDirection: 'row',
        marginBottom: 40,
        gap: 8,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#334155',
    },
    dotActive: {
        backgroundColor: '#3B82F6',
        width: 30,
    },
    nextBtn: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 48,
        paddingVertical: 16,
        borderRadius: 30,
        marginBottom: 40,
    },
    nextText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});
