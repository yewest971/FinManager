import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebase";
import { useTheme } from "../context/ThemeContext";
import { a11y, a11yHeader } from "../context/accessibility";

export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      let message = "Something went wrong";
      if (err.code === "auth/invalid-credential") message = "Incorrect email or password";
      else if (err.code === "auth/invalid-email") message = "Please enter a valid email";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      <Text style={[s.title, { color: colors.text }]} {...a11yHeader("Welcome back, log in to your account")}>Welcome Back</Text>
      <Text style={[s.subtitle, { color: colors.textMuted }]}>Log in to your account</Text>

      <TextInput
        style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]}
        placeholder="Email"{...a11y("Email address input field", "none")}
        placeholderTextColor={colors.textMuted}
        value={email}
        onChangeText={(text) => { setEmail(text); setError(""); }}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.borderDark, color: colors.text }]}
        placeholder="Password"{...a11y("Password input field", "none")}
        placeholderTextColor={colors.textMuted}
        value={password}
        onChangeText={(text) => { setPassword(text); setError(""); }}
        secureTextEntry
      />

      {error ? <Text style={[s.errorText, { color: colors.expense }]}>{error}</Text> : null}


      <TouchableOpacity
        style={[s.button, { backgroundColor: colors.primary }]}
        onPress={handleLogin}{...a11y("Log in to your account")}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.buttonText}>Log In</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
        <Text style={[s.linkText, { color: colors.textMuted }]}>
          Don't have an account? <Text style={[s.link, { color: colors.primary }]}>Sign Up</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 16, marginBottom: 32 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16 },
  button: { padding: 16, borderRadius: 12, alignItems: "center", marginTop: 8, marginBottom: 16 },
  errorText: { fontSize: 13, fontWeight: "500", textAlign: "center", marginBottom: 8, padding: 10, borderRadius: 10, backgroundColor: "rgba(239,68,68,0.1)" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  linkText: { textAlign: "center", fontSize: 14 },
  link: { fontWeight: "600" },
});