import React, { useState, useCallback } from "react";
import {
  View,
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

  // Transfer state
  const [showTransfer, setShowTransfer] = useState(false);
  const [fromAccount, setFromAccount] = useState(null);
  const [toAccount, setToAccount] = useState(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);

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
    if (!name.trim()) {
      Alert.alert("Error", "Please enter an account name");
      return;
    }

    const exists = accounts.some(
      (acc) => acc.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (exists) {
      Alert.alert("Error", "This account already exists");
      return;
    }

    try {
      setLoading(true);
      await addAccount({
        name: name.trim(),
        type: selectedType,
        icon: getIcon(selectedType),
      });
      setName("");
      setSelectedType(null);
      loadData();
    } catch (error) {
      Alert.alert("Error", "Failed to add account");
    } finally {
      setLoading(false);
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
    if (!fromAccount || !toAccount) {
      Alert.alert("Error", "Please select both accounts");
      return;
    }

    if (fromAccount === toAccount) {
      Alert.alert("Error", "Cannot transfer to the same account");
      return;
    }

    if (!transferAmount || isNaN(parseFloat(transferAmount)) || parseFloat(transferAmount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    const amount = parseFloat(transferAmount);
    const fromBalance = balances[fromAccount] || 0;

    if (amount > fromBalance) {
      Alert.alert("Error", `Insufficient balance in ${fromAccount} (${fromBalance.toFixed(2)})`);
      return;
    }

    try {
      setTransferLoading(true);
      const now = new Date().toISOString();
      const note = transferNote.trim() || `Transfer: ${fromAccount} → ${toAccount}`;

      // Create two transactions — one out, one in
      await addTransaction({
        title: note,
        amount: amount,
        type: "transfer_out",
        category: "Transfer",
        account: fromAccount,
        date: now,
      });

      await addTransaction({
        title: note,
        amount: amount,
        type: "transfer_in",
        category: "Transfer",
        account: toAccount,
        date: now,
      });

      setShowTransfer(false);
      setFromAccount(null);
      setToAccount(null);
      setTransferAmount("");
      setTransferNote("");
      loadData();
      Alert.alert("Success", `Transferred ${amount.toFixed(2)} from ${fromAccount} to ${toAccount}`);
    } catch (error) {
      Alert.alert("Error", "Transfer failed");
    } finally {
      setTransferLoading(false);
    }
  };

  // Total balance
  const totalBalance = Object.values(balances).reduce((sum, b) => sum + b, 0);

  const renderAccount = ({ item }) => {
    const bal = balances[item.name] || 0;
    const isNegative = bal < 0;

    return (
      <View style={styles.accountCard}>
        <View style={styles.accountLeft}>
          <Text style={styles.accountIcon}>{item.icon}</Text>
          <View>
            <Text style={styles.accountName}>{item.name}</Text>
            <Text style={styles.accountType}>{item.type}</Text>
          </View>
        </View>
        <View style={styles.accountRight}>
          <Text
            style={[
              styles.accountBalance,
              { color: isNegative ? "#EF4444" : "#10B981" },
            ]}
          >
            {bal.toFixed(2)}
          </Text>
          <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}>
            <Text style={styles.deleteLink}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
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
      <View style={styles.typeRow}>
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
      </View>

      {/* Name input */}
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
        <FlatList
          data={accounts}
          renderItem={renderAccount}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      {/* Transfer Modal */}
      <Modal visible={showTransfer} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
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

            {/* Note */}
            <Text style={styles.modalLabel}>Note (optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Savings deposit"
              value={transferNote}
              onChangeText={setTransferNote}
            />

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
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    marginBottom: 8,
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
});