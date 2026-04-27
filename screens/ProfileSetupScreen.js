import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  FlatList,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { COUNTRIES, useUser } from "../context/UserContext";
import { createUserProfile } from "../services/firestoreService";

export default function ProfileSetupScreen() {
  const { colors } = useTheme();
  const { refreshProfile } = useUser();
  const [name, setName] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filteredCountries = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.currency.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const handleSave = async () => {
    setError("");
    if (!name.trim()) { setError("Please enter your name"); return; }
    if (!selectedCountry) { setError("Please select your country"); return; }

    try {
      setLoading(true);
      await createUserProfile({
        name: name.trim(),
        country: selectedCountry.name,
        countryCode: selectedCountry.code,
        currency: selectedCountry.currency,
        currencySymbol: selectedCountry.symbol,
      });
      await refreshProfile();
    } catch (err) {
      setError("Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[s.container, { backgroundColor: colors.bg }]} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={[s.emoji]}>👋</Text>
      <Text style={[s.title, { color: colors.text }]}>Welcome to FinManager</Text>
      <Text style={[s.subtitle, { color: colors.textMuted }]}>Let's set up your profile to get started</Text>

      <Text style={[s.label, { color: colors.textSecondary }]}>What's your name?</Text>
      <TextInput
        style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]}
        placeholder="e.g. John"
        placeholderTextColor={colors.textMuted}
        value={name}
        onChangeText={(t) => { setName(t); setError(""); }}
      />

      <Text style={[s.label, { color: colors.textSecondary }]}>Select your country & currency</Text>
      <TouchableOpacity
        style={[s.countrySelector, { backgroundColor: colors.inputBg, borderColor: colors.borderDark }]}
        onPress={() => setShowCountryPicker(true)}
      >
        <Text style={[s.countrySelectorText, { color: selectedCountry ? colors.text : colors.textMuted }]}>
          {selectedCountry
            ? `${selectedCountry.name} (${selectedCountry.symbol} ${selectedCountry.currency})`
            : "Tap to select country"}
        </Text>
      </TouchableOpacity>

      {error ? <Text style={[s.errorText, { color: colors.expense }]}>{error}</Text> : null}

      <TouchableOpacity
        style={[s.button, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={loading}
      >
        <Text style={s.buttonText}>{loading ? "Saving..." : "Continue"}</Text>
      </TouchableOpacity>

      <Modal visible={showCountryPicker} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Select Country</Text>

            <TextInput
              style={[s.searchInput, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]}
              placeholder="Search country or currency..."
              placeholderTextColor={colors.textMuted}
              value={countrySearch}
              onChangeText={setCountrySearch}
            />

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.countryItem, { borderBottomColor: colors.border }, selectedCountry?.code === item.code && { backgroundColor: colors.balanceBg }]}
                  onPress={() => { setSelectedCountry(item); setShowCountryPicker(false); setCountrySearch(""); setError(""); }}
                >
                  <View>
                    <Text style={[s.countryName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[s.countryCurrency, { color: colors.textMuted }]}>{item.symbol} {item.currency}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity style={[s.closeBtn, { borderColor: colors.borderDark }]} onPress={() => { setShowCountryPicker(false); setCountrySearch(""); }}>
              <Text style={[s.closeBtnText, { color: colors.textSecondary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { justifyContent: "center", padding: 24, paddingTop: 80, paddingBottom: 40 },
  emoji: { fontSize: 48, textAlign: "center", marginBottom: 16 },
  title: { fontSize: 26, fontWeight: "bold", textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 15, textAlign: "center", marginBottom: 32 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
  countrySelector: { borderWidth: 1, borderRadius: 12, padding: 14 },
  countrySelectorText: { fontSize: 16 },
  button: { padding: 16, borderRadius: 12, alignItems: "center", marginTop: 32 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  errorText: { fontSize: 13, fontWeight: "500", marginTop: 12, textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { borderRadius: 16, padding: 20, maxHeight: "80%" },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  searchInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, marginBottom: 12 },
  countryItem: { padding: 14, borderBottomWidth: 1 },
  countryName: { fontSize: 15, fontWeight: "500" },
  countryCurrency: { fontSize: 13, marginTop: 2 },
  closeBtn: { padding: 14, borderRadius: 12, alignItems: "center", marginTop: 12, borderWidth: 1 },
  closeBtnText: { fontSize: 15, fontWeight: "500" },
});