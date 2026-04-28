    import React, { useState } from "react";
    import {
      View,
      Text,
      TextInput,
      TouchableOpacity,
      StyleSheet,
      Alert,
      ActivityIndicator,
      Image,
      KeyboardAvoidingView,
      ScrollView,
      Platform,
    } from "react-native";
    import { signInWithEmailAndPassword } from "firebase/auth";
    import { auth } from "../config/firebase";
    import { useTheme } from "../context/ThemeContext";

    export default function LoginScreen({ navigation }) {
      const { colors } = useTheme();
      const [email, setEmail] = useState("");
      const [password, setPassword] = useState("");
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState("");

      const handleLogin = async () => {
        setError("");
        if (!email) { setError("Please enter your email"); return; }
        if (!password) { setError("Please enter your password"); return; }
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

      const isDark = colors.name === "dark";

      return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            {/* Hero section */}
            <View style={[s.hero, { backgroundColor: "#6C63FF" }]}>
              <Image source={require("../assets/logo-full - Copy.png")} style={{ width: 300, height: 250}} resizeMode="contain" />
            </View>

            {/* Curved transition */}
            <View style={[s.curveContainer, { backgroundColor: "#6C63FF" }]}>
              <View style={[s.curve, { backgroundColor: isDark ? colors.bg : "#fff" }]} />
            </View>

            {/* Form section */}
            <View style={[s.formSection, { backgroundColor: isDark ? colors.bg : "#fff" }]}>
              <Text style={[s.formTitle, { color: "#6C63FF" }]}>Login</Text>
              <Text style={[s.formSubtitle, { color: colors.textMuted }]}>Sign in to continue.</Text>

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

              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>PASSWORD</Text>
              <TextInput
                style={[s.input, { backgroundColor: isDark ? colors.inputBg : "#F0F0F5", color: colors.text }]}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={(t) => { setPassword(t); setError(""); }}
                secureTextEntry
              />

              {error ? <Text style={s.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[s.button, loading && { opacity: 0.6 }]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Log in</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate("SignUp")} style={s.linkContainer}>
                <Text style={[s.linkText, { color: colors.textMuted }]}>
                  Don't have account? <Text style={s.linkBold}>Signup</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      );
    }

    const s = StyleSheet.create({
      hero: {
        paddingTop: 70,
        paddingBottom: 30,
        alignItems: "center",
      },
      logoIcon: {
        width: 80,
        height: 80,
        marginBottom: 12,
      },
      logoText: {
        fontSize: 22,
        fontWeight: "900",
        color: "#fff",
        letterSpacing: 3,
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
        paddingBottom: 40,
      },
      formTitle: {
        fontSize: 32,
        fontWeight: "bold",
        marginBottom: 4,
      },
      formSubtitle: {
        fontSize: 15,
        marginBottom: 32,
      },
      fieldLabel: {
        fontSize: 12,
        fontWeight: "600",
        letterSpacing: 1,
        marginBottom: 8,
        marginTop: 12,
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
      },
      linkText: {
        fontSize: 14,
      },
      linkBold: {
        color: "#6C63FF",
        fontWeight: "700",
      },
        logoTextImage: {
        width: 200,
        height: 40,
        marginTop: 8,
  },
    });