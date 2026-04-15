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
  addCategory,
  getCategories,
  deleteCategory,
  initializeDefaultCategories,
} from "../services/firestoreService";

const ICONS = ["🍔", "🏠", "🚗", "💊", "🎓", "🛒", "✈️", "🎮", "💰", "📱", "👕", "⚡", "☕", "🎵", "🐾", "💻"];

export default function CategoriesScreen() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("🛒");
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [])
  );

  const loadCategories = async () => {
    try {
      // This loads defaults only on first run (when no categories exist)
      await initializeDefaultCategories();
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.log("Error loading categories:", error);
    }
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a category name");
      return;
    }

    const exists = categories.some(
      (cat) => cat.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (exists) {
      Alert.alert("Error", "This category already exists");
      return;
    }

    try {
      setLoading(true);
      await addCategory({
        name: name.trim(),
        icon: selectedIcon,
      });
      setName("");
      loadCategories();
    } catch (error) {
      Alert.alert("Error", "Failed to add category");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id, catName) => {
    Alert.alert("Delete Category", `Delete "${catName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCategory(id);
            setCategories((prev) => prev.filter((c) => c.id !== id));
          } catch (error) {
            Alert.alert("Error", "Failed to delete");
          }
        },
      },
    ]);
  };

  const renderCategory = ({ item }) => (
    <View style={styles.categoryCard}>
      <View style={styles.categoryLeft}>
        <Text style={styles.categoryIcon}>{item.icon}</Text>
        <Text style={styles.categoryName}>{item.name}</Text>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}>
        <Text style={styles.deleteLink}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Categories</Text>

      {/* Add custom category */}
      <Text style={styles.label}>Add a new category</Text>

      {/* Icon picker */}
      <View style={styles.iconGrid}>
        {ICONS.map((icon) => (
          <TouchableOpacity
            key={icon}
            style={[
              styles.iconButton,
              selectedIcon === icon && styles.iconButtonActive,
            ]}
            onPress={() => setSelectedIcon(icon)}
          >
            <Text style={styles.iconText}>{icon}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Name input */}
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="e.g. Subscriptions"
          placeholderTextColor="#9CA3AF" 
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

      {/* Category list */}
      <Text style={styles.listHeading}>
        Your categories ({categories.length})
      </Text>

      {categories.length === 0 ? (
        <Text style={styles.emptyText}>Loading categories...</Text>
      ) : (
        <FlatList
          data={categories}
          renderItem={renderCategory}
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
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9f9f9",
  },
  iconButtonActive: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  iconText: {
    fontSize: 20,
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
  categoryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    marginBottom: 8,
  },
  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  categoryIcon: {
    fontSize: 22,
  },
  categoryName: {
    fontSize: 16,
    color: "#1a1a1a",
    fontWeight: "500",
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
});