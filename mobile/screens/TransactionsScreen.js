import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    Alert,
    Modal,
    Linking,
} from 'react-native';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function TransactionsScreen() {
    const { colors } = useTheme();
    const [transactions, setTransactions] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all'); // all, spent, credited
    const [ledgers, setLedgers] = useState([]);
    const [selectedTxn, setSelectedTxn] = useState(null);
    const [showLedgerModal, setShowLedgerModal] = useState(false);

    const loadTransactions = async () => {
        try {
            const data = await api.getTransactions(100);
            setTransactions(data);
        } catch (error) {
            console.error('Failed to load transactions:', error);
        }
    };

    const loadLedgers = async () => {
        try {
            const data = await api.getLedgers();
            setLedgers(data);
        } catch (error) {
            console.error('Failed to load ledgers:', error);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([loadTransactions(), loadLedgers()]);
        setRefreshing(false);
    }, []);

    useEffect(() => {
        loadTransactions();
        loadLedgers();
    }, []);

    const handleDelete = (id) => {
        Alert.alert(
            'Delete Transaction',
            'Are you sure you want to delete this transaction?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.deleteTransaction(id);
                            loadTransactions();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete transaction');
                        }
                    },
                },
            ]
        );
    };

    const handleTapTransaction = (txn) => {
        setSelectedTxn(txn);
        setShowLedgerModal(true);
    };

    const handleAssignLedger = async (ledgerId) => {
        if (!selectedTxn) return;
        try {
            await api.linkTransactionToLedger(selectedTxn.id, ledgerId);
            setShowLedgerModal(false);
            setSelectedTxn(null);
            await loadTransactions();
            alert('Transaction added to ledger!');
        } catch (error) {
            alert('Failed to assign ledger');
        }
    };

    const formatAmount = (amount) => {
        return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    };

    const isCredit = (type) => {
        return ['credited', 'credit', 'received', 'deposited'].includes(type.toLowerCase());
    };

    const filteredTransactions = transactions.filter((txn) => {
        if (filter === 'all') return true;
        if (filter === 'credited') return isCredit(txn.txn_type);
        if (filter === 'spent') return !isCredit(txn.txn_type);
        return true;
    });

    const getLedgerForTxn = (ledgerId) => {
        return ledgers.find(l => l.id === ledgerId);
    };

    const renderTransaction = ({ item }) => {
        const linkedLedger = getLedgerForTxn(item.ledger_id);

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => handleTapTransaction(item)}
                onLongPress={() => handleDelete(item.id)}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.account}>{item.account || 'Unknown Account'}</Text>
                    <Text
                        style={[
                            styles.amount,
                            { color: isCredit(item.txn_type) ? '#10B981' : '#EF4444' },
                        ]}
                    >
                        {isCredit(item.txn_type) ? '+' : '-'}
                        {formatAmount(item.amount)}
                    </Text>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Date:</Text>
                        <Text style={styles.infoValue}>{item.txn_date}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Type:</Text>
                        <Text style={styles.infoValue}>{item.txn_type}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Category:</Text>
                        <Text style={styles.infoValue}>{item.category}</Text>
                    </View>
                    {linkedLedger && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Ledger:</Text>
                            <View style={[styles.ledgerBadge, { backgroundColor: linkedLedger.color }]}>
                                <Text style={styles.ledgerBadgeText}>
                                    {linkedLedger.icon} {linkedLedger.name}
                                </Text>
                            </View>
                        </View>
                    )}
                    {item.balance && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Balance:</Text>
                            <Text style={styles.infoValue}>{formatAmount(item.balance)}</Text>
                        </View>
                    )}
                </View>

                <Text style={styles.hint}>
                    {linkedLedger ? 'Tap to change ledger • Long press to delete' : 'Tap to add to ledger • Long press to delete'}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Transactions</Text>
                <Text style={[styles.subtitle, { color: colors.subtext }]}>
                    {filteredTransactions.length} transaction(s)
                </Text>
                <View style={styles.exportRow}>
                    <TouchableOpacity
                        style={styles.exportBtn}
                        onPress={() => Linking.openURL(api.getExportUrl('csv'))}
                    >
                        <Text style={styles.exportText}>📥 CSV</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.exportBtn}
                        onPress={() => Linking.openURL(api.getExportUrl('pdf'))}
                    >
                        <Text style={styles.exportText}>📄 Report</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Filters */}
            <View style={styles.filterContainer}>
                {['all', 'spent', 'credited'].map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterChip, filter === f && styles.filterChipActive]}
                        onPress={() => setFilter(f)}
                    >
                        <Text
                            style={[
                                styles.filterText,
                                filter === f && styles.filterTextActive,
                            ]}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Transaction List */}
            <FlatList
                data={filteredTransactions}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderTransaction}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No transactions found</Text>
                    </View>
                }
            />

            {/* Ledger Assignment Modal */}
            <Modal visible={showLedgerModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add to Ledger</Text>

                        {selectedTxn && (
                            <View style={styles.selectedTxnInfo}>
                                <Text style={styles.selectedTxnAmount}>
                                    {isCredit(selectedTxn.txn_type) ? '+' : '-'}
                                    {formatAmount(selectedTxn.amount)}
                                </Text>
                                <Text style={styles.selectedTxnDate}>{selectedTxn.txn_date}</Text>
                            </View>
                        )}

                        <View style={styles.ledgerList}>
                            <TouchableOpacity
                                style={styles.ledgerOption}
                                onPress={() => handleAssignLedger(0)}
                            >
                                <Text style={styles.ledgerOptionIcon}>🚫</Text>
                                <Text style={styles.ledgerOptionText}>Remove from Ledger</Text>
                            </TouchableOpacity>

                            {ledgers.map((ledger) => (
                                <TouchableOpacity
                                    key={ledger.id}
                                    style={[styles.ledgerOption, { borderLeftColor: ledger.color, borderLeftWidth: 4 }]}
                                    onPress={() => handleAssignLedger(ledger.id)}
                                >
                                    <Text style={styles.ledgerOptionIcon}>{ledger.icon}</Text>
                                    <View style={styles.ledgerOptionInfo}>
                                        <Text style={styles.ledgerOptionText}>{ledger.name}</Text>
                                        <Text style={styles.ledgerOptionMeta}>
                                            {ledger.transaction_count} transactions
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => {
                                setShowLedgerModal(false);
                                setSelectedTxn(null);
                            }}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
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
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#1E293B',
        marginRight: 8,
    },
    filterChipActive: {
        backgroundColor: '#3B82F6',
    },
    filterText: {
        fontSize: 14,
        color: '#94A3B8',
    },
    filterTextActive: {
        color: '#fff',
        fontWeight: '500',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: '#1E293B',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    account: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
        flex: 1,
    },
    amount: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    cardBody: {},
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    infoLabel: {
        fontSize: 13,
        color: '#64748B',
    },
    infoValue: {
        fontSize: 13,
        color: '#94A3B8',
    },
    ledgerBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    ledgerBadgeText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '500',
    },
    hint: {
        fontSize: 11,
        color: '#475569',
        marginTop: 12,
        textAlign: 'center',
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#64748B',
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
        maxHeight: '70%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 16,
    },
    selectedTxnInfo: {
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    selectedTxnAmount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    selectedTxnDate: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 4,
    },
    ledgerList: {},
    ledgerOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#0F172A',
        borderRadius: 12,
        marginBottom: 8,
    },
    ledgerOptionIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    ledgerOptionInfo: {
        flex: 1,
    },
    ledgerOptionText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '500',
    },
    ledgerOptionMeta: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    cancelButton: {
        marginTop: 16,
        padding: 16,
        backgroundColor: '#334155',
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '600',
    },
    exportRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    exportBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#334155',
    },
    exportText: {
        fontSize: 13,
        color: '#fff',
    },
});
