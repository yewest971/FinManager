      import React, { useState } from "react";
      import {
        View,
        Text,
        TextInput,
        TouchableOpacity,
        StyleSheet,
        Alert,
        ActivityIndicator,
        ScrollView,
        Modal,
        FlatList,
      } from "react-native";
      import { createUserWithEmailAndPassword } from "firebase/auth";
      import { auth } from "../config/firebase";
      import { createUserProfile } from "../services/firestoreService";
      import { useTheme } from "../context/ThemeContext";
      import { COUNTRIES, useUser } from "../context/UserContext";

      export default function SignUpScreen({ navigation }) {
        const { colors } = useTheme();
        const { refreshProfile } = useUser();
        const [name, setName] = useState("");
        const [email, setEmail] = useState("");
        const [password, setPassword] = useState("");
        const [confirmPassword, setConfirmPassword] = useState("");
        const [selectedCountry, setSelectedCountry] = useState(null);
        const [showCountryPicker, setShowCountryPicker] = useState(false);
        const [countrySearch, setCountrySearch] = useState("");
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState("");

        const filteredCountries = COUNTRIES.filter((c) =>
          c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
          c.currency.toLowerCase().includes(countrySearch.toLowerCase())
        );

        const handleSignUp = async () => {
          setError("");
          if (!name.trim()) { setError("Please enter your name"); return; }
          if (!email) { setError("Please enter your email"); return; }
          if (!selectedCountry) { setError("Please select your country"); return; }
          if (!password) { setError("Please enter a password"); return; }
          if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
          if (password !== confirmPassword) { setError("Passwords do not match"); return; }

          try {
            setLoading(true);
            await createUserWithEmailAndPassword(auth, email, password);

            await createUserProfile({
              name: name.trim(),
              country: selectedCountry.name,
              countryCode: selectedCountry.code,
              currency: selectedCountry.currency,
              currencySymbol: selectedCountry.symbol,
            });

            await refreshProfile();
          } catch (error) {
            let message = "Something went wrong";
            if (error.code === "auth/email-already-in-use") message = "This email is already registered";
            else if (error.code === "auth/invalid-email") message = "Please enter a valid email";
            setError(message);
          } finally {
            setLoading(false);
          }
        };

        return (
          <ScrollView style={[st.container, { backgroundColor: colors.bg }]} contentContainerStyle={st.content} keyboardShouldPersistTaps="handled">
            <Text style={[st.title, { color: colors.text }]}>Create Account</Text>
            <Text style={[st.subtitle, { color: colors.textMuted }]}>Start managing your finances</Text>

            <Text style={[st.label, { color: colors.textSecondary }]}>Full name</Text>
            <TextInput
              style={[st.input, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]}
              placeholder="e.g. John"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={(t) => { setName(t); setError(""); }}
            />

            <Text style={[st.label, { color: colors.textSecondary }]}>Email</Text>
            <TextInput
              style={[st.input, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]}
              placeholder="email@example.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={(t) => { setEmail(t); setError(""); }}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[st.label, { color: colors.textSecondary }]}>Country & currency</Text>
            <TouchableOpacity
              style={[st.countrySelector, { backgroundColor: colors.inputBg, borderColor: colors.borderDark }]}
              onPress={() => setShowCountryPicker(true)}
            >
              <Text style={[st.countrySelectorText, { color: selectedCountry ? colors.text : colors.textMuted }]}>
                {selectedCountry
                  ? `${selectedCountry.name} (${selectedCountry.symbol} ${selectedCountry.currency})`
                  : "Select your country"}
              </Text>
            </TouchableOpacity>

            <Text style={[st.label, { color: colors.textSecondary }]}>Password</Text>
            <TextInput
              style={[st.input, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]}
              placeholder="Minimum 6 characters"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={(t) => { setPassword(t); setError(""); }}
              secureTextEntry
            />

            <Text style={[st.label, { color: colors.textSecondary }]}>Confirm password</Text>
            <TextInput
              style={[st.input, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]}
              placeholder="Re-enter password"
              placeholderTextColor={colors.textMuted}
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setError(""); }}
              secureTextEntry
            />

            {error ? <Text style={[st.errorText, { color: colors.expense }]}>{error}</Text> : null}

            <TouchableOpacity
              style={[st.button, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={st.buttonText}>Sign Up</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={[st.linkText, { color: colors.textMuted }]}>
                Already have an account? <Text style={[st.link, { color: colors.primary }]}>Log In</Text>
              </Text>
            </TouchableOpacity>

            {/* Country Picker Modal */}
            <Modal visible={showCountryPicker} transparent animationType="slide">
              <View style={st.modalOverlay}>
                <View style={[st.modalContent, { backgroundColor: colors.card }]}>
                  <Text style={[st.modalTitle, { color: colors.text }]}>Select Country</Text>

                  <TextInput
                    style={[st.searchInput, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]}
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
                        style={[st.countryItem, { borderBottomColor: colors.border }, selectedCountry?.code === item.code && { backgroundColor: colors.balanceBg }]}
                        onPress={() => { setSelectedCountry(item); setShowCountryPicker(false); setCountrySearch(""); setError(""); }}
                      >
                        <View>
                          <Text style={[st.countryName, { color: colors.text }]}>{item.name}</Text>
                          <Text style={[st.countryCurrency, { color: colors.textMuted }]}>{item.symbol} {item.currency}</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  />

                  <TouchableOpacity style={[st.closeBtn, { borderColor: colors.borderDark }]} onPress={() => { setShowCountryPicker(false); setCountrySearch(""); }}>
                    <Text style={[st.closeBtnText, { color: colors.textSecondary }]}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </ScrollView>
        );
      }

      const st = StyleSheet.create({
        container: { flex: 1 },
        content: { justifyContent: "center", padding: 24, paddingTop: 60, paddingBottom: 40 },
        title: { fontSize: 28, fontWeight: "bold", marginBottom: 4 },
        subtitle: { fontSize: 16, marginBottom: 24 },
        label: { fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 12 },
        input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 4 },
        countrySelector: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 4 },
        countrySelectorText: { fontSize: 16 },
        button: { padding: 16, borderRadius: 12, alignItems: "center", marginTop: 20, marginBottom: 16 },
        buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
        linkText: { textAlign: "center", fontSize: 14 },
        link: { fontWeight: "600" },
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