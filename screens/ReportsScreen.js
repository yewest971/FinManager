            import React, { useState, useCallback } from "react";
            import {
            View,
            ScrollView,
            Text,
            TouchableOpacity,
            StyleSheet,
            Platform,
            Alert,
            } from "react-native";
            import { useUser } from "../context/UserContext";
            import { exportCSV, exportPDF } from "../services/exportService";
            import { useFocusEffect } from "@react-navigation/native";
            import DateTimePicker from "@react-native-community/datetimepicker";
            import { useTheme } from "../context/ThemeContext";
            import { getTransactions, getCategories } from "../services/firestoreService";
            import Svg, { Circle, Rect, Text as SvgText, G, Line } from "react-native-svg";

            const CHART_COLORS = [
            "#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
            "#EC4899", "#06B6D4", "#F97316", "#14B8A6", "#6366F1",
            ];

            const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

            export default function ReportsScreen({ navigation }) {
            const { formatAmount } = useUser();
            const { colors } = useTheme();
            const [transactions, setTransactions] = useState([]);
            const [categories, setCategories] = useState([]);
            const [reportType, setReportType] = useState("monthly");
            const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
            const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
            const [loading, setLoading] = useState(true);
            const [exporting, setExporting] = useState(false);

            useFocusEffect(useCallback(() => { loadData(); }, []));

            const loadData = async () => {
                try {
                setLoading(true);
                const [txData, catData] = await Promise.all([getTransactions(), getCategories()]);
                setTransactions(txData);
                setCategories(catData);
                } catch (error) {
                console.log("Error loading report data:", error);
                } finally {
                setLoading(false);
                }
            };

            const getCategoryEmoji = (catName) => {
                const found = categories.find((c) => c.name.toLowerCase() === (catName || "").toLowerCase());
                return found ? found.icon : "";
            };

            // Filter transactions based on report type
            const filteredTransactions = transactions.filter((t) => {
                if (!t.date) return false;
                if (t.type === "transfer_in" || t.type === "transfer_out") return false;
                if (t.category === "Adjustment") return false;
                const d = new Date(t.date);
                if (reportType === "monthly") {
                return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
                }
                return d.getFullYear() === selectedYear;
            });

            const totalIncome = filteredTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
            const totalExpenses = filteredTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
            const netSavings = totalIncome - totalExpenses;
            const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100) : 0;

            // Category breakdown (expenses)
            const expenseByCategory = {};
            filteredTransactions.filter((t) => t.type === "expense").forEach((t) => {
                const cat = t.category || "Other";
                expenseByCategory[cat] = (expenseByCategory[cat] || 0) + t.amount;
            });
            const categoryData = Object.entries(expenseByCategory)
                .map(([name, amount]) => ({ name, amount }))
                .sort((a, b) => b.amount - a.amount);

            // Income breakdown
            const incomeByCategory = {};
            filteredTransactions.filter((t) => t.type === "income").forEach((t) => {
                const cat = t.category || "Other";
                incomeByCategory[cat] = (incomeByCategory[cat] || 0) + t.amount;
            });
            const incomeData = Object.entries(incomeByCategory)
                .map(([name, amount]) => ({ name, amount }))
                .sort((a, b) => b.amount - a.amount);

            // Daily spending (for monthly report)
            const dailySpending = {};
            if (reportType === "monthly") {
                filteredTransactions.filter((t) => t.type === "expense").forEach((t) => {
                const day = new Date(t.date).getDate();
                dailySpending[day] = (dailySpending[day] || 0) + t.amount;
                });
            }

            // Monthly spending (for yearly report)
            const monthlySpending = {};
            const monthlyIncome = {};
            if (reportType === "yearly") {
                filteredTransactions.forEach((t) => {
                const month = new Date(t.date).getMonth();
                if (t.type === "expense") monthlySpending[month] = (monthlySpending[month] || 0) + t.amount;
                if (t.type === "income") monthlyIncome[month] = (monthlyIncome[month] || 0) + t.amount;
                });
            }

            // Transaction count
            const txCount = filteredTransactions.length;
            const avgPerTx = txCount > 0 ? totalExpenses / filteredTransactions.filter((t) => t.type === "expense").length : 0;

            // Navigate months/years
            const goBack = () => {
                if (reportType === "monthly") {
                if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1); }
                else setSelectedMonth(selectedMonth - 1);
                } else {
                setSelectedYear(selectedYear - 1);
                }
            };

            const goForward = () => {
                const now = new Date();
                if (reportType === "monthly") {
                if (selectedMonth === now.getMonth() && selectedYear === now.getFullYear()) return;
                if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1); }
                else setSelectedMonth(selectedMonth + 1);
                } else {
                if (selectedYear === now.getFullYear()) return;
                setSelectedYear(selectedYear + 1);
                }
            };

            const handleExportCSV = async () => {
                try {
                setExporting(true);
                const filename = reportType === "monthly"
                    ? `FinManager_${MONTH_NAMES[selectedMonth]}_${selectedYear}`
                    : `FinManager_${selectedYear}`;
                await exportCSV(filteredTransactions, filename);
                } catch (error) {
                console.log("CSV export error:", error);
                Platform.OS === "web" ? window.alert("Export failed") : Alert.alert("Error", "Export failed");
                } finally {
                setExporting(false);
                }
            };

            const handleExportPDF = async () => {
                try {
                setExporting(true);
                const filename = reportType === "monthly"
                    ? `FinManager_${MONTH_NAMES[selectedMonth]}_${selectedYear}`
                    : `FinManager_${selectedYear}`;
                const period = reportType === "monthly"
                    ? `${MONTH_NAMES[selectedMonth]} ${selectedYear}`
                    : `${selectedYear}`;

                await exportPDF({
                    title: "FinManager Report",
                    period,
                    totalIncome,
                    totalExpenses,
                    netSavings,
                    savingsRate,
                    txCount,
                    avgPerTx: isNaN(avgPerTx) ? 0 : avgPerTx,
                    categoryData,
                    incomeData,
                    transactions: filteredTransactions,
                }, filename);
                } catch (error) {
                console.log("PDF export error:", error);
                Platform.OS === "web" ? window.alert("Export failed") : Alert.alert("Error", "Export failed");
                } finally {
                setExporting(false);
                }
            };

            // Donut chart
            const renderDonut = (data, total, label) => {
                if (data.length === 0) return <Text style={[st.emptyText, { color: colors.textMuted }]}>No {label.toLowerCase()} data</Text>;

                const circumference = 2 * Math.PI * 60;
                let cumulativePercent = 0;

                return (
                <View style={st.donutContainer}>
                    <Svg width={160} height={160} viewBox="0 0 160 160">
                    {data.map((cat, i) => {
                        const percent = cat.amount / total;
                        const offset = circumference * (1 - cumulativePercent);
                        const dashLength = circumference * percent;
                        cumulativePercent += percent;
                        return (
                        <Circle key={cat.name} cx="80" cy="80" r="60" fill="none"
                            stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth="24"
                            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                            strokeDashoffset={offset} transform="rotate(-90 80 80)" />
                        );
                    })}
                    <SvgText x="80" y="75" textAnchor="middle" fontSize="14" fontWeight="bold" fill={colors.text}>{formatAmount(total)}</SvgText>
                    <SvgText x="80" y="95" textAnchor="middle" fontSize="11" fill={colors.textMuted}>{label}</SvgText>
                    </Svg>
                    <View style={st.donutLegend}>
                    {data.slice(0, 5).map((cat, i) => (
                        <View key={cat.name} style={st.legendItem}>
                        <View style={[st.legendDot, { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }]} />
                        <Text style={[st.legendText, { color: colors.textSecondary }]} numberOfLines={1}>{getCategoryEmoji(cat.name)} {cat.name}</Text>
                        <Text style={[st.legendValue, { color: colors.text }]}>{formatAmount(cat.amount)}</Text>
                        <Text style={[st.legendPercent, { color: colors.textMuted }]}>{Math.round((cat.amount / total) * 100)}%</Text>
                        </View>
                    ))}
                    {data.length > 5 && <Text style={[st.legendMore, { color: colors.textMuted }]}>+{data.length - 5} more</Text>}
                    </View>
                </View>
                );
            };

            // Bar chart for yearly
            const renderYearlyBars = () => {
                const maxVal = Math.max(
                ...Object.values(monthlySpending),
                ...Object.values(monthlyIncome),
                1
                );
                const chartHeight = 140;
                const barWidth = 10;
                const gap = 4;
                const groupWidth = barWidth * 2 + gap;
                const totalWidth = 12 * (groupWidth + 12) + 20;

                return (
                <View style={st.section}>
                    <Text style={[st.sectionTitle, { color: colors.text }]}>Monthly Breakdown</Text>
                    <View style={st.barLegendRow}>
                    <View style={st.legendItem}><View style={[st.legendDot, { backgroundColor: colors.income }]} /><Text style={[st.legendSmall, { color: colors.textSecondary }]}>Income</Text></View>
                    <View style={st.legendItem}><View style={[st.legendDot, { backgroundColor: colors.expense }]} /><Text style={[st.legendSmall, { color: colors.textSecondary }]}>Expenses</Text></View>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <Svg width={totalWidth} height={chartHeight + 30} viewBox={`0 0 ${totalWidth} ${chartHeight + 30}`}>
                        {[0, 0.5, 1].map((frac) => (
                        <Line key={frac} x1="0" y1={chartHeight * (1 - frac)} x2={totalWidth} y2={chartHeight * (1 - frac)} stroke={colors.border} strokeWidth="1" />
                        ))}
                        {Array.from({ length: 12 }, (_, i) => {
                        const x = i * (groupWidth + 12) + 20;
                        const inc = monthlyIncome[i] || 0;
                        const exp = monthlySpending[i] || 0;
                        const incH = (inc / maxVal) * chartHeight;
                        const expH = (exp / maxVal) * chartHeight;
                        return (
                            <G key={i}>
                            <Rect x={x} y={chartHeight - incH} width={barWidth} height={Math.max(incH, 1)} rx={3} fill={colors.income} />
                            <Rect x={x + barWidth + gap} y={chartHeight - expH} width={barWidth} height={Math.max(expH, 1)} rx={3} fill={colors.expense} />
                            <SvgText x={x + groupWidth / 2} y={chartHeight + 18} textAnchor="middle" fontSize="10" fill={colors.textMuted}>{MONTH_NAMES[i].substring(0, 1)}</SvgText>
                            </G>
                        );
                        })}
                    </Svg>
                    </ScrollView>
                </View>
                );
            };

            // Daily spending bars for monthly
            const renderDailyBars = () => {
                const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
                const maxVal = Math.max(...Object.values(dailySpending), 1);
                const chartHeight = 120;
                const barWidth = 8;
                const totalWidth = daysInMonth * (barWidth + 4) + 20;

                if (Object.keys(dailySpending).length === 0) return null;

                return (
                <View style={st.section}>
                    <Text style={[st.sectionTitle, { color: colors.text }]}>Daily Spending</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <Svg width={totalWidth} height={chartHeight + 30} viewBox={`0 0 ${totalWidth} ${chartHeight + 30}`}>
                        {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const x = i * (barWidth + 4) + 10;
                        const val = dailySpending[day] || 0;
                        const h = (val / maxVal) * chartHeight;
                        return (
                            <G key={day}>
                            <Rect x={x} y={chartHeight - h} width={barWidth} height={Math.max(h, 1)} rx={2} fill={val > 0 ? colors.expense : colors.border} />
                            {day % 5 === 1 && <SvgText x={x + barWidth / 2} y={chartHeight + 16} textAnchor="middle" fontSize="9" fill={colors.textMuted}>{day}</SvgText>}
                            </G>
                        );
                        })}
                    </Svg>
                    </ScrollView>
                </View>
                );
            };

            if (loading) {
                return <View style={[st.container, { backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }]}><Text style={{ color: colors.textMuted }}>Loading report...</Text></View>;
            }

            return (
                <ScrollView style={[st.container, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

                <View style={st.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={[st.backBtn, { color: colors.primary }]}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={[st.heading, { color: colors.text }]}>Reports</Text>
                    <View style={{ width: 50 }} />
                </View>

                {/* Report type toggle */}
                <View style={st.toggleRow}>
                    <TouchableOpacity style={[st.toggleBtn, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, reportType === "monthly" && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setReportType("monthly")}>
                    <Text style={[st.toggleText, { color: colors.textSecondary }, reportType === "monthly" && { color: "#fff", fontWeight: "600" }]}>Monthly</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[st.toggleBtn, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, reportType === "yearly" && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setReportType("yearly")}>
                    <Text style={[st.toggleText, { color: colors.textSecondary }, reportType === "yearly" && { color: "#fff", fontWeight: "600" }]}>Yearly</Text>
                    </TouchableOpacity>
                </View>

                {/* Period selector */}
                <View style={st.periodSelector}>
                    <TouchableOpacity onPress={goBack}><Text style={[st.periodArrow, { color: colors.primary }]}>◀</Text></TouchableOpacity>
                    <Text style={[st.periodLabel, { color: colors.text }]}>
                    {reportType === "monthly" ? `${MONTH_NAMES[selectedMonth]} ${selectedYear}` : `${selectedYear}`}
                    </Text>
                    <TouchableOpacity onPress={goForward}><Text style={[st.periodArrow, { color: colors.primary }]}>▶</Text></TouchableOpacity>
                </View>

                {/* Summary cards */}
                <View style={st.summaryGrid}>
                    <View style={[st.summaryCard, { backgroundColor: colors.incomeBg }]}>
                    <Text style={[st.summaryLabel, { color: colors.textSecondary }]}>Total Income</Text>
                    <Text style={[st.summaryValue, { color: colors.income }]}>{formatAmount(totalIncome)}</Text>
                    </View>
                    <View style={[st.summaryCard, { backgroundColor: colors.expenseBg }]}>
                    <Text style={[st.summaryLabel, { color: colors.textSecondary }]}>Total Expenses</Text>
                    <Text style={[st.summaryValue, { color: colors.expense }]}>{formatAmount(totalExpenses)}</Text>
                    </View>
                    <View style={[st.summaryCard, { backgroundColor: colors.balanceBg }]}>
                    <Text style={[st.summaryLabel, { color: colors.textSecondary }]}>Net Savings</Text>
                    <Text style={[st.summaryValue, { color: netSavings >= 0 ? colors.income : colors.expense }]}>{formatAmount(netSavings)}</Text>
                    </View>
                    <View style={[st.summaryCard, { backgroundColor: colors.bgSecondary }]}>
                    <Text style={[st.summaryLabel, { color: colors.textSecondary }]}>Savings Rate</Text>
                    <Text style={[st.summaryValue, { color: savingsRate >= 0 ? colors.income : colors.expense }]}>{savingsRate.toFixed(0)}%</Text>
                    </View>
                </View>

                {/* Stats row */}
                <View style={[st.statsRow, { borderColor: colors.border }]}>
                    <View style={st.statItem}>
                    <Text style={[st.statValue, { color: colors.text }]}>{txCount}</Text>
                    <Text style={[st.statLabel, { color: colors.textMuted }]}>Transactions</Text>
                    </View>
                    <View style={[st.statDivider, { backgroundColor: colors.border }]} />
                    <View style={st.statItem}>
                    <Text style={[st.statValue, { color: colors.text }]}>{isNaN(avgPerTx) ? "0" : avgPerTx.toFixed(0)}</Text>
                    <Text style={[st.statLabel, { color: colors.textMuted }]}>Avg expense</Text>
                    </View>
                    <View style={[st.statDivider, { backgroundColor: colors.border }]} />
                    <View style={st.statItem}>
                    <Text style={[st.statValue, { color: colors.text }]}>{categoryData.length}</Text>
                    <Text style={[st.statLabel, { color: colors.textMuted }]}>Categories</Text>
                    </View>
                </View>

                {/* Expense donut */}
                <View style={st.section}>
                    <Text style={[st.sectionTitle, { color: colors.text }]}>Expense Breakdown</Text>
                    {renderDonut(categoryData, totalExpenses, "Expenses")}
                </View>

                {/* Income donut */}
                <View style={st.section}>
                    <Text style={[st.sectionTitle, { color: colors.text }]}>Income Breakdown</Text>
                    {renderDonut(incomeData, totalIncome, "Income")}
                </View>

                {/* Daily / Monthly bars */}
                {reportType === "monthly" ? renderDailyBars() : renderYearlyBars()}

                {/* Export buttons */}
                <View style={st.section}>
                    <Text style={[st.sectionTitle, { color: colors.text }]}>Export</Text>
                    <View style={st.exportRow}>
                    <TouchableOpacity
                        style={[st.exportBtn, { backgroundColor: colors.income }, exporting && { opacity: 0.6 }]}
                        onPress={handleExportCSV}
                        disabled={exporting}
                    >
                        <Text style={st.exportBtnText}>📊 Export CSV</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[st.exportBtn, { backgroundColor: colors.primary }, exporting && { opacity: 0.6 }]}
                        onPress={handleExportPDF}
                        disabled={exporting}
                    >
                        <Text style={st.exportBtnText}>📄 Export PDF</Text>
                    </TouchableOpacity>
                    </View>
                    <Text style={[st.exportHint, { color: colors.textMuted }]}>
                    {Platform.OS === "web" ? "CSV downloads directly. PDF opens in a new tab for printing." : "Files will open in the share menu."}
                    </Text>
                </View>

                {/* Top expenses list */}
                <View style={st.section}>
                    <Text style={[st.sectionTitle, { color: colors.text }]}>Top Expenses</Text>
                    {categoryData.length === 0 ? (
                    <Text style={[st.emptyText, { color: colors.textMuted }]}>No expenses</Text>
                    ) : (
                    categoryData.slice(0, 8).map((cat, i) => {
                        const percentage = totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0;
                        return (
                        <View key={cat.name} style={[st.topExpenseRow, { borderBottomColor: colors.border }]}>
                            <View style={st.topExpenseLeft}>
                            <Text style={[st.topExpenseRank, { color: colors.textMuted }]}>{i + 1}</Text>
                            <Text style={[st.topExpenseName, { color: colors.text }]}>{getCategoryEmoji(cat.name)} {cat.name}</Text>
                            </View>
                            <View style={st.topExpenseRight}>
                            <Text style={[st.topExpenseAmount, { color: colors.expense }]}>{formatAmount(cat.amount)}</Text>
                            <View style={[st.topExpenseBar, { backgroundColor: colors.inputBg }]}>
                                <View style={[st.topExpenseFill, { width: `${percentage}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }]} />
                            </View>
                            </View>
                        </View>
                        );
                    })
                    )}
                </View>
                </ScrollView>
            );
            }

            const st = StyleSheet.create({
            container: { flex: 1, padding: 20, paddingTop: 60 },
            headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
            backBtn: { fontSize: 15, fontWeight: "600" },
            heading: { fontSize: 20, fontWeight: "bold" },
            toggleRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
            toggleBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
            toggleText: { fontSize: 14, fontWeight: "500" },
            periodSelector: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 24, marginBottom: 20 },
            periodArrow: { fontSize: 18, fontWeight: "bold" },
            periodLabel: { fontSize: 18, fontWeight: "bold" },
            summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
            summaryCard: { width: "48%", padding: 14, borderRadius: 12, flexGrow: 1 },
            summaryLabel: { fontSize: 12, marginBottom: 4 },
            summaryValue: { fontSize: 18, fontWeight: "bold" },
            statsRow: { flexDirection: "row", borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 20, justifyContent: "space-around", alignItems: "center" },
            statItem: { alignItems: "center" },
            statValue: { fontSize: 18, fontWeight: "bold" },
            statLabel: { fontSize: 11, marginTop: 2 },
            statDivider: { width: 1, height: 30 },
            section: { marginBottom: 24 },
            sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
            donutContainer: { flexDirection: "row", alignItems: "center", gap: 16 },
            donutLegend: { flex: 1, gap: 6 },
            legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
            legendDot: { width: 10, height: 10, borderRadius: 5 },
            legendText: { fontSize: 12, flex: 1 },
            legendValue: { fontSize: 12, fontWeight: "500" },
            legendPercent: { fontSize: 11, width: 30, textAlign: "right" },
            legendMore: { fontSize: 11, marginTop: 2 },
            legendSmall: { fontSize: 12 },
            barLegendRow: { flexDirection: "row", gap: 16, marginBottom: 8 },
            topExpenseRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1 },
            topExpenseLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
            topExpenseRank: { fontSize: 12, fontWeight: "600", width: 18 },
            topExpenseName: { fontSize: 13, fontWeight: "500" },
            topExpenseRight: { alignItems: "flex-end", gap: 4 },
            topExpenseAmount: { fontSize: 14, fontWeight: "600" },
            topExpenseBar: { height: 4, width: 80, borderRadius: 2, overflow: "hidden" },
            topExpenseFill: { height: "100%", borderRadius: 2 },
            emptyText: { fontSize: 14, textAlign: "center", paddingVertical: 20 },
            exportRow: { flexDirection: "row", gap: 10 },
            exportBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: "center" },
            exportBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
            exportHint: { fontSize: 12, textAlign: "center", marginTop: 8 },
            });