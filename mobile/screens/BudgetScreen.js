import React, { useState, useCallback } from 'react';
import {
    StyleSheet, Text, View, ScrollView, TouchableOpacity,
    TextInput, Modal, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const CATEGORIES = [
    'Food & Dining', 'Shopping', 'Travel', 'Entertainment',
    'Bills & Utilities', 'Health', 'Education', 'Other',
];

export default function BudgetScreen() {
    const { colors } = useTheme();
    const [budgets, setBudgets] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('Food & Dining');
    const [limitAmount, setLimitAmount] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        try {
            const [budgetData, alertData] = await Promise.all([
                api.getBudgets(),
                api.getBudgetAlerts(),
            ]);
            setBudgets(budgetData);
            setAlerts(alertData);
        } catch (err) {
            console.error(err);
        }
    };

    useFocusEffect(useCallback(() => { loadData(); }, []));

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleCreate = async () => {
        const limit = parseFloat(limitAmount);
        if (!limit || limit <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        try {
            await api.createBudget(selectedCategory, limit);
            setShowModal(false);
            setLimitAmount('');
            await loadData();
        } catch (err) {
            alert('Failed to create budget');
        }
    };

    const handleDelete = (id, category) => {
        if (confirm(`Delete budget for "${category}"?`)) {
            api.deleteBudget(id).then(loadData);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'exceeded': return '#EF4444';
            case 'warning': return '#F59E0B';
            case 'caution': return '#3B82F6';
            default: return '#10B981';
        }
    };

    const getStatusEmoji = (status) => {
        switch (status) {
            case 'exceeded': return '🔴';
            case 'warning': return '🟡';
            case 'caution': return '🔵';
            default: return '🟢';
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>Budgets</Text>
                    <Text style={[styles.subtitle, { color: colors.subtext }]}>
                        Set monthly spending limits
                    </Text>
                </View>

                {/* Budget Alerts */}
                {alerts.length > 0 ? (
                    alerts.map((alert) => (
                        <TouchableOpacity
                            key={alert.budget_id}
                            style={[styles.alertCard, { backgroundColor: colors.card }]}
                            onLongPress={() => handleDelete(alert.budget_id, alert.category)}
                        >
                            <View style={styles.alertHeader}>
                                <Text style={styles.alertEmoji}>{getStatusEmoji(alert.status)}</Text>
                                <Text style={[styles.alertCategory, { color: colors.text }]}>
                                    {alert.category}
                                </Text>
                                <Text style={[styles.alertPct, { color: getStatusColor(alert.status) }]}>
                                    {alert.percentage}%
                                </Text>
                            </View>

                            {/* Progress Bar */}
                            <View style={[styles.progressBg, { backgroundColor: colors.bg }]}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: `${Math.min(100, alert.percentage)}%`,
                                            backgroundColor: getStatusColor(alert.status),
                                        },
                                    ]}
                                />
                            </View>

                            <View style={styles.alertFooter}>
                                <Text style={[styles.alertSpent, { color: colors.subtext }]}>
                                    ₹{alert.spent.toLocaleString('en-IN')} spent
                                </Text>
                                <Text style={[styles.alertLimit, { color: colors.muted }]}>
                                    of ₹{alert.monthly_limit.toLocaleString('en-IN')}
                                </Text>
                            </View>

                            {alert.status === 'exceeded' && (
                                <View style={styles.exceededBanner}>
                                    <Text style={styles.exceededText}>
                                        ⚠️ Over by ₹{(alert.spent - alert.monthly_limit).toLocaleString('en-IN')}
                                    </Text>
                                </View>
                            )}

                            <Text style={[styles.hint, { color: colors.muted }]}>
                                Long press to delete
                            </Text>
                        </TouchableOpacity>
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>📊</Text>
                        <Text style={[styles.emptyText, { color: colors.muted }]}>
                            No budgets set
                        </Text>
                        <Text style={[styles.emptySubtext, { color: colors.muted }]}>
                            Tap + to set your first spending limit
                        </Text>
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>

            {/* Create Modal */}
            <Modal visible={showModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Set Budget</Text>

                        <Text style={[styles.label, { color: colors.subtext }]}>Category</Text>
                        <View style={styles.categoryGrid}>
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[
                                        styles.categoryChip,
                                        { backgroundColor: colors.bg },
                                        selectedCategory === cat && styles.categoryChipActive,
                                    ]}
                                    onPress={() => setSelectedCategory(cat)}
                                >
                                    <Text style={[
                                        styles.categoryText,
                                        { color: colors.subtext },
                                        selectedCategory === cat && styles.categoryTextActive,
                                    ]}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.label, { color: colors.subtext }]}>Monthly Limit (₹)</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.bg, color: colors.text }]}
                            placeholder="e.g. 5000"
                            placeholderTextColor={colors.muted}
                            keyboardType="numeric"
                            value={limitAmount}
                            onChangeText={setLimitAmount}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.cancelBtn, { backgroundColor: colors.bg }]}
                                onPress={() => setShowModal(false)}
                            >
                                <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleCreate}>
                                <Text style={styles.saveText}>Set Budget</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 20, paddingTop: 60 },
    title: { fontSize: 28, fontWeight: 'bold' },
    subtitle: { fontSize: 14, marginTop: 4 },
    alertCard: {
        marginHorizontal: 20, marginBottom: 12, padding: 16, borderRadius: 12,
    },
    alertHeader: {
        flexDirection: 'row', alignItems: 'center', marginBottom: 12,
    },
    alertEmoji: { fontSize: 20, marginRight: 8 },
    alertCategory: { fontSize: 16, fontWeight: '600', flex: 1 },
    alertPct: { fontSize: 18, fontWeight: 'bold' },
    progressBg: {
        height: 8, borderRadius: 4, marginBottom: 12,
    },
    progressFill: { height: 8, borderRadius: 4 },
    alertFooter: {
        flexDirection: 'row', justifyContent: 'space-between',
    },
    alertSpent: { fontSize: 14 },
    alertLimit: { fontSize: 12 },
    exceededBanner: {
        backgroundColor: '#7F1D1D', padding: 8, borderRadius: 8, marginTop: 8,
    },
    exceededText: { color: '#FCA5A5', fontSize: 12, textAlign: 'center' },
    hint: { fontSize: 11, textAlign: 'center', marginTop: 8 },
    emptyState: { alignItems: 'center', padding: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyText: { fontSize: 18, fontWeight: '600' },
    emptySubtext: { fontSize: 14, marginTop: 8, textAlign: 'center' },
    fab: {
        position: 'absolute', bottom: 100, right: 20,
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center',
        elevation: 8,
    },
    fabText: { fontSize: 32, color: '#fff', fontWeight: '300' },
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: 40,
    },
    modalTitle: {
        fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20,
    },
    label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    categoryChip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    },
    categoryChipActive: { backgroundColor: '#3B82F6' },
    categoryText: { fontSize: 13 },
    categoryTextActive: { color: '#fff', fontWeight: '500' },
    input: {
        borderRadius: 12, padding: 16, fontSize: 18, marginBottom: 20,
    },
    modalButtons: { flexDirection: 'row', gap: 12 },
    cancelBtn: {
        flex: 1, padding: 16, borderRadius: 12, alignItems: 'center',
    },
    cancelText: { fontSize: 16, fontWeight: '600' },
    saveBtn: {
        flex: 1, padding: 16, borderRadius: 12,
        backgroundColor: '#3B82F6', alignItems: 'center',
    },
    saveText: { fontSize: 16, color: '#fff', fontWeight: '600' },
});
