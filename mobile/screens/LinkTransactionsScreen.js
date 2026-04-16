import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import api from '../services/api';

export default function LinkTransactionsScreen({ route, navigation }) {
    const { ledgerId, ledgerName, ledgerColor } = route.params;
    const [transactions, setTransactions] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadTransactions();
    }, []);

    const loadTransactions = async () => {
        try {
            const data = await api.getUnlinkedTransactions(100);
            setTransactions(data);
        } catch (error) {
            console.error(error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadTransactions();
        setRefreshing(false);
    };

    const toggleSelect = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleLink = async () => {
        if (selectedIds.length === 0) {
            alert('Please select at least one transaction');
            return;
        }

        setLoading(true);
        try {
            for (const txnId of selectedIds) {
                await api.linkTransactionToLedger(txnId, ledgerId);
            }
            alert(`${selectedIds.length} transaction(s) added to ledger!`);
            navigation.goBack();
        } catch (error) {
            alert('Failed to link transactions');
        }
        setLoading(false);
    };

    const formatAmount = (amount) => {
        return `₹${Math.abs(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    };

    const getTxnColor = (type) => {
        const lowerType = type.toLowerCase();
        if (['credited', 'credit', 'received', 'deposited'].includes(lowerType)) {
            return '#10B981';
        }
        return '#EF4444';
    };

    const getTxnPrefix = (type) => {
        const lowerType = type.toLowerCase();
        if (['credited', 'credit', 'received', 'deposited'].includes(lowerType)) {
            return '+';
        }
        return '-';
    };

    return (
        <View style={styles.container}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Add to Ledger</Text>
                    <Text style={styles.subtitle}>Select transactions to add to "{ledgerName}"</Text>
                </View>

                {/* Selected Count */}
                {selectedIds.length > 0 && (
                    <View style={[styles.selectedBanner, { backgroundColor: ledgerColor || '#3B82F6' }]}>
                        <Text style={styles.selectedText}>
                            {selectedIds.length} transaction{selectedIds.length > 1 ? 's' : ''} selected
                        </Text>
                    </View>
                )}

                {/* Transaction List */}
                {transactions.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No unlinked transactions</Text>
                        <Text style={styles.emptySubtext}>All transactions are already linked to ledgers</Text>
                    </View>
                ) : (
                    transactions.map((txn) => (
                        <TouchableOpacity
                            key={txn.id}
                            style={[
                                styles.transactionCard,
                                selectedIds.includes(txn.id) && styles.transactionCardSelected,
                            ]}
                            onPress={() => toggleSelect(txn.id)}
                        >
                            <View style={styles.checkbox}>
                                {selectedIds.includes(txn.id) && (
                                    <Text style={styles.checkmark}>✓</Text>
                                )}
                            </View>
                            <View style={styles.txnInfo}>
                                <Text style={styles.txnAccount}>{txn.account || txn.category}</Text>
                                <Text style={styles.txnDate}>{txn.txn_date}</Text>
                            </View>
                            <View style={styles.txnRight}>
                                <Text style={[styles.txnAmount, { color: getTxnColor(txn.txn_type) }]}>
                                    {getTxnPrefix(txn.txn_type)}{formatAmount(txn.amount)}
                                </Text>
                                <Text style={styles.txnType}>{txn.txn_type}</Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Link Button */}
            {selectedIds.length > 0 && (
                <View style={styles.bottomBar}>
                    <TouchableOpacity
                        style={[styles.linkButton, { backgroundColor: ledgerColor || '#3B82F6' }]}
                        onPress={handleLink}
                        disabled={loading}
                    >
                        <Text style={styles.linkButtonText}>
                            {loading ? 'Adding...' : `Add ${selectedIds.length} to Ledger`}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
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
    selectedBanner: {
        padding: 12,
        marginHorizontal: 20,
        borderRadius: 8,
        marginBottom: 16,
    },
    selectedText: {
        color: '#fff',
        fontWeight: '600',
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
    emptySubtext: {
        fontSize: 12,
        color: '#475569',
        marginTop: 4,
    },
    transactionCard: {
        backgroundColor: '#1E293B',
        marginHorizontal: 20,
        marginBottom: 8,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    transactionCardSelected: {
        borderColor: '#3B82F6',
        backgroundColor: '#1E3A5F',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#64748B',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmark: {
        color: '#3B82F6',
        fontSize: 14,
        fontWeight: 'bold',
    },
    txnInfo: {
        flex: 1,
    },
    txnAccount: {
        fontSize: 14,
        fontWeight: '500',
        color: '#fff',
    },
    txnDate: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 4,
    },
    txnRight: {
        alignItems: 'flex-end',
    },
    txnAmount: {
        fontSize: 16,
        fontWeight: '600',
    },
    txnType: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
        textTransform: 'capitalize',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: 40,
        backgroundColor: '#1E293B',
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    linkButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    linkButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});
