    import React, { useState, useCallback } from "react";
    import {
      View,
      ScrollView,
      Text,
      TextInput,
      TouchableOpacity,
      StyleSheet,
      Alert,
      Platform,
      KeyboardAvoidingView,
    } from "react-native";
    import { useFocusEffect } from "@react-navigation/native";
    import EmojiPicker from "rn-emoji-keyboard";
    import { useTheme } from "../context/ThemeContext";
    import {
      addCategory,
      getCategories,
      deleteCategory,
      syncDefaultCategories,
      trackDeletedDefault,
      DEFAULT_CATEGORIES,
    } from "../services/firestoreService";

    export default function CategoriesScreen({ navigation }) {
      const { colors } = useTheme();
      const [categories, setCategories] = useState([]);
      const [name, setName] = useState("");
      const [selectedIcon, setSelectedIcon] = useState("");
      const [loading, setLoading] = useState(false);
      const [showEmojiPicker, setShowEmojiPicker] = useState(false);
      const [error, setError] = useState("");

      useFocusEffect(useCallback(() => { loadCategories(); }, []));

      const loadCategories = async () => {
        try {
          await syncDefaultCategories();
          const data = await getCategories();
          data.sort((a, b) => a.name.localeCompare(b.name));
          setCategories(data);
        } catch (error) {
          console.log("Error loading categories:", error);
        }
      };

      const handleAdd = async () => {
        if (!selectedIcon) { setError("Please select an icon for the category"); return; }
        if (!name.trim()) { setError("Please enter a category name"); return; }
        const exists = categories.some((cat) => cat.name.toLowerCase() === name.trim().toLowerCase());
        if (exists) { setError("This category already exists"); return; }

        try {
          setError("");
          setLoading(true);
          await addCategory({ name: name.trim(), icon: selectedIcon });
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
          if (window.confirm(`Delete "${catName}"?`)) performDelete(id, catName);
        } else {
          Alert.alert("Delete Category", `Delete "${catName}"?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => performDelete(id, catName) },
          ]);
        }
      };

      const performDelete = async (id, catName) => {
        try {
          await deleteCategory(id);
          const isDefault = DEFAULT_CATEGORIES.some((c) => c.name.toLowerCase() === catName.toLowerCase());
          if (isDefault) await trackDeletedDefault(catName);
          setCategories((prev) => prev.filter((c) => c.id !== id));
        } catch (error) {
          setError("Failed to delete category");
        }
      };

      const renderCategory = ({ item }) => (
        <View style={[s.categoryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.categoryLeft}>
            <Text style={s.categoryIcon}>{item.icon}</Text>
            <Text style={[s.categoryName, { color: colors.text }]}>{item.name}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}>
            <Text style={s.deleteLink}>Delete</Text>
          </TouchableOpacity>
        </View>
      );

      return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : "undefined"}>
          <ScrollView style={[s.container, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>

            <View style={s.headerRow}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={[s.backBtn, { color: colors.primary }]}>← Back</Text>
              </TouchableOpacity>
              <Text style={[s.heading, { color: colors.text }]}>Categories</Text>
              <View style={{ width: 50 }} />
            </View>

            <Text style={[s.label, { color: colors.textSecondary }]}>Add a new category</Text>

            <TouchableOpacity style={[s.emojiPickerButton, { borderColor: colors.borderDark, backgroundColor: colors.inputBg }]} onPress={() => setShowEmojiPicker(true)}>
              <Text style={s.emojiPickerEmoji}>{selectedIcon || "➕"}</Text>
              <Text style={[s.emojiPickerLabel, { color: colors.textMuted }]}>{selectedIcon ? "Tap to change icon" : "Tap to select icon"}</Text>
            </TouchableOpacity>

            <EmojiPicker
              onEmojiSelected={(emoji) => { setSelectedIcon(emoji.emoji); setShowEmojiPicker(false); setError(""); }}
              open={showEmojiPicker}
              onClose={() => setShowEmojiPicker(false)}
            />

            {error ? <Text style={[s.errorText, { color: colors.expense }]}>{error}</Text> : null}
            <View style={s.addRow}>
              <TextInput style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]} placeholder="e.g. Subscriptions" placeholderTextColor={colors.textMuted} value={name} onChangeText={(t) => { setName(t); setError(""); }} />
              <TouchableOpacity style={[s.addButton, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]} onPress={handleAdd} disabled={loading}>
                <Text style={s.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            <Text style={[s.listHeading, { color: colors.text }]}>Categories ({categories.length})</Text>

            {categories.length === 0 ? (
              <Text style={[s.emptyText, { color: colors.textMuted }]}>Loading categories...</Text>
            ) : (
              categories.map((item) => <View key={item.id}>{renderCategory({ item })}</View>)
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      );
    }

    const s = StyleSheet.create({
      container: { padding: 24, paddingTop: 60 },
      headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
      backBtn: { fontSize: 15, fontWeight: "600" },
      heading: { fontSize: 20, fontWeight: "bold" },
      label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
      emojiPickerButton: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderWidth: 1, borderRadius: 12, marginBottom: 12 },
      emojiPickerEmoji: { fontSize: 32 },
      emojiPickerLabel: { fontSize: 14 },
      addRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
      input: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
      addButton: { paddingHorizontal: 20, borderRadius: 12, justifyContent: "center" },
      addButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
      listHeading: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
      categoryCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderWidth: 1, borderRadius: 12, marginBottom: 8 },
      categoryLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
      categoryIcon: { fontSize: 22 },
      categoryName: { fontSize: 16, fontWeight: "500" },
      deleteLink: { fontSize: 13, color: "#EF4444", fontWeight: "500" },
      errorText: { fontSize: 13, fontWeight: "500", marginBottom: 8 },
      emptyText: { fontSize: 14, textAlign: "center", marginTop: 20 },
    });