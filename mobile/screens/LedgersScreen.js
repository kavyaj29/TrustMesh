import React, { useState, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    TextInput,
    Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const ICONS = ['📒', '💰', '🏠', '🚗', '✈️', '🛒', '💼', '🎮', '🍔', '💊', '📚', '🎁'];
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function LedgersScreen({ navigation }) {
    const { colors } = useTheme();
    const [ledgers, setLedgers] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [newLedger, setNewLedger] = useState({ name: '', description: '', icon: '📒', color: '#3B82F6' });
    const [loading, setLoading] = useState(false);

    const loadLedgers = async () => {
        try {
            const data = await api.getLedgers();
            setLedgers(data);
        } catch (error) {
            console.error(error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadLedgers();
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadLedgers();
        setRefreshing(false);
    };

    const handleCreateLedger = async () => {
        if (!newLedger.name.trim()) {
            alert('Please enter a ledger name');
            return;
        }
        setLoading(true);
        try {
            await api.createLedger(newLedger.name, newLedger.description, newLedger.icon, newLedger.color);
            setShowModal(false);
            setNewLedger({ name: '', description: '', icon: '📒', color: '#3B82F6' });
            await loadLedgers();
            alert('Ledger created successfully!');
        } catch (error) {
            alert('Failed to create ledger');
        }
        setLoading(false);
    };

    const handleDeleteLedger = async (ledgerId, ledgerName) => {
        if (confirm(`Delete ledger "${ledgerName}"? Transactions will be unlinked but not deleted.`)) {
            try {
                await api.deleteLedger(ledgerId);
                await loadLedgers();
            } catch (error) {
                alert('Failed to delete ledger');
            }
        }
    };

    const formatAmount = (amount) => {
        return `₹${Math.abs(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>Ledgers</Text>
                    <Text style={[styles.subtitle, { color: colors.subtext }]}>Organize your transactions</Text>
                </View>

                {/* Ledger List */}
                {ledgers.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>📒</Text>
                        <Text style={styles.emptyText}>No ledgers yet</Text>
                        <Text style={styles.emptySubtext}>Create a ledger to organize your expenses</Text>
                    </View>
                ) : (
                    ledgers.map((ledger) => (
                        <TouchableOpacity
                            key={ledger.id}
                            style={[styles.ledgerCard, { borderLeftColor: ledger.color }]}
                            onPress={() => navigation.navigate('LedgerDetail', { ledgerId: ledger.id })}
                            onLongPress={() => handleDeleteLedger(ledger.id, ledger.name)}
                        >
                            <View style={styles.ledgerIcon}>
                                <Text style={styles.iconText}>{ledger.icon}</Text>
                            </View>
                            <View style={styles.ledgerInfo}>
                                <Text style={styles.ledgerName}>{ledger.name}</Text>
                                <Text style={styles.ledgerMeta}>
                                    {ledger.transaction_count} transactions
                                </Text>
                            </View>
                            <View style={styles.ledgerAmounts}>
                                <Text style={styles.ledgerSpent}>-{formatAmount(ledger.total_spent)}</Text>
                                <Text style={styles.ledgerCredited}>+{formatAmount(ledger.total_credited)}</Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Add Button */}
            <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>

            {/* Create Ledger Modal */}
            <Modal visible={showModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Create Ledger</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Ledger Name"
                            placeholderTextColor="#64748B"
                            value={newLedger.name}
                            onChangeText={(text) => setNewLedger({ ...newLedger, name: text })}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Description (optional)"
                            placeholderTextColor="#64748B"
                            value={newLedger.description}
                            onChangeText={(text) => setNewLedger({ ...newLedger, description: text })}
                        />

                        {/* Icon Picker */}
                        <Text style={styles.pickerLabel}>Icon</Text>
                        <View style={styles.pickerGrid}>
                            {ICONS.map((icon) => (
                                <TouchableOpacity
                                    key={icon}
                                    style={[
                                        styles.pickerItem,
                                        newLedger.icon === icon && styles.pickerItemSelected,
                                    ]}
                                    onPress={() => setNewLedger({ ...newLedger, icon })}
                                >
                                    <Text style={styles.pickerIcon}>{icon}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Color Picker */}
                        <Text style={styles.pickerLabel}>Color</Text>
                        <View style={styles.pickerGrid}>
                            {COLORS.map((color) => (
                                <TouchableOpacity
                                    key={color}
                                    style={[
                                        styles.colorItem,
                                        { backgroundColor: color },
                                        newLedger.color === color && styles.colorItemSelected,
                                    ]}
                                    onPress={() => setNewLedger({ ...newLedger, color })}
                                />
                            ))}
                        </View>

                        {/* Buttons */}
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.createButton}
                                onPress={handleCreateLedger}
                                disabled={loading}
                            >
                                <Text style={styles.createButtonText}>
                                    {loading ? 'Creating...' : 'Create'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
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
    emptyState: {
        alignItems: 'center',
        padding: 60,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 18,
        color: '#64748B',
        fontWeight: '600',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#475569',
        marginTop: 8,
        textAlign: 'center',
    },
    ledgerCard: {
        backgroundColor: '#1E293B',
        marginHorizontal: 20,
        marginBottom: 12,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 4,
    },
    ledgerIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconText: {
        fontSize: 24,
    },
    ledgerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    ledgerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    ledgerMeta: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 4,
    },
    ledgerAmounts: {
        alignItems: 'flex-end',
    },
    ledgerSpent: {
        fontSize: 14,
        fontWeight: '600',
        color: '#EF4444',
    },
    ledgerCredited: {
        fontSize: 12,
        color: '#10B981',
        marginTop: 2,
    },
    fab: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    fabText: {
        fontSize: 32,
        color: '#fff',
        fontWeight: '300',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1E293B',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        backgroundColor: '#0F172A',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#fff',
        marginBottom: 16,
    },
    pickerLabel: {
        fontSize: 14,
        color: '#94A3B8',
        marginBottom: 8,
    },
    pickerGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    pickerItem: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerItemSelected: {
        borderWidth: 2,
        borderColor: '#3B82F6',
    },
    pickerIcon: {
        fontSize: 20,
    },
    colorItem: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    colorItemSelected: {
        borderWidth: 3,
        borderColor: '#fff',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    cancelButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#334155',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '600',
    },
    createButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#3B82F6',
        alignItems: 'center',
    },
    createButtonText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '600',
    },
});
