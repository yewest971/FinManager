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
          Modal,
        } from "react-native";
        import { useUser } from "../context/UserContext";
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
          const { formatAmount } = useUser();
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

          // Filter state
          const [showFilters, setShowFilters] = useState(false);
          const [filterType, setFilterType] = useState("all");
          const [filterCategory, setFilterCategory] = useState(null);
          const [filterAccount, setFilterAccount] = useState(null);
          const [filterMinAmount, setFilterMinAmount] = useState("");
          const [filterMaxAmount, setFilterMaxAmount] = useState("");
          const [filterDateFrom, setFilterDateFrom] = useState("");
          const [filterDateTo, setFilterDateTo] = useState("");
          const [hideTransfers, setHideTransfers] = useState(false);
          const [hideAdjustments, setHideAdjustments] = useState(false);
          const [showFilterDateFrom, setShowFilterDateFrom] = useState(false);
          const [showFilterDateTo, setShowFilterDateTo] = useState(false);

          useFocusEffect(
            useCallback(() => {
              loadTransactions();
              loadCategories();
              loadAccounts();
            }, [])
          );

          const loadAccounts = async () => {
            try { const data = await getAccounts(); setAccounts(data); } catch (error) { console.log("Error loading accounts:", error); }
          };

          const loadTransactions = async () => {
            try { setLoading(true); const data = await getTransactions(); setTransactions(data); } catch (error) { console.log("Error loading transactions:", error); } finally { setLoading(false); }
          };

          const loadCategories = async () => {
            try { const data = await getCategories(); setCategories(data); } catch (error) { console.log("Error loading categories:", error); }
          };

          const getCategoryEmoji = (catName) => {
            const found = categories.find((c) => c.name.toLowerCase() === (catName || "").toLowerCase());
            return found ? found.icon : "";
          };

          const handleDelete = (id) => {
            if (Platform.OS === "web") {
              if (window.confirm("Delete this transaction?")) performDelete(id);
            } else {
              Alert.alert("Delete Transaction", "Delete this transaction?", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => performDelete(id) },
              ]);
            }
          };

          const performDelete = async (id) => {
            try { await deleteTransaction(id); setTransactions((prev) => prev.filter((t) => t.id !== id)); } catch (error) { console.log("Delete error:", error); }
          };

          const startEditing = (item) => {
            setEditingId(item.id); setEditTitle(item.title); setEditAmount(String(item.amount));
            setEditType(item.type); setEditDate(item.date || new Date().toISOString());
            setEditCategory(item.category || ""); setEditAccount(item.account || "");
          };

          const handleUpdate = async () => {
            if (!editAmount) { Alert.alert("Error", "Please enter an amount"); return; }
            try {
              await updateTransaction(editingId, { title: editTitle.trim() || "No note", amount: parseFloat(editAmount), type: editType, category: editCategory, account: editAccount, date: editDate });
              setEditingId(null); loadTransactions();
            } catch (error) { Alert.alert("Error", "Failed to update"); }
          };

          const formatDate = (dateStr) => {
            if (!dateStr) return "No date";
            const d = new Date(dateStr);
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            let hours = d.getHours(); const minutes = String(d.getMinutes()).padStart(2, "0");
            const ampm = hours >= 12 ? "PM" : "AM"; hours = hours % 12 || 12;
            return `${months[d.getMonth()]}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()} ${hours}:${minutes} ${ampm}`;
          };

          const clearFilters = () => {
            setFilterType("all"); setFilterCategory(null); setFilterAccount(null);
            setFilterMinAmount(""); setFilterMaxAmount(""); setFilterDateFrom("");
            setFilterDateTo(""); setHideTransfers(false); setHideAdjustments(false);
          };

          const hasActiveFilters = filterType !== "all" || filterCategory || filterAccount || filterMinAmount || filterMaxAmount || filterDateFrom || filterDateTo || hideTransfers || hideAdjustments;

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
                <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={st.editTypeRow}>
                    <TouchableOpacity style={[st.editTypeButton, { borderColor: colors.borderDark }, editType === "income" && { backgroundColor: colors.incomeBg, borderColor: colors.income }]} onPress={() => setEditType("income")}>
                      <Text style={[{ fontSize: 14, color: colors.textMuted }, editType === "income" && { color: colors.income, fontWeight: "600" }]}>Income</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[st.editTypeButton, { borderColor: colors.borderDark }, editType === "expense" && { backgroundColor: colors.expenseBg, borderColor: colors.expense }]} onPress={() => setEditType("expense")}>
                      <Text style={[{ fontSize: 14, color: colors.textMuted }, editType === "expense" && { color: colors.expense, fontWeight: "600" }]}>Expense</Text>
                    </TouchableOpacity>
                  </View>

                  <TextInput style={[st.editInput, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]} value={editAmount} onChangeText={setEditAmount} placeholder="Amount" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />
                  <TextInput style={[st.editInput, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]} value={editTitle === "No note" ? "" : editTitle} onChangeText={setEditTitle} placeholder="Note (optional)" placeholderTextColor={colors.textMuted} />

                  <Text style={[st.editLabel, { color: colors.textSecondary }]}>Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6, maxHeight: 36 }}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {categories.map((cat) => (
                        <TouchableOpacity key={cat.id} style={[st.chip, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, editCategory === cat.name && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setEditCategory(cat.name)}>
                          <Text style={[{ fontSize: 13, color: colors.textSecondary }, editCategory === cat.name && { color: "#fff", fontWeight: "500" }]}>{cat.icon} {cat.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  <Text style={[st.editLabel, { color: colors.textSecondary }]}>Account</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6, maxHeight: 36 }}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {accounts.map((acc) => (
                        <TouchableOpacity key={acc.id} style={[st.chip, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, editAccount === acc.name && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setEditAccount(acc.name)}>
                          <Text style={[{ fontSize: 13, color: colors.textSecondary }, editAccount === acc.name && { color: "#fff", fontWeight: "500" }]}>{acc.icon} {acc.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  <Text style={[st.editDateText, { color: colors.textSecondary }]}>{`${editDateObj.toLocaleDateString()} ${editHours}:${editMinutes} ${editAmPm}`}</Text>

                  {Platform.OS === "web" ? (
                    <View style={st.timeRow}>
                      <input type="date" value={editDateObj.toISOString().split("T")[0]} onChange={(e) => { const current = new Date(editDate); const [year, month, day] = e.target.value.split("-"); current.setFullYear(year, month - 1, day); setEditDate(current.toISOString()); }} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${colors.borderDark}`, fontSize: 14, backgroundColor: colors.inputBg, color: colors.text }} />
                      <input type="time" value={`${String(editDateObj.getHours()).padStart(2, "0")}:${editMinutes}`} onChange={(e) => { const current = new Date(editDate); const [hours, mins] = e.target.value.split(":"); current.setHours(parseInt(hours), parseInt(mins)); setEditDate(current.toISOString()); }} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${colors.borderDark}`, fontSize: 14, backgroundColor: colors.inputBg, color: colors.text }} />
                    </View>
                  ) : (
                    <>
                      <View style={st.timeRow}>
                        <TouchableOpacity style={[st.timeButton, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }]} onPress={() => setShowDatePicker(true)}><Text style={[st.timeButtonText, { color: colors.textSecondary }]}>📅 Date</Text></TouchableOpacity>
                        <TouchableOpacity style={[st.timeButton, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }]} onPress={() => setShowTimePicker(true)}><Text style={[st.timeButtonText, { color: colors.textSecondary }]}>🕐 Time</Text></TouchableOpacity>
                      </View>
                      {showDatePicker && <DateTimePicker value={new Date(editDate)} mode="date" display="default" onChange={(event, selectedDate) => { setShowDatePicker(false); if (selectedDate) { const current = new Date(editDate); selectedDate.setHours(current.getHours(), current.getMinutes()); setEditDate(selectedDate.toISOString()); } }} />}
                      {showTimePicker && <DateTimePicker value={new Date(editDate)} mode="time" display="default" onChange={(event, selectedTime) => { setShowTimePicker(false); if (selectedTime) { const current = new Date(editDate); current.setHours(selectedTime.getHours(), selectedTime.getMinutes()); setEditDate(current.toISOString()); } }} />}
                    </>
                  )}

                  <View style={st.editActions}>
                    <TouchableOpacity style={[st.saveButton, { backgroundColor: colors.primary }]} onPress={handleUpdate}><Text style={st.saveButtonText}>Save</Text></TouchableOpacity>
                    <TouchableOpacity style={[st.cancelButton, { borderColor: colors.borderDark }]} onPress={() => setEditingId(null)}><Text style={[st.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text></TouchableOpacity>
                  </View>
                </View>
              );
            }

            return (
              <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={st.cardTop}>
                  <View style={st.cardLeft}>
                    <Text style={[st.cardTitle, { color: colors.text }]}>{emoji ? `${emoji} ` : ""}{item.category}</Text>
                    {item.title && item.title !== "No note" ? <Text style={[st.cardNote, { color: colors.textSecondary }]}>{item.title}</Text> : null}
                    {item.account ? <Text style={[st.cardAccount, { color: colors.primary }]}>{item.account}</Text> : null}
                    <Text style={[st.cardDate, { color: colors.textMuted }]}>{formatDate(item.date)}</Text>
                  </View>
                  <Text style={[st.cardAmount, { color: isTransfer ? colors.primary : isIncome ? colors.income : colors.expense }]}>
                    {isTransfer ? "↔" : isIncome ? "+" : "-"} {formatAmount(item.amount)}
                  </Text>
                </View>
                <View style={st.cardActions}>
                  <TouchableOpacity onPress={() => startEditing(item)}><Text style={[st.editLink, { color: colors.primary }]}>Edit</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item.id)}><Text style={st.deleteLink}>Delete</Text></TouchableOpacity>
                </View>
              </View>
            );
          };

          // Apply filters
          let filteredTransactions = [...transactions];

          if (hideTransfers) {
            filteredTransactions = filteredTransactions.filter((t) => t.type !== "transfer_in" && t.type !== "transfer_out");
          }

          if (hideAdjustments) {
            filteredTransactions = filteredTransactions.filter((t) => t.category !== "Adjustment");
          }

          if (filterType !== "all") {
            filteredTransactions = filteredTransactions.filter((t) => t.type === filterType);
          }

          if (filterCategory) {
            filteredTransactions = filteredTransactions.filter((t) => t.category === filterCategory);
          }

          if (filterAccount) {
            filteredTransactions = filteredTransactions.filter((t) => t.account === filterAccount);
          }

          if (filterMinAmount) {
            const min = parseFloat(filterMinAmount);
            if (!isNaN(min)) filteredTransactions = filteredTransactions.filter((t) => t.amount >= min);
          }

          if (filterMaxAmount) {
            const max = parseFloat(filterMaxAmount);
            if (!isNaN(max)) filteredTransactions = filteredTransactions.filter((t) => t.amount <= max);
          }

          if (filterDateFrom) {
            const from = new Date(filterDateFrom + "T00:00:00");
            filteredTransactions = filteredTransactions.filter((t) => t.date && new Date(t.date) >= from);
          }

          if (filterDateTo) {
            const to = new Date(filterDateTo + "T23:59:59");
            filteredTransactions = filteredTransactions.filter((t) => t.date && new Date(t.date) <= to);
          }

          // Sort
          const sortedTransactions = filteredTransactions.sort((a, b) => {
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

          // Totals (from filtered, excluding transfers/adjustments)
          const creditAccountNames = accounts.filter((a) => a.type === "credit").map((a) => a.name);

          const totalIncome = filteredTransactions
            .filter((t) => t.type === "income" && !creditAccountNames.includes(t.account))
            .reduce((sum, t) => sum + t.amount, 0);

          const totalExpenses = filteredTransactions
            .filter((t) => {
              if (t.type === "expense" && !creditAccountNames.includes(t.account)) return true;
              if (t.type === "transfer_in") { const acc = accounts.find((a) => a.name === t.account); if (acc && acc.type === "credit") return true; }
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
            <SafeAreaView style={[st.safeArea, { backgroundColor: colors.bg }]} edges={["top", "left", "right"]}>
              <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <ScrollView style={[st.container, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
                  <Text style={[st.heading, { color: colors.text }]}>Transactions</Text>

                  <View style={st.summaryRow}>
                    <View style={[st.summaryCard, { backgroundColor: colors.incomeBg }]}>
                      <Text style={[st.summaryLabel, { color: colors.textSecondary }]}>Income</Text>
                      <Text style={[st.summaryValue, { color: colors.income }]}>{formatAmount(totalIncome)}</Text>
                    </View>
                    <View style={[st.summaryCard, { backgroundColor: colors.expenseBg }]}>
                      <Text style={[st.summaryLabel, { color: colors.textSecondary }]}>Expenses</Text>
                      <Text style={[st.summaryValue, { color: colors.expense }]}>{formatAmount(totalExpenses)}</Text>
                    </View>
                    <View style={[st.summaryCard, { backgroundColor: colors.balanceBg }]}>
                      <Text style={[st.summaryLabel, { color: colors.textSecondary }]}>Balance</Text>
                      <Text style={[st.summaryValue, { color: colors.primary }]}>{formatAmount(balance)}</Text>
                    </View>
                  </View>

                  {creditOutstanding > 0 && (
                    <View style={[st.creditRow, { backgroundColor: colors.expenseBg }]}>
                      <Text style={[st.creditLabel, { color: colors.expense }]}>
                        💳 Credit Card Due
                      </Text>
                      <Text style={[st.creditValue]}>{formatAmount(creditOutstanding)}</Text>
                    </View>
                  )}

                  {/* Sort + Filter bar */}
                  <View style={st.toolbarRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 8, alignItems: "center" }}>
                      {[
                        { label: "Newest", value: "date_desc" },
                        { label: "Oldest", value: "date_asc" },
                        { label: "Highest", value: "amount_desc" },
                        { label: "Lowest", value: "amount_asc" },
                        { label: "A–Z", value: "name_asc" },
                        { label: "Z–A", value: "name_desc" },
                      ].map((filter) => (
                        <TouchableOpacity key={filter.value} style={[st.filterChip, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, sortBy === filter.value && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setSortBy(filter.value)}>
                          <Text style={[st.filterChipText, { color: colors.textSecondary }, sortBy === filter.value && { color: "#fff", fontWeight: "600" }]}>{filter.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <TouchableOpacity style={[st.filterBtn, { borderColor: hasActiveFilters ? colors.primary : colors.borderDark, backgroundColor: hasActiveFilters ? colors.balanceBg : colors.inputBg }]} onPress={() => setShowFilters(true)}>
                      <Text style={[st.filterBtnText, { color: hasActiveFilters ? colors.primary : colors.textSecondary }]}>
                        {hasActiveFilters ? "⚡ Filters" : "🔍 Filter"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Active filter tags */}
                  {hasActiveFilters && (
                    <View style={st.activeFilters}>
                      {filterType !== "all" && <View style={[st.filterTag, { backgroundColor: colors.balanceBg }]}><Text style={[st.filterTagText, { color: colors.primary }]}>{filterType}</Text></View>}
                      {filterCategory && <View style={[st.filterTag, { backgroundColor: colors.balanceBg }]}><Text style={[st.filterTagText, { color: colors.primary }]}>{filterCategory}</Text></View>}
                      {filterAccount && <View style={[st.filterTag, { backgroundColor: colors.balanceBg }]}><Text style={[st.filterTagText, { color: colors.primary }]}>{filterAccount}</Text></View>}
                      {filterMinAmount && <View style={[st.filterTag, { backgroundColor: colors.balanceBg }]}><Text style={[st.filterTagText, { color: colors.primary }]}>Min: {filterMinAmount}</Text></View>}
                      {filterMaxAmount && <View style={[st.filterTag, { backgroundColor: colors.balanceBg }]}><Text style={[st.filterTagText, { color: colors.primary }]}>Max: {filterMaxAmount}</Text></View>}
                      {filterDateFrom && <View style={[st.filterTag, { backgroundColor: colors.balanceBg }]}><Text style={[st.filterTagText, { color: colors.primary }]}>From: {filterDateFrom}</Text></View>}
                      {filterDateTo && <View style={[st.filterTag, { backgroundColor: colors.balanceBg }]}><Text style={[st.filterTagText, { color: colors.primary }]}>To: {filterDateTo}</Text></View>}
                      {hideTransfers && <View style={[st.filterTag, { backgroundColor: colors.balanceBg }]}><Text style={[st.filterTagText, { color: colors.primary }]}>No transfers</Text></View>}
                      {hideAdjustments && <View style={[st.filterTag, { backgroundColor: colors.balanceBg }]}><Text style={[st.filterTagText, { color: colors.primary }]}>No adjustments</Text></View>}
                      <TouchableOpacity onPress={clearFilters}><Text style={{ fontSize: 12, color: colors.expense, fontWeight: "600" }}>Clear all</Text></TouchableOpacity>
                    </View>
                  )}

                  {/* Results count */}
                  <Text style={[st.resultsCount, { color: colors.textMuted }]}>
                    {sortedTransactions.length} transaction{sortedTransactions.length !== 1 ? "s" : ""}
                    {hasActiveFilters ? " (filtered)" : ""}
                  </Text>

                  {loading ? (
                    <Text style={[st.emptyText, { color: colors.textMuted }]}>Loading...</Text>
                  ) : sortedTransactions.length === 0 ? (
                    <View style={st.emptyContainer}>
                      <Text style={[st.emptyText, { color: colors.textMuted }]}>{hasActiveFilters ? "No transactions match your filters" : "No transactions yet"}</Text>
                      {hasActiveFilters ? (
                        <TouchableOpacity style={[st.addButton, { backgroundColor: colors.primary }]} onPress={clearFilters}><Text style={st.addButtonText}>Clear filters</Text></TouchableOpacity>
                      ) : (
                        <TouchableOpacity style={[st.addButton, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate("Add")}><Text style={st.addButtonText}>Add your first transaction</Text></TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    sortedTransactions.map((item) => <View key={item.id}>{renderTransaction({ item })}</View>)
                  )}
                </ScrollView>

                {/* Filter Modal */}
                <Modal visible={showFilters} transparent animationType="slide">
                  <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                    <View style={st.modalOverlay}>
                      <View style={[st.modalContent, { backgroundColor: colors.card }]}>
                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                          <View style={st.modalHeader}>
                            <Text style={[st.modalTitle, { color: colors.text }]}>Filter Transactions</Text>
                            <TouchableOpacity onPress={clearFilters}><Text style={{ fontSize: 13, color: colors.expense, fontWeight: "500" }}>Reset</Text></TouchableOpacity>
                          </View>

                          {/* Type filter */}
                          <Text style={[st.modalLabel, { color: colors.textSecondary }]}>Type</Text>
                          <View style={st.modalChipRow}>
                            {[{ label: "All", value: "all" }, { label: "Income", value: "income" }, { label: "Expense", value: "expense" }].map((opt) => (
                              <TouchableOpacity key={opt.value} style={[st.modalChip, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, filterType === opt.value && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setFilterType(opt.value)}>
                                <Text style={[st.modalChipText, { color: colors.textSecondary }, filterType === opt.value && { color: "#fff", fontWeight: "500" }]}>{opt.label}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>

                          {/* Exclude toggles */}
                          <Text style={[st.modalLabel, { color: colors.textSecondary }]}>Exclude</Text>
                          <View style={st.modalChipRow}>
                            <TouchableOpacity style={[st.modalChip, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, hideTransfers && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setHideTransfers(!hideTransfers)}>
                              <Text style={[st.modalChipText, { color: colors.textSecondary }, hideTransfers && { color: "#fff", fontWeight: "500" }]}>↔ Transfers</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[st.modalChip, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, hideAdjustments && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setHideAdjustments(!hideAdjustments)}>
                              <Text style={[st.modalChipText, { color: colors.textSecondary }, hideAdjustments && { color: "#fff", fontWeight: "500" }]}>⚙️ Adjustments</Text>
                            </TouchableOpacity>
                          </View>

                          {/* Category filter */}
                          <Text style={[st.modalLabel, { color: colors.textSecondary }]}>Category</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 40 }}>
                            <View style={{ flexDirection: "row", gap: 8 }}>
                              <TouchableOpacity style={[st.modalChip, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, !filterCategory && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setFilterCategory(null)}>
                                <Text style={[st.modalChipText, { color: colors.textSecondary }, !filterCategory && { color: "#fff", fontWeight: "500" }]}>All</Text>
                              </TouchableOpacity>
                              {categories.map((cat) => (
                                <TouchableOpacity key={cat.id} style={[st.modalChip, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, filterCategory === cat.name && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setFilterCategory(filterCategory === cat.name ? null : cat.name)}>
                                  <Text style={[st.modalChipText, { color: colors.textSecondary }, filterCategory === cat.name && { color: "#fff", fontWeight: "500" }]}>{cat.icon} {cat.name}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </ScrollView>

                          {/* Account filter */}
                          <Text style={[st.modalLabel, { color: colors.textSecondary }]}>Account</Text>
                          <View style={st.modalChipRow}>
                            <TouchableOpacity style={[st.modalChip, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, !filterAccount && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setFilterAccount(null)}>
                              <Text style={[st.modalChipText, { color: colors.textSecondary }, !filterAccount && { color: "#fff", fontWeight: "500" }]}>All</Text>
                            </TouchableOpacity>
                            {accounts.map((acc) => (
                              <TouchableOpacity key={acc.id} style={[st.modalChip, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, filterAccount === acc.name && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setFilterAccount(filterAccount === acc.name ? null : acc.name)}>
                                <Text style={[st.modalChipText, { color: colors.textSecondary }, filterAccount === acc.name && { color: "#fff", fontWeight: "500" }]}>{acc.icon} {acc.name}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>

                          {/* Amount range */}
                          <Text style={[st.modalLabel, { color: colors.textSecondary }]}>Amount range</Text>
                          <View style={{ flexDirection: "row", gap: 10 }}>
                            <TextInput style={[st.modalInput, { flex: 1, backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]} placeholder="Min" placeholderTextColor={colors.textMuted} value={filterMinAmount} onChangeText={setFilterMinAmount} keyboardType="decimal-pad" />
                            <TextInput style={[st.modalInput, { flex: 1, backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]} placeholder="Max" placeholderTextColor={colors.textMuted} value={filterMaxAmount} onChangeText={setFilterMaxAmount} keyboardType="decimal-pad" />
                          </View>

                          {/* Date range */}
                          <Text style={[st.modalLabel, { color: colors.textSecondary }]}>Date range</Text>
                          {Platform.OS === "web" ? (
                            <View style={{ flexDirection: "row", gap: 10 }}>
                              <View style={{ flex: 1 }}>
                                <Text style={[{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }]}>From</Text>
                                <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} style={{ width: "100%", padding: 12, borderRadius: 12, border: `1px solid ${colors.borderDark}`, fontSize: 14, backgroundColor: colors.inputBg, color: colors.text, boxSizing: "border-box" }} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }]}>To</Text>
                                <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} style={{ width: "100%", padding: 12, borderRadius: 12, border: `1px solid ${colors.borderDark}`, fontSize: 14, backgroundColor: colors.inputBg, color: colors.text, boxSizing: "border-box" }} />
                              </View>
                            </View>
                          ) : (
                            <View style={{ flexDirection: "row", gap: 10 }}>
                              <TouchableOpacity style={[st.dateButton, { flex: 1, borderColor: colors.borderDark, backgroundColor: colors.inputBg }]} onPress={() => setShowFilterDateFrom(true)}>
                                <Text style={[{ fontSize: 13, color: filterDateFrom ? colors.text : colors.textMuted }]}>{filterDateFrom || "📅 From"}</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={[st.dateButton, { flex: 1, borderColor: colors.borderDark, backgroundColor: colors.inputBg }]} onPress={() => setShowFilterDateTo(true)}>
                                <Text style={[{ fontSize: 13, color: filterDateTo ? colors.text : colors.textMuted }]}>{filterDateTo || "📅 To"}</Text>
                              </TouchableOpacity>
                            </View>
                          )}

                          {Platform.OS !== "web" && showFilterDateFrom && (
                            <DateTimePicker value={filterDateFrom ? new Date(filterDateFrom) : new Date()} mode="date" display="default" onChange={(event, date) => { setShowFilterDateFrom(false); if (date) setFilterDateFrom(date.toISOString().split("T")[0]); }} />
                          )}
                          {Platform.OS !== "web" && showFilterDateTo && (
                            <DateTimePicker value={filterDateTo ? new Date(filterDateTo) : new Date()} mode="date" display="default" onChange={(event, date) => { setShowFilterDateTo(false); if (date) setFilterDateTo(date.toISOString().split("T")[0]); }} />
                          )}

                          {/* Apply button */}
                          <TouchableOpacity style={[st.applyBtn, { backgroundColor: colors.primary }]} onPress={() => setShowFilters(false)}>
                            <Text style={st.applyBtnText}>Apply Filters</Text>
                          </TouchableOpacity>

                          <TouchableOpacity style={[st.closeBtnModal, { borderColor: colors.borderDark }]} onPress={() => setShowFilters(false)}>
                            <Text style={[st.closeBtnText, { color: colors.textSecondary }]}>Close</Text>
                          </TouchableOpacity>
                        </ScrollView>
                      </View>
                    </View>
                  </KeyboardAvoidingView>
                </Modal>
              </KeyboardAvoidingView>
            </SafeAreaView>
          );
        }

        const st = StyleSheet.create({
          safeArea: { flex: 1 },
          container: { padding: 16, paddingTop: 8 },
          heading: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
          summaryRow: { flexDirection: "row", gap: 6, marginBottom: 12 },
          summaryCard: { flex: 1, padding: 8, borderRadius: 10, alignItems: "center" },
          summaryLabel: { fontSize: 11, marginBottom: 2 },
          summaryValue: { fontSize: 14, fontWeight: "bold" },
          creditRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 10, borderRadius: 10, marginBottom: 12 },
          creditLabel: { fontSize: 13, color: "#9A3412", fontWeight: "500" },
          creditValue: { fontSize: 14, color: "#EA580C", fontWeight: "bold" },
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
          toolbarRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
          filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
          filterChipText: { fontSize: 12, fontWeight: "500" },
          filterBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
          filterBtnText: { fontSize: 12, fontWeight: "600" },
          activeFilters: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8, alignItems: "center" },
          filterTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
          filterTagText: { fontSize: 11, fontWeight: "500" },
          resultsCount: { fontSize: 12, marginBottom: 8 },
          emptyContainer: { justifyContent: "center", alignItems: "center", paddingTop: 40 },
          emptyText: { fontSize: 16, marginBottom: 16 },
          addButton: { padding: 14, borderRadius: 12, paddingHorizontal: 24 },
          addButtonText: { color: "#fff", fontWeight: "600" },
          modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
          modalContent: { borderRadius: 16, padding: 20, maxHeight: "90%" },
          modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
          modalTitle: { fontSize: 20, fontWeight: "bold" },
          modalLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 14 },
          modalChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
          modalChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
          modalChipText: { fontSize: 13 },
          modalInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
          dateButton: { padding: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
          applyBtn: { padding: 16, borderRadius: 12, alignItems: "center", marginTop: 20 },
          applyBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
          closeBtnModal: { padding: 14, borderRadius: 12, alignItems: "center", marginTop: 10, borderWidth: 1 },
          closeBtnText: { fontSize: 15, fontWeight: "500" },
        });