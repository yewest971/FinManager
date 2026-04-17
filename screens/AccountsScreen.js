import React, { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Modal,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

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

export default function AccountsScreen() {
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

  // Transfer state
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
      const [accData, txData] = await Promise.all([
        getAccounts(),
        getTransactions(),
      ]);
      setAccounts(accData);

      // Calculate balance per account
      const bal = {};
      accData.forEach((acc) => {
        bal[acc.name] = 0;
      });

      txData.forEach((tx) => {
        const accName = tx.account || "Cash";
        if (bal[accName] === undefined) bal[accName] = 0;

        if (tx.type === "income") {
          bal[accName] += tx.amount;
        } else if (tx.type === "expense") {
          bal[accName] -= tx.amount;
        } else if (tx.type === "transfer_out") {
          bal[accName] -= tx.amount;
        } else if (tx.type === "transfer_in") {
          bal[accName] += tx.amount;
        }
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

      if (!selectedType) {
        setAddError("Please select an account type");
        return;
      }

      if (!name.trim()) {
        setAddError("Please enter an account name");
        return;
      }

      const exists = accounts.some(
        (acc) => acc.name.toLowerCase() === name.trim().toLowerCase()
      );
      if (exists) {
        setAddError("An account with this name already exists");
        return;
      }

      try {
        setLoading(true);
        const accountData = {
          name: name.trim(),
          type: selectedType,
          icon: getIcon(selectedType),
        };

        if (selectedType === "credit") {
          accountData.limit = parseFloat(newLimit) || 0;
        }

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
    if (Platform.OS === "web") {
      window.alert("Please enter an account name");
    } else {
      Alert.alert("Error", "Please enter an account name");
    }
    return;
  }

  try {
    const item = accounts.find((a) => a.id === editingId);
    const oldName = item.name;
    const oldBalance = balances[oldName] || 0;
    const newBalance = parseFloat(editBalance) || 0;
    const difference = newBalance - oldBalance;

    const updateData = {
      name: editName.trim(),
      type: editType,
      icon: getIcon(editType),
    };

    if (editType === "credit") {
      updateData.limit = parseFloat(editLimit) || 0;
    }

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
    const confirmed = window.confirm(`Delete "${accName}"?`);
    if (confirmed) {
      performDelete(id);
    }
  } else {
    Alert.alert("Delete Account", `Delete "${accName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => performDelete(id),
      },
    ]);
  }
};

const performDelete = async (id) => {
  try {
    await deleteAccount(id);
    loadData();
  } catch (error) {
    console.log("Delete error:", error);
  }
};
  const handleTransfer = async () => {
    setTransferError("");

    if (!fromAccount || !toAccount) {
      setTransferError("Please select both accounts");
      return;
    }

    if (fromAccount === toAccount) {
      setTransferError("Cannot transfer to the same account");
      return;
    }

    if (!transferAmount || isNaN(parseFloat(transferAmount)) || parseFloat(transferAmount) <= 0) {
      setTransferError("Please enter a valid amount");
      return;
    }

const amount = parseFloat(transferAmount);
const fromBalance = balances[fromAccount] || 0;

const fromAcc = accounts.find((a) => a.name === fromAccount);
if (fromAcc && fromAcc.type === "credit") {
  const creditLimit = fromAcc.limit || 0;
  const creditUsed = Math.abs(fromBalance);
  const creditAvailable = creditLimit - creditUsed;
  if (amount > creditAvailable) {
    setTransferError(`Credit limit exceeded. Available: ${creditAvailable.toFixed(2)}`);
    return;
  }
} else {
  if (amount > fromBalance) {
    setTransferError(`Insufficient balance in ${fromAccount} (${fromBalance.toFixed(2)})`);
    return;
  }
}
// Block transfer to credit card with no outstanding balance
const toAcc = accounts.find((a) => a.name === toAccount);
if (toAcc && toAcc.type === "credit") {
  const toBalance = balances[toAccount] || 0;
  const outstanding = Math.abs(toBalance);
  if (outstanding <= 0) {
    setTransferError(`${toAccount} has no outstanding balance to pay off`);
    return;
  }
  if (amount > outstanding) {
    setTransferError(`Payment exceeds outstanding balance (${outstanding.toFixed(2)})`);
    return;
  }
}

        try {
          setTransferError("");
          setTransferLoading(true);
          const now = new Date().toISOString();
          const note = transferNote.trim() || `Transfer: ${fromAccount} → ${toAccount}`;
          const fee = parseFloat(transferFee) || 0;

          // Transfer out
          await addTransaction({
            title: note,
            amount: amount,
            type: "transfer_out",
            category: "Transfer",
            account: fromAccount,
            date: now,
          });

          // Transfer in
          await addTransaction({
            title: note,
            amount: amount,
            type: "transfer_in",
            category: "Transfer",
            account: toAccount,
            date: now,
          });

          // Fee as a separate expense if provided
          if (fee > 0) {
            await addTransaction({
              title: `Fee: ${note}`,
              amount: fee,
              type: "expense",
              category: "Fees & Charges",
              account: fromAccount,
              date: now,
            });
          }

          setShowTransfer(false);
          setFromAccount(null);
          setToAccount(null);
          setTransferAmount("");
          setTransferNote("");
          setTransferFee("");
          loadData();

          const successMsg = fee > 0
            ? `Transferred ${amount.toFixed(2)} from ${fromAccount} to ${toAccount} (fee: ${fee.toFixed(2)})`
            : `Transferred ${amount.toFixed(2)} from ${fromAccount} to ${toAccount}`;

          if (Platform.OS === "web") {
            window.alert(successMsg);
          } else {
            Alert.alert("Success", successMsg);
          }
        } catch (error) {
          if (Platform.OS === "web") {
            window.alert("Transfer failed");
          } else {
            Alert.alert("Error", "Transfer failed");
          }
        } finally {
          setTransferLoading(false);
        }
    };

  // Total balance
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
      <View style={styles.accountCard}>
        <Text style={styles.editLabel}>Account Name</Text>
        <TextInput
          style={styles.editInput}
          value={editName}
          onChangeText={setEditName}
          placeholder="Account name"
        />

        <Text style={styles.editLabel}>Account Type</Text>
        <View style={styles.editTypeRow}>
          {ACCOUNT_TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[
                styles.editTypeChip,
                editType === t.value && styles.editTypeChipActive,
              ]}
              onPress={() => setEditType(t.value)}
            >
              <Text
                style={[
                  styles.editTypeChipText,
                  editType === t.value && styles.editTypeChipTextActive,
                ]}
              >
                {t.icon} {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {editType === "credit" ? (
          <>
            <Text style={styles.editLabel}>Credit Limit</Text>
            <TextInput
              style={styles.editInput}
              value={editLimit}
              onChangeText={setEditLimit}
              placeholder="e.g. 5000"
              keyboardType="decimal-pad"
            />
          </>
        ) : (
          <>
            <Text style={styles.editLabel}>Balance</Text>
            <TextInput
              style={styles.editInput}
              value={editBalance}
              onChangeText={setEditBalance}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </>
        )}

        <View style={styles.editActions}>
          <TouchableOpacity style={styles.saveButton} onPress={handleUpdate}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setEditingId(null)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.accountCard}>
      <View style={styles.accountCardRow}>
        <View style={styles.accountLeft}>
          <Text style={styles.accountIcon}>{item.icon}</Text>
          <View>
            <Text style={styles.accountName}>{item.name}</Text>
            <Text style={styles.accountType}>{item.type}</Text>
          </View>
        </View>
        <View style={styles.accountRight}>
          {isCredit ? (
            <>
              <Text style={[styles.accountBalance, { color: "#4F46E5" }]}>
                Limit: {creditLimit.toFixed(2)}
              </Text>
              <Text style={{ fontSize: 12, color: "#EF4444" }}>
                Used: {creditUsed.toFixed(2)}
              </Text>
              <Text style={{ fontSize: 12, color: "#10B981" }}>
                Available: {creditAvailable.toFixed(2)}
              </Text>
            </>
          ) : (
            <Text
              style={[
                styles.accountBalance,
                { color: isNegative ? "#EF4444" : "#10B981" },
              ]}
            >
              {bal.toFixed(2)}
            </Text>
          )}
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => startEditing(item)}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}>
              <Text style={styles.deleteLink}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

return (
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
  >
  <ScrollView
    style={styles.container}
    showsVerticalScrollIndicator={false}
    keyboardShouldPersistTaps="handled"
    contentContainerStyle={{ paddingBottom: 40 }}
  >
    <Text style={styles.heading}>Accounts</Text>

    {/* Total balance card */}
    <View style={styles.totalCard}>
      <Text style={styles.totalLabel}>Total Balance</Text>
      <Text
        style={[
          styles.totalValue,
          { color: totalBalance >= 0 ? "#10B981" : "#EF4444" },
        ]}
      >
        {totalBalance.toFixed(2)}
      </Text>
    </View>

    {/* Transfer button */}
    <TouchableOpacity
      style={styles.transferButton}
      onPress={() => setShowTransfer(true)}
    >
      <Text style={styles.transferButtonText}>↔ Transfer Between Accounts</Text>
    </TouchableOpacity>

    {/* Type picker */}
    <Text style={styles.label}>Add new account</Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginBottom: 12, flexGrow: 0 }}
      contentContainerStyle={{ gap: 8 }}
    >
      {ACCOUNT_TYPES.map((t) => (
        <TouchableOpacity
          key={t.value}
          style={[
            styles.typeChip,
            selectedType === t.value && styles.typeChipActive,
          ]}
          onPress={() => setSelectedType(t.value)}
        >
          <Text
            style={[
              styles.typeChipText,
              selectedType === t.value && styles.typeChipTextActive,
            ]}
          >
            {t.icon} {t.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>

    {/* Credit limit input */}
    {selectedType === "credit" && (
      <TextInput
        style={[styles.input, { marginBottom: 12 }]}
        placeholder="Credit limit (e.g. 5000)"
        placeholderTextColor="#9CA3AF"
        value={newLimit}
        onChangeText={setNewLimit}
        keyboardType="decimal-pad"
      />
    )}

    {/* Name input */}
    {addError ? <Text style={styles.errorText}>{addError}</Text> : null}
    <View style={styles.addRow}>
      <TextInput
        style={styles.input}
        placeholder="e.g. My Visa Card"
        value={name}
        onChangeText={setName}
      />
      <TouchableOpacity
        style={[styles.addButton, loading && { opacity: 0.6 }]}
        onPress={handleAdd}
        disabled={loading}
      >
        <Text style={styles.addButtonText}>Add</Text>
      </TouchableOpacity>
    </View>

    {/* Account list */}
    <Text style={styles.listHeading}>
      Your accounts ({accounts.length})
    </Text>

    {accounts.length === 0 ? (
      <Text style={styles.emptyText}>Loading accounts...</Text>
    ) : (
      accounts.map((item) => (
        <View key={item.id}>{renderAccount({ item })}</View>
      ))
    )}

  </ScrollView>


<Modal visible={showTransfer} transparent animationType="slide">
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitle}>Transfer Funds</Text>

          {/* From account */}
          <Text style={styles.modalLabel}>From</Text>
          <View style={styles.modalChipRow}>
            {accounts.map((acc) => (
              <TouchableOpacity
                key={acc.id}
                style={[
                  styles.modalChip,
                  fromAccount === acc.name && styles.modalChipActive,
                ]}
                onPress={() => setFromAccount(acc.name)}
              >
                <Text
                  style={[
                    styles.modalChipText,
                    fromAccount === acc.name && styles.modalChipTextActive,
                  ]}
                >
                  {acc.icon} {acc.name}
                </Text>
                <Text
                  style={[
                    styles.modalChipBalance,
                    fromAccount === acc.name && { color: "#ddd" },
                  ]}
                >
                  {(balances[acc.name] || 0).toFixed(2)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* To account */}
          <Text style={styles.modalLabel}>To</Text>
          <View style={styles.modalChipRow}>
            {accounts.map((acc) => (
              <TouchableOpacity
                key={acc.id}
                style={[
                  styles.modalChip,
                  toAccount === acc.name && styles.modalChipActive,
                ]}
                onPress={() => setToAccount(acc.name)}
              >
                <Text
                  style={[
                    styles.modalChipText,
                    toAccount === acc.name && styles.modalChipTextActive,
                  ]}
                >
                  {acc.icon} {acc.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Amount */}
          <Text style={styles.modalLabel}>Amount</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="0.00"
            value={transferAmount}
            onChangeText={setTransferAmount}
            keyboardType="decimal-pad"
          />

          {/* Fee */}
          <Text style={styles.modalLabel}>Fee (optional)</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="e.g. ATM fee, transfer fee"
            placeholderTextColor="#9CA3AF"
            value={transferFee}
            onChangeText={setTransferFee}
            keyboardType="decimal-pad"
          />

          {/* Note */}
          <Text style={styles.modalLabel}>Note (optional)</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="e.g. Savings deposit"
            value={transferNote}
            onChangeText={setTransferNote}
          />

          {transferError ? <Text style={styles.transferErrorText}>{transferError}</Text> : null}

          {/* Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalTransferBtn, transferLoading && { opacity: 0.6 }]}
              onPress={handleTransfer}
              disabled={transferLoading}
            >
              <Text style={styles.modalTransferText}>
                {transferLoading ? "Transferring..." : "Transfer"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => {
                setShowTransfer(false);
                setFromAccount(null);
                setToAccount(null);
                setTransferAmount("");
                setTransferNote("");
                setTransferFee("");
                setTransferError("");
              }}
            >
                <Text style={styles.modalCancelText}>Cancel</Text>
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


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 24,
    paddingTop: 60,
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#1a1a1a",
  },
  totalCard: {
    backgroundColor: "#EEF2FF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 13,
    color: "#555",
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: "bold",
  },
  transferButton: {
    backgroundColor: "#4F46E5",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  transferButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginBottom: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9",
  },
  typeChipActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  typeChipText: {
    fontSize: 13,
    color: "#555",
  },
  typeChipTextActive: {
    color: "#fff",
    fontWeight: "500",
  },
  addRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  addButton: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: "center",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  listHeading: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 12,
  },
accountCard: {
  padding: 14,
  borderWidth: 1,
  borderColor: "#eee",
  borderRadius: 12,
  marginBottom: 8,
},
accountCardRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},
  accountLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  accountIcon: {
    fontSize: 24,
  },
  accountName: {
    fontSize: 16,
    color: "#1a1a1a",
    fontWeight: "500",
  },
  accountType: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
    textTransform: "capitalize",
  },
  accountRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  accountBalance: {
    fontSize: 16,
    fontWeight: "bold",
  },
  deleteLink: {
    fontSize: 13,
    color: "#EF4444",
    fontWeight: "500",
  },
  emptyText: {
    fontSize: 14,
    color: "#aaa",
    textAlign: "center",
    marginTop: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginBottom: 6,
    marginTop: 10,
  },
  modalChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modalChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9",
  },
  modalChipActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  modalChipText: {
    fontSize: 13,
    color: "#555",
  },
  modalChipTextActive: {
    color: "#fff",
    fontWeight: "500",
  },
  modalChipBalance: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  modalTransferBtn: {
    flex: 1,
    backgroundColor: "#4F46E5",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalTransferText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalCancelText: {
    color: "#555",
    fontWeight: "500",
    fontSize: 15,
  },
  editLabel: {
  fontSize: 13,
  fontWeight: "600",
  color: "#555",
  marginBottom: 6,
  marginTop: 8,
},
editInput: {
  borderWidth: 1,
  borderColor: "#ddd",
  borderRadius: 10,
  padding: 10,
  fontSize: 15,
  marginBottom: 8,
  backgroundColor: "#f9f9f9",
},
editTypeRow: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 8,
},
editTypeChip: {
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: "#ddd",
  backgroundColor: "#f9f9f9",
},
editTypeChipActive: {
  backgroundColor: "#4F46E5",
  borderColor: "#4F46E5",
},
editTypeChipText: {
  fontSize: 13,
  color: "#555",
},
editTypeChipTextActive: {
  color: "#fff",
  fontWeight: "500",
},
editActions: {
  flexDirection: "row",
  gap: 10,
  marginTop: 10,
},
saveButton: {
  flex: 1,
  backgroundColor: "#4F46E5",
  padding: 12,
  borderRadius: 10,
  alignItems: "center",
},
saveButtonText: {
  color: "#fff",
  fontWeight: "600",
},
cancelButton: {
  flex: 1,
  borderWidth: 1,
  borderColor: "#ddd",
  padding: 12,
  borderRadius: 10,
  alignItems: "center",
},
cancelButtonText: {
  color: "#555",
  fontWeight: "500",
},
editLink: {
  fontSize: 13,
  color: "#4F46E5",
  fontWeight: "500",
},
actionRow: {
  flexDirection: "row",
  gap: 12,
  marginTop: 4,
},
errorText: {
  color: "#EF4444",
  fontSize: 13,
  fontWeight: "500",
  marginBottom: 8,
},
transferErrorText: {
  color: "#EF4444",
  fontSize: 13,
  fontWeight: "500",
  marginTop: 12,
  textAlign: "center",
},
modalContent: {
  backgroundColor: "#fff",
  borderRadius: 16,
  padding: 20,
  maxHeight: "85%",
},
});