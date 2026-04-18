import React, { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "../context/ThemeContext";
import {
  getBudgets,
  setBudget,
  deleteBudget,
  getCategories,
  getTransactions,
} from "../services/firestoreService";

const PERIOD_OPTIONS = [
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
  { label: "Custom", value: "custom" },
];

export default function BudgetScreen({ navigation }) {
  const { colors } = useTheme();
  const [budgets, setBudgets] = useState([]);
  const [budgetName, setBudgetName] = useState("");
  const [categories, setCategories] = useState([]);
  const [spending, setSpending] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [limitAmount, setLimitAmount] = useState("");
  const [budgetPeriod, setBudgetPeriod] = useState(null);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const getDateRange = (period, cs, ce) => {
    const now = new Date();
    if (period === "weekly") {
      const day = now.getDay();
      const start = new Date(now); start.setDate(now.getDate() - day); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (period === "monthly") {
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) };
    }
    if (period === "yearly") {
      return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999) };
    }
    if (period === "custom" && cs && ce) {
      return { start: new Date(cs + "T00:00:00"), end: new Date(ce + "T23:59:59") };
    }
    return null;
  };

  const loadData = async () => {
    try {
      const [budgetData, categoryData, transactionData] = await Promise.all([getBudgets(), getCategories(), getTransactions()]);
      setBudgets(budgetData);
      setCategories(categoryData);

      const spendingByBudget = {};
      budgetData.forEach((budget) => {
        const range = getDateRange(budget.period || "monthly", budget.customStart || "", budget.customEnd || "");
        if (!range) { spendingByBudget[budget.id] = 0; return; }
        let total = 0;
        for (const t of transactionData) {
          if (t.type !== "expense" || !t.date) continue;
          const d = new Date(t.date);
          if (d < range.start || d > range.end) continue;
          if (budget.category && t.category !== budget.category) continue;
          total += t.amount;
        }
        spendingByBudget[budget.id] = total;
      });
      setSpending(spendingByBudget);
    } catch (error) {
      console.log("Error loading data:", error);
    }
  };

  const handleAddBudget = async () => {
    setError("");
    if (!budgetName.trim()) { setError("Please enter a budget name"); return; }
    if (!budgetPeriod) { setError("Please select a budget period"); return; }
    if (budgetPeriod === "custom" && (!customStart || !customEnd)) { setError("Please select start and end dates"); return; }
    if (budgetPeriod === "custom" && new Date(customStart) >= new Date(customEnd)) { setError("End date must be after start date"); return; }
    if (!limitAmount || isNaN(parseFloat(limitAmount)) || parseFloat(limitAmount) <= 0) { setError("Please enter a valid amount"); return; }
    const exists = budgets.some((b) => b.name && b.name.toLowerCase() === budgetName.trim().toLowerCase());
    if (exists) { setError("A budget with this name already exists"); return; }

    try {
      setLoading(true);
      await setBudget({
        name: budgetName.trim(),
        category: selectedCategory || "",
        limit: parseFloat(limitAmount),
        period: budgetPeriod,
        customStart: budgetPeriod === "custom" ? customStart : "",
        customEnd: budgetPeriod === "custom" ? customEnd : "",
      });
      setLimitAmount(""); setBudgetName(""); setSelectedCategory(null); setBudgetPeriod(null); setCustomStart(""); setCustomEnd("");
      loadData();
    } catch (err) {
      setError("Failed to set budget");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id, name) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Remove budget "${name}"?`)) performDelete(id);
    } else {
      Alert.alert("Delete Budget", `Remove budget "${name}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => performDelete(id) },
      ]);
    }
  };

  const performDelete = async (id) => {
    try { await deleteBudget(id); setBudgets((prev) => prev.filter((b) => b.id !== id)); } catch (error) { console.log("Delete error:", error); }
  };

  const renderBudget = ({ item }) => {
    const spent = spending[item.id] || 0;
    const percentage = Math.min((spent / item.limit) * 100, 100);
    const isOver = spent > item.limit;
    const isWarning = percentage >= 80 && !isOver;

    let barColor = colors.primary;
    if (isOver) barColor = colors.expense;
    else if (isWarning) barColor = colors.warning;

    const periodLabel = item.period === "custom"
      ? `${item.customStart} → ${item.customEnd}`
      : item.period ? item.period.charAt(0).toUpperCase() + item.period.slice(1) : "Monthly";

    return (
      <View style={[s.budgetCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.budgetTop}>
          <View style={{ flex: 1 }}>
            <Text style={[s.budgetName, { color: colors.text }]}>{item.name || item.category}</Text>
            <Text style={[s.budgetPeriod, { color: colors.textMuted }]}>
              {periodLabel}{item.category ? ` · ${item.category}` : ""}
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item.id, item.name || item.category)}>
            <Text style={s.deleteLink}>Delete</Text>
          </TouchableOpacity>
        </View>

        <View style={s.budgetNumbers}>
          <Text style={[s.budgetSpent, { color: colors.textSecondary }]}>
            Spent: <Text style={{ color: isOver ? colors.expense : colors.text }}>{spent.toFixed(2)}</Text>
          </Text>
          <Text style={[s.budgetLimit, { color: colors.textSecondary }]}>Limit: {item.limit.toFixed(2)}</Text>
        </View>

        <View style={[s.progressTrack, { backgroundColor: colors.inputBg }]}>
          <View style={[s.progressFill, { width: `${percentage}%`, backgroundColor: barColor }]} />
        </View>

        {isWarning && <Text style={[s.warningText, { color: colors.warning }]}>⚠️ You've used {Math.round(percentage)}% of this budget</Text>}
        {isOver && <Text style={[s.overText, { color: colors.expense }]}>🚨 Over budget by {(spent - item.limit).toFixed(2)}</Text>}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView style={[s.container, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>

        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[s.backBtn, { color: colors.primary }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[s.heading, { color: colors.text }]}>Budgets</Text>
          <View style={{ width: 50 }} />
        </View>

        <Text style={[s.label, { color: colors.textSecondary }]}>Budget name</Text>
        <TextInput style={[s.input, { marginBottom: 12, backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]} placeholder="e.g. Monthly Groceries" placeholderTextColor={colors.textMuted} value={budgetName} onChangeText={(t) => { setBudgetName(t); setError(""); }} />

        <Text style={[s.label, { color: colors.textSecondary }]}>Category (optional)</Text>
        {categories.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8, flexGrow: 0 }} contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <TouchableOpacity style={[s.addChip, { borderColor: colors.primary, backgroundColor: colors.balanceBg }]} onPress={() => navigation.navigate("Categories")}>
              <Text style={[s.addChipText, { color: colors.primary }]}>+ New</Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity key={cat.id} style={[s.chip, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, selectedCategory === cat.name && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}>
                <Text style={[s.chipText, { color: colors.textSecondary }, selectedCategory === cat.name && { color: "#fff", fontWeight: "500" }]}>{cat.icon} {cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <Text style={[s.emptyText, { color: colors.textMuted }]}>Add categories first</Text>
        )}

        <Text style={[s.label, { color: colors.textSecondary }]}>Budget period</Text>
        <View style={s.periodRow}>
          {PERIOD_OPTIONS.map((opt) => (
            <TouchableOpacity key={opt.value} style={[s.periodChip, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, budgetPeriod === opt.value && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => { setBudgetPeriod(opt.value); if (opt.value !== "custom") { setCustomStart(""); setCustomEnd(""); } }}>
              <Text style={[s.periodChipText, { color: colors.textSecondary }, budgetPeriod === opt.value && { color: "#fff", fontWeight: "600" }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {budgetPeriod === "custom" && (
          Platform.OS === "web" ? (
            <View style={s.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={[s.dateLabel, { color: colors.textSecondary }]}>Start</Text>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} style={{ width: "100%", padding: 12, borderRadius: 12, border: `1px solid ${colors.borderDark}`, fontSize: 14, backgroundColor: colors.inputBg, color: colors.text }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.dateLabel, { color: colors.textSecondary }]}>End</Text>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} style={{ width: "100%", padding: 12, borderRadius: 12, border: `1px solid ${colors.borderDark}`, fontSize: 14, backgroundColor: colors.inputBg, color: colors.text }} />
              </View>
            </View>
          ) : (
            <View style={s.dateRow}>
              <TouchableOpacity style={[s.dateButton, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }]} onPress={() => setShowStartPicker(true)}>
                <Text style={[s.dateButtonText, { color: colors.textSecondary }]}>{customStart ? `Start: ${customStart}` : "📅 Pick start date"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.dateButton, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }]} onPress={() => setShowEndPicker(true)}>
                <Text style={[s.dateButtonText, { color: colors.textSecondary }]}>{customEnd ? `End: ${customEnd}` : "📅 Pick end date"}</Text>
              </TouchableOpacity>
            </View>
          )
        )}

        {Platform.OS !== "web" && showStartPicker && (
          <DateTimePicker value={customStart ? new Date(customStart) : new Date()} mode="date" display="default" onChange={(event, date) => { setShowStartPicker(false); if (date) setCustomStart(date.toISOString().split("T")[0]); }} />
        )}
        {Platform.OS !== "web" && showEndPicker && (
          <DateTimePicker value={customEnd ? new Date(customEnd) : new Date()} mode="date" display="default" onChange={(event, date) => { setShowEndPicker(false); if (date) setCustomEnd(date.toISOString().split("T")[0]); }} />
        )}

        <Text style={[s.label, { color: colors.textSecondary }]}>Limit</Text>
        {error ? <Text style={[s.errorText, { color: colors.expense }]}>{error}</Text> : null}
        <View style={s.addRow}>
          <TextInput style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]} placeholder="e.g. 500" placeholderTextColor={colors.textMuted} value={limitAmount} onChangeText={setLimitAmount} keyboardType="decimal-pad" />
          <TouchableOpacity style={[s.addButton, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]} onPress={handleAddBudget} disabled={loading}>
            <Text style={s.addButtonText}>Set</Text>
          </TouchableOpacity>
        </View>

        <Text style={[s.listHeading, { color: colors.text }]}>Your budgets ({budgets.length})</Text>
        {budgets.length === 0 ? (
          <Text style={[s.emptyText, { color: colors.textMuted }]}>No budgets set yet</Text>
        ) : (
          budgets.map((item) => <View key={item.id}>{renderBudget({ item })}</View>)
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { padding: 24, paddingTop: 60 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  backBtn: { fontSize: 15, fontWeight: "600" },
  heading: { fontSize: 20, fontWeight: "bold" },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 12 },
  input: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13 },
  addChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderStyle: "dashed" },
  addChipText: { fontSize: 13, fontWeight: "600" },
  addRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  addButton: { paddingHorizontal: 24, borderRadius: 12, justifyContent: "center" },
  addButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  periodRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  periodChip: { flex: 1, padding: 10, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  periodChipText: { fontSize: 13, fontWeight: "500" },
  dateRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  dateLabel: { fontSize: 12, fontWeight: "500", marginBottom: 4 },
  dateButton: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  dateButtonText: { fontSize: 13 },
  listHeading: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  budgetCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  budgetTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  budgetName: { fontSize: 16, fontWeight: "600" },
  budgetPeriod: { fontSize: 12, marginTop: 2 },
  deleteLink: { fontSize: 13, color: "#EF4444", fontWeight: "500" },
  budgetNumbers: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  budgetSpent: { fontSize: 13 },
  budgetLimit: { fontSize: 13 },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  warningText: { fontSize: 12, marginTop: 6 },
  overText: { fontSize: 12, marginTop: 6 },
  errorText: { fontSize: 13, fontWeight: "500", marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: "center", marginTop: 12, marginBottom: 12 },
});