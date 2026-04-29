import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { auth } from "../config/firebase";
import { getTransactions, getAccounts, initializeDefaultAccounts, getGoals, removeDuplicateAccounts } from "../services/firestoreService";
import { getAllBudgetStatuses } from "../services/budgetChecker";
import { useUser } from "../context/UserContext";
import { useTheme } from "../context/ThemeContext";
import { Feather } from "@expo/vector-icons";
import Svg, { Circle, Rect, Text as SvgText, G, Line } from "react-native-svg";

const CHART_COLORS = [
  "#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#14B8A6", "#6366F1",
  "#D946EF", "#0EA5E9", "#84CC16", "#E11D48", "#A855F7",
];

export default function HomeScreen({ navigation }) {
  const { colors } = useTheme();
  const { displayName, formatAmount } = useUser();
  const { width: screenWidth } = useWindowDimensions();
  const isWide = screenWidth > 600;
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [budgetAlerts, setBudgetAlerts] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

      const loadData = async () => {
        try {
          setLoading(true);
          const startTime = Date.now();
          await initializeDefaultAccounts();
          await removeDuplicateAccounts();
          const [txData, accData, alerts, goalsData] = await Promise.all([
            getTransactions(),
            getAccounts(),
            getAllBudgetStatuses(),
            getGoals(),
          ]);
          setTransactions(txData);

          // Deduplicate accounts by name
          const uniqueAccounts = [];
          const seen = new Set();
          accData.forEach((acc) => {
            if (!seen.has(acc.name)) {
              seen.add(acc.name);
              uniqueAccounts.push(acc);
            }
          });
          setAccounts(uniqueAccounts);

          setBudgetAlerts(alerts);
          setSavingsGoals(goalsData);
          const loadTime = Date.now() - startTime;
          console.log(`Dashboard loaded in ${loadTime}ms`);
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
  const pieSize = isWide ? 280 : 200;
  const radius = isWide ? 100 : 70;
  const strokeW = isWide ? 40 : 30;
  const center = pieSize / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;

  const donutSlices = categoryData.map((cat, i) => {
    const percent = cat.amount / total;
    const offset = circumference * (1 - cumulativePercent);
    const dashLength = circumference * percent;
    cumulativePercent += percent;

    return (
      <Circle
        key={cat.name}
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={CHART_COLORS[i % CHART_COLORS.length]}
        strokeWidth={strokeW}
        strokeDasharray={`${dashLength} ${circumference - dashLength}`}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
      />
    );
  });

  return (
    <View style={s.chartSection}>
      <Text style={[s.sectionTitle, { color: colors.text }]}>Spending by Category</Text>
      <View style={[s.pieContainer, isWide && { gap: 32 }]}>
        <Svg width={pieSize} height={pieSize} viewBox={`0 0 ${pieSize} ${pieSize}`}>
          {donutSlices}
          <SvgText x={center} y={center - 8} textAnchor="middle" fontSize={isWide ? 24 : 18} fontWeight="bold" fill={colors.text}>
            {total.toFixed(0)}
          </SvgText>
          <SvgText x={center} y={center + 14} textAnchor="middle" fontSize={isWide ? 14 : 12} fill={colors.textMuted}>
            Total
          </SvgText>
        </Svg>
        <View style={s.legendContainer}>
          {categoryData.slice(0, 8).map((cat, i) => (
            <View key={cat.name} style={[s.legendItem, { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 6 }]}>
              <View style={[s.legendDot, { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }]} />
              <Text style={[s.legendText, { color: colors.textSecondary, fontSize: isWide ? 14 : 12 }]} numberOfLines={1}>{cat.name}</Text>
              <Text style={[s.legendValue, { color: colors.text, fontSize: isWide ? 14 : 12 }]}>{cat.amount.toFixed(0)}</Text>
            </View>
          ))}
          {categoryData.length > 8 && (
            <Text style={[s.legendMore, { color: colors.textMuted }]}>+{categoryData.length - 8} more</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const renderBarChart = () => {
  const maxVal = Math.max(...monthlyData.map((d) => Math.max(d.income, d.expenses)), 1);
  const chartHeight = isWide ? 280 : 160;
  const barWidth = isWide ? 32 : 16;
  const gap = isWide ? 12 : 8;
  const groupWidth = barWidth * 2 + gap;
  const groupGap = isWide ? 40 : 20;
  const chartWidth = Math.max(monthlyData.length * (groupWidth + groupGap) + 40, screenWidth - 60);

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
      <Svg width={chartWidth} height={chartHeight + 40} viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`}>
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
          <G key={frac}>
            <Line x1="0" y1={chartHeight * (1 - frac)} x2={chartWidth} y2={chartHeight * (1 - frac)} stroke={colors.border} strokeWidth="1" />
            {isWide && (
              <SvgText x={chartWidth - 5} y={chartHeight * (1 - frac) - 4} textAnchor="end" fontSize="10" fill={colors.textMuted}>
                {(maxVal * frac).toFixed(0)}
              </SvgText>
            )}
          </G>
        ))}
        {monthlyData.map((d, i) => {
          const x = i * (groupWidth + groupGap) + 30;
          const incomeHeight = (d.income / maxVal) * chartHeight;
          const expenseHeight = (d.expenses / maxVal) * chartHeight;
          return (
            <G key={d.month}>
              <Rect x={x} y={chartHeight - incomeHeight} width={barWidth} height={Math.max(incomeHeight, 1)} rx={4} fill={colors.income} />
              <Rect x={x + barWidth + gap} y={chartHeight - expenseHeight} width={barWidth} height={Math.max(expenseHeight, 1)} rx={4} fill={colors.expense} />
              <SvgText x={x + groupWidth / 2} y={chartHeight + 20} textAnchor="middle" fontSize={isWide ? 13 : 11} fill={colors.textMuted}>{d.month}</SvgText>
              {isWide && d.income > 0 && (
                <SvgText x={x + barWidth / 2} y={chartHeight - incomeHeight - 6} textAnchor="middle" fontSize="10" fill={colors.income}>{d.income.toFixed(0)}</SvgText>
              )}
              {isWide && d.expenses > 0 && (
                <SvgText x={x + barWidth + gap + barWidth / 2} y={chartHeight - expenseHeight - 6} textAnchor="middle" fontSize="10" fill={colors.expense}>{d.expenses.toFixed(0)}</SvgText>
              )}
            </G>
          );
        })}
      </Svg>
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
            {now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening"}{displayName ? `, ${displayName}` : ""}
          </Text>
          <Text style={[s.email, { color: colors.textMuted }]}>{auth.currentUser?.email}</Text>
        </View>
        <TouchableOpacity
          style={[s.settingsBtn, { borderColor: colors.borderDark }]}
          onPress={() => navigation.navigate("Settings")}
        >
          <Feather name="settings" size={22} color={colors.textMuted} />
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
              <Feather name={alert.type === "over" ? "alert-circle" : "alert-triangle"} size={22} color={alert.type === "over" ? colors.expense : "#92400E"} />
              <View style={s.alertContent}>
                <Text style={[s.alertTitle, { color: alert.type === "over" ? colors.expense : "#92400E" }]}>
                  {alert.name}
                </Text>
                <Text style={[s.alertText, { color: alert.type === "over" ? colors.expense : "#92400E" }]}>
                  {alert.percentage}% used — {formatAmount(alert.spent)} / {formatAmount(alert.limit)}
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
          <Text style={[s.summaryValue, { color: colors.income }]}>{formatAmount(totalIncome)}</Text>
        </View>
        <View style={[s.summaryCard, { backgroundColor: colors.expenseBg }]}>
          <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Expenses</Text>
          <Text style={[s.summaryValue, { color: colors.expense }]}>{formatAmount(totalExpenses)}</Text>
        </View>
        <View style={[s.summaryCard, { backgroundColor: colors.balanceBg }]}>
          <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Balance</Text>
          <Text style={[s.summaryValue, { color: colors.primary }]}>{formatAmount(balance)}</Text>
        </View>
      </View>

      {/* Quick actions */}
      <View style={s.quickActions}>
        {[
          { label: "Accounts & Cards", iconName: "credit-card", screen: "Accounts" },
          { label: "Budgets", iconName: "pie-chart", screen: "Budgets" },
          { label: "Goals", iconName: "target", lib: "Feather", screen: "SavingsGoals" },
          { label: "Reports", iconName: "file-text", lib: "Feather", screen: "Reports" },
          { label: "Categories", iconName: "tag", lib: "Feather", screen: "Categories" },
        ].map((item) => {
          
          return (
            <TouchableOpacity
              key={item.label}
              style={[s.actionCard, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
              onPress={() => navigation.navigate(item.screen)}
            >
              <Feather name={item.iconName} size={26} color={colors.primary} />
              <Text style={[s.actionLabel, { color: colors.text }]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Account balances */}
      <View style={s.chartSection}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Account Balances</Text>
        {accounts
          .filter((acc) => acc.type !== "credit")
          .sort((a, b) => (accountBalances[b.name] || 0) - (accountBalances[a.name] || 0))
          .map((acc) => {
            const bal = accountBalances[acc.name] || 0;
            return (
              <View key={acc.id} style={[s.accountRow, { borderBottomColor: colors.border }]}>
                <View style={s.accountInfo}>
                  <Text style={s.accountIconText}>{acc.icon}</Text>
                  <Text style={[s.accountName, { color: colors.text }]}>{acc.name}</Text>
                </View>
                <Text style={[s.accountBal, { color: bal >= 0 ? colors.income : colors.expense }]}>
                  {formatAmount(bal)}
                </Text>
              </View>
            );
          })}
      </View>

      {/* Credit cards */}
      {accounts.filter((acc) => acc.type === "credit").length > 0 && (
        <View style={s.chartSection}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Credit Cards</Text>
          {accounts
            .filter((acc) => acc.type === "credit")
            .sort((a, b) => {
              const aAvail = (a.limit || 0) - Math.abs(accountBalances[a.name] || 0);
              const bAvail = (b.limit || 0) - Math.abs(accountBalances[b.name] || 0);
              return aAvail - bAvail;
            })
            .map((acc) => {
              const bal = accountBalances[acc.name] || 0;
              const used = Math.abs(bal);
              const limit = acc.limit || 0;
              return (
                <View key={acc.id} style={[s.accountRow, { borderBottomColor: colors.border }]}>
                  <View style={s.accountInfo}>
                    <Text style={s.accountIconText}>{acc.icon}</Text>
                    <Text style={[s.accountName, { color: colors.text }]}>{acc.name}</Text>
                  </View>
                  <Text style={[s.accountBal, { color: colors.primary }]}>
                    {formatAmount(used)}/{formatAmount(limit)} used
                  </Text>
                </View>
              );
            })}
        </View>
      )}

      {/* Pie chart */}
      {renderPieChart()}

      {/* Bar chart */}
      {renderBarChart()}

            {/* Savings Goals */}
      {savingsGoals.length > 0 && (
        <View style={s.chartSection}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Savings Goals</Text>
            <TouchableOpacity onPress={() => navigation.navigate("SavingsGoals")}>
              <Text style={[s.seeAll, { color: colors.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>
          {savingsGoals
            .filter((g) => (g.savedAmount || 0) < g.targetAmount)
            .slice(0, 3)
            .map((goal) => {
              const percentage = Math.min(((goal.savedAmount || 0) / goal.targetAmount) * 100, 100);
              const daysLeft = Math.max(Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24)), 0);
              return (
                <TouchableOpacity key={goal.id} style={[s.goalRow, { borderBottomColor: colors.border }]} onPress={() => navigation.navigate("SavingsGoals")}>
                  <View style={{ flex: 1 }}>
                    <View style={s.goalTopRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Feather name="target" size={14} color={colors.primary} />
                        <Text style={[s.goalName, { color: colors.text }]}>{goal.name}</Text>
                      </View>
                      <Text style={[s.goalDays, { color: daysLeft === 0 ? colors.expense : colors.textMuted }]}>
                        {daysLeft === 0 ? "Overdue" : `${daysLeft}d left`}
                      </Text>
                    </View>
                    <View style={[s.goalTrack, { backgroundColor: colors.inputBg }]}>
                      <View style={[s.goalFill, { width: `${percentage}%`, backgroundColor: colors.primary }]} />
                    </View>
                    <Text style={[s.goalProgress, { color: colors.textMuted }]}>
                      {(goal.savedAmount || 0).toFixed(0)} / {goal.targetAmount.toFixed(0)} ({Math.round(percentage)}%)
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
        </View>
      )}

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
                {tx.type === "income" ? "+" : "-"}{formatAmount(tx.amount)}
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
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
    justifyContent: "flex-start",
  },
  actionCard: {
    flexBasis: "31%",
    flexGrow: 0,
    flexShrink: 0,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
    },
  actionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
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
  goalRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  goalTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  goalName: {
    fontSize: 14,
    fontWeight: "500",
  },
  goalDays: {
    fontSize: 12,
  },
  goalTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  goalFill: {
    height: "100%",
    borderRadius: 3,
  },
  goalProgress: {
    fontSize: 12,
  },
});