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
    } from "react-native";
    import { addTransaction, getCategories, getAccounts, addCategory, getTransactions } from "../services/firestoreService";
    import { savePendingTransaction } from "../services/localDatabase";
    import { isOnline, syncPendingTransactions } from "../services/syncService";
    import { checkBudgetAlerts } from "../services/budgetChecker";
    import { useTheme } from "../context/ThemeContext";
    import EmojiPicker from "rn-emoji-keyboard";

    export default function AddTransactionScreen({ navigation }) {
      const { colors } = useTheme();
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
      const [showAddCategory, setShowAddCategory] = useState(false);
      const [newCategoryName, setNewCategoryName] = useState("");
      const [newCategoryIcon, setNewCategoryIcon] = useState("");
      const [showEmojiPicker, setShowEmojiPicker] = useState(false);

      useEffect(() => {
        loadData();
      }, []);

      const loadData = async () => {
        try {
          await initializeDefaultAccounts();
          const [catData, accData, txData] = await Promise.all([
            getCategories(),
            getAccounts(),
            getTransactions(),
          ]);
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
        } catch (error) {
          console.log("Error loading data:", error);
        }
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
          setShowAddCategory(false);
          setError("");
          setSuccess("");
          const catData = await getCategories();
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
              setError(`Credit limit exceeded. Available: ${creditAvailable.toFixed(2)}`);
              return;
            }
          } else {
            const accountBalance = balances[account] || 0;
            if (parseFloat(amount) > accountBalance) {
              setError(`Insufficient balance in ${account} (${accountBalance.toFixed(2)})`);
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
              const msg = alerts.map((a) =>
                a.type === "over"
                  ? `🚨 ${a.name}: Over budget! ${a.percentage}% used`
                  : `⚠️ ${a.name}: ${a.percentage}% used`
              ).join("\n");
              Alert.alert("Transaction Added", `Budget alerts:\n\n${msg}`, [
                { text: "OK", onPress: () => navigation.goBack() },
              ]);
            } else {
              Alert.alert("Success", "Transaction added!", [
                { text: "OK", onPress: () => navigation.goBack() },
              ]);
            }
          } else {
            setSuccess("Saved offline — will sync when you're back online.");
          }
        } catch (error) {
          setError("Failed to add transaction");
        } finally {
          setLoading(false);
        }
      };

      return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView style={[s.container, { backgroundColor: colors.bg }]} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={[s.heading, { color: colors.text }]}>Add Transaction</Text>

            <Text style={[s.label, { color: colors.textSecondary }]}>Type</Text>
            <View style={s.typeRow}>
              <TouchableOpacity
                style={[s.typeButton, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, type === "income" && { backgroundColor: colors.incomeBg, borderColor: colors.income }]}
                onPress={() => setType("income")}
              >
                <Text style={[s.typeText, { color: colors.textMuted }, type === "income" && { color: colors.income, fontWeight: "600" }]}>Income</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.typeButton, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, type === "expense" && { backgroundColor: colors.expenseBg, borderColor: colors.expense }]}
                onPress={() => setType("expense")}
              >
                <Text style={[s.typeText, { color: colors.textMuted }, type === "expense" && { color: colors.expense, fontWeight: "600" }]}>Expense</Text>
              </TouchableOpacity>
            </View>

            <Text style={[s.label, { color: colors.textSecondary }]}>Amount</Text>
            <TextInput style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]} placeholder="0.00" placeholderTextColor={colors.textMuted} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />

            <Text style={[s.label, { color: colors.textSecondary }]}>Note (optional)</Text>
            <TextInput style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]} placeholder="Optional" placeholderTextColor={colors.textMuted} value={note} onChangeText={setNote} />

            <Text style={[s.label, { color: colors.textSecondary }]}>Category</Text>
            {categories.length > 0 ? (
              <View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={s.chipRow}>
                    {categories.map((cat) => (
                      <TouchableOpacity key={cat.id} style={[s.chip, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, category === cat.name && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setCategory(cat.name)}>
                        <Text style={[s.chipText, { color: colors.textSecondary }, category === cat.name && { color: "#fff", fontWeight: "500" }]}>{cat.icon} {cat.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <TouchableOpacity style={[s.addChip, { borderColor: colors.primary, backgroundColor: colors.balanceBg }]} onPress={() => setShowAddCategory(!showAddCategory)}>
                  <Text style={[s.addChipText, { color: colors.primary }]}>+ New Category</Text>
                </TouchableOpacity>

                {showAddCategory && (
                  <View style={[s.newCategoryBox, { backgroundColor: colors.inputBg, borderColor: colors.borderDark }]}>
                    <TouchableOpacity style={[s.emojiPickerButton, { borderColor: colors.borderDark, backgroundColor: colors.card }]} onPress={() => setShowEmojiPicker(true)}>
                      <Text style={{ fontSize: 24 }}>{newCategoryIcon || "➕"}</Text>
                      <Text style={[s.emojiPickerLabel, { color: colors.textMuted }]}>{newCategoryIcon ? "Tap to change icon" : "Tap to select icon"}</Text>
                    </TouchableOpacity>

                    <View style={s.newCategoryRow}>
                      <TextInput style={[s.newCategoryInput, { backgroundColor: colors.card, borderColor: colors.borderDark, color: colors.text }]} placeholder="Category name" placeholderTextColor={colors.textMuted} value={newCategoryName} onChangeText={setNewCategoryName} />
                      <TouchableOpacity style={[s.newCategoryBtn, { backgroundColor: colors.primary }]} onPress={handleAddCategory}>
                        <Text style={s.newCategoryBtnText}>Add</Text>
                      </TouchableOpacity>
                    </View>

                    <EmojiPicker onEmojiSelected={(emoji) => { setNewCategoryIcon(emoji.emoji); setShowEmojiPicker(false); }} open={showEmojiPicker} onClose={() => setShowEmojiPicker(false)} />
                  </View>
                )}
              </View>
            ) : (
              <TouchableOpacity style={[s.addCategoryLink, { borderColor: colors.borderDark }]} onPress={() => setShowAddCategory(true)}>
                <Text style={[s.addCategoryText, { color: colors.primary }]}>No categories yet — tap to add some</Text>
              </TouchableOpacity>
            )}

            <Text style={[s.label, { color: colors.textSecondary }]}>Account</Text>
            {accounts.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.chipRow}>
                  {accounts.map((acc) => (
                    <TouchableOpacity key={acc.id} style={[s.chip, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, account === acc.name && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setAccount(acc.name)}>
                      <Text style={[s.chipText, { color: colors.textSecondary }, account === acc.name && { color: "#fff", fontWeight: "500" }]}>{acc.icon} {acc.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <Text style={[s.addCategoryText, { color: colors.textMuted }]}>Loading accounts...</Text>
            )}

            {account && (
              <Text style={[s.balanceHint, { color: colors.textMuted }]}>
                {accounts.find((a) => a.name === account)?.type === "credit"
                  ? `Available credit: ${((accounts.find((a) => a.name === account)?.limit || 0) - Math.abs(balances[account] || 0)).toFixed(2)}`
                  : `Available: ${(balances[account] || 0).toFixed(2)}`}
              </Text>
            )}

            {error ? <Text style={[s.errorText, { backgroundColor: colors.expenseBg, color: colors.expense }]}>{error}</Text> : null}
            {success ? <Text style={[s.successText, { backgroundColor: colors.incomeBg, color: colors.income }]}>{success}</Text> : null}

            <TouchableOpacity style={[s.submitButton, { backgroundColor: colors.primary }, loading && s.submitDisabled]} onPress={handleSubmit} disabled={loading}>
              <Text style={s.submitText}>{loading ? "Adding..." : "Add Transaction"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[s.transferButton, { borderColor: colors.primary }]} onPress={() => navigation.navigate("Accounts")}>
              <Text style={[s.transferButtonText, { color: colors.primary }]}>↔ Transfer Between Accounts</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      );
    }

    const s = StyleSheet.create({
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
    });