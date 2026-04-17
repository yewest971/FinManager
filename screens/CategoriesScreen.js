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
import { useFocusEffect } from "@react-navigation/native";
import EmojiPicker from "rn-emoji-keyboard";
import {
  addCategory,
  getCategories,
  deleteCategory,
  syncDefaultCategories,
  trackDeletedDefault,
  DEFAULT_CATEGORIES,
} from "../services/firestoreService";

export default function CategoriesScreen() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [])
  );

  const loadCategories = async () => {
    try {
      // This loads defaults only on first run (when no categories exist)
      await syncDefaultCategories();
      const data = await getCategories();
      data.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(data);
    } catch (error) {
      console.log("Error loading categories:", error);
    }
  };

const handleAdd = async () => {
  if (!selectedIcon) {
    setError("Please select an icon for the category");
    return;
  }

  if (!name.trim()) {
    setError("Please enter a category name");
    return;
  }

  const exists = categories.some(
    (cat) => cat.name.toLowerCase() === name.trim().toLowerCase()
  );
  if (exists) {
    setError("This category already exists");
    return;
  }

  try {
    setError("");
    setLoading(true);
    await addCategory({
      name: name.trim(),
      icon: selectedIcon,
    });
    setName("");
    setSelectedIcon("");
    loadCategories();
  } catch (err) {
    setError("Failed to add category");
  } finally {
    setLoading(false);
  }
};

const handleDelete = (id, catName) => {
  if (Platform.OS === "web") {
    const confirmed = window.confirm(`Delete "${catName}"?`);
    if (confirmed) {
      performDelete(id, catName);
    }
  } else {
    Alert.alert("Delete Category", `Delete "${catName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => performDelete(id, catName),
      },
    ]);
  }
};

const performDelete = async (id, catName) => {
  try {
    await deleteCategory(id);

    const isDefault = DEFAULT_CATEGORIES.some(
      (c) => c.name.toLowerCase() === catName.toLowerCase()
    );
    if (isDefault) {
      await trackDeletedDefault(catName);
    }

    setCategories((prev) => prev.filter((c) => c.id !== id));
  } catch (error) {
    setError("Failed to delete category");
  }
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
    <Text style={styles.heading}>Categories</Text>

    {/* Add custom category */}
    <Text style={styles.label}>Add a new category</Text>

    {/* Emoji picker */}
    <TouchableOpacity
      style={styles.emojiPickerButton}
      onPress={() => setShowEmojiPicker(true)}
    >
      <Text style={styles.emojiPickerEmoji}>{selectedIcon || "➕"}</Text>
      <Text style={styles.emojiPickerLabel}>{selectedIcon ? "Tap to change icon" : "Tap to select icon"}</Text>
    </TouchableOpacity>

    <EmojiPicker
      onEmojiSelected={(emoji) => {
        setSelectedIcon(emoji.emoji);
        setShowEmojiPicker(false);
        setError("");
      }}
      open={showEmojiPicker}
      onClose={() => setShowEmojiPicker(false)}
    />

    {/* Name input */}
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
    <View style={styles.addRow}>
      <TextInput
        style={styles.input}
        placeholder="e.g. Subscriptions"
        placeholderTextColor="#9CA3AF"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setError("");
        }}
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
      Categories ({categories.length})
    </Text>

    {categories.length === 0 ? (
      <Text style={styles.emptyText}>Loading categories...</Text>
    ) : (
      categories.map((item) => (
        <View key={item.id}>{renderCategory({ item })}</View>
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
  emojiPickerButton: {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  padding: 12,
  borderWidth: 1,
  borderColor: "#ddd",
  borderRadius: 12,
  backgroundColor: "#f9f9f9",
  marginBottom: 12,
},
emojiPickerEmoji: {
  fontSize: 32,
},
emojiPickerLabel: {
  fontSize: 14,
  color: "#888",
},
errorText: {
  color: "#EF4444",
  fontSize: 13,
  marginBottom: 8,
  fontWeight: "500",
},
});