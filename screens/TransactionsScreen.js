import React, { useState, useCallback } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import {
  getTransactions,
  deleteTransaction,
  updateTransaction,
  getCategories,
  getAccounts,
} from "../services/firestoreService";
import { useTheme } from "../context/ThemeContext";

export default function TransactionsScreen({ navigation }) {
  const { colors } = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editType, setEditType] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editCategory, setEditCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [sortBy, setSortBy] = useState("date_desc");
  const [editAccount, setEditAccount] = useState("");
  const [accounts, setAccounts] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
      loadCategories();
      loadAccounts();
    }, [])
  );

  const loadAccounts = async () => {
    try {
      const data = await getAccounts();
      setAccounts(data);
    } catch (error) {
      console.log("Error loading accounts:", error);
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await getTransactions();
      setTransactions(data);
    } catch (error) {
      console.log("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.log("Error loading categories:", error);
    }
  };

  const getCategoryEmoji = (catName) => {
    const found = categories.find(
      (c) => c.name.toLowerCase() === (catName || "").toLowerCase()
    );
    return found ? found.icon : "";
  };

  const handleDelete = (id) => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Delete this transaction?");
      if (confirmed) performDelete(id);
    } else {
      Alert.alert("Delete Transaction", "Delete this transaction?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => performDelete(id) },
      ]);
    }
  };

  const performDelete = async (id) => {
    try {
      await deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.log("Delete error:", error);
    }
  };

  const startEditing = (item) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditAmount(String(item.amount));
    setEditType(item.type);
    setEditDate(item.date || new Date().toISOString());
    setEditCategory(item.category || "");
    setEditAccount(item.account || "");
  };

  const handleUpdate = async () => {
    if (!editAmount) {
      Alert.alert("Error", "Please enter an amount");
      return;
    }
    try {
      await updateTransaction(editingId, {
        title: editTitle.trim() || "No note",
        amount: parseFloat(editAmount),
        type: editType,
        category: editCategory,
        account: editAccount,
        date: editDate,
      });
      setEditingId(null);
      loadTransactions();
    } catch (error) {
      Alert.alert("Error", "Failed to update");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "No date";
    const d = new Date(dateStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const day = String(d.getDate()).padStart(2, "0");
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${month}/${day}/${year} ${hours}:${minutes} ${ampm}`;
  };

  const renderTransaction = ({ item }) => {
    const isEditing = editingId === item.id;
    const isIncome = item.type === "income" || item.type === "transfer_in";
    const isTransfer = item.type === "transfer_in" || item.type === "transfer_out";
    const emoji = getCategoryEmoji(item.category);

    if (isEditing) {
      const editDateObj = new Date(editDate);
      let editHours = editDateObj.getHours();
      const editMinutes = String(editDateObj.getMinutes()).padStart(2, "0");
      const editAmPm = editHours >= 12 ? "PM" : "AM";
      editHours = editHours % 12 || 12;

      return (
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.editTypeRow}>
            <TouchableOpacity
              style={[s.editTypeButton, { borderColor: colors.borderDark }, editType === "income" && { backgroundColor: colors.incomeBg, borderColor: colors.income }]}
              onPress={() => setEditType("income")}
            >
              <Text style={[{ fontSize: 14, color: colors.textMuted }, editType === "income" && { color: colors.income, fontWeight: "600" }]}>Income</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.editTypeButton, { borderColor: colors.borderDark }, editType === "expense" && { backgroundColor: colors.expenseBg, borderColor: colors.expense }]}
              onPress={() => setEditType("expense")}
            >
              <Text style={[{ fontSize: 14, color: colors.textMuted }, editType === "expense" && { color: colors.expense, fontWeight: "600" }]}>Expense</Text>
            </TouchableOpacity>
          </View>

          <TextInput style={[s.editInput, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]} value={editAmount} onChangeText={setEditAmount} placeholder="Amount" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />
          <TextInput style={[s.editInput, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]} value={editTitle === "No note" ? "" : editTitle} onChangeText={setEditTitle} placeholder="Note (optional)" placeholderTextColor={colors.textMuted} />

          <Text style={[s.editLabel, { color: colors.textSecondary }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6, maxHeight: 36 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {categories.map((cat) => (
                <TouchableOpacity key={cat.id} style={[s.chip, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, editCategory === cat.name && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setEditCategory(cat.name)}>
                  <Text style={[{ fontSize: 13, color: colors.textSecondary }, editCategory === cat.name && { color: "#fff", fontWeight: "500" }]}>{cat.icon} {cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={[s.editLabel, { color: colors.textSecondary }]}>Account</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6, maxHeight: 36 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {accounts.map((acc) => (
                <TouchableOpacity key={acc.id} style={[s.chip, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, editAccount === acc.name && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setEditAccount(acc.name)}>
                  <Text style={[{ fontSize: 13, color: colors.textSecondary }, editAccount === acc.name && { color: "#fff", fontWeight: "500" }]}>{acc.icon} {acc.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={[s.editDateText, { color: colors.textSecondary }]}>
            {`${editDateObj.toLocaleDateString()} ${editHours}:${editMinutes} ${editAmPm}`}
          </Text>

          {Platform.OS === "web" ? (
            <View style={s.timeRow}>
              <input type="date" value={editDateObj.toISOString().split("T")[0]} onChange={(e) => { const current = new Date(editDate); const [year, month, day] = e.target.value.split("-"); current.setFullYear(year, month - 1, day); setEditDate(current.toISOString()); }} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${colors.borderDark}`, fontSize: 14, backgroundColor: colors.inputBg, color: colors.text }} />
              <input type="time" value={`${String(editDateObj.getHours()).padStart(2, "0")}:${editMinutes}`} onChange={(e) => { const current = new Date(editDate); const [hours, mins] = e.target.value.split(":"); current.setHours(parseInt(hours), parseInt(mins)); setEditDate(current.toISOString()); }} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${colors.borderDark}`, fontSize: 14, backgroundColor: colors.inputBg, color: colors.text }} />
            </View>
          ) : (
            <>
              <View style={s.timeRow}>
                <TouchableOpacity style={[s.timeButton, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }]} onPress={() => setShowDatePicker(true)}>
                  <Text style={[s.timeButtonText, { color: colors.textSecondary }]}>📅 Date</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.timeButton, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }]} onPress={() => setShowTimePicker(true)}>
                  <Text style={[s.timeButtonText, { color: colors.textSecondary }]}>🕐 Time</Text>
                </TouchableOpacity>
              </View>
              {showDatePicker && (
                <DateTimePicker value={new Date(editDate)} mode="date" display="default" onChange={(event, selectedDate) => { setShowDatePicker(false); if (selectedDate) { const current = new Date(editDate); selectedDate.setHours(current.getHours(), current.getMinutes()); setEditDate(selectedDate.toISOString()); } }} />
              )}
              {showTimePicker && (
                <DateTimePicker value={new Date(editDate)} mode="time" display="default" onChange={(event, selectedTime) => { setShowTimePicker(false); if (selectedTime) { const current = new Date(editDate); current.setHours(selectedTime.getHours(), selectedTime.getMinutes()); setEditDate(current.toISOString()); } }} />
              )}
            </>
          )}

          <View style={s.editActions}>
            <TouchableOpacity style={[s.saveButton, { backgroundColor: colors.primary }]} onPress={handleUpdate}>
              <Text style={s.saveButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.cancelButton, { borderColor: colors.borderDark }]} onPress={() => setEditingId(null)}>
              <Text style={[s.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.cardTop}>
          <View style={s.cardLeft}>
            <Text style={[s.cardTitle, { color: colors.text }]}>
              {emoji ? `${emoji} ` : ""}{item.category}
            </Text>
            {item.title && item.title !== "No note" ? (
              <Text style={[s.cardNote, { color: colors.textSecondary }]}>{item.title}</Text>
            ) : null}
            {item.account ? (
              <Text style={[s.cardAccount, { color: colors.primary }]}>{item.account}</Text>
            ) : null}
            <Text style={[s.cardDate, { color: colors.textMuted }]}>{formatDate(item.date)}</Text>
          </View>
          <Text style={[s.cardAmount, { color: isTransfer ? colors.primary : isIncome ? colors.income : colors.expense }]}>
            {isTransfer ? "↔" : isIncome ? "+" : "-"} {item.amount.toFixed(2)}
          </Text>
        </View>
        <View style={s.cardActions}>
          <TouchableOpacity onPress={() => startEditing(item)}>
            <Text style={[s.editLink, { color: colors.primary }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id)}>
            <Text style={s.deleteLink}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
    switch (sortBy) {
      case "date_desc": return new Date(b.date) - new Date(a.date);
      case "date_asc": return new Date(a.date) - new Date(b.date);
      case "amount_desc": return b.amount - a.amount;
      case "amount_asc": return a.amount - b.amount;
      case "name_asc": return (a.category || "").localeCompare(b.category || "");
      case "name_desc": return (b.category || "").localeCompare(a.category || "");
      default: return 0;
    }
  });

  const creditAccountNames = accounts.filter((a) => a.type === "credit").map((a) => a.name);

  const totalIncome = transactions
    .filter((t) => t.type === "income" && !creditAccountNames.includes(t.account))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => {
      if (t.type === "expense" && !creditAccountNames.includes(t.account)) return true;
      if (t.type === "transfer_in") {
        const acc = accounts.find((a) => a.name === t.account);
        if (acc && acc.type === "credit") return true;
      }
      return false;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpenses;

  const creditOutstanding = transactions
    .filter((t) => {
      const acc = accounts.find((a) => a.name === t.account);
      return acc && acc.type === "credit";
    })
    .reduce((sum, t) => {
      if (t.type === "expense") return sum + t.amount;
      if (t.type === "income") return sum - t.amount;
      if (t.type === "transfer_in") return sum - t.amount;
      return sum;
    }, 0);

  return (
    <SafeAreaView style={[s.safeArea, { backgroundColor: colors.bg }]} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView style={[s.container, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={[s.heading, { color: colors.text }]}>Transactions</Text>

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

          {creditOutstanding > 0 && (
            <View style={[s.creditRow, { backgroundColor: colors.warningBg }]}>
              <Text style={[s.creditLabel, { color: "#9A3412" }]}>💳 Credit Card Due</Text>
              <Text style={[s.creditValue, { color: "#EA580C" }]}>{creditOutstanding.toFixed(2)}</Text>
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterRow}>
            {[
              { label: "Newest", value: "date_desc" },
              { label: "Oldest", value: "date_asc" },
              { label: "Highest", value: "amount_desc" },
              { label: "Lowest", value: "amount_asc" },
              { label: "A–Z", value: "name_asc" },
              { label: "Z–A", value: "name_desc" },
            ].map((filter) => (
              <TouchableOpacity
                key={filter.value}
                style={[s.filterChip, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, sortBy === filter.value && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setSortBy(filter.value)}
              >
                <Text style={[s.filterChipText, { color: colors.textSecondary }, sortBy === filter.value && { color: "#fff", fontWeight: "600" }]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading ? (
            <Text style={[s.emptyText, { color: colors.textMuted }]}>Loading...</Text>
          ) : sortedTransactions.length === 0 ? (
            <View style={s.emptyContainer}>
              <Text style={[s.emptyText, { color: colors.textMuted }]}>No transactions yet</Text>
              <TouchableOpacity style={[s.addButton, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate("Add")}>
                <Text style={s.addButtonText}>Add your first transaction</Text>
              </TouchableOpacity>
            </View>
          ) : (
            sortedTransactions.map((item) => (
              <View key={item.id}>{renderTransaction({ item })}</View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 16, paddingTop: 8 },
  heading: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  summaryRow: { flexDirection: "row", gap: 6, marginBottom: 12 },
  summaryCard: { flex: 1, padding: 8, borderRadius: 10, alignItems: "center" },
  summaryLabel: { fontSize: 11, marginBottom: 2 },
  summaryValue: { fontSize: 14, fontWeight: "bold" },
  creditRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 10, borderRadius: 10, marginBottom: 12 },
  creditLabel: { fontSize: 13, fontWeight: "500" },
  creditValue: { fontSize: 14, fontWeight: "bold" },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  cardLeft: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "600" },
  cardNote: { fontSize: 13, marginTop: 2 },
  cardAccount: { fontSize: 12, marginTop: 2, fontWeight: "500" },
  cardDate: { fontSize: 12, marginTop: 2 },
  cardAmount: { fontSize: 16, fontWeight: "bold" },
  cardActions: { flexDirection: "row", justifyContent: "flex-end", gap: 16, marginTop: 6 },
  editLink: { fontSize: 13, fontWeight: "500" },
  deleteLink: { fontSize: 13, color: "#EF4444", fontWeight: "500" },
  editTypeRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  editTypeButton: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  editInput: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 15, marginBottom: 8 },
  editLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  editDateText: { fontSize: 14, textAlign: "center", marginBottom: 6, fontWeight: "500" },
  editActions: { flexDirection: "row", gap: 10 },
  saveButton: { flex: 1, padding: 10, borderRadius: 10, alignItems: "center" },
  saveButtonText: { color: "#fff", fontWeight: "600" },
  cancelButton: { flex: 1, borderWidth: 1, padding: 10, borderRadius: 10, alignItems: "center" },
  cancelButtonText: { fontWeight: "500" },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  timeRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
  timeButton: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  timeButtonText: { fontSize: 13, fontWeight: "500" },
  filterScroll: { marginHorizontal: -16, marginTop: 4, marginBottom: 12, flexGrow: 0 },
  filterRow: { flexDirection: "row", gap: 8, alignItems: "center", paddingHorizontal: 16 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 12, fontWeight: "500" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 40 },
  emptyText: { fontSize: 16, marginBottom: 16 },
  addButton: { padding: 14, borderRadius: 12, paddingHorizontal: 24 },
  addButtonText: { color: "#fff", fontWeight: "600" },
});