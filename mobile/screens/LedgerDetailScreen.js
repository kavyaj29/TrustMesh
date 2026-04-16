import React, { useState, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';

export default function LedgerDetailScreen({ route, navigation }) {
    const { ledgerId } = route.params;
    const [ledger, setLedger] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const loadLedger = async () => {
        try {
            const data = await api.getLedger(ledgerId);
            setLedger(data);
        } catch (error) {
            console.error(error);
            alert('Failed to load ledger');
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadLedger();
        }, [ledgerId])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadLedger();
        setRefreshing(false);
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

    if (!ledger) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    const netFlow = (ledger.transactions || []).reduce((acc, txn) => {
        const lowerType = txn.txn_type.toLowerCase();
        if (['credited', 'credit', 'received', 'deposited'].includes(lowerType)) {
            return acc + txn.amount;
        }
        return acc - txn.amount;
    }, 0);

    return (
        <View style={styles.container}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Header */}
                <View style={[styles.header, { borderLeftColor: ledger.color }]}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>
                    <View style={styles.headerTop}>
                        <Text style={styles.headerIcon}>{ledger.icon}</Text>
                        <View style={styles.headerInfo}>
                            <Text style={styles.title}>{ledger.name}</Text>
                            {ledger.description && (
                                <Text style={styles.description}>{ledger.description}</Text>
                            )}
                        </View>
                    </View>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Spent</Text>
                            <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                                -{formatAmount(ledger.total_spent || 0)}
                            </Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Credited</Text>
                            <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                                +{formatAmount(ledger.total_credited || 0)}
                            </Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Net</Text>
                            <Text style={[styles.summaryValue, { color: netFlow >= 0 ? '#10B981' : '#EF4444' }]}>
                                {netFlow >= 0 ? '+' : ''}{formatAmount(netFlow)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Transactions */}
                <View style={styles.transactionsHeader}>
                    <Text style={styles.sectionTitle}>Transactions</Text>
                    <Text style={styles.txnCount}>{ledger.transactions?.length || 0} items</Text>
                </View>

                {(!ledger.transactions || ledger.transactions.length === 0) ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No transactions in this ledger</Text>
                        <Text style={styles.emptySubtext}>Add transactions using the + button</Text>
                    </View>
                ) : (
                    ledger.transactions.map((txn) => (
                        <View key={txn.id} style={styles.transactionCard}>
                            <View style={styles.txnLeft}>
                                <Text style={styles.txnNote}>{txn.note || txn.account || txn.category}</Text>
                                <Text style={styles.txnDate}>{txn.txn_date}</Text>
                            </View>
                            <View style={styles.txnRight}>
                                <Text style={[styles.txnAmount, { color: getTxnColor(txn.txn_type) }]}>
                                    {getTxnPrefix(txn.txn_type)}{formatAmount(txn.amount)}
                                </Text>
                                <Text style={styles.txnCategory}>{txn.category}</Text>
                            </View>
                        </View>
                    ))
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* FAB Buttons */}
            <View style={styles.fabContainer}>
                {/* Link Existing Transactions */}
                <TouchableOpacity
                    style={[styles.fabSecondary, { backgroundColor: '#334155' }]}
                    onPress={() => navigation.navigate('LinkTransactions', {
                        ledgerId: ledger.id,
                        ledgerName: ledger.name,
                        ledgerColor: ledger.color
                    })}
                >
                    <Text style={styles.fabSecondaryText}>📎</Text>
                </TouchableOpacity>

                {/* Add New Transaction */}
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: ledger.color }]}
                    onPress={() => navigation.navigate('AddManual', { ledgerId: ledger.id })}
                >
                    <Text style={styles.fabText}>+</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#64748B',
        fontSize: 16,
    },
    header: {
        backgroundColor: '#1E293B',
        padding: 20,
        paddingTop: 60,
        borderLeftWidth: 4,
    },
    backButton: {
        marginBottom: 12,
    },
    backButtonText: {
        color: '#3B82F6',
        fontSize: 16,
        fontWeight: '500',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerIcon: {
        fontSize: 40,
        marginRight: 16,
    },
    headerInfo: {
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    description: {
        fontSize: 14,
        color: '#94A3B8',
        marginTop: 4,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryItem: {
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '600',
    },
    transactionsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    txnCount: {
        fontSize: 14,
        color: '#64748B',
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
        marginBottom: 12,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    txnLeft: {},
    txnNote: {
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
    txnCategory: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    fabContainer: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        flexDirection: 'row',
        gap: 12,
    },
    fabSecondary: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    fabSecondaryText: {
        fontSize: 20,
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
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
});
