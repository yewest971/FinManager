import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { addTransaction, getCategories, getAccounts, initializeDefaultAccounts, addCategory } from "../services/firestoreService";
import { savePendingTransaction } from "../services/localDatabase";
import { isOnline, syncPendingTransactions } from "../services/syncService";

export default function AddTransactionScreen({ navigation }) {
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState(null);
  const [category, setCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("🛒");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await initializeDefaultAccounts();
      const [catData, accData] = await Promise.all([
        getCategories(),
        getAccounts(),
      ]);
      setCategories(catData);
      setAccounts(accData);
    } catch (error) {
      console.log("Error loading data:", error);
    }
  };

  const ICONS = ["🍔", "🏠", "🚗", "💊", "🎓", "🛒", "✈️", "🎮", "💰", "📱", "👕", "⚡", "☕", "🎵", "🐾", "💻"];

  const handleAddCategory = async () => {
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
      await addCategory({
        name: newCategoryName.trim(),
        icon: newCategoryIcon,
      });
      setNewCategoryName("");
      setShowAddCategory(false);
      setError("");
      const catData = await getCategories();
      setCategories(catData);
      setCategory(newCategoryName.trim());
    } catch (err) {
      setError("Failed to add category");
    }
  };

    const handleSubmit = async () => {
        setError("");

    if (!type) {
      setError("Please select Income or Expense");
      return;
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (!category) {
      setError("Please select a category");
      return;
    }

    if (!account) {
      setError("Please select an account");
      return;
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

      Alert.alert(
        "Success",
        online
          ? "Transaction added!"
          : "Saved offline — will sync when you're back online.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      setError("Failed to add transaction");
    } finally {
      setLoading(false);
    }
  };


  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Add Transaction</Text>

      {/* Type selector */}
      <Text style={styles.label}>Type</Text>
      <View style={styles.typeRow}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            type === "income" && styles.incomeActive,
          ]}
          onPress={() => setType("income")}
        >
          <Text
            style={[
              styles.typeText,
              type === "income" && styles.typeTextActive,
            ]}
          >
            Income
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.typeButton,
            type === "expense" && styles.expenseActive,
          ]}
          onPress={() => setType("expense")}
        >
          <Text
            style={[
              styles.typeText,
              type === "expense" && styles.typeTextActive,
            ]}
          >
            Expense
          </Text>
        </TouchableOpacity>
      </View>

    {/* Amount */}
      <Text style={styles.label}>Amount</Text>
      <TextInput
        style={styles.input}
        placeholder="0.00"
        placeholderTextColor="#9CA3AF"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />

    {/* Note */}
      <Text style={styles.label}>Note (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Optional"
        placeholderTextColor="#9CA3AF"
        value={note}
        onChangeText={setNote}
      />

      {/* Category */}
      <Text style={styles.label}>Category</Text>
      {categories.length > 0 ? (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoryRow}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    category === cat.name && styles.categoryChipActive,
                  ]}
                  onPress={() => setCategory(cat.name)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      category === cat.name && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.icon} {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.addChip}
                onPress={() => setShowAddCategory(!showAddCategory)}
              >
                <Text style={styles.addChipText}>+ New</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {showAddCategory && (
            <View style={styles.newCategoryBox}>
              <View style={styles.iconRow}>
                {ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconBtn,
                      newCategoryIcon === icon && styles.iconBtnActive,
                    ]}
                    onPress={() => setNewCategoryIcon(icon)}
                  >
                    <Text style={{ fontSize: 18 }}>{icon}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.newCategoryRow}>
                <TextInput
                  style={styles.newCategoryInput}
                  placeholder="Category name"
                  placeholderTextColor="#9CA3AF"
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                />
                <TouchableOpacity
                  style={styles.newCategoryBtn}
                  onPress={handleAddCategory}
                >
                  <Text style={styles.newCategoryBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addCategoryLink}
          onPress={() => setShowAddCategory(true)}
        >
          <Text style={styles.addCategoryText}>
            No categories yet — tap to add some
          </Text>
        </TouchableOpacity>
      )}

    {/* Account */}
      <Text style={styles.label}>Account</Text>
      {accounts.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categoryRow}>
            {accounts.map((acc) => (
              <TouchableOpacity
                key={acc.id}
                style={[
                  styles.categoryChip,
                  account === acc.name && styles.categoryChipActive,
                ]}
                onPress={() => setAccount(acc.name)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    account === acc.name && styles.categoryChipTextActive,
                  ]}
                >
                  {acc.icon} {acc.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <Text style={styles.addCategoryText}>Loading accounts...</Text>
      )}

     {/* Error message */}
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}


    {/* Submit */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitText}>
          {loading ? "Adding..." : "Add Transaction"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
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
    marginBottom: 24,
    color: "#1a1a1a",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  typeRow: {
    flexDirection: "row",
    gap: 12,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  incomeActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
  },
  expenseActive: {
    backgroundColor: "#FEF2F2",
    borderColor: "#EF4444",
  },
  typeText: {
    fontSize: 15,
    color: "#888",
    fontWeight: "500",
  },
  typeTextActive: {
    color: "#1a1a1a",
    fontWeight: "600",
  },
  categoryRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9",
  },
  categoryChipActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  categoryChipText: {
    fontSize: 14,
    color: "#555",
  },
  categoryChipTextActive: {
    color: "#fff",
    fontWeight: "500",
  },
  addCategoryLink: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    alignItems: "center",
  },
  addCategoryText: {
    color: "#4F46E5",
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: "#4F46E5",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 32,
    marginBottom: 40,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 16,
    backgroundColor: "#FEF2F2",
    padding: 10,
    borderRadius: 10,
  },
    addChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#4F46E5",
    borderStyle: "dashed",
    backgroundColor: "#EEF2FF",
  },
  addChipText: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "600",
  },
  newCategoryBox: {
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    backgroundColor: "#f9f9f9",
  },
  iconRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  iconBtnActive: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  newCategoryRow: {
    flexDirection: "row",
    gap: 8,
  },
  newCategoryInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    backgroundColor: "#fff",
  },
  newCategoryBtn: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: "center",
  },
  newCategoryBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});