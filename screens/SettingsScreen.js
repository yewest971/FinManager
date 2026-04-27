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
          Modal,
          FlatList,
        } from "react-native";
        import { useTheme } from "../context/ThemeContext";
        import { useUser, COUNTRIES } from "../context/UserContext";
        import { getSettings, saveSettings, updateUserProfile } from "../services/firestoreService";
        import { signOut, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
        import { auth } from "../config/firebase";

        export default function SettingsScreen({ navigation }) {
          const { colors, themeMode, changeTheme } = useTheme();
          const { displayName, profile, currencySymbol, refreshProfile } = useUser();
          const [threshold, setThreshold] = useState("90");
          const [saving, setSaving] = useState(false);
          const [success, setSuccess] = useState("");

          // Edit profile state
          const [editingProfile, setEditingProfile] = useState(false);
          const [editName, setEditName] = useState("");
          const [editCountry, setEditCountry] = useState(null);
          const [showCountryPicker, setShowCountryPicker] = useState(false);
          const [countrySearch, setCountrySearch] = useState("");
          const [profileError, setProfileError] = useState("");
          const [profileSuccess, setProfileSuccess] = useState("");
          const [profileSaving, setProfileSaving] = useState(false);

          // Change password state
          const [showChangePassword, setShowChangePassword] = useState(false);
          const [currentPassword, setCurrentPassword] = useState("");
          const [newPassword, setNewPassword] = useState("");
          const [confirmNewPassword, setConfirmNewPassword] = useState("");
          const [passwordError, setPasswordError] = useState("");
          const [passwordSuccess, setPasswordSuccess] = useState("");
          const [passwordSaving, setPasswordSaving] = useState(false);

          useEffect(() => {
            loadSettings();
          }, []);

          useEffect(() => {
            if (profile) {
              setEditName(profile.name || "");
              const country = COUNTRIES.find((c) => c.code === profile.countryCode);
              setEditCountry(country || null);
            }
          }, [profile]);

          const filteredCountries = COUNTRIES.filter((c) =>
            c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
            c.currency.toLowerCase().includes(countrySearch.toLowerCase())
          );

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
              Platform.OS === "web" ? window.alert("Please enter a value between 1 and 100") : Alert.alert("Error", "Please enter a value between 1 and 100");
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

          const handleSaveProfile = async () => {
            setProfileError("");
            setProfileSuccess("");
            if (!editName.trim()) { setProfileError("Please enter your name"); return; }
            if (!editCountry) { setProfileError("Please select a country"); return; }

            try {
              setProfileSaving(true);
              await updateUserProfile(profile.id, {
                name: editName.trim(),
                country: editCountry.name,
                countryCode: editCountry.code,
                currency: editCountry.currency,
                currencySymbol: editCountry.symbol,
              });
              await refreshProfile();
              setEditingProfile(false);
              setProfileSuccess("Profile updated!");
              setTimeout(() => setProfileSuccess(""), 2000);
            } catch (error) {
              setProfileError("Failed to update profile");
            } finally {
              setProfileSaving(false);
            }
          };

          const handleChangePassword = async () => {
            setPasswordError("");
            setPasswordSuccess("");
            if (!currentPassword) { setPasswordError("Please enter your current password"); return; }
            if (!newPassword) { setPasswordError("Please enter a new password"); return; }
            if (newPassword.length < 6) { setPasswordError("New password must be at least 6 characters"); return; }
            if (newPassword !== confirmNewPassword) { setPasswordError("New passwords do not match"); return; }

            try {
              setPasswordSaving(true);
              const user = auth.currentUser;
              const credential = EmailAuthProvider.credential(user.email, currentPassword);
              await reauthenticateWithCredential(user, credential);
              await updatePassword(user, newPassword);
              setShowChangePassword(false);
              setCurrentPassword("");
              setNewPassword("");
              setConfirmNewPassword("");
              setPasswordSuccess("Password changed successfully!");
              setTimeout(() => setPasswordSuccess(""), 3000);
            } catch (error) {
              if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
                setPasswordError("Current password is incorrect");
              } else {
                setPasswordError("Failed to change password");
              }
            } finally {
              setPasswordSaving(false);
            }
          };

          const handleLogout = async () => {
            try { await signOut(auth); } catch (error) { console.log("Logout error:", error); }
          };

          const s = dynamicStyles(colors);

          return (
            <ScrollView style={s.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
              <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Text style={s.backBtn}>← Back</Text>
                </TouchableOpacity>
                <Text style={s.heading}>Settings</Text>
                <View style={{ width: 50 }} />
              </View>

              {/* Profile section */}
              <View style={s.section}>
                <View style={s.sectionHeaderRow}>
                  <Text style={s.sectionTitle}>Profile</Text>
                  {!editingProfile && profile && (
                    <TouchableOpacity onPress={() => setEditingProfile(true)}>
                      <Text style={s.editBtn}>Edit</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {profileSuccess ? <Text style={s.profileSuccess}>{profileSuccess}</Text> : null}
                {passwordSuccess ? <Text style={s.profileSuccess}>{passwordSuccess}</Text> : null}

                {editingProfile ? (
                  <View>
                    <Text style={s.fieldLabel}>Name</Text>
                    <TextInput style={s.fieldInput} value={editName} onChangeText={(t) => { setEditName(t); setProfileError(""); }} placeholder="Your name" placeholderTextColor={colors.textMuted} />

                    <Text style={s.fieldLabel}>Country & currency</Text>
                    <TouchableOpacity style={s.countrySelector} onPress={() => setShowCountryPicker(true)}>
                      <Text style={[s.countrySelectorText, { color: editCountry ? colors.text : colors.textMuted }]}>
                        {editCountry ? `${editCountry.name} (${editCountry.symbol} ${editCountry.currency})` : "Select country"}
                      </Text>
                    </TouchableOpacity>

                    {profileError ? <Text style={s.profileError}>{profileError}</Text> : null}

                    <View style={s.editActions}>
                      <TouchableOpacity style={[s.saveProfileBtn, profileSaving && { opacity: 0.6 }]} onPress={handleSaveProfile} disabled={profileSaving}>
                        <Text style={s.saveProfileBtnText}>{profileSaving ? "Saving..." : "Save"}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.cancelProfileBtn} onPress={() => { setEditingProfile(false); setProfileError(""); }}>
                        <Text style={s.cancelProfileBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View>
                    {displayName ? (
                      <View style={[s.infoRow, { marginBottom: 8 }]}>
                        <Text style={s.infoLabel}>Name</Text>
                        <Text style={s.infoValue}>{displayName}</Text>
                      </View>
                    ) : null}
                    <View style={[s.infoRow, { marginBottom: 8 }]}>
                      <Text style={s.infoLabel}>Email</Text>
                      <Text style={s.infoValue}>{auth.currentUser?.email}</Text>
                    </View>
                    {profile?.country ? (
                      <View style={[s.infoRow, { marginBottom: 8 }]}>
                        <Text style={s.infoLabel}>Country</Text>
                        <Text style={s.infoValue}>{profile.country}</Text>
                      </View>
                    ) : null}
                    {currencySymbol ? (
                      <View style={[s.infoRow, { marginBottom: 8 }]}>
                        <Text style={s.infoLabel}>Currency</Text>
                        <Text style={s.infoValue}>{currencySymbol} {profile?.currency}</Text>
                      </View>
                    ) : null}
                  </View>
                )}
              </View>

              {/* Change password */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Security</Text>
                {!showChangePassword ? (
                  <TouchableOpacity style={s.changePasswordBtn} onPress={() => setShowChangePassword(true)}>
                    <Text style={s.changePasswordBtnText}>Change Password</Text>
                  </TouchableOpacity>
                ) : (
                  <View>
                    <Text style={s.fieldLabel}>Current password</Text>
                    <TextInput style={s.fieldInput} value={currentPassword} onChangeText={(t) => { setCurrentPassword(t); setPasswordError(""); }} placeholder="Enter current password" placeholderTextColor={colors.textMuted} secureTextEntry />

                    <Text style={s.fieldLabel}>New password</Text>
                    <TextInput style={s.fieldInput} value={newPassword} onChangeText={(t) => { setNewPassword(t); setPasswordError(""); }} placeholder="Minimum 6 characters" placeholderTextColor={colors.textMuted} secureTextEntry />

                    <Text style={s.fieldLabel}>Confirm new password</Text>
                    <TextInput style={s.fieldInput} value={confirmNewPassword} onChangeText={(t) => { setConfirmNewPassword(t); setPasswordError(""); }} placeholder="Re-enter new password" placeholderTextColor={colors.textMuted} secureTextEntry />

                    {passwordError ? <Text style={s.profileError}>{passwordError}</Text> : null}

                    <View style={s.editActions}>
                      <TouchableOpacity style={[s.saveProfileBtn, passwordSaving && { opacity: 0.6 }]} onPress={handleChangePassword} disabled={passwordSaving}>
                        <Text style={s.saveProfileBtnText}>{passwordSaving ? "Changing..." : "Change Password"}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.cancelProfileBtn} onPress={() => { setShowChangePassword(false); setCurrentPassword(""); setNewPassword(""); setConfirmNewPassword(""); setPasswordError(""); }}>
                        <Text style={s.cancelProfileBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
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
                    <TouchableOpacity key={opt.value} style={[s.themeChip, themeMode === opt.value && s.themeChipActive]} onPress={() => changeTheme(opt.value)}>
                      <Text style={s.themeIcon}>{opt.icon}</Text>
                      <Text style={[s.themeChipText, themeMode === opt.value && s.themeChipTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Budget alerts */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Budget Alerts</Text>
                <Text style={s.description}>Get notified when spending reaches this percentage of your budget limit.</Text>
                <View style={s.thresholdRow}>
                  <TextInput style={s.thresholdInput} value={threshold} onChangeText={setThreshold} keyboardType="number-pad" maxLength={3} />
                  <Text style={s.percentSign}>%</Text>
                  <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveThreshold} disabled={saving}>
                    <Text style={s.saveBtnText}>{saving ? "Saving..." : "Save"}</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.presetRow}>
                  {[50, 75, 80, 90].map((val) => (
                    <TouchableOpacity key={val} style={[s.presetChip, parseInt(threshold) === val && s.presetChipActive]} onPress={() => setThreshold(String(val))}>
                      <Text style={[s.presetText, parseInt(threshold) === val && s.presetTextActive]}>{val}%</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {success ? <Text style={s.profileSuccess}>{success}</Text> : null}
              </View>

              {/* Logout */}
              <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
                <Text style={s.logoutText}>Log Out</Text>
              </TouchableOpacity>

              {/* Country Picker Modal */}
              <Modal visible={showCountryPicker} transparent animationType="slide">
                <View style={s.modalOverlay}>
                  <View style={s.modalContent}>
                    <Text style={s.modalTitle}>Select Country</Text>
                    <TextInput style={s.searchInput} placeholder="Search country or currency..." placeholderTextColor={colors.textMuted} value={countrySearch} onChangeText={setCountrySearch} />
                    <FlatList
                      data={filteredCountries}
                      keyExtractor={(item) => item.code}
                      showsVerticalScrollIndicator={false}
                      style={{ maxHeight: 400 }}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[s.countryItem, editCountry?.code === item.code && { backgroundColor: colors.balanceBg }]}
                          onPress={() => { setEditCountry(item); setShowCountryPicker(false); setCountrySearch(""); setProfileError(""); }}
                        >
                          <View>
                            <Text style={s.countryName}>{item.name}</Text>
                            <Text style={s.countryCurrency}>{item.symbol} {item.currency}</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    />
                    <TouchableOpacity style={s.closeBtn} onPress={() => { setShowCountryPicker(false); setCountrySearch(""); }}>
                      <Text style={s.closeBtnText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            </ScrollView>
          );
        }

        const dynamicStyles = (colors) =>
          StyleSheet.create({
            container: { flex: 1, backgroundColor: colors.bg, padding: 20, paddingTop: 60 },
            header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
            backBtn: { fontSize: 15, color: colors.primary, fontWeight: "600" },
            heading: { fontSize: 20, fontWeight: "bold", color: colors.text },
            section: { marginBottom: 28 },
            sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
            sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
            editBtn: { fontSize: 14, color: colors.primary, fontWeight: "600" },
            description: { fontSize: 13, color: colors.textSecondary, marginBottom: 12, lineHeight: 18 },
            infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, backgroundColor: colors.bgSecondary, borderRadius: 12 },
            infoLabel: { fontSize: 14, color: colors.textSecondary },
            infoValue: { fontSize: 14, color: colors.text, fontWeight: "500" },
            fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
            fieldInput: { borderWidth: 1, borderColor: colors.borderDark, borderRadius: 12, padding: 12, fontSize: 15, backgroundColor: colors.inputBg, color: colors.text },
            countrySelector: { borderWidth: 1, borderColor: colors.borderDark, borderRadius: 12, padding: 14, backgroundColor: colors.inputBg },
            countrySelectorText: { fontSize: 15 },
            editActions: { flexDirection: "row", gap: 10, marginTop: 16 },
            saveProfileBtn: { flex: 1, backgroundColor: colors.primary, padding: 12, borderRadius: 12, alignItems: "center" },
            saveProfileBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
            cancelProfileBtn: { flex: 1, borderWidth: 1, borderColor: colors.borderDark, padding: 12, borderRadius: 12, alignItems: "center" },
            cancelProfileBtnText: { color: colors.textSecondary, fontWeight: "500", fontSize: 14 },
            profileError: { color: colors.expense, fontSize: 13, fontWeight: "500", marginTop: 8 },
            profileSuccess: { color: colors.income, fontSize: 13, fontWeight: "500", marginBottom: 8 },
            changePasswordBtn: { borderWidth: 1, borderColor: colors.borderDark, padding: 14, borderRadius: 12, alignItems: "center" },
            changePasswordBtnText: { color: colors.text, fontWeight: "500", fontSize: 14 },
            themeRow: { flexDirection: "row", gap: 10 },
            themeChip: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.borderDark, alignItems: "center", backgroundColor: colors.bgSecondary, gap: 6 },
            themeChipActive: { borderColor: colors.primary, backgroundColor: colors.balanceBg },
            themeIcon: { fontSize: 22 },
            themeChipText: { fontSize: 13, color: colors.textSecondary, fontWeight: "500" },
            themeChipTextActive: { color: colors.primary, fontWeight: "600" },
            thresholdRow: { flexDirection: "row", alignItems: "center", gap: 8 },
            thresholdInput: { borderWidth: 1, borderColor: colors.borderDark, borderRadius: 12, padding: 12, fontSize: 18, fontWeight: "600", textAlign: "center", width: 70, backgroundColor: colors.inputBg, color: colors.text },
            percentSign: { fontSize: 18, color: colors.textSecondary, fontWeight: "600" },
            saveBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginLeft: 8 },
            saveBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
            presetRow: { flexDirection: "row", gap: 8, marginTop: 12 },
            presetChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.borderDark, backgroundColor: colors.bgSecondary },
            presetChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
            presetText: { fontSize: 13, color: colors.textSecondary, fontWeight: "500" },
            presetTextActive: { color: "#fff", fontWeight: "600" },
            logoutBtn: { borderWidth: 1, borderColor: "#EF4444", padding: 14, borderRadius: 12, alignItems: "center", marginTop: 10 },
            logoutText: { color: "#EF4444", fontSize: 15, fontWeight: "600" },
            modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
            modalContent: { backgroundColor: colors.card, borderRadius: 16, padding: 20, maxHeight: "80%" },
            modalTitle: { fontSize: 20, fontWeight: "bold", color: colors.text, marginBottom: 12 },
            searchInput: { borderWidth: 1, borderColor: colors.borderDark, borderRadius: 12, padding: 12, fontSize: 15, backgroundColor: colors.inputBg, color: colors.text, marginBottom: 12 },
            countryItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
            countryName: { fontSize: 15, fontWeight: "500", color: colors.text },
            countryCurrency: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
            closeBtn: { padding: 14, borderRadius: 12, alignItems: "center", marginTop: 12, borderWidth: 1, borderColor: colors.borderDark },
            closeBtnText: { fontSize: 15, fontWeight: "500", color: colors.textSecondary },
          });