import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { auth } from "../config/firebase";
import { getTransactions, getAccounts } from "../services/firestoreService";
import { getAllBudgetStatuses } from "../services/budgetChecker";
import { useTheme } from "../context/ThemeContext";
import Svg, { Circle, Rect, Text as SvgText, G, Line } from "react-native-svg";

const CHART_COLORS = [
  "#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#14B8A6", "#6366F1",
  "#D946EF", "#0EA5E9", "#84CC16", "#E11D48", "#A855F7",
];

export default function HomeScreen({ navigation }) {
  const { colors } = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [budgetAlerts, setBudgetAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [txData, accData, alerts] = await Promise.all([
        getTransactions(),
        getAccounts(),
        getAllBudgetStatuses(),
      ]);
      setTransactions(txData);
      setAccounts(accData);
      setBudgetAlerts(alerts);
    } catch (error) {
      console.log("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const monthlyTransactions = transactions.filter((t) => {
    if (!t.date) return false;
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalIncome = monthlyTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = monthlyTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpenses;

  // Category breakdown
  const categoryTotals = {};
  monthlyTransactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const cat = t.category || "Other";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
    });

  const categoryData = Object.entries(categoryTotals)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  // Monthly trends (last 6 months)
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();

    const income = transactions
      .filter((t) => {
        if (!t.date || t.type !== "income") return false;
        const td = new Date(t.date);
        return td.getMonth() === m && td.getFullYear() === y;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions
      .filter((t) => {
        if (!t.date || t.type !== "expense") return false;
        const td = new Date(t.date);
        return td.getMonth() === m && td.getFullYear() === y;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    monthlyData.push({ month: monthNames[m], income, expenses });
  }

  // Account balances
  const accountBalances = {};
  accounts.forEach((acc) => { accountBalances[acc.name] = 0; });
  transactions.forEach((tx) => {
    const accName = tx.account || "Cash";
    if (accountBalances[accName] === undefined) accountBalances[accName] = 0;
    if (tx.type === "income") accountBalances[accName] += tx.amount;
    else if (tx.type === "expense") accountBalances[accName] -= tx.amount;
    else if (tx.type === "transfer_out") accountBalances[accName] -= tx.amount;
    else if (tx.type === "transfer_in") accountBalances[accName] += tx.amount;
  });

  // Recent transactions
  const recentTransactions = transactions
    .filter((t) => t.type === "income" || t.type === "expense")
    .slice(0, 5);

  // Pie chart
  const renderPieChart = () => {
    if (categoryData.length === 0) {
      return <Text style={[s.emptyChart, { color: colors.textMuted }]}>No expenses this month</Text>;
    }

    const total = categoryData.reduce((sum, c) => sum + c.amount, 0);
    const circumference = 2 * Math.PI * 70;
    let cumulativePercent = 0;

    const donutSlices = categoryData.map((cat, i) => {
      const percent = cat.amount / total;
      const offset = circumference * (1 - cumulativePercent);
      const dashLength = circumference * percent;
      cumulativePercent += percent;

      return (
        <Circle
          key={cat.name}
          cx="100"
          cy="100"
          r="70"
          fill="none"
          stroke={CHART_COLORS[i % CHART_COLORS.length]}
          strokeWidth="30"
          strokeDasharray={`${dashLength} ${circumference - dashLength}`}
          strokeDashoffset={offset}
          transform="rotate(-90 100 100)"
        />
      );
    });

    return (
      <View style={s.chartSection}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Spending by Category</Text>
        <View style={s.pieContainer}>
          <Svg width={200} height={200} viewBox="0 0 200 200">
            {donutSlices}
            <SvgText x="100" y="95" textAnchor="middle" fontSize="18" fontWeight="bold" fill={colors.text}>
              {total.toFixed(0)}
            </SvgText>
            <SvgText x="100" y="115" textAnchor="middle" fontSize="12" fill={colors.textMuted}>
              Total
            </SvgText>
          </Svg>
          <View style={s.legendContainer}>
            {categoryData.slice(0, 6).map((cat, i) => (
              <View key={cat.name} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }]} />
                <Text style={[s.legendText, { color: colors.textSecondary }]} numberOfLines={1}>{cat.name}</Text>
                <Text style={[s.legendValue, { color: colors.text }]}>{cat.amount.toFixed(0)}</Text>
              </View>
            ))}
            {categoryData.length > 6 && (
              <Text style={[s.legendMore, { color: colors.textMuted }]}>+{categoryData.length - 6} more</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Bar chart
  const renderBarChart = () => {
    const maxVal = Math.max(...monthlyData.map((d) => Math.max(d.income, d.expenses)), 1);
    const chartHeight = 160;
    const barWidth = 16;
    const gap = 8;
    const groupWidth = barWidth * 2 + gap;
    const chartWidth = monthlyData.length * (groupWidth + 20);

    return (
      <View style={s.chartSection}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Monthly Trends</Text>
        <View style={s.legendRow}>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: colors.income }]} />
            <Text style={[s.legendSmall, { color: colors.textSecondary }]}>Income</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: colors.expense }]} />
            <Text style={[s.legendSmall, { color: colors.textSecondary }]}>Expenses</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Svg width={Math.max(chartWidth + 20, 300)} height={chartHeight + 40} viewBox={`0 0 ${Math.max(chartWidth + 20, 300)} ${chartHeight + 40}`}>
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
              <Line key={frac} x1="0" y1={chartHeight * (1 - frac)} x2={Math.max(chartWidth + 20, 300)} y2={chartHeight * (1 - frac)} stroke={colors.border} strokeWidth="1" />
            ))}
            {monthlyData.map((d, i) => {
              const x = i * (groupWidth + 20) + 20;
              const incomeHeight = (d.income / maxVal) * chartHeight;
              const expenseHeight = (d.expenses / maxVal) * chartHeight;
              return (
                <G key={d.month}>
                  <Rect x={x} y={chartHeight - incomeHeight} width={barWidth} height={Math.max(incomeHeight, 1)} rx={4} fill={colors.income} />
                  <Rect x={x + barWidth + gap} y={chartHeight - expenseHeight} width={barWidth} height={Math.max(expenseHeight, 1)} rx={4} fill={colors.expense} />
                  <SvgText x={x + groupWidth / 2} y={chartHeight + 20} textAnchor="middle" fontSize="11" fill={colors.textMuted}>{d.month}</SvgText>
                </G>
              );
            })}
          </Svg>
        </ScrollView>
      </View>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${monthNames[d.getMonth()]} ${d.getDate()}`;
  };

  const s = styles;

  if (loading) {
    return (
      <View style={[s.container, { backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: colors.textMuted, fontSize: 16 }}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.bg }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={[s.greeting, { color: colors.text }]}>
            {now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening"}
          </Text>
          <Text style={[s.email, { color: colors.textMuted }]}>{auth.currentUser?.email}</Text>
        </View>
        <TouchableOpacity
          style={[s.settingsBtn, { borderColor: colors.borderDark }]}
          onPress={() => navigation.navigate("Settings")}
        >
          <Text style={{ fontSize: 20 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Month indicator */}
      <Text style={[s.monthLabel, { color: colors.primary }]}>
        {monthNames[currentMonth]} {currentYear}
      </Text>

      {/* Budget alerts */}
      {budgetAlerts.length > 0 && (
        <View style={s.alertSection}>
          {budgetAlerts.map((alert, i) => (
            <TouchableOpacity
              key={i}
              style={[
                s.alertCard,
                {
                  backgroundColor: alert.type === "over" ? colors.expenseBg : colors.warningBg,
                  borderColor: alert.type === "over" ? colors.expense : colors.warning,
                },
              ]}
              onPress={() => navigation.navigate("Budgets")}
            >
              <Text style={[s.alertIcon]}>{alert.type === "over" ? "🚨" : "⚠️"}</Text>
              <View style={s.alertContent}>
                <Text style={[s.alertTitle, { color: alert.type === "over" ? colors.expense : "#92400E" }]}>
                  {alert.name}
                </Text>
                <Text style={[s.alertText, { color: alert.type === "over" ? colors.expense : "#92400E" }]}>
                  {alert.percentage}% used — {alert.spent.toFixed(2)} / {alert.limit.toFixed(2)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Summary cards */}
      <View style={s.summaryRow}>
        <View style={[s.summaryCard, { backgroundColor: colors.incomeBg }]}>
          <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Income</Text>
          <Text style={[s.summaryValue, { color: colors.income }]}>{totalIncome.toFixed(2)}</Text>
        </View>
        <View style={[s.summaryCard, { backgroundColor: colors.expenseBg }]}>
          <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Expenses</Text>
          <Text style={[s.summaryValue, { color: colors.expense }]}>{totalExpenses.toFixed(2)}</Text>
        </View>
        <View style={[s.summaryCard, { backgroundColor: colors.balanceBg }]}>
          <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Balance</Text>
          <Text style={[s.summaryValue, { color: colors.primary }]}>{balance.toFixed(2)}</Text>
        </View>
      </View>

      {/* Quick actions */}
      <View style={s.quickActions}>
        {[
          { label: "Accounts", icon: "🏦", screen: "Accounts" },
          { label: "Budgets", icon: "📊", screen: "Budgets" },
          { label: "Categories", icon: "🏷️", screen: "Categories" },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            style={[s.actionCard, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Text style={s.actionIcon}>{item.icon}</Text>
            <Text style={[s.actionLabel, { color: colors.text }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Account balances */}
      <View style={s.chartSection}>
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Account Balances</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Accounts")}>
            <Text style={[s.seeAll, { color: colors.primary }]}>Manage</Text>
          </TouchableOpacity>
        </View>
        {accounts.map((acc) => {
          const bal = accountBalances[acc.name] || 0;
          const isCredit = acc.type === "credit";
          return (
            <View key={acc.id} style={[s.accountRow, { borderBottomColor: colors.border }]}>
              <View style={s.accountInfo}>
                <Text style={s.accountIconText}>{acc.icon}</Text>
                <Text style={[s.accountName, { color: colors.text }]}>{acc.name}</Text>
              </View>
              <Text style={[s.accountBal, { color: isCredit ? colors.primary : bal >= 0 ? colors.income : colors.expense }]}>
                {isCredit ? `${Math.abs(bal).toFixed(2)} used` : bal.toFixed(2)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Pie chart */}
      {renderPieChart()}

      {/* Bar chart */}
      {renderBarChart()}

      {/* Recent transactions */}
      <View style={s.chartSection}>
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Transactions")}>
            <Text style={[s.seeAll, { color: colors.primary }]}>See all</Text>
          </TouchableOpacity>
        </View>
        {recentTransactions.length === 0 ? (
          <Text style={[s.emptyChart, { color: colors.textMuted }]}>No transactions yet</Text>
        ) : (
          recentTransactions.map((tx) => (
            <View key={tx.id} style={[s.recentRow, { borderBottomColor: colors.border }]}>
              <View style={s.recentLeft}>
                <Text style={[s.recentCategory, { color: colors.text }]}>{tx.category}</Text>
                <Text style={[s.recentDate, { color: colors.textMuted }]}>{formatDate(tx.date)}</Text>
              </View>
              <Text style={[s.recentAmount, { color: tx.type === "income" ? colors.income : colors.expense }]}>
                {tx.type === "income" ? "+" : "-"}{tx.amount.toFixed(2)}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "bold",
  },
  email: {
    fontSize: 13,
    marginTop: 2,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  alertSection: {
    marginBottom: 16,
    gap: 8,
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  alertIcon: {
    fontSize: 20,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  alertText: {
    fontSize: 12,
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  quickActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  chartSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: "500",
  },
  pieContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  legendContainer: {
    flex: 1,
    gap: 6,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    flex: 1,
  },
  legendValue: {
    fontSize: 12,
    fontWeight: "500",
  },
  legendMore: {
    fontSize: 11,
    marginTop: 2,
  },
  legendRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  legendSmall: {
    fontSize: 12,
  },
  emptyChart: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 30,
  },
  accountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  accountInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  accountIconText: {
    fontSize: 20,
  },
  accountName: {
    fontSize: 14,
    fontWeight: "500",
  },
  accountBal: {
    fontSize: 15,
    fontWeight: "600",
  },
  recentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  recentLeft: {
    flex: 1,
  },
  recentCategory: {
    fontSize: 14,
    fontWeight: "500",
  },
  recentDate: {
    fontSize: 12,
    marginTop: 2,
  },
  recentAmount: {
    fontSize: 15,
    fontWeight: "600",
  },
});