import React, { useState, useCallback } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  TextInput,
  ScrollView,
  Platform,
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

export default function TransactionsScreen({ navigation }) {
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

  // Reload transactions every time this screen comes into focus
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

const handleDelete = (id) => {
  if (Platform.OS === "web") {
    const confirmed = window.confirm("Delete this transaction?");
    if (confirmed) {
      performDelete(id);
    }
  } else {
    Alert.alert("Delete Transaction", "Delete this transaction?", [
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

  const renderTransaction = ({ item }) => {
    const isEditing = editingId === item.id;
    const isIncome = item.type === "income" || item.type === "transfer_in";
    const isTransfer = item.type === "transfer_in" || item.type === "transfer_out";

if (isEditing) {
      const editDateObj = new Date(editDate);
      let editHours = editDateObj.getHours();
      const editMinutes = String(editDateObj.getMinutes()).padStart(2, "0");
      const editAmPm = editHours >= 12 ? "PM" : "AM";
      editHours = editHours % 12 || 12;

      return (
        <View style={styles.card}>
    {/* Type toggle */}
          <View style={styles.editTypeRow}>
            <TouchableOpacity
              style={[
                styles.editTypeButton,
                editType === "income" && styles.editTypeIncome,
              ]}
              onPress={() => setEditType("income")}
            >
              <Text
                style={[
                  styles.editTypeText,
                  editType === "income" && { color: "#10B981", fontWeight: "600" },
                ]}
              >
                Income
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.editTypeButton,
                editType === "expense" && styles.editTypeExpense,
              ]}
              onPress={() => setEditType("expense")}
            >
              <Text
                style={[
                  styles.editTypeText,
                  editType === "expense" && { color: "#EF4444", fontWeight: "600" },
                ]}
              >
                Expense
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.editInput}
            value={editAmount}
            onChangeText={setEditAmount}
            placeholder="Amount"
            keyboardType="decimal-pad"
          />
          <TextInput
            style={styles.editInput}
            value={editTitle === "No note" ? "" : editTitle}
            onChangeText={setEditTitle}
            placeholder="Note (optional)"
          />

{/* Category selector */}
<Text style={styles.editCategoryLabel}>Category</Text>
<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6, maxHeight: 36  }}>
   <View style={{ flexDirection: "row", gap: 8 }}>
    {categories.map((cat) => (
      <TouchableOpacity
        key={cat.id}
        style={[
          styles.categoryChip,
          editCategory === cat.name && styles.categoryChipActive,
        ]}
        onPress={() => setEditCategory(cat.name)}
      >
        <Text
          style={[
            styles.categoryChipText,
            editCategory === cat.name && styles.categoryChipTextActive,
          ]}
        >
          {cat.icon} {cat.name}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
</ScrollView>

{/* Account selector */}
<Text style={styles.editCategoryLabel}>Account</Text>
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  style={{ marginBottom: 6, maxHeight: 36 }}
>
  <View style={{ flexDirection: "row", gap: 8 }}>
    {accounts.map((acc) => (
      <TouchableOpacity
        key={acc.id}
        style={[
          styles.categoryChip,
          editAccount === acc.name && styles.categoryChipActive,
        ]}
        onPress={() => setEditAccount(acc.name)}
      >
        <Text
          style={[
            styles.categoryChipText,
            editAccount === acc.name && styles.categoryChipTextActive,
          ]}
        >
          {acc.icon} {acc.name}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
</ScrollView>

{/* Date/time display */}
<Text style={styles.editDateText}>
  {`${editDateObj.toLocaleDateString()} ${editHours}:${editMinutes} ${editAmPm}`}
</Text>

{/* Date and Time picker */}
{Platform.OS === "web" ? (
  <View style={styles.timeRow}>
    <input
      type="date"
      value={editDateObj.toISOString().split("T")[0]}
      onChange={(e) => {
        const current = new Date(editDate);
        const [year, month, day] = e.target.value.split("-");
        current.setFullYear(year, month - 1, day);
        setEditDate(current.toISOString());
      }}
      style={{
        flex: 1,
        padding: 10,
        borderRadius: 10,
        border: "1px solid #ddd",
        fontSize: 14,
        backgroundColor: "#f9f9f9",
      }}
    />
    <input
      type="time"
      value={`${String(editDateObj.getHours()).padStart(2, "0")}:${editMinutes}`}
      onChange={(e) => {
        const current = new Date(editDate);
        const [hours, mins] = e.target.value.split(":");
        current.setHours(parseInt(hours), parseInt(mins));
        setEditDate(current.toISOString());
      }}
      style={{
        flex: 1,
        padding: 10,
        borderRadius: 10,
        border: "1px solid #ddd",
        fontSize: 14,
        backgroundColor: "#f9f9f9",
      }}
    />
  </View>
) : (
  <>
    <View style={styles.timeRow}>
      <TouchableOpacity
        style={styles.timeButton}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={styles.timeButtonText}>📅 Date</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.timeButton}
        onPress={() => setShowTimePicker(true)}
      >
        <Text style={styles.timeButtonText}>🕐 Time</Text>
      </TouchableOpacity>
    </View>

    {showDatePicker && (
      <DateTimePicker
        value={new Date(editDate)}
        mode="date"
        display="default"
        onChange={(event, selectedDate) => {
          setShowDatePicker(false);
          if (selectedDate) {
            const current = new Date(editDate);
            selectedDate.setHours(current.getHours(), current.getMinutes());
            setEditDate(selectedDate.toISOString());
          }
        }}
      />
    )}

    {showTimePicker && (
      <DateTimePicker
        value={new Date(editDate)}
        mode="time"
        display="default"
        onChange={(event, selectedTime) => {
          setShowTimePicker(false);
          if (selectedTime) {
            const current = new Date(editDate);
            current.setHours(selectedTime.getHours(), selectedTime.getMinutes());
            setEditDate(current.toISOString());
          }
        }}
      />
    )}
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


        //time date format
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

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardTitle}>{item.category}</Text>
            {item.title && item.title !== "No note" ? (
              <Text style={styles.cardNote}>{item.title}</Text>
            ) : null}
            {item.account ? (
              <Text style={styles.cardAccount}>{item.account}</Text>
            ) : null}
            <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
          </View>
         <Text
            style={[
              styles.cardAmount,
              { color: isTransfer ? "#4F46E5" : isIncome ? "#10B981" : "#EF4444" },
            ]}
          >
            {isTransfer ? "↔" : isIncome ? "+" : "-"} {item.amount.toFixed(2)}
          </Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => startEditing(item)}>
            <Text style={styles.editLink}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id)}>
            <Text style={styles.deleteLink}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
  switch (sortBy) {
    case "date_desc":
      return new Date(b.date) - new Date(a.date);
    case "date_asc":
      return new Date(a.date) - new Date(b.date);
    case "amount_desc":
      return b.amount - a.amount;
    case "amount_asc":
      return a.amount - b.amount;
    case "name_asc":
      return (a.category || "").localeCompare(b.category || "");
    case "name_desc":
      return (b.category || "").localeCompare(a.category || "");
    default:
      return 0;
  }
});

  // Calculate totals
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpenses;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
    <View style={styles.container}>
      <Text style={styles.heading}>Transactions</Text>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: "#ECFDF5" }]}>
          <Text style={styles.summaryLabel}>Income</Text>
          <Text style={[styles.summaryValue, { color: "#10B981" }]}>
            {totalIncome.toFixed(2)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: "#FEF2F2" }]}>
          <Text style={styles.summaryLabel}>Expenses</Text>
          <Text style={[styles.summaryValue, { color: "#EF4444" }]}>
            {totalExpenses.toFixed(2)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: "#EEF2FF" }]}>
          <Text style={styles.summaryLabel}>Balance</Text>
          <Text style={[styles.summaryValue, { color: "#4F46E5" }]}>
            {balance.toFixed(2)}
          </Text>
        </View>
    </View>

    <View style={{ flex: 1, justifyContent: "flex-start" }}>

{/* Sort filters */}
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  style={styles.filterScroll}
  contentContainerStyle={styles.filterRow}
>
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
      style={[styles.filterChip, sortBy === filter.value && styles.filterChipActive]}
      onPress={() => setSortBy(filter.value)}
    >
      <Text
        style={[styles.filterChipText, sortBy === filter.value && styles.filterChipTextActive]}
      >
        {filter.label}
      </Text>
    </TouchableOpacity>
  ))}
</ScrollView>

      {/* Transaction list */}
      {loading ? (
        <Text style={styles.emptyText}>Loading...</Text>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No transactions yet</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate("AddTransaction")}
          >
            <Text style={styles.addButtonText}>Add your first transaction</Text>
          </TouchableOpacity>
        </View>
      ) : (
    <FlatList
    data={sortedTransactions}
    renderItem={renderTransaction}
    keyExtractor={(item) => item.id}
    showsVerticalScrollIndicator={false}
    style={{ flex: 1 }}
    contentContainerStyle={{ paddingBottom: 20 }}
    extraData={{ showDatePicker, showTimePicker, editDate, editingId, editCategory, editAccount, sortBy }}
    />
      )}
      </View>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
  flex: 1,
  backgroundColor: "#fff",
  padding: 16,
  paddingTop: 8,
},
  heading: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#1a1a1a",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
summaryCard: {
  flex: 1,
  padding: 8,
  borderRadius: 10,
  alignItems: "center",
},
summaryLabel: {
  fontSize: 11,
  color: "#555",
  marginBottom: 2,
},
summaryValue: {
  fontSize: 14,
  fontWeight: "bold",
},
  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  cardNote: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: "bold",
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
    marginTop: 8,
  },
    cardAccount: {
    fontSize: 12,
    color: "#4F46E5",
    marginTop: 2,
    fontWeight: "500",
  },
  cardDate: {
    fontSize: 12,
    color: "#aaa",
  },

  editLink: {
    fontSize: 13,
    color: "#4F46E5",
    fontWeight: "500",
  },
  deleteLink: {
    fontSize: 13,
    color: "#EF4444",
    fontWeight: "500",
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
  editActions: {
    flexDirection: "row",
    gap: 10,
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#4F46E5",
    padding: 10,
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
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#555",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#aaa",
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: "#4F46E5",
    padding: 14,
    borderRadius: 12,
    paddingHorizontal: 24,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  editTypeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  editTypeButton: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  editTypeIncome: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
  },
  editTypeExpense: {
    backgroundColor: "#FEF2F2",
    borderColor: "#EF4444",
  },
  editTypeText: {
    fontSize: 14,
    color: "#888",
  },
  editDateText: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginBottom: 6,
    fontWeight: "500",
  },
  timeRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  editCategoryLabel: {
  fontSize: 13,
  fontWeight: "600",
  color: "#555",
  marginBottom: 6,
},
categoryChip: {
  paddingHorizontal: 14,
  paddingVertical: 8,
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
  fontSize: 13,
  color: "#555",
},
categoryChipTextActive: {
  color: "#fff",
  fontWeight: "500",
},
filterScroll: {
  marginHorizontal: -16, // escape the container's 16px padding
  marginTop: 4,
  marginBottom: 12,
  flexGrow: 0,
},
filterRow: {
  flexDirection: "row",
  gap: 8,
  alignItems: "center",
  paddingHorizontal: 16, // re-apply padding inside so first chip aligns with heading
},
filterChip: {
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: "#ddd",
  backgroundColor: "#f9f9f9",
},
filterChipActive: {
  backgroundColor: "#4F46E5",
  borderColor: "#4F46E5",
},
filterChipText: {
  fontSize: 12,
  color: "#555",
  fontWeight: "500",
},
filterChipTextActive: {
  color: "#fff",
  fontWeight: "600",
},
safeArea: {
  flex: 1,
  backgroundColor: "#fff",
  paddingHorizontal: 0,
},
});