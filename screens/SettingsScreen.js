import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { getSettings, saveSettings } from "../services/firestoreService";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";

export default function SettingsScreen({ navigation }) {
  const { colors, themeMode, changeTheme } = useTheme();
  const [threshold, setThreshold] = useState("90");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getSettings();
      setThreshold(String(data.budgetAlertThreshold || 90));
    } catch (error) {
      console.log("Error loading settings:", error);
    }
  };

  const handleSaveThreshold = async () => {
    const value = parseInt(threshold);
    if (isNaN(value) || value < 1 || value > 100) {
      if (Platform.OS === "web") {
        window.alert("Please enter a value between 1 and 100");
      } else {
        Alert.alert("Error", "Please enter a value between 1 and 100");
      }
      return;
    }

    try {
      setSaving(true);
      await saveSettings({ budgetAlertThreshold: value });
      setSuccess("Settings saved!");
      setTimeout(() => setSuccess(""), 2000);
    } catch (error) {
      console.log("Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.log("Logout error:", error);
    }
  };

  const s = dynamicStyles(colors);

  return (
    <ScrollView
      style={s.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.heading}>Settings</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Account info */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Account</Text>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Email</Text>
          <Text style={s.infoValue}>{auth.currentUser?.email}</Text>
        </View>
      </View>

      {/* Theme */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Appearance</Text>
        <View style={s.themeRow}>
          {[
            { label: "Light", value: "light", icon: "☀️" },
            { label: "Dark", value: "dark", icon: "🌙" },
            { label: "System", value: "system", icon: "⚙️" },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                s.themeChip,
                themeMode === opt.value && s.themeChipActive,
              ]}
              onPress={() => changeTheme(opt.value)}
            >
              <Text style={s.themeIcon}>{opt.icon}</Text>
              <Text
                style={[
                  s.themeChipText,
                  themeMode === opt.value && s.themeChipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Budget alert threshold */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Budget Alerts</Text>
        <Text style={s.description}>
          Get notified when spending reaches this percentage of your budget limit.
        </Text>
        <View style={s.thresholdRow}>
          <TextInput
            style={s.thresholdInput}
            value={threshold}
            onChangeText={setThreshold}
            keyboardType="number-pad"
            maxLength={3}
          />
          <Text style={s.percentSign}>%</Text>
          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSaveThreshold}
            disabled={saving}
          >
            <Text style={s.saveBtnText}>{saving ? "Saving..." : "Save"}</Text>
          </TouchableOpacity>
        </View>

        {/* Quick presets */}
        <View style={s.presetRow}>
          {[50, 75, 80, 90].map((val) => (
            <TouchableOpacity
              key={val}
              style={[
                s.presetChip,
                parseInt(threshold) === val && s.presetChipActive,
              ]}
              onPress={() => setThreshold(String(val))}
            >
              <Text
                style={[
                  s.presetText,
                  parseInt(threshold) === val && s.presetTextActive,
                ]}
              >
                {val}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {success ? <Text style={s.successText}>{success}</Text> : null}
      </View>

      {/* Logout */}
      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Text style={s.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const dynamicStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      padding: 20,
      paddingTop: 60,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 24,
    },
    backBtn: {
      fontSize: 15,
      color: colors.primary,
      fontWeight: "600",
    },
    heading: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
    },
    section: {
      marginBottom: 28,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
    },
    description: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 12,
      lineHeight: 18,
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 14,
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
    },
    infoLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    infoValue: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "500",
    },
    themeRow: {
      flexDirection: "row",
      gap: 10,
    },
    themeChip: {
      flex: 1,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderDark,
      alignItems: "center",
      backgroundColor: colors.bgSecondary,
      gap: 6,
    },
    themeChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.balanceBg,
    },
    themeIcon: {
      fontSize: 22,
    },
    themeChipText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    themeChipTextActive: {
      color: colors.primary,
      fontWeight: "600",
    },
    thresholdRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    thresholdInput: {
      borderWidth: 1,
      borderColor: colors.borderDark,
      borderRadius: 12,
      padding: 12,
      fontSize: 18,
      fontWeight: "600",
      textAlign: "center",
      width: 70,
      backgroundColor: colors.inputBg,
      color: colors.text,
    },
    percentSign: {
      fontSize: 18,
      color: colors.textSecondary,
      fontWeight: "600",
    },
    saveBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      marginLeft: 8,
    },
    saveBtnText: {
      color: "#fff",
      fontWeight: "600",
      fontSize: 14,
    },
    presetRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
    },
    presetChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.borderDark,
      backgroundColor: colors.bgSecondary,
    },
    presetChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    presetText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    presetTextActive: {
      color: "#fff",
      fontWeight: "600",
    },
    successText: {
      color: colors.income,
      fontSize: 13,
      fontWeight: "500",
      marginTop: 10,
    },
    logoutBtn: {
      borderWidth: 1,
      borderColor: "#EF4444",
      padding: 14,
      borderRadius: 12,
      alignItems: "center",
      marginTop: 10,
    },
    logoutText: {
      color: "#EF4444",
      fontSize: 15,
      fontWeight: "600",
    },
  });