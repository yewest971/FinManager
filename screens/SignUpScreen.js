    import React, { useState } from "react";
    import {
      View,
      Text,
      TextInput,
      TouchableOpacity,
      StyleSheet,
      ActivityIndicator,
      ScrollView,
      KeyboardAvoidingView,
      Platform,
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

      const isDark = colors.name === "dark";

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
        } catch (err) {
          let message = "Something went wrong";
          if (err.code === "auth/email-already-in-use") message = "This email is already registered";
          else if (err.code === "auth/invalid-email") message = "Please enter a valid email";
          setError(message);
        } finally {
          setLoading(false);
        }
      };

      return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            {/* Hero section */}
            <View style={[s.hero, { backgroundColor: "#6C63FF" }]}>
              <TouchableOpacity style={s.backArrow} onPress={() => navigation.goBack()}>
                <Text style={s.backArrowText}>←</Text>
              </TouchableOpacity>
              <Text style={s.heroTitle}>Create new{"\n"}Account</Text>
            </View>

            {/* Curved transition */}
            <View style={[s.curveContainer, { backgroundColor: "#6C63FF" }]}>
              <View style={[s.curve, { backgroundColor: isDark ? colors.bg : "#fff" }]} />
            </View>

            {/* Form section */}
            <View style={[s.formSection, { backgroundColor: isDark ? colors.bg : "#fff" }]}>

              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>NAME</Text>
              <TextInput
                style={[s.input, { backgroundColor: isDark ? colors.inputBg : "#F0F0F5", color: colors.text }]}
                placeholder="e.g. John"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={(t) => { setName(t); setError(""); }}
              />

              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>EMAIL</Text>
              <TextInput
                style={[s.input, { backgroundColor: isDark ? colors.inputBg : "#F0F0F5", color: colors.text }]}
                placeholder="Email"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(""); }}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>COUNTRY & CURRENCY</Text>
              <TouchableOpacity
                style={[s.input, { backgroundColor: isDark ? colors.inputBg : "#F0F0F5", justifyContent: "center" }]}
                onPress={() => setShowCountryPicker(true)}
              >
                <Text style={[{ fontSize: 16, color: selectedCountry ? colors.text : colors.textMuted }]}>
                  {selectedCountry
                    ? `${selectedCountry.name} (${selectedCountry.symbol} ${selectedCountry.currency})`
                    : "Select your country"}
                </Text>
              </TouchableOpacity>

              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>PASSWORD</Text>
              <TextInput
                style={[s.input, { backgroundColor: isDark ? colors.inputBg : "#F0F0F5", color: colors.text }]}
                placeholder="Minimum 6 characters"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={(t) => { setPassword(t); setError(""); }}
                secureTextEntry
              />

              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>CONFIRM PASSWORD</Text>
              <TextInput
                style={[s.input, { backgroundColor: isDark ? colors.inputBg : "#F0F0F5", color: colors.text }]}
                placeholder="Re-enter password"
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setError(""); }}
                secureTextEntry
              />

              {error ? <Text style={s.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[s.button, loading && { opacity: 0.6 }]}
                onPress={handleSignUp}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Sign up</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate("Login")} style={s.linkContainer}>
                <Text style={[s.linkText, { color: colors.textMuted }]}>
                  Already Registered? <Text style={s.linkBold}>Log in here.</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* Country Picker Modal */}
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
                        <Text style={[s.countryName, { color: colors.text }]}>{item.name}</Text>
                        <Text style={[s.countryCurrency, { color: colors.textMuted }]}>{item.symbol} {item.currency}</Text>
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
        </KeyboardAvoidingView>
      );
    }

    const s = StyleSheet.create({
      hero: {
        paddingTop: 60,
        paddingBottom: 40,
        paddingHorizontal: 32,
      },
      backArrow: {
        marginBottom: 20,
      },
      backArrowText: {
        fontSize: 24,
        color: "#fff",
        fontWeight: "600",
      },
      heroTitle: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#fff",
        lineHeight: 40,
      },
      curveContainer: {
        height: 40,
      },
      curve: {
        flex: 1,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
      },
      formSection: {
        flex: 1,
        paddingHorizontal: 32,
        paddingTop: 10,
        paddingBottom: 40,
      },
      fieldLabel: {
        fontSize: 12,
        fontWeight: "600",
        letterSpacing: 1,
        marginBottom: 8,
        marginTop: 14,
      },
      input: {
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        marginBottom: 4,
      },
      errorText: {
        color: "#EF4444",
        fontSize: 13,
        fontWeight: "500",
        textAlign: "center",
        marginTop: 12,
      },
      button: {
        backgroundColor: "#6C63FF",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 24,
      },
      buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
      },
      linkContainer: {
        marginTop: 20,
        alignItems: "center",
        paddingBottom: 20,
      },
      linkText: {
        fontSize: 14,
      },
      linkBold: {
        color: "#6C63FF",
        fontWeight: "700",
      },
      modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        padding: 20,
      },
      modalContent: {
        borderRadius: 16,
        padding: 20,
        maxHeight: "80%",
      },
      modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 12,
      },
      searchInput: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontSize: 15,
        marginBottom: 12,
      },
      countryItem: {
        padding: 14,
        borderBottomWidth: 1,
      },
      countryName: {
        fontSize: 15,
        fontWeight: "500",
      },
      countryCurrency: {
        fontSize: 13,
        marginTop: 2,
      },
      closeBtn: {
        padding: 14,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 12,
        borderWidth: 1,
      },
      closeBtnText: {
        fontSize: 15,
        fontWeight: "500",
      },
    });