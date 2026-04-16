import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    TextInput,
} from 'react-native';
import api from '../services/api';

const CATEGORIES = [
    'Food & Dining', 'Shopping', 'Transport', 'Entertainment',
    'Bills & Utilities', 'Health', 'Education', 'Travel', 'Other'
];

export default function AddManualScreen({ navigation }) {
    const [amount, setAmount] = useState('');
    const [txnType, setTxnType] = useState('debit');
    const [txnDate, setTxnDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState('Other');
    const [note, setNote] = useState('');
    const [ledgerId, setLedgerId] = useState(null);
    const [ledgers, setLedgers] = useState([]);
    const [loading, setLoading] = useState(false);

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

    const handleSave = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        setLoading(true);
        try {
            await api.createManualTransaction({
                amount: parseFloat(amount),
                txn_type: txnType,
                txn_date: txnDate,
                ledger_id: ledgerId,
                category: category,
                note: note || null,
                account: null,
            });
            alert('Transaction added successfully!');
            navigation.goBack();
        } catch (error) {
            alert('Failed to add transaction');
        }
        setLoading(false);
    };

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Add Transaction</Text>
                <Text style={styles.subtitle}>Enter transaction details manually</Text>
            </View>

            {/* Amount Input */}
            <View style={styles.section}>
                <Text style={styles.label}>Amount</Text>
                <View style={styles.amountContainer}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                        style={styles.amountInput}
                        placeholder="0"
                        placeholderTextColor="#64748B"
                        keyboardType="decimal-pad"
                        value={amount}
                        onChangeText={setAmount}
                    />
                </View>
            </View>

            {/* Transaction Type Toggle */}
            <View style={styles.section}>
                <Text style={styles.label}>Type</Text>
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[
                            styles.toggleButton,
                            txnType === 'debit' && styles.toggleButtonActiveDebit,
                        ]}
                        onPress={() => setTxnType('debit')}
                    >
                        <Text style={[
                            styles.toggleText,
                            txnType === 'debit' && styles.toggleTextActive,
                        ]}>💸 Expense</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.toggleButton,
                            txnType === 'credit' && styles.toggleButtonActiveCredit,
                        ]}
                        onPress={() => setTxnType('credit')}
                    >
                        <Text style={[
                            styles.toggleText,
                            txnType === 'credit' && styles.toggleTextActive,
                        ]}>💰 Income</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Date Input */}
            <View style={styles.section}>
                <Text style={styles.label}>Date</Text>
                <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#64748B"
                    value={txnDate}
                    onChangeText={setTxnDate}
                />
            </View>

            {/* Category Selection */}
            <View style={styles.section}>
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
                            <Text style={[
                                styles.categoryText,
                                category === cat && styles.categoryTextActive,
                            ]}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Ledger Selection */}
            <View style={styles.section}>
                <Text style={styles.label}>Ledger (Optional)</Text>
                <View style={styles.ledgerGrid}>
                    <TouchableOpacity
                        style={[
                            styles.ledgerChip,
                            ledgerId === null && styles.ledgerChipActive,
                        ]}
                        onPress={() => setLedgerId(null)}
                    >
                        <Text style={styles.ledgerChipText}>None</Text>
                    </TouchableOpacity>
                    {ledgers.map((ledger) => (
                        <TouchableOpacity
                            key={ledger.id}
                            style={[
                                styles.ledgerChip,
                                { borderColor: ledger.color },
                                ledgerId === ledger.id && { backgroundColor: ledger.color },
                            ]}
                            onPress={() => setLedgerId(ledger.id)}
                        >
                            <Text style={styles.ledgerChipIcon}>{ledger.icon}</Text>
                            <Text style={styles.ledgerChipText}>{ledger.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Note Input */}
            <View style={styles.section}>
                <Text style={styles.label}>Note (Optional)</Text>
                <TextInput
                    style={[styles.input, styles.noteInput]}
                    placeholder="Add a note..."
                    placeholderTextColor="#64748B"
                    multiline
                    value={note}
                    onChangeText={setNote}
                />
            </View>

            {/* Save Button */}
            <TouchableOpacity
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={loading}
            >
                <Text style={styles.saveButtonText}>
                    {loading ? 'Saving...' : 'Save Transaction'}
                </Text>
            </TouchableOpacity>

            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    header: {
        padding: 20,
        paddingTop: 60,
    },
    backButton: {
        marginBottom: 12,
    },
    backButtonText: {
        color: '#3B82F6',
        fontSize: 16,
        fontWeight: '500',
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
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        color: '#94A3B8',
        marginBottom: 8,
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        borderRadius: 12,
        padding: 16,
    },
    currencySymbol: {
        fontSize: 32,
        color: '#64748B',
        marginRight: 8,
    },
    amountInput: {
        flex: 1,
        fontSize: 32,
        color: '#fff',
        fontWeight: 'bold',
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#1E293B',
        borderRadius: 12,
        padding: 4,
    },
    toggleButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    toggleButtonActiveDebit: {
        backgroundColor: '#EF4444',
    },
    toggleButtonActiveCredit: {
        backgroundColor: '#10B981',
    },
    toggleText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '600',
    },
    toggleTextActive: {
        color: '#fff',
    },
    input: {
        backgroundColor: '#1E293B',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#fff',
    },
    noteInput: {
        height: 100,
        textAlignVertical: 'top',
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#1E293B',
    },
    categoryChipActive: {
        backgroundColor: '#3B82F6',
    },
    categoryText: {
        fontSize: 14,
        color: '#94A3B8',
    },
    categoryTextActive: {
        color: '#fff',
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
        fontSize: 14,
        color: '#fff',
    },
    saveButton: {
        marginHorizontal: 20,
        backgroundColor: '#3B82F6',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});
