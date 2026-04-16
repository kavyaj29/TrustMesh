import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const CATEGORIES = [
    'Food & Dining',
    'Shopping',
    'Travel',
    'Entertainment',
    'Bills & Utilities',
    'Health',
    'Education',
    'Other',
];

export default function AddSMSScreen({ navigation }) {
    const { colors } = useTheme();
    const [smsText, setSmsText] = useState('');
    const [category, setCategory] = useState('Other');
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [ledgers, setLedgers] = useState([]);
    const [selectedLedger, setSelectedLedger] = useState(null);

    useEffect(() => {
        loadLedgers();
    }, []);

    const loadLedgers = async () => {
        try {
            const data = await api.getLedgers();
            setLedgers(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handlePreview = async () => {
        if (!smsText.trim()) {
            Alert.alert('Error', 'Please paste an SMS message');
            return;
        }

        setLoading(true);
        try {
            const result = await api.extractEntities(smsText);
            setPreviewData(result);
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to parse SMS');
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!smsText.trim()) {
            alert('Please paste a valid bank SMS message');
            return;
        }

        // Validate that SMS looks like a bank message
        const hasAmount = /(?:Rs\.?|INR|₹)\s*[\d,]+/.test(smsText);
        if (!hasAmount) {
            alert('This does not look like a valid bank SMS. Please paste a message containing an amount (e.g., Rs.5000 or INR 1000)');
            return;
        }

        setLoading(true);
        try {
            await api.parseSMS(smsText, category, null, selectedLedger);
            alert('Transaction saved successfully!');
            setSmsText('');
            setPreviewData(null);
            setSelectedLedger(null);
            navigation.navigate('Home');
        } catch (error) {
            alert('Error: ' + (error.message || 'Failed to save transaction'));
        }
        setLoading(false);
    };

    const getEntityValue = (label) => {
        if (!previewData?.entities) return null;
        const entity = previewData.entities.find((e) => e.label === label);
        return entity?.text;
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.bg }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView style={styles.scrollView}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>Add Transaction</Text>
                    <Text style={[styles.subtitle, { color: colors.subtext }]}>Paste your bank SMS below</Text>
                </View>

                {/* SMS Input */}
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Bank SMS</Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="Paste your bank SMS here..."
                        placeholderTextColor="#64748B"
                        value={smsText}
                        onChangeText={setSmsText}
                        multiline
                        numberOfLines={4}
                    />
                </View>

                {/* Preview Button */}
                <TouchableOpacity
                    style={styles.previewButton}
                    onPress={handlePreview}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.previewButtonText}>Preview Extraction</Text>
                    )}
                </TouchableOpacity>

                {/* Preview Results */}
                {previewData && (
                    <View style={styles.previewCard}>
                        <Text style={styles.previewTitle}>Extracted Information</Text>

                        <View style={styles.previewRow}>
                            <Text style={styles.previewLabel}>Amount:</Text>
                            <Text style={styles.previewValue}>
                                {getEntityValue('AMOUNT') || 'Not found'}
                            </Text>
                        </View>

                        <View style={styles.previewRow}>
                            <Text style={styles.previewLabel}>Type:</Text>
                            <Text style={styles.previewValue}>
                                {getEntityValue('TXN_TYPE') || 'Not found'}
                            </Text>
                        </View>

                        <View style={styles.previewRow}>
                            <Text style={styles.previewLabel}>Account:</Text>
                            <Text style={styles.previewValue}>
                                {getEntityValue('ACCOUNT') || 'Not found'}
                            </Text>
                        </View>

                        <View style={styles.previewRow}>
                            <Text style={styles.previewLabel}>Date:</Text>
                            <Text style={styles.previewValue}>
                                {getEntityValue('DATE') || 'Not found'}
                            </Text>
                        </View>

                        <View style={styles.previewRow}>
                            <Text style={styles.previewLabel}>Balance:</Text>
                            <Text style={styles.previewValue}>
                                {getEntityValue('BALANCE') || 'Not found'}
                            </Text>
                        </View>

                        <View style={styles.previewRow}>
                            <Text style={styles.previewLabel}>Bank:</Text>
                            <Text style={styles.previewValue}>
                                {getEntityValue('BANK') || 'Not found'}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Category Selection */}
                <View style={styles.categoryContainer}>
                    <Text style={styles.label}>Category</Text>
                    <View style={styles.categoryGrid}>
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                style={[
                                    styles.categoryChip,
                                    category === cat && styles.categoryChipActive,
                                ]}
                                onPress={() => setCategory(cat)}
                            >
                                <Text
                                    style={[
                                        styles.categoryText,
                                        category === cat && styles.categoryTextActive,
                                    ]}
                                >
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Ledger Selection */}
                <View style={styles.categoryContainer}>
                    <Text style={styles.label}>Add to Ledger (Optional)</Text>
                    <View style={styles.ledgerGrid}>
                        <TouchableOpacity
                            style={[
                                styles.ledgerChip,
                                selectedLedger === null && styles.ledgerChipActive,
                            ]}
                            onPress={() => setSelectedLedger(null)}
                        >
                            <Text style={styles.ledgerChipText}>None</Text>
                        </TouchableOpacity>
                        {ledgers.map((ledger) => (
                            <TouchableOpacity
                                key={ledger.id}
                                style={[
                                    styles.ledgerChip,
                                    { borderColor: ledger.color },
                                    selectedLedger === ledger.id && { backgroundColor: ledger.color },
                                ]}
                                onPress={() => setSelectedLedger(ledger.id)}
                            >
                                <Text style={styles.ledgerChipIcon}>{ledger.icon}</Text>
                                <Text style={styles.ledgerChipText}>{ledger.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    style={[styles.saveButton, !smsText.trim() && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={loading || !smsText.trim()}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Transaction</Text>
                    )}
                </TouchableOpacity>

                <View style={{ height: 100 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        padding: 20,
        paddingTop: 60,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    subtitle: {
        fontSize: 14,
        color: '#94A3B8',
        marginTop: 4,
    },
    inputContainer: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#94A3B8',
        marginBottom: 8,
    },
    textArea: {
        backgroundColor: '#1E293B',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        fontSize: 14,
        minHeight: 120,
        textAlignVertical: 'top',
    },
    previewButton: {
        backgroundColor: '#3B82F6',
        marginHorizontal: 20,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 20,
    },
    previewButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    previewCard: {
        backgroundColor: '#1E293B',
        marginHorizontal: 20,
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    previewTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 12,
    },
    previewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    previewLabel: {
        fontSize: 14,
        color: '#94A3B8',
    },
    previewValue: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '500',
    },
    categoryContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryChip: {
        backgroundColor: '#1E293B',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#334155',
    },
    categoryChipActive: {
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6',
    },
    categoryText: {
        fontSize: 13,
        color: '#94A3B8',
    },
    categoryTextActive: {
        color: '#fff',
        fontWeight: '500',
    },
    ledgerGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    ledgerChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: '#334155',
    },
    ledgerChipActive: {
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6',
    },
    ledgerChipIcon: {
        fontSize: 14,
        marginRight: 4,
    },
    ledgerChipText: {
        fontSize: 13,
        color: '#fff',
    },
    saveButton: {
        backgroundColor: '#10B981',
        marginHorizontal: 20,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        backgroundColor: '#334155',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});
