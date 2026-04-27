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
import { useUser } from "../context/UserContext";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "../context/ThemeContext";
import {
  addGoal,
  getGoals,
  updateGoal,
  deleteGoal,
} from "../services/firestoreService";

export default function SavingsGoalsScreen({ navigation }) {
  const { formatAmount } = useUser();
  const { colors } = useTheme();
  const [goals, setGoals] = useState([]);
  const [goalName, setGoalName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [savedAmount, setSavedAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Add money state
  const [addingToId, setAddingToId] = useState(null);
  const [addAmount, setAddAmount] = useState("");

  useFocusEffect(useCallback(() => { loadGoals(); }, []));

  const loadGoals = async () => {
    try {
      const data = await getGoals();
      setGoals(data);
    } catch (error) {
      console.log("Error loading goals:", error);
    }
  };

  const handleAddGoal = async () => {
    setError("");
    if (!goalName.trim()) { setError("Please enter a goal name"); return; }
    if (!targetAmount || isNaN(parseFloat(targetAmount)) || parseFloat(targetAmount) <= 0) { setError("Please enter a valid target amount"); return; }
    if (!targetDate) { setError("Please select a target date"); return; }
    if (new Date(targetDate) <= new Date()) { setError("Target date must be in the future"); return; }

    try {
      setLoading(true);
      await addGoal({
        name: goalName.trim(),
        targetAmount: parseFloat(targetAmount),
        savedAmount: parseFloat(savedAmount) || 0,
        targetDate: targetDate,
      });
      setGoalName("");
      setTargetAmount("");
      setSavedAmount("");
      setTargetDate("");
      loadGoals();
    } catch (err) {
      setError("Failed to add goal");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMoney = async (goalId) => {
    if (!addAmount || isNaN(parseFloat(addAmount)) || parseFloat(addAmount) <= 0) {
      Platform.OS === "web" ? window.alert("Please enter a valid amount") : Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    try {
      const goal = goals.find((g) => g.id === goalId);
      const newSaved = (goal.savedAmount || 0) + parseFloat(addAmount);
      await updateGoal(goalId, { savedAmount: newSaved });
      setAddingToId(null);
      setAddAmount("");
      loadGoals();

      if (newSaved >= goal.targetAmount) {
        Platform.OS === "web"
          ? window.alert(`🎉 Congratulations! You've reached your "${goal.name}" goal!`)
          : Alert.alert("🎉 Goal Reached!", `You've reached your "${goal.name}" goal!`);
      }
    } catch (error) {
      console.log("Add money error:", error);
    }
  };

  const handleWithdraw = async (goalId) => {
    if (!addAmount || isNaN(parseFloat(addAmount)) || parseFloat(addAmount) <= 0) {
      Platform.OS === "web" ? window.alert("Please enter a valid amount") : Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    const goal = goals.find((g) => g.id === goalId);
    const withdrawAmount = parseFloat(addAmount);
    if (withdrawAmount > (goal.savedAmount || 0)) {
      Platform.OS === "web" ? window.alert("Cannot withdraw more than saved amount") : Alert.alert("Error", "Cannot withdraw more than saved amount");
      return;
    }

    try {
      const newSaved = (goal.savedAmount || 0) - withdrawAmount;
      await updateGoal(goalId, { savedAmount: newSaved });
      setAddingToId(null);
      setAddAmount("");
      loadGoals();
    } catch (error) {
      console.log("Withdraw error:", error);
    }
  };

  const handleDelete = (id, name) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Delete goal "${name}"?`)) performDelete(id);
    } else {
      Alert.alert("Delete Goal", `Delete goal "${name}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => performDelete(id) },
      ]);
    }
  };

  const performDelete = async (id) => {
    try { await deleteGoal(id); setGoals((prev) => prev.filter((g) => g.id !== id)); } catch (error) { console.log("Delete error:", error); }
  };

  const getDaysLeft = (dateStr) => {
    if (!dateStr) return 0;
    const target = new Date(dateStr);
    const now = new Date();
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return Math.max(diff, 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  const renderGoal = (item) => {
    const percentage = Math.min(((item.savedAmount || 0) / item.targetAmount) * 100, 100);
    const isComplete = percentage >= 100;
    const daysLeft = getDaysLeft(item.targetDate);
    const isOverdue = daysLeft === 0 && !isComplete;
    const isAdding = addingToId === item.id;

    let barColor = colors.primary;
    if (isComplete) barColor = colors.income;
    else if (isOverdue) barColor = colors.expense;

    // Monthly savings needed
    const remaining = item.targetAmount - (item.savedAmount || 0);
    const monthsLeft = Math.max(Math.ceil(daysLeft / 30), 1);
    const monthlyNeeded = remaining > 0 ? (remaining / monthsLeft) : 0;

    return (
      <View key={item.id} style={[s.goalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.goalTop}>
          <View style={{ flex: 1 }}>
            <Text style={[s.goalName, { color: colors.text }]}>
              {isComplete ? "🎉 " : "🎯 "}{item.name}
            </Text>
            <Text style={[s.goalDate, { color: isOverdue ? colors.expense : colors.textMuted }]}>
              {isComplete ? "Goal reached!" : isOverdue ? "Overdue" : `${daysLeft} days left · ${formatDate(item.targetDate)}`}
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}>
            <Text style={s.deleteLink}>Delete</Text>
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={[s.progressTrack, { backgroundColor: colors.inputBg }]}>
          <View style={[s.progressFill, { width: `${percentage}%`, backgroundColor: barColor }]} />
        </View>

        <View style={s.goalNumbers}>
          <Text style={[s.goalSaved, { color: colors.text }]}>
          {formatAmount(item.savedAmount || 0)}
        </Text>
        <Text style={[s.goalTarget, { color: colors.textMuted }]}>
          / {formatAmount(item.targetAmount)} ({Math.round(percentage)}%)
        </Text>
        </View>

        {!isComplete && remaining > 0 && (
          <Text style={[s.monthlySuggestion, { color: colors.textSecondary }]}>
            Save ~{formatAmount(monthlyNeeded)}/month to reach your goal
          </Text>
        )}

        {/* Add/Withdraw money */}
        {isAdding ? (
          <View style={s.addMoneyBox}>
            <TextInput
              style={[s.addMoneyInput, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]}
              placeholder="Amount"
              placeholderTextColor={colors.textMuted}
              value={addAmount}
              onChangeText={setAddAmount}
              keyboardType="decimal-pad"
            />
            <View style={s.addMoneyActions}>
              <TouchableOpacity style={[s.addMoneyBtn, { backgroundColor: colors.income }]} onPress={() => handleAddMoney(item.id)}>
                <Text style={s.addMoneyBtnText}>+ Add</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.withdrawBtn, { backgroundColor: colors.expense }]} onPress={() => handleWithdraw(item.id)}>
                <Text style={s.addMoneyBtnText}>- Withdraw</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.cancelSmallBtn, { borderColor: colors.borderDark }]} onPress={() => { setAddingToId(null); setAddAmount(""); }}>
                <Text style={[s.cancelSmallText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[s.updateBtn, { borderColor: colors.primary }]}
            onPress={() => { setAddingToId(item.id); setAddAmount(""); }}
          >
            <Text style={[s.updateBtnText, { color: colors.primary }]}>
              {isComplete ? "Adjust savings" : "Add / Withdraw money"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Summary
  const totalSaved = goals.reduce((sum, g) => sum + (g.savedAmount || 0), 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const completedGoals = goals.filter((g) => (g.savedAmount || 0) >= g.targetAmount).length;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView style={[s.container, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>

        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[s.backBtn, { color: colors.primary }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[s.heading, { color: colors.text }]}>Savings Goals</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Summary */}
        {goals.length > 0 && (
          <View style={[s.summaryCard, { backgroundColor: colors.balanceBg }]}>
            <View style={s.summaryRow}>
              <View style={s.summaryItem}>
                <Text style={[s.summaryValue, { color: colors.primary }]}>{goals.length}</Text>
                <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Goals</Text>
              </View>
              <View style={s.summaryItem}>
                <Text style={[s.summaryValue, { color: colors.income }]}>{completedGoals}</Text>
                <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Completed</Text>
              </View>
              <View style={s.summaryItem}>
                <Text style={[s.summaryValue, { color: colors.primary }]}>{formatAmount(totalSaved)}</Text>
                <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Saved</Text>
              </View>
            </View>
          </View>
        )}

        {/* Add new goal */}
        <Text style={[s.label, { color: colors.textSecondary }]}>Goal name</Text>
        <TextInput style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]} placeholder="e.g. New Laptop, Emergency Fund" placeholderTextColor={colors.textMuted} value={goalName} onChangeText={(t) => { setGoalName(t); setError(""); }} />

        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={[s.label, { color: colors.textSecondary }]}>Target amount</Text>
            <TextInput style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]} placeholder="e.g. 5000" placeholderTextColor={colors.textMuted} value={targetAmount} onChangeText={setTargetAmount} keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.label, { color: colors.textSecondary }]}>Already saved</Text>
            <TextInput style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]} placeholder="0.00" placeholderTextColor={colors.textMuted} value={savedAmount} onChangeText={setSavedAmount} keyboardType="decimal-pad" />
          </View>
        </View>

        <Text style={[s.label, { color: colors.textSecondary }]}>Target date</Text>
        {Platform.OS === "web" ? (
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            style={{ width: "100%", padding: 14, borderRadius: 12, border: `1px solid ${colors.borderDark}`, fontSize: 16, backgroundColor: colors.inputBg, color: colors.text, marginBottom: 8, boxSizing: "border-box" }}
          />
        ) : (
          <>
            <TouchableOpacity style={[s.dateButton, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }]} onPress={() => setShowDatePicker(true)}>
              <Text style={[s.dateButtonText, { color: targetDate ? colors.text : colors.textMuted }]}>
                {targetDate ? formatDate(targetDate) : "📅 Pick target date"}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker value={targetDate ? new Date(targetDate) : new Date()} mode="date" display="default" minimumDate={new Date()} onChange={(event, date) => { setShowDatePicker(false); if (date) setTargetDate(date.toISOString().split("T")[0]); }} />
            )}
          </>
        )}

        {error ? <Text style={[s.errorText, { color: colors.expense }]}>{error}</Text> : null}

        <TouchableOpacity style={[s.addButton, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]} onPress={handleAddGoal} disabled={loading}>
          <Text style={s.addButtonText}>{loading ? "Creating..." : "Create Goal"}</Text>
        </TouchableOpacity>

        {/* Goals list */}
        <Text style={[s.listHeading, { color: colors.text }]}>Your goals ({goals.length})</Text>
        {goals.length === 0 ? (
          <Text style={[s.emptyText, { color: colors.textMuted }]}>No savings goals yet</Text>
        ) : (
          goals
            .sort((a, b) => {
              const aComplete = (a.savedAmount || 0) >= a.targetAmount;
              const bComplete = (b.savedAmount || 0) >= b.targetAmount;
              if (aComplete !== bComplete) return aComplete ? 1 : -1;
              return getDaysLeft(a.targetDate) - getDaysLeft(b.targetDate);
            })
            .map((item) => renderGoal(item))
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
  summaryCard: { padding: 16, borderRadius: 12, marginBottom: 20 },
  summaryRow: { flexDirection: "row", justifyContent: "space-around" },
  summaryItem: { alignItems: "center" },
  summaryValue: { fontSize: 20, fontWeight: "bold" },
  summaryLabel: { fontSize: 12, marginTop: 2 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 4 },
  row: { flexDirection: "row", gap: 12 },
  dateButton: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  dateButtonText: { fontSize: 16 },
  addButton: { padding: 16, borderRadius: 12, alignItems: "center", marginTop: 16, marginBottom: 24 },
  addButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  listHeading: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  goalCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  goalTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  goalName: { fontSize: 16, fontWeight: "600" },
  goalDate: { fontSize: 12, marginTop: 2 },
  deleteLink: { fontSize: 13, color: "#EF4444", fontWeight: "500" },
  progressTrack: { height: 10, borderRadius: 5, overflow: "hidden", marginBottom: 8 },
  progressFill: { height: "100%", borderRadius: 5 },
  goalNumbers: { flexDirection: "row", alignItems: "baseline", marginBottom: 4 },
  goalSaved: { fontSize: 18, fontWeight: "bold" },
  goalTarget: { fontSize: 13, marginLeft: 4 },
  monthlySuggestion: { fontSize: 12, marginBottom: 8, fontStyle: "italic" },
  updateBtn: { padding: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  updateBtnText: { fontSize: 13, fontWeight: "600" },
  addMoneyBox: { marginTop: 8 },
  addMoneyInput: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 16, marginBottom: 8 },
  addMoneyActions: { flexDirection: "row", gap: 8 },
  addMoneyBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: "center" },
  withdrawBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: "center" },
  addMoneyBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  cancelSmallBtn: { padding: 10, borderRadius: 10, borderWidth: 1, alignItems: "center", paddingHorizontal: 16 },
  cancelSmallText: { fontSize: 13, fontWeight: "500" },
  errorText: { fontSize: 13, fontWeight: "500", marginTop: 8 },
  emptyText: { fontSize: 14, textAlign: "center", marginTop: 20 },
});