import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  getBudgets,
  setBudget,
  deleteBudget,
  getCategories,
  getTransactions,
} from "../services/firestoreService";

export default function BudgetScreen() {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [spending, setSpending] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const [budgetData, categoryData, transactionData] = await Promise.all([
        getBudgets(),
        getCategories(),
        getTransactions(),
      ]);

      setBudgets(budgetData);
      setCategories(categoryData);

      // Calculate spending per category for current month
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const monthlySpending = {};
      transactionData
        .filter((t) => {
          if (t.type !== "expense" || !t.date) return false;
          const d = new Date(t.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .forEach((t) => {
          monthlySpending[t.category] =
            (monthlySpending[t.category] || 0) + t.amount;
        });

      setSpending(monthlySpending);

      if (categoryData.length > 0 && !selectedCategory) {
        setSelectedCategory(categoryData[0].name);
      }
    } catch (error) {
      console.log("Error loading data:", error);
    }
  };

  const handleAddBudget = async () => {
    if (!selectedCategory) {
      Alert.alert("Error", "Please select a category");
      return;
    }

    if (!limitAmount || isNaN(parseFloat(limitAmount)) || parseFloat(limitAmount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    // Check if budget already exists for this category
    const exists = budgets.some((b) => b.category === selectedCategory);
    if (exists) {
      Alert.alert("Error", "Budget already set for this category. Delete the old one first.");
      return;
    }

    try {
      setLoading(true);
      await setBudget({
        category: selectedCategory,
        limit: parseFloat(limitAmount),
      });
      setLimitAmount("");
      loadData();
    } catch (error) {
      Alert.alert("Error", "Failed to set budget");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id, category) => {
    Alert.alert("Delete Budget", `Remove budget for "${category}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteBudget(id);
            setBudgets((prev) => prev.filter((b) => b.id !== id));
          } catch (error) {
            Alert.alert("Error", "Failed to delete");
          }
        },
      },
    ]);
  };

  const renderBudget = ({ item }) => {
    const spent = spending[item.category] || 0;
    const percentage = Math.min((spent / item.limit) * 100, 100);
    const isOver = spent > item.limit;
    const isWarning = percentage >= 80 && !isOver;

    let barColor = "#4F46E5";
    if (isOver) barColor = "#EF4444";
    else if (isWarning) barColor = "#F59E0B";

    return (
      <View style={styles.budgetCard}>
        <View style={styles.budgetTop}>
          <Text style={styles.budgetCategory}>{item.category}</Text>
          <TouchableOpacity onPress={() => handleDelete(item.id, item.category)}>
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

        {/* Progress bar */}
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
    <View style={styles.container}>
      <Text style={styles.heading}>Budgets</Text>

      {/* Category selector */}
      <Text style={styles.label}>Category</Text>
      {categories.length > 0 ? (
        <View style={styles.chipRow}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.chip,
                selectedCategory === cat.name && styles.chipActive,
              ]}
              onPress={() => setSelectedCategory(cat.name)}
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
        </View>
      ) : (
        <Text style={styles.emptyText}>Add categories first</Text>
      )}

      {/* Limit input */}
      <Text style={styles.label}>Monthly limit</Text>
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
        <FlatList
          data={budgets}
          renderItem={renderBudget}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
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
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
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
});
