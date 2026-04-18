import React, { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useFocusEffect} from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";

import {
  getBudgets,
  setBudget,
  deleteBudget,
  getCategories,
  getTransactions,
} from "../services/firestoreService";

const PERIOD_OPTIONS = [
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
  { label: "Custom", value: "custom" },
];

export default function BudgetScreen({ navigation }) {
  const [budgets, setBudgets] = useState([]);
  const [budgetName, setBudgetName] = useState("");
  const [categories, setCategories] = useState([]);
  const [spending, setSpending] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [limitAmount, setLimitAmount] = useState("");
  const [budgetPeriod, setBudgetPeriod] = useState(null);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

    const getDateRange = (period, customStart, customEnd) => {
      const now = new Date();

      if (period === "weekly") {
        const day = now.getDay();
        const start = new Date(now);
        start.setDate(now.getDate() - day);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }

      if (period === "monthly") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start, end };
      }

      if (period === "yearly") {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        return { start, end };
      }

      if (period === "custom" && customStart && customEnd) {
        return {
          start: new Date(customStart + "T00:00:00"),
          end: new Date(customEnd + "T23:59:59"),
        };
      }

      return null;
    };

const loadData = async () => {
  try {
    const [budgetData, categoryData, transactionData] = await Promise.all([
      getBudgets(),
      getCategories(),
      getTransactions(),
    ]);

    setBudgets(budgetData);
    setCategories(categoryData);

    const spendingByBudget = {};

    budgetData.forEach((budget) => {
      const range = getDateRange(
        budget.period || "monthly",
        budget.customStart || "",
        budget.customEnd || ""
      );
      if (!range) {
        spendingByBudget[budget.id] = 0;
        return;
      }

      const cat = budget.category || "";

      let total = 0;
      for (const t of transactionData) {
        if (t.type !== "expense") continue;
        if (!t.date) continue;
        const d = new Date(t.date);
        if (d < range.start || d > range.end) continue;
        if (cat && t.category !== cat) continue;
        total += t.amount;
      }

      spendingByBudget[budget.id] = total;
    });

    setSpending(spendingByBudget);
  } catch (error) {
    console.log("Error loading data:", error);
  }
};

const handleAddBudget = async () => {
  setError("");

  if (!budgetName.trim()) {
    setError("Please enter a budget name");
    return;
  }

  if (!budgetPeriod) {
    setError("Please select a budget period");
    return;
  }

  if (budgetPeriod === "custom" && (!customStart || !customEnd)) {
    setError("Please select start and end dates");
    return;
  }

  if (budgetPeriod === "custom" && new Date(customStart) >= new Date(customEnd)) {
    setError("End date must be after start date");
    return;
  }

  if (!limitAmount || isNaN(parseFloat(limitAmount)) || parseFloat(limitAmount) <= 0) {
    setError("Please enter a valid amount");
    return;
  }

  const exists = budgets.some(
    (b) => b.name && b.name.toLowerCase() === budgetName.trim().toLowerCase()
  );
  if (exists) {
    setError("A budget with this name already exists");
    return;
  }

  try {
    setLoading(true);
    await setBudget({
      name: budgetName.trim(),
      category: selectedCategory || "",
      limit: parseFloat(limitAmount),
      period: budgetPeriod,
      customStart: budgetPeriod === "custom" ? customStart : "",
      customEnd: budgetPeriod === "custom" ? customEnd : "",
    });
    setLimitAmount("");
    setBudgetName("");
    setSelectedCategory(null);
    setBudgetPeriod(null);
    setCustomStart("");
    setCustomEnd("");
    loadData();
  } catch (err) {
    setError("Failed to set budget");
  } finally {
    setLoading(false);
  }
};

const handleDelete = (id, category) => {
  if (Platform.OS === "web") {
    const confirmed = window.confirm(`Remove budget for "${category}"?`);
    if (confirmed) {
      performDelete(id);
    }
  } else {
    Alert.alert("Delete Budget", `Remove budget for "${category}"?`, [
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
    await deleteBudget(id);
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  } catch (error) {
    console.log("Delete error:", error);
  }
};

const renderBudget = ({ item }) => {
  const spent = spending[item.id] || 0;
  const percentage = Math.min((spent / item.limit) * 100, 100);
  const isOver = spent > item.limit;
  const isWarning = percentage >= 80 && !isOver;

  let barColor = "#4F46E5";
  if (isOver) barColor = "#EF4444";
  else if (isWarning) barColor = "#F59E0B";

  const periodLabel = item.period === "custom"
    ? `${item.customStart} → ${item.customEnd}`
    : item.period
      ? item.period.charAt(0).toUpperCase() + item.period.slice(1)
      : "Monthly";

  return (
    <View style={styles.budgetCard}>
      <View style={styles.budgetTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.budgetCategory}>{item.name || item.category}</Text>
          <Text style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
            {periodLabel}{item.category ? ` · ${item.category}` : ""}
          </Text>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id, item.name || item.category)}>
          <Text style={styles.deleteLink}>Delete</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.budgetNumbers}>
        <Text style={styles.budgetSpent}>
          Spent:{" "}
          <Text style={{ color: isOver ? "#EF4444" : "#1a1a1a" }}>
            {spent.toFixed(2)}
          </Text>
        </Text>
        <Text style={styles.budgetLimit}>Limit: {item.limit.toFixed(2)}</Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${percentage}%`, backgroundColor: barColor },
          ]}
        />
      </View>

      {isWarning && (
        <Text style={styles.warningText}>
          ⚠️ You've used {Math.round(percentage)}% of this budget
        </Text>
      )}
      {isOver && (
        <Text style={styles.overText}>
          🚨 Over budget by {(spent - item.limit).toFixed(2)}
        </Text>
      )}
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
    <Text style={styles.heading}>Budgets</Text>

    {/* Budget name */}
    <Text style={styles.label}>Budget name</Text>
    <TextInput
      style={[styles.input, { marginBottom: 12 }]}
      placeholder="e.g. Monthly Groceries, Travel Fund"
      placeholderTextColor="#9CA3AF"
      value={budgetName}
      onChangeText={(text) => {
        setBudgetName(text);
        setError("");
      }}
    />

    {/* Category selector (optional) */}
    <Text style={styles.label}>Category (optional)</Text>
    {categories.length > 0 ? (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryGrid}
      >
        <TouchableOpacity
          style={styles.addChip}
          onPress={() => navigation.navigate("Categories")}
        >
          <Text style={styles.addChipText}>+ New</Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.chip,
              selectedCategory === cat.name && styles.chipActive,
            ]}
            onPress={() =>
              setSelectedCategory(
                selectedCategory === cat.name ? null : cat.name
              )
            }
          >
            <Text
              style={[
                styles.chipText,
                selectedCategory === cat.name && styles.chipTextActive,
              ]}
            >
              {cat.icon} {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    ) : (
      <Text style={styles.emptyText}>Add categories first</Text>
    )}

      {/* Period selector */}
    <Text style={styles.label}>Budget period</Text>
    <View style={styles.periodRow}>
      {PERIOD_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.periodChip,
            budgetPeriod === opt.value && styles.periodChipActive,
          ]}
          onPress={() => {
            setBudgetPeriod(opt.value);
            if (opt.value !== "custom") {
              setCustomStart("");
              setCustomEnd("");
            }
          }}
        >
          <Text
            style={[
              styles.periodChipText,
              budgetPeriod === opt.value && styles.periodChipTextActive,
            ]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>

 {budgetPeriod === "custom" && (
      Platform.OS === "web" ? (
        <View style={styles.dateRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateLabel}>Start</Text>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1px solid #ddd",
                fontSize: 14,
                backgroundColor: "#f9f9f9",
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateLabel}>End</Text>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1px solid #ddd",
                fontSize: 14,
                backgroundColor: "#f9f9f9",
              }}
            />
          </View>
        </View>
      ) : (
        <View style={styles.dateRow}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowStartPicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {customStart ? `Start: ${customStart}` : "📅 Pick start date"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowEndPicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {customEnd ? `End: ${customEnd}` : "📅 Pick end date"}
            </Text>
          </TouchableOpacity>
        </View>
      )
    )}

    {Platform.OS !== "web" && showStartPicker && (
      <DateTimePicker
        value={customStart ? new Date(customStart) : new Date()}
        mode="date"
        display="default"
        onChange={(event, date) => {
          setShowStartPicker(false);
          if (date) setCustomStart(date.toISOString().split("T")[0]);
        }}
      />
    )}

    {Platform.OS !== "web" && showEndPicker && (
      <DateTimePicker
        value={customEnd ? new Date(customEnd) : new Date()}
        mode="date"
        display="default"
        onChange={(event, date) => {
          setShowEndPicker(false);
          if (date) setCustomEnd(date.toISOString().split("T")[0]);
        }}
      />
    )}

    {/* Limit input */}
    <Text style={styles.label}>Limit</Text>
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
    <View style={styles.addRow}>
      <TextInput
        style={styles.input}
        placeholder="e.g. 500"
        placeholderTextColor="#9CA3AF"
        value={limitAmount}
        onChangeText={setLimitAmount}
        keyboardType="decimal-pad"
      />
      <TouchableOpacity
        style={[styles.addButton, loading && { opacity: 0.6 }]}
        onPress={handleAddBudget}
        disabled={loading}
      >
        <Text style={styles.addButtonText}>Set</Text>
      </TouchableOpacity>
    </View>

    {/* Budget list */}
    <Text style={styles.listHeading}>
      Your budgets ({budgets.length})
    </Text>

    {budgets.length === 0 ? (
      <Text style={styles.emptyText}>No budgets set yet</Text>
    ) : (
      budgets.map((item) => (
        <View key={item.id}>{renderBudget({ item })}</View>
      ))
    )}

  </ScrollView>
  </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    padding: 24,
    paddingTop: 60,
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#1a1a1a",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginBottom: 8,
    marginTop: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9",
  },
  chipActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  chipText: {
    fontSize: 13,
    color: "#555",
  },
  chipTextActive: {
    color: "#fff",
    fontWeight: "500",
  },
  addRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
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
  categoryScroll: {
  maxHeight: 88,
  marginBottom: 8,
  flexGrow: 0,
},
categoryGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
  maxHeight: 88,
},
addChip: {
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: "#4F46E5",
  borderStyle: "dashed",
  backgroundColor: "#EEF2FF",
},
addChipText: {
  fontSize: 13,
  color: "#4F46E5",
  fontWeight: "600",
},
  addButton: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 24,
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
  budgetCard: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  budgetTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  budgetCategory: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  deleteLink: {
    fontSize: 13,
    color: "#EF4444",
    fontWeight: "500",
  },
  budgetNumbers: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  budgetSpent: {
    fontSize: 13,
    color: "#555",
  },
  budgetLimit: {
    fontSize: 13,
    color: "#555",
  },
  progressTrack: {
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  warningText: {
    fontSize: 12,
    color: "#F59E0B",
    marginTop: 6,
  },
  overText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 6,
  },
  emptyText: {
    fontSize: 14,
    color: "#aaa",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 12,
  },
  errorText: {
  color: "#EF4444",
  fontSize: 13,
  fontWeight: "500",
  marginBottom: 8,
},
periodRow: {
  flexDirection: "row",
  gap: 8,
  marginBottom: 12,
},
periodChip: {
  flex: 1,
  padding: 10,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#ddd",
  alignItems: "center",
  backgroundColor: "#f9f9f9",
},
periodChipActive: {
  backgroundColor: "#4F46E5",
  borderColor: "#4F46E5",
},
periodChipText: {
  fontSize: 13,
  color: "#555",
  fontWeight: "500",
},
periodChipTextActive: {
  color: "#fff",
  fontWeight: "600",
},
dateRow: {
  flexDirection: "row",
  gap: 10,
  marginBottom: 12,
},
dateLabel: {
  fontSize: 12,
  color: "#555",
  fontWeight: "500",
  marginBottom: 4,
},
dateButton: {
  flex: 1,
  padding: 12,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#ddd",
  backgroundColor: "#f9f9f9",
  alignItems: "center",
},
dateButtonText: {
  fontSize: 13,
  color: "#555",
},
});
