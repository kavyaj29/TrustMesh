import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

// Simple pie chart using CSS conic gradient (web) or segments
const PieChart = ({ data, size = 160 }) => {
    if (!data || data.length === 0) {
        return (
            <View style={[styles.emptyChart, { width: size, height: size }]}>
                <Text style={styles.emptyText}>No data</Text>
            </View>
        );
    }

    const total = data.reduce((sum, d) => sum + d.total, 0);
    if (total === 0) return null;

    // Build conic gradient segments
    let cumPercent = 0;
    const segments = data.map((d, i) => {
        const percent = (d.total / total) * 100;
        const start = cumPercent;
        cumPercent += percent;
        return `${COLORS[i % COLORS.length]} ${start}% ${cumPercent}%`;
    });

    const gradientStr = `conic-gradient(${segments.join(', ')})`;

    return (
        <View style={{ alignItems: 'center' }}>
            <View
                style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundImage: gradientStr,
                }}
            />
            {/* Legend */}
            <View style={styles.legend}>
                {data.slice(0, 5).map((d, i) => (
                    <View key={i} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: COLORS[i % COLORS.length] }]} />
                        <Text style={styles.legendText}>
                            {d.txn_type || d.category || 'Other'} - ₹{Math.round(d.total).toLocaleString()}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

// Simple bar chart
const BarChart = ({ data, height = 140 }) => {
    if (!data || data.length === 0) {
        return (
            <View style={[styles.emptyChart, { height }]}>
                <Text style={styles.emptyText}>No recent data</Text>
            </View>
        );
    }

    const maxVal = Math.max(...data.map(d => d.total), 1);

    return (
        <View style={{ height: height + 30 }}>
            <View style={[styles.barContainer, { height }]}>
                {data.map((d, i) => {
                    const barHeight = (d.total / maxVal) * (height - 20);
                    const dateStr = d.txn_date ? d.txn_date.slice(5) : `Day ${i + 1}`;
                    return (
                        <View key={i} style={styles.barWrapper}>
                            <Text style={styles.barValue}>₹{Math.round(d.total / 1000)}k</Text>
                            <View
                                style={[
                                    styles.bar,
                                    {
                                        height: Math.max(barHeight, 4),
                                        backgroundColor: COLORS[i % COLORS.length],
                                    },
                                ]}
                            />
                            <Text style={styles.barLabel}>{dateStr}</Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

export default function SpendingChart({ chartData, theme }) {
    const isDark = theme === 'dark';
    const cardBg = isDark ? '#1E293B' : '#F1F5F9';
    const textColor = isDark ? '#fff' : '#0F172A';
    const subColor = isDark ? '#94A3B8' : '#64748B';

    return (
        <View style={styles.container}>
            {/* Category Pie Chart */}
            <View style={[styles.chartCard, { backgroundColor: cardBg }]}>
                <Text style={[styles.chartTitle, { color: textColor }]}>Spending by Category</Text>
                <PieChart data={chartData?.by_category} />
            </View>

            {/* Daily Spending Bar Chart */}
            <View style={[styles.chartCard, { backgroundColor: cardBg }]}>
                <Text style={[styles.chartTitle, { color: textColor }]}>Daily Spending (7 days)</Text>
                <BarChart data={chartData?.daily_spending} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        gap: 16,
        marginBottom: 16,
    },
    chartCard: {
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
        alignSelf: 'flex-start',
    },
    emptyChart: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        color: '#64748B',
        fontSize: 14,
    },
    legend: {
        marginTop: 12,
        width: '100%',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    legendText: {
        color: '#94A3B8',
        fontSize: 12,
        textTransform: 'capitalize',
    },
    barContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        width: '100%',
    },
    barWrapper: {
        alignItems: 'center',
        flex: 1,
    },
    bar: {
        width: 28,
        borderRadius: 6,
        marginVertical: 4,
    },
    barValue: {
        fontSize: 10,
        color: '#94A3B8',
    },
    barLabel: {
        fontSize: 10,
        color: '#64748B',
    },
});
