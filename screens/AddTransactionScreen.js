      import React, { useState, useEffect } from "react";
      import {
        View,
        Text,
        TextInput,
        TouchableOpacity,
        StyleSheet,
        Alert,
        ScrollView,
        KeyboardAvoidingView,
        Platform,
        Modal,
      } from "react-native";
      import { useUser } from "../context/UserContext";
      import { addTransaction, getCategories, getAccounts, addCategory, getTransactions } from "../services/firestoreService";
      import { savePendingTransaction } from "../services/localDatabase";
      import { isOnline, syncPendingTransactions } from "../services/syncService";
      import { checkBudgetAlerts } from "../services/budgetChecker";
      import { useTheme } from "../context/ThemeContext";
      import { sendBudgetAlerts } from "../services/notificationService";
      import EmojiPicker from "rn-emoji-keyboard";

      export default function AddTransactionScreen({ navigation }) {
        const { colors } = useTheme();
        const { formatAmount } = useUser();
        const [note, setNote] = useState("");
        const [amount, setAmount] = useState("");
        const [type, setType] = useState(null);
        const [category, setCategory] = useState(null);
        const [categories, setCategories] = useState([]);
        const [accounts, setAccounts] = useState([]);
        const [account, setAccount] = useState(null);
        const [balances, setBalances] = useState({});
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState("");
        const [success, setSuccess] = useState("");
        const [showCategoryPicker, setShowCategoryPicker] = useState(false);
        const [showAddCategory, setShowAddCategory] = useState(false);
        const [newCategoryName, setNewCategoryName] = useState("");
        const [newCategoryIcon, setNewCategoryIcon] = useState("");
        const [showEmojiPicker, setShowEmojiPicker] = useState(false);

        useEffect(() => {
          loadData();
        }, []);

        const loadData = async () => {
          try {
            const [catData, accData, txData] = await Promise.all([
              getCategories(),
              getAccounts(),
              getTransactions(),
            ]);
            catData.sort((a, b) => a.name.localeCompare(b.name));
            setCategories(catData);
            setAccounts(accData);

            const bal = {};
            accData.forEach((acc) => { bal[acc.name] = 0; });
            txData.forEach((tx) => {
              const accName = tx.account || "Cash";
              if (bal[accName] === undefined) bal[accName] = 0;
              if (tx.type === "income") bal[accName] += tx.amount;
              else if (tx.type === "expense") bal[accName] -= tx.amount;
              else if (tx.type === "transfer_out") bal[accName] -= tx.amount;
              else if (tx.type === "transfer_in") bal[accName] += tx.amount;
            });
            setBalances(bal);
          } catch (err) {
            console.log("Error loading data:", err);
          }
        };

        const getCategoryEmoji = (catName) => {
          const found = categories.find((c) => c.name.toLowerCase() === (catName || "").toLowerCase());
          return found ? found.icon : "";
        };

        const handleAddCategory = async () => {
          if (!newCategoryIcon) {
            setError("Please select an icon for the category");
            return;
          }
          if (!newCategoryName.trim()) {
            setError("Please enter a category name");
            return;
          }
          const exists = categories.some(
            (cat) => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase()
          );
          if (exists) {
            setError("This category already exists");
            return;
          }
          try {
            await addCategory({ name: newCategoryName.trim(), icon: newCategoryIcon });
            setNewCategoryName("");
            setNewCategoryIcon("");
            setShowAddCategory(false);
            setError("");
            setSuccess("");
            const catData = await getCategories();
            catData.sort((a, b) => a.name.localeCompare(b.name));
            setCategories(catData);
            setCategory(newCategoryName.trim());
          } catch (err) {
            setError("Failed to add category");
          }
        };

        const handleSubmit = async () => {
          setError("");
          setSuccess("");

          if (!type) { setError("Please select Income or Expense"); return; }
          if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) { setError("Please enter a valid amount"); return; }
          if (!category) { setError("Please select a category"); return; }
          if (!account) { setError("Please select an account"); return; }

          if (type === "expense") {
            const selectedAcc = accounts.find((a) => a.name === account);
            if (selectedAcc && selectedAcc.type === "credit") {
              const creditLimit = selectedAcc.limit || 0;
              const creditUsed = Math.abs(balances[account] || 0);
              const creditAvailable = creditLimit - creditUsed;
              if (parseFloat(amount) > creditAvailable) {
                setError(`Credit limit exceeded. Available: ${formatAmount(creditAvailable)}`);
                return;
              }
            } else {
              const accountBalance = balances[account] || 0;
              if (parseFloat(amount) > accountBalance) {
                setError(`Insufficient balance in ${account} (${formatAmount(accountBalance)})`);
                return;
              }
            }
          }

          try {
            setLoading(true);
            const transactionData = {
              title: note.trim() || "No note",
              amount: parseFloat(amount),
              type,
              category: category || "Uncategorised",
              account: account || "Cash",
              date: new Date().toISOString(),
            };

            const online = await isOnline();
            if (online) {
              await addTransaction(transactionData);
            } else {
              await savePendingTransaction(transactionData);
            }

            setAmount("");
            setType(null);
            setNote("");
            setCategory(null);
            setAccount(null);
            setError("");

            if (online) {
              setSuccess("");
              const alerts = await checkBudgetAlerts(transactionData);
              if (alerts.length > 0) {
                await sendBudgetAlerts(alerts);
                const msg = alerts.map((a) =>
                  a.type === "over"
                    ? `🚨 ${a.name}: Over budget! ${a.percentage}% used`
                    : `⚠️ ${a.name}: ${a.percentage}% used`
                ).join("\n");

                if (Platform.OS === "web") {
                  window.alert(`Transaction Added\n\nBudget alerts:\n${msg}`);
                  navigation.goBack();
                } else {
                  Alert.alert("Transaction Added", `Budget alerts:\n\n${msg}`, [
                    { text: "OK", onPress: () => navigation.goBack() },
                  ]);
                }
              } else {
                if (Platform.OS === "web") {
                  window.alert("Transaction added!");
                  navigation.goBack();
                } else {
                  Alert.alert("Success", "Transaction added!", [
                    { text: "OK", onPress: () => navigation.goBack() },
                  ]);
                }
              }
            } else {
              setSuccess("Saved offline — will sync when you're back online.");
            }
          } catch (err) {
            setError("Failed to add transaction");
          } finally {
            setLoading(false);
          }
        };

        return (
          <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView style={[st.container, { backgroundColor: colors.bg }]} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
              <Text style={[st.heading, { color: colors.text }]}>Add Transaction</Text>

              {/* Type */}
              <Text style={[st.label, { color: colors.textSecondary }]}>Type</Text>
              <View style={st.typeRow}>
                <TouchableOpacity
                  style={[st.typeButton, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, type === "income" && { backgroundColor: colors.incomeBg, borderColor: colors.income }]}
                  onPress={() => setType("income")}
                >
                  <Text style={[st.typeText, { color: colors.textMuted }, type === "income" && { color: colors.income, fontWeight: "600" }]}>Income</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[st.typeButton, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, type === "expense" && { backgroundColor: colors.expenseBg, borderColor: colors.expense }]}
                  onPress={() => setType("expense")}
                >
                  <Text style={[st.typeText, { color: colors.textMuted }, type === "expense" && { color: colors.expense, fontWeight: "600" }]}>Expense</Text>
                </TouchableOpacity>
              </View>

              {/* Amount */}
              <Text style={[st.label, { color: colors.textSecondary }]}>Amount</Text>
              <TextInput style={[st.input, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]}
                  placeholder="0.00" placeholderTextColor={colors.textMuted} value={amount}
                    onChangeText={(text) => {
                            const cleaned = text.replace(/[^0-9.]/g, "");
                            const parts = cleaned.split(".");
                            if (parts.length > 2) return;
                            if (parts[1] && parts[1].length > 2) return;
                            setAmount(cleaned);
                          }} keyboardType="decimal-pad" />

              {/* Note */}
              <Text style={[st.label, { color: colors.textSecondary }]}>Note (optional)</Text>
              <TextInput style={[st.input, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]} placeholder="Optional" placeholderTextColor={colors.textMuted} value={note} onChangeText={setNote} />

              {/* Category */}
              <Text style={[st.label, { color: colors.textSecondary }]}>Category</Text>
              <TouchableOpacity
                style={[st.categoryPickerBtn, { backgroundColor: colors.inputBg, borderColor: colors.borderDark }]}
                onPress={() => setShowCategoryPicker(true)}
              >
                <Text style={[st.categoryPickerText, { color: category ? colors.text : colors.textMuted }]}>
                  {category ? `${getCategoryEmoji(category)} ${category}` : "Select a category"}
                </Text>
                <Text style={{ fontSize: 16, color: colors.textMuted }}>▼</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[st.addChip, { borderColor: colors.primary, backgroundColor: colors.balanceBg }]}
                onPress={() => setShowAddCategory(!showAddCategory)}
              >
                <Text style={[st.addChipText, { color: colors.primary }]}>+ New Category</Text>
              </TouchableOpacity>

              {showAddCategory && (
                <View style={[st.newCategoryBox, { backgroundColor: colors.inputBg, borderColor: colors.borderDark }]}>
                  <TouchableOpacity
                    style={[st.emojiPickerButton, { backgroundColor: colors.card, borderColor: colors.borderDark }]}
                    onPress={() => setShowEmojiPicker(true)}
                  >
                    <Text style={{ fontSize: 24 }}>{newCategoryIcon || "➕"}</Text>
                    <Text style={[st.emojiPickerLabel, { color: colors.textMuted }]}>
                      {newCategoryIcon ? "Tap to change icon" : "Tap to select icon"}
                    </Text>
                  </TouchableOpacity>

                  <View style={st.newCategoryRow}>
                    <TextInput
                      style={[st.newCategoryInput, { backgroundColor: colors.card, borderColor: colors.borderDark, color: colors.text }]}
                      placeholder="Category name"
                      placeholderTextColor={colors.textMuted}
                      value={newCategoryName}
                      onChangeText={setNewCategoryName}
                    />
                    <TouchableOpacity
                      style={[st.newCategoryBtn, { backgroundColor: colors.primary }]}
                      onPress={handleAddCategory}
                    >
                      <Text style={st.newCategoryBtnText}>Add</Text>
                    </TouchableOpacity>
                  </View>

                  <EmojiPicker
                    onEmojiSelected={(emoji) => {
                      setNewCategoryIcon(emoji.emoji);
                      setShowEmojiPicker(false);
                    }}
                    open={showEmojiPicker}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                </View>
              )}

              {/* Category Picker Modal */}
              <Modal visible={showCategoryPicker} transparent animationType="fade">
                <TouchableOpacity
                  style={st.pickerOverlay}
                  activeOpacity={1}
                  onPress={() => setShowCategoryPicker(false)}
                >
                  <View style={[st.pickerContent, { backgroundColor: colors.card }]}>
                    <Text style={[st.pickerTitle, { color: colors.text }]}>Select Category</Text>
                    <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 350 }}>
                      {categories.map((cat) => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            st.pickerItem,
                            { borderBottomColor: colors.border },
                            category === cat.name && { backgroundColor: colors.balanceBg },
                          ]}
                          onPress={() => {
                            setCategory(cat.name);
                            setShowCategoryPicker(false);
                            setError("");
                          }}
                        >
                          <Text style={[st.pickerItemText, { color: colors.text }]}>
                            {cat.icon} {cat.name}
                          </Text>
                          {category === cat.name && (
                            <Text style={{ color: colors.primary, fontWeight: "600" }}>✓</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <TouchableOpacity
                      style={[st.pickerCloseBtn, { borderColor: colors.borderDark }]}
                      onPress={() => setShowCategoryPicker(false)}
                    >
                      <Text style={[st.pickerCloseBtnText, { color: colors.textSecondary }]}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Modal>

              {/* Account */}
              <Text style={[st.label, { color: colors.textSecondary }]}>Account</Text>
              {accounts.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={st.chipRow}>
                    {accounts.map((acc) => (
                      <TouchableOpacity
                        key={acc.id}
                        style={[st.chip, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, account === acc.name && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                        onPress={() => setAccount(acc.name)}
                      >
                        <Text style={[st.chipText, { color: colors.textSecondary }, account === acc.name && { color: "#fff", fontWeight: "500" }]}>
                          {acc.icon} {acc.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <Text style={[st.addCategoryText, { color: colors.textMuted }]}>Loading accounts...</Text>
              )}

              {account && (
                <Text style={[st.balanceHint, { color: colors.textMuted }]}>
                  {accounts.find((a) => a.name === account)?.type === "credit"
                    ? `Available credit: ${formatAmount((accounts.find((a) => a.name === account)?.limit || 0) - Math.abs(balances[account] || 0))}`
                    : `Available: ${formatAmount(balances[account] || 0)}`}
                </Text>
              )}

              {/* Error / Success */}
              {error ? <Text style={[st.errorText, { backgroundColor: colors.expenseBg, color: colors.expense }]}>{error}</Text> : null}
              {success ? <Text style={[st.successText, { backgroundColor: colors.incomeBg, color: colors.income }]}>{success}</Text> : null}

              {/* Submit */}
              <TouchableOpacity style={[st.submitButton, { backgroundColor: colors.primary }, loading && st.submitDisabled]} onPress={handleSubmit} disabled={loading}>
                <Text style={st.submitText}>{loading ? "Adding..." : "Add Transaction"}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[st.transferButton, { borderColor: colors.primary }]} onPress={() => navigation.navigate("Home", { screen: "Accounts" })}>
                <Text style={[st.transferButtonText, { color: colors.primary }]}>↔ Transfer Between Accounts</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        );
      }

      const st = StyleSheet.create({
        container: { flex: 1, padding: 24, paddingTop: 60 },
        heading: { fontSize: 24, fontWeight: "bold", marginBottom: 24 },
        label: { fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 16 },
        input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
        typeRow: { flexDirection: "row", gap: 12 },
        typeButton: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
        typeText: { fontSize: 15, fontWeight: "500" },
        chipRow: { flexDirection: "row", gap: 8, paddingVertical: 4 },
        chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
        chipText: { fontSize: 14 },
        addCategoryLink: { padding: 14, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", alignItems: "center" },
        addCategoryText: { fontSize: 14 },
        submitButton: { padding: 16, borderRadius: 12, alignItems: "center", marginTop: 32, marginBottom: 12 },
        submitDisabled: { opacity: 0.6 },
        submitText: { color: "#fff", fontSize: 16, fontWeight: "600" },
        errorText: { fontSize: 14, fontWeight: "500", textAlign: "center", marginTop: 16, padding: 10, borderRadius: 10 },
        successText: { fontSize: 14, fontWeight: "500", textAlign: "center", marginTop: 16, padding: 10, borderRadius: 10 },
        addChip: { alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderStyle: "dashed", marginTop: 8 },
        addChipText: { fontSize: 14, fontWeight: "600" },
        newCategoryBox: { marginTop: 10, padding: 12, borderWidth: 1, borderRadius: 12 },
        newCategoryRow: { flexDirection: "row", gap: 8 },
        newCategoryInput: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 15 },
        newCategoryBtn: { paddingHorizontal: 16, borderRadius: 10, justifyContent: "center" },
        newCategoryBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
        emojiPickerButton: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderWidth: 1, borderRadius: 12, marginBottom: 10 },
        emojiPickerLabel: { fontSize: 14 },
        balanceHint: { fontSize: 12, marginTop: 4 },
        transferButton: { padding: 16, borderRadius: 12, alignItems: "center", marginBottom: 40, borderWidth: 1 },
        transferButtonText: { fontSize: 16, fontWeight: "600" },
        categoryPickerBtn: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8 },
        categoryPickerText: { fontSize: 16 },
        pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 30 },
        pickerContent: { width: "100%", maxWidth: 400, borderRadius: 16, padding: 20 },
        pickerTitle: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
        pickerItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderRadius: 8 },
        pickerItemText: { fontSize: 15 },
        pickerCloseBtn: { padding: 12, borderRadius: 12, alignItems: "center", marginTop: 12, borderWidth: 1 },
        pickerCloseBtnText: { fontSize: 15, fontWeight: "500" },
      });