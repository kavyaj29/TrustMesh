import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import SpendingChart from '../components/SpendingChart';

export default function HomeScreen({ navigation }) {
    const { colors, theme, toggleTheme } = useTheme();
    const [summary, setSummary] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [chartData, setChartData] = useState(null);
    const [budgetAlerts, setBudgetAlerts] = useState([]);
    const [recurring, setRecurring] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const loadData = async () => {
        try {
            setError(null);
            const [summaryData, txnData, charts, alerts, recur] = await Promise.all([
                api.getSummary('monthly'),
                api.getTransactions(5),
                api.getChartData(),
                api.getBudgetAlerts().catch(() => []),
                api.getRecurring().catch(() => []),
            ]);
            setSummary(summaryData);
            setTransactions(txnData);
            setChartData(charts);
            setBudgetAlerts(alerts.filter(a => a.status !== 'ok'));
            setRecurring(recur);
        } catch (err) {
            setError('Failed to load data. Check API connection.');
            console.error(err);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, []);

    // Reload data every time the screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const formatAmount = (amount) => {
        return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    };

    const getTxnColor = (type) => {
        const lowerType = type.toLowerCase();
        if (['credited', 'received', 'deposited'].includes(lowerType)) {
            return colors.success;
        }
        return colors.error;
    };

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.bg }]}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: colors.text }]}>Expense Tracker</Text>
                    <Text style={[styles.subtitle, { color: colors.subtext }]}>Track your daily expenses</Text>
                </View>
                <TouchableOpacity onPress={toggleTheme} style={[styles.themeBtn, { backgroundColor: colors.card }]}>
                    <Text style={styles.themeBtnText}>{theme === 'dark' ? '☀️' : '🌙'}</Text>
                </TouchableOpacity>
            </View>

            {/* Error Message */}
            {error && (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {/* Summary Cards */}
            <View style={styles.summaryContainer}>
                <View style={[styles.summaryCard, { backgroundColor: colors.error }]}>
                    <Text style={styles.summaryLabel}>Spent (Month)</Text>
                    <Text style={styles.summaryAmount}>
                        {summary ? formatAmount(summary.total_spent) : '₹0'}
                    </Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: colors.success }]}>
                    <Text style={styles.summaryLabel}>Credited</Text>
                    <Text style={styles.summaryAmount}>
                        {summary ? formatAmount(summary.total_credited) : '₹0'}
                    </Text>
                </View>
            </View>

            {/* Net Flow */}
            <View style={[styles.netFlowCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.netFlowLabel, { color: colors.subtext }]}>Net Flow</Text>
                <Text
                    style={[
                        styles.netFlowAmount,
                        { color: summary?.net_flow >= 0 ? colors.success : colors.error },
                    ]}
                >
                    {summary ? formatAmount(summary.net_flow) : '₹0'}
                </Text>
                <Text style={[styles.netFlowPeriod, { color: colors.muted }]}>
                    {summary?.transaction_count || 0} transactions this month
                </Text>
            </View>

            {/* Charts */}
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Spending Insights</Text>
            </View>
            <SpendingChart chartData={chartData} theme={theme} />

            {/* Budget Alerts */}
            {budgetAlerts.length > 0 && (
                <>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>⚠️ Budget Alerts</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Budgets')}>
                            <Text style={[styles.seeAll, { color: colors.accent }]}>Manage</Text>
                        </TouchableOpacity>
                    </View>
                    {budgetAlerts.map((alert) => (
                        <View key={alert.budget_id} style={[styles.alertBanner, {
                            backgroundColor: alert.status === 'exceeded' ? '#7F1D1D' : '#78350F',
                        }]}>
                            <Text style={styles.alertBannerText}>
                                {alert.status === 'exceeded' ? '🔴' : '🟡'} {alert.category}: {alert.percentage}% used
                                (₹{alert.spent.toLocaleString('en-IN')} / ₹{alert.monthly_limit.toLocaleString('en-IN')})
                            </Text>
                        </View>
                    ))}
                </>
            )}

            {/* Recurring Transactions */}
            {recurring.length > 0 && (
                <>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>🔄 Recurring</Text>
                    </View>
                    {recurring.slice(0, 3).map((r, idx) => (
                        <View key={idx} style={[styles.recurringCard, { backgroundColor: colors.card }]}>
                            <Text style={[styles.recurringMerchant, { color: colors.text }]}>
                                {r.merchant}
                            </Text>
                            <Text style={[styles.recurringAmount, { color: colors.subtext }]}>
                                ~₹{r.avg_amount?.toLocaleString('en-IN')} • {r.occurrence_count}x
                            </Text>
                        </View>
                    ))}
                </>
            )}

            {/* Recent Transactions */}
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
                    <Text style={[styles.seeAll, { color: colors.accent }]}>See All</Text>
                </TouchableOpacity>
            </View>

            {transactions.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: colors.muted }]}>No transactions yet</Text>
                    <Text style={[styles.emptySubtext, { color: colors.muted }]}>
                        Add your first expense from the Add tab
                    </Text>
                </View>
            ) : (
                transactions.map((txn) => (
                    <View key={txn.id} style={[styles.transactionCard, { backgroundColor: colors.card }]}>
                        <View style={styles.txnLeft}>
                            <Text style={[styles.txnAccount, { color: colors.text }]}>{txn.account || 'Unknown'}</Text>
                            <Text style={[styles.txnDate, { color: colors.muted }]}>{txn.txn_date}</Text>
                        </View>
                        <View style={styles.txnRight}>
                            <Text style={[styles.txnAmount, { color: getTxnColor(txn.txn_type) }]}>
                                {['credited', 'received', 'deposited'].includes(txn.txn_type.toLowerCase())
                                    ? '+' : '-'}
                                {formatAmount(txn.amount)}
                            </Text>
                            <Text style={[styles.txnType, { color: colors.muted }]}>{txn.txn_type}</Text>
                        </View>
                    </View>
                ))
            )}

            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 20,
        paddingTop: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    themeBtn: {
        padding: 10,
        borderRadius: 20,
        marginTop: 4,
    },
    themeBtnText: {
        fontSize: 22,
    },
    errorBox: {
        backgroundColor: '#7F1D1D',
        padding: 12,
        marginHorizontal: 20,
        borderRadius: 8,
        marginBottom: 16,
    },
    errorText: {
        color: '#FCA5A5',
        textAlign: 'center',
    },
    summaryContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
    },
    summaryCard: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
    },
    summaryLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 8,
    },
    summaryAmount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    netFlowCard: {
        margin: 20,
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
    },
    netFlowLabel: {
        fontSize: 14,
    },
    netFlowAmount: {
        fontSize: 36,
        fontWeight: 'bold',
        marginVertical: 8,
    },
    netFlowPeriod: {
        fontSize: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    seeAll: {
        fontSize: 14,
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
    },
    emptySubtext: {
        fontSize: 12,
        marginTop: 4,
    },
    transactionCard: {
        marginHorizontal: 20,
        marginBottom: 12,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    txnLeft: {},
    txnAccount: {
        fontSize: 14,
        fontWeight: '500',
    },
    txnDate: {
        fontSize: 12,
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
        marginTop: 2,
        textTransform: 'capitalize',
    },
    alertBanner: {
        marginHorizontal: 20,
        marginBottom: 8,
        padding: 12,
        borderRadius: 10,
    },
    alertBannerText: {
        color: '#FCA5A5',
        fontSize: 13,
    },
    recurringCard: {
        marginHorizontal: 20,
        marginBottom: 8,
        padding: 14,
        borderRadius: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    recurringMerchant: {
        fontSize: 14,
        fontWeight: '500',
    },
    recurringAmount: {
        fontSize: 13,
    },
});
