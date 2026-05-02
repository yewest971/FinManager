    import React, { useState, useCallback } from "react";
    import {
      View,
      ScrollView,
      KeyboardAvoidingView,
      Text,
      TextInput,
      TouchableOpacity,
      StyleSheet,
      Alert,
      Modal,
      Platform,
    } from "react-native";
    import { useUser } from "../context/UserContext";
    import { useFocusEffect } from "@react-navigation/native";
    import { useTheme } from "../context/ThemeContext";
    import {
      addAccount,
      getAccounts,
      deleteAccount,
      updateAccount,
      initializeDefaultAccounts,
      getTransactions,
      addTransaction,
    } from "../services/firestoreService";

    const ACCOUNT_TYPES = [
      { label: "Cash", value: "cash", icon: "💵" },
      { label: "Bank", value: "bank", icon: "🏦" },
      { label: "Credit Card", value: "credit", icon: "💳" },
      { label: "Savings", value: "savings", icon: "💰" },
      { label: "E-Wallet", value: "ewallet", icon: "📱" },
    ];

    export default function AccountsScreen({ navigation }) {
      const { colors } = useTheme();
      const { formatAmount } = useUser();
      const [accounts, setAccounts] = useState([]);
      const [balances, setBalances] = useState({});
      const [name, setName] = useState("");
      const [selectedType, setSelectedType] = useState(null);
      const [loading, setLoading] = useState(false);
      const [editingId, setEditingId] = useState(null);
      const [editName, setEditName] = useState("");
      const [editType, setEditType] = useState("cash");
      const [editBalance, setEditBalance] = useState("");
      const [editLimit, setEditLimit] = useState("");
      const [newLimit, setNewLimit] = useState("");

      const [showTransfer, setShowTransfer] = useState(false);
      const [fromAccount, setFromAccount] = useState(null);
      const [toAccount, setToAccount] = useState(null);
      const [transferAmount, setTransferAmount] = useState("");
      const [transferNote, setTransferNote] = useState("");
      const [transferLoading, setTransferLoading] = useState(false);
      const [transferFee, setTransferFee] = useState("");
      const [transferError, setTransferError] = useState("");
      const [addError, setAddError] = useState("");

      useFocusEffect(
        useCallback(() => {
          loadData();
        }, [])
      );

      const loadData = async () => {
        try {
          await initializeDefaultAccounts();
          const [accData, txData] = await Promise.all([getAccounts(), getTransactions()]);
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

      const getIcon = (type) => {
        const found = ACCOUNT_TYPES.find((t) => t.value === type);
        return found ? found.icon : "💰";
      };

      const handleAdd = async () => {
        setAddError("");
        if (!selectedType) { setAddError("Please select an account type"); return; }
        if (!name.trim()) { setAddError("Please enter an account name"); return; }
        const exists = accounts.some((acc) => acc.name.toLowerCase() === name.trim().toLowerCase());
        if (exists) { setAddError("An account with this name already exists"); return; }

        try {
          setLoading(true);
          const accountData = { name: name.trim(), type: selectedType, icon: getIcon(selectedType) };
          if (selectedType === "credit") accountData.limit = parseFloat(newLimit) || 0;
          await addAccount(accountData);
          setName("");
          setSelectedType(null);
          setNewLimit("");
          loadData();
        } catch (error) {
          setAddError("Failed to add account");
        } finally {
          setLoading(false);
        }
      };

      const startEditing = (item) => {
        const bal = balances[item.name] || 0;
        setEditingId(item.id);
        setEditName(item.name);
        setEditType(item.type);
        setEditBalance(String(bal.toFixed(2)));
        setEditLimit(String(item.limit || 0));
      };

      const handleUpdate = async () => {
        if (!editName.trim()) {
          Platform.OS === "web" ? window.alert("Please enter an account name") : Alert.alert("Error", "Please enter an account name");
          return;
        }
        try {
          const item = accounts.find((a) => a.id === editingId);
          const oldName = item.name;
          const oldBalance = balances[oldName] || 0;
          const newBalance = parseFloat(editBalance) || 0;
          const difference = newBalance - oldBalance;

          const updateData = { name: editName.trim(), type: editType, icon: getIcon(editType) };
          if (editType === "credit") updateData.limit = parseFloat(editLimit) || 0;
          await updateAccount(editingId, updateData);

          if (difference !== 0) {
            await addTransaction({
              title: `Balance adjustment (${oldName})`,
              amount: Math.abs(difference),
              type: difference > 0 ? "income" : "expense",
              category: "Adjustment",
              account: editName.trim(),
              date: new Date().toISOString(),
            });
          }
          setEditingId(null);
          loadData();
        } catch (error) {
          console.log("Update error:", error);
        }
      };

      const handleDelete = (id, accName) => {
        if (Platform.OS === "web") {
          if (window.confirm(`Delete "${accName}"?`)) performDelete(id);
        } else {
          Alert.alert("Delete Account", `Delete "${accName}"?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => performDelete(id) },
          ]);
        }
      };

      const performDelete = async (id) => {
        try { await deleteAccount(id); loadData(); } catch (error) { console.log("Delete error:", error); }
      };

      const handleTransfer = async () => {
        setTransferError("");
        if (!fromAccount || !toAccount) { setTransferError("Please select both accounts"); return; }
        if (fromAccount === toAccount) { setTransferError("Cannot transfer to the same account"); return; }
        if (!transferAmount || isNaN(parseFloat(transferAmount)) || parseFloat(transferAmount) <= 0) { setTransferError("Please enter a valid amount"); return; }

        const amount = parseFloat(transferAmount);
        const fromBalance = balances[fromAccount] || 0;
        const fromAcc = accounts.find((a) => a.name === fromAccount);

        if (fromAcc && fromAcc.type === "credit") {
          const creditAvailable = (fromAcc.limit || 0) - Math.abs(fromBalance);
          if (amount > creditAvailable) { setTransferError(`Credit limit exceeded. Available: ${formatAmount(creditAvailable)}`); return; }
        } else {
          if (amount > fromBalance) { setTransferError(`Insufficient balance in ${fromAccount} (${formatAmount(fromBalance)})`); return; }
        }

        const toAcc = accounts.find((a) => a.name === toAccount);
        if (toAcc && toAcc.type === "credit") {
          const outstanding = Math.abs(balances[toAccount] || 0);
          if (outstanding <= 0) { setTransferError(`${toAccount} has no outstanding balance to pay off`); return; }
          if (amount > outstanding) { setTransferError(`Payment exceeds outstanding balance (${formatAmount(outstanding)})`); return; }
        }

        try {
          setTransferLoading(true);
          const now = new Date().toISOString();
          const note = transferNote.trim() || `Transfer: ${fromAccount} → ${toAccount}`;
          const fee = parseFloat(transferFee) || 0;

          await addTransaction({ title: note, amount, type: "transfer_out", category: "Transfer", account: fromAccount, date: now });
          await addTransaction({ title: note, amount, type: "transfer_in", category: "Transfer", account: toAccount, date: now });
          if (fee > 0) {
            await addTransaction({ title: `Fee: ${note}`, amount: fee, type: "expense", category: "Fees & Charges", account: fromAccount, date: now });
          }

          setShowTransfer(false);
          setFromAccount(null);
          setToAccount(null);
          setTransferAmount("");
          setTransferNote("");
          setTransferFee("");
          loadData();

          const successMsg = fee > 0
          ? `Transferred ${formatAmount(amount)} from ${fromAccount} to ${toAccount} (fee: ${formatAmount(fee)})`
          : `Transferred ${formatAmount(amount)} from ${fromAccount} to ${toAccount}`;
          Platform.OS === "web" ? window.alert(successMsg) : Alert.alert("Success", successMsg);
        } catch (error) {
          Platform.OS === "web" ? window.alert("Transfer failed") : Alert.alert("Error", "Transfer failed");
        } finally {
          setTransferLoading(false);
        }
      };

      const totalBalance = Object.values(balances).reduce((sum, b) => sum + b, 0);

      const renderAccount = ({ item }) => {
        const bal = balances[item.name] || 0;
        const isCredit = item.type === "credit";
        const creditLimit = item.limit || 0;
        const creditUsed = isCredit ? Math.abs(bal) : 0;
        const creditAvailable = isCredit ? creditLimit - creditUsed : 0;
        const isNegative = isCredit ? false : bal < 0;
        const isEditing = editingId === item.id;

        if (isEditing) {
          return (
            <View style={[s.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.editLabel, { color: colors.textSecondary }]}>Account Name</Text>
              <TextInput style={[s.editInput, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]} value={editName} onChangeText={setEditName} placeholder="Account name" placeholderTextColor={colors.textMuted} />

              <Text style={[s.editLabel, { color: colors.textSecondary }]}>Account Type</Text>
              <View style={s.editTypeRow}>
                {ACCOUNT_TYPES.map((t) => (
                  <TouchableOpacity key={t.value} style={[s.editTypeChip, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, editType === t.value && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setEditType(t.value)}>
                    <Text style={[s.editTypeChipText, { color: colors.textSecondary }, editType === t.value && { color: "#fff", fontWeight: "500" }]}>{t.icon} {t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {editType === "credit" ? (
                <>
                  <Text style={[s.editLabel, { color: colors.textSecondary }]}>Credit Limit</Text>
                  <TextInput style={[s.editInput, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]} value={editLimit} onChangeText={setEditLimit} placeholder="e.g. 5000" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />
                </>
              ) : (
                <>
                  <Text style={[s.editLabel, { color: colors.textSecondary }]}>Balance</Text>
                  <TextInput style={[s.editInput, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]} value={editBalance} onChangeText={setEditBalance} placeholder="0.00" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />
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
          <View style={[s.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={s.accountCardRow}>
              <View style={s.accountLeft}>
                <Text style={s.accountIcon}>{item.icon}</Text>
                <View>
                  <Text style={[s.accountName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[s.accountType, { color: colors.textMuted }]}>{item.type}</Text>
                </View>
              </View>
              <View style={s.accountRight}>
                {isCredit ? (
                  <>
                    <Text style={[s.accountBalance, { color: colors.primary }]}>Limit: {formatAmount(creditLimit)}</Text>
                    <Text style={{ fontSize: 12, color: colors.expense }}>Used: {formatAmount(creditUsed)}</Text>
                    <Text style={{ fontSize: 12, color: colors.income }}>Available: {formatAmount(creditAvailable)}</Text>
                  </>
                ) : (
                  <Text style={[s.accountBalance, { color: isNegative ? colors.expense : colors.income }]}>{formatAmount(bal)}</Text>
                )}
                <View style={s.actionRow}>
                  <TouchableOpacity onPress={() => startEditing(item)}>
                    <Text style={[s.editLink, { color: colors.primary }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}>
                    <Text style={s.deleteLink}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        );
      };

      return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : "undefined"}>
          <ScrollView style={[s.container, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>

            <View style={s.headerRow}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={[s.backBtn, { color: colors.primary }]}>← Back</Text>
              </TouchableOpacity>
              <Text style={[s.heading, { color: colors.text }]}>Accounts</Text>
              <View style={{ width: 50 }} />
            </View>

            <View style={[s.totalCard, { backgroundColor: colors.balanceBg }]}>
              <Text style={[s.totalLabel, { color: colors.textSecondary }]}>Total Balance</Text>
              <Text style={[s.totalValue, { color: totalBalance >= 0 ? colors.income : colors.expense }]}>{formatAmount(totalBalance)}</Text>
            </View>

            <TouchableOpacity style={[s.transferButton, { backgroundColor: colors.primary }]} onPress={() => setShowTransfer(true)}>
              <Text style={s.transferButtonText}>↔ Transfer Between Accounts</Text>
            </TouchableOpacity>

            <Text style={[s.label, { color: colors.textSecondary }]}>Add new account</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
              {ACCOUNT_TYPES.map((t) => (
                <TouchableOpacity key={t.value} style={[s.typeChip, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, selectedType === t.value && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setSelectedType(t.value)}>
                  <Text style={[s.typeChipText, { color: colors.textSecondary }, selectedType === t.value && { color: "#fff", fontWeight: "500" }]}>{t.icon} {t.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedType === "credit" && (
              <TextInput style={[s.input, { marginBottom: 12, backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]} placeholder="Credit limit (e.g. 5000)" placeholderTextColor={colors.textMuted} value={newLimit} onChangeText={setNewLimit} keyboardType="decimal-pad" />
            )}

            {addError ? <Text style={[s.errorText, { color: colors.expense }]}>{addError}</Text> : null}
            <View style={s.addRow}>
              <TextInput style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]} placeholder="e.g. My Visa Card" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
              <TouchableOpacity style={[s.addButton, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]} onPress={handleAdd} disabled={loading}>
                <Text style={s.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            <Text style={[s.listHeading, { color: colors.text }]}>Your accounts ({accounts.length})</Text>
            {accounts.length === 0 ? (
              <Text style={[s.emptyText, { color: colors.textMuted }]}>Loading accounts...</Text>
            ) : (
              accounts.map((item) => <View key={item.id}>{renderAccount({ item })}</View>)
            )}
          </ScrollView>

          <Modal visible={showTransfer} transparent animationType="slide">
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <View style={s.modalOverlay}>
                <View style={[s.modalContent, { backgroundColor: colors.card }]}>
                  <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <Text style={[s.modalTitle, { color: colors.text }]}>Transfer Funds</Text>

                    <Text style={[s.modalLabel, { color: colors.textSecondary }]}>From</Text>
                    <View style={s.modalChipRow}>
                      {accounts.map((acc) => (
                        <TouchableOpacity key={acc.id} style={[s.modalChip, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, fromAccount === acc.name && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setFromAccount(acc.name)}>
                          <Text style={[s.modalChipText, { color: colors.textSecondary }, fromAccount === acc.name && { color: "#fff", fontWeight: "500" }]}>{acc.icon} {acc.name}</Text>
                          <Text style={[s.modalChipBalance, { color: colors.textMuted }, fromAccount === acc.name && { color: "#ddd" }]}>{formatAmount(balances[acc.name] || 0)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={[s.modalLabel, { color: colors.textSecondary }]}>To</Text>
                    <View style={s.modalChipRow}>
                      {accounts.map((acc) => (
                        <TouchableOpacity key={acc.id} style={[s.modalChip, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }, toAccount === acc.name && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setToAccount(acc.name)}>
                          <Text style={[s.modalChipText, { color: colors.textSecondary }, toAccount === acc.name && { color: "#fff", fontWeight: "500" }]}>{acc.icon} {acc.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={[s.modalLabel, { color: colors.textSecondary }]}>Amount</Text>
                    <TextInput style={[s.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]} placeholder="0.00" placeholderTextColor={colors.textMuted} value={transferAmount} onChangeText={setTransferAmount} keyboardType="decimal-pad" />

                    <Text style={[s.modalLabel, { color: colors.textSecondary }]}>Fee (optional)</Text>
                    <TextInput style={[s.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]} placeholder="e.g. ATM fee" placeholderTextColor={colors.textMuted} value={transferFee} onChangeText={setTransferFee} keyboardType="decimal-pad" />

                    <Text style={[s.modalLabel, { color: colors.textSecondary }]}>Note (optional)</Text>
                    <TextInput style={[s.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]} placeholder="e.g. Savings deposit" placeholderTextColor={colors.textMuted} value={transferNote} onChangeText={setTransferNote} />

                    {transferError ? <Text style={[s.transferErrorText, { color: colors.expense }]}>{transferError}</Text> : null}

                    <View style={s.modalActions}>
                      <TouchableOpacity style={[s.modalTransferBtn, { backgroundColor: colors.primary }, transferLoading && { opacity: 0.6 }]} onPress={handleTransfer} disabled={transferLoading}>
                        <Text style={s.modalTransferText}>{transferLoading ? "Transferring..." : "Transfer"}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.modalCancelBtn, { borderColor: colors.borderDark }]} onPress={() => { setShowTransfer(false); setFromAccount(null); setToAccount(null); setTransferAmount(""); setTransferNote(""); setTransferFee(""); setTransferError(""); }}>
                        <Text style={[s.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        </KeyboardAvoidingView>
      );
    }

    const s = StyleSheet.create({
      container: { flex: 1, padding: 24, paddingTop: 60 },
      headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
      backBtn: { fontSize: 15, fontWeight: "600" },
      heading: { fontSize: 20, fontWeight: "bold" },
      totalCard: { padding: 16, borderRadius: 12, alignItems: "center", marginBottom: 12 },
      totalLabel: { fontSize: 13, marginBottom: 4 },
      totalValue: { fontSize: 28, fontWeight: "bold" },
      transferButton: { padding: 12, borderRadius: 12, alignItems: "center", marginBottom: 20 },
      transferButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
      label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
      typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
      typeChipText: { fontSize: 13 },
      addRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
      input: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
      addButton: { paddingHorizontal: 20, borderRadius: 12, justifyContent: "center" },
      addButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
      listHeading: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
      accountCard: { padding: 14, borderWidth: 1, borderRadius: 12, marginBottom: 8 },
      accountCardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
      accountLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
      accountIcon: { fontSize: 24 },
      accountName: { fontSize: 16, fontWeight: "500" },
      accountType: { fontSize: 12, marginTop: 2, textTransform: "capitalize" },
      accountRight: { alignItems: "flex-end", gap: 4 },
      accountBalance: { fontSize: 16, fontWeight: "bold" },
      actionRow: { flexDirection: "row", gap: 12, marginTop: 4 },
      editLink: { fontSize: 13, fontWeight: "500" },
      deleteLink: { fontSize: 13, color: "#EF4444", fontWeight: "500" },
      editLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 8 },
      editInput: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 15, marginBottom: 8 },
      editTypeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
      editTypeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
      editTypeChipText: { fontSize: 13 },
      editActions: { flexDirection: "row", gap: 10, marginTop: 10 },
      saveButton: { flex: 1, padding: 12, borderRadius: 10, alignItems: "center" },
      saveButtonText: { color: "#fff", fontWeight: "600" },
      cancelButton: { flex: 1, borderWidth: 1, padding: 12, borderRadius: 10, alignItems: "center" },
      cancelButtonText: { fontWeight: "500" },
      errorText: { fontSize: 13, fontWeight: "500", marginBottom: 8 },
      emptyText: { fontSize: 14, textAlign: "center", marginTop: 20 },
      modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
      modalContent: { borderRadius: 16, padding: 20, maxHeight: "85%" },
      modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
      modalLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 10 },
      modalChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
      modalChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
      modalChipText: { fontSize: 13 },
      modalChipBalance: { fontSize: 11, marginTop: 2 },
      modalInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
      modalActions: { flexDirection: "row", gap: 10, marginTop: 20 },
      modalTransferBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: "center" },
      modalTransferText: { color: "#fff", fontWeight: "600", fontSize: 15 },
      modalCancelBtn: { flex: 1, borderWidth: 1, padding: 14, borderRadius: 12, alignItems: "center" },
      modalCancelText: { fontWeight: "500", fontSize: 15 },
      transferErrorText: { fontSize: 13, fontWeight: "500", marginTop: 12, textAlign: "center" },
    });