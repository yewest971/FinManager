      import React, { useState, useEffect } from "react";
      import { NavigationContainer } from "@react-navigation/native";
      import { createNativeStackNavigator } from "@react-navigation/native-stack";
      import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
      import { Text, Platform } from "react-native";
      import { onAuthStateChanged } from "firebase/auth";
      import { auth } from "./config/firebase";
      import { initDatabase } from "./services/localDatabase";
      import { syncPendingTransactions } from "./services/syncService";
      import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
      import { ThemeProvider, useTheme } from "./context/ThemeContext";
      import { requestNotificationPermission } from "./services/notificationService";
      import { Feather } from "@expo/vector-icons";
      import { UserProvider } from "./context/UserContext";
      import { useUser } from "./context/UserContext";
      import NetInfo from "@react-native-community/netinfo";
      import * as Font from "expo-font";

      import LoginScreen from "./screens/LoginScreen";
      import SignUpScreen from "./screens/SignUpScreen";
      import HomeScreen from "./screens/HomeScreen";
      import TransactionsScreen from "./screens/TransactionsScreen";
      import AddTransactionScreen from "./screens/AddTransactionScreen";
      import CategoriesScreen from "./screens/CategoriesScreen";
      import BudgetScreen from "./screens/BudgetScreen";
      import AccountsScreen from "./screens/AccountsScreen";
      import SavingsGoalsScreen from "./screens/SavingsGoalsScreen";
      import ReportsScreen from "./screens/ReportsScreen";
      import SettingsScreen from "./screens/SettingsScreen";

      const Stack = createNativeStackNavigator();
      const Tab = createBottomTabNavigator();
      const HomeStack = createNativeStackNavigator();

      function HomeStackScreen() {
        return (
          <HomeStack.Navigator screenOptions={{ headerShown: false }}>
            <HomeStack.Screen name="HomeMain" component={HomeScreen} />
            <HomeStack.Screen name="Accounts" component={AccountsScreen} />
            <HomeStack.Screen name="Budgets" component={BudgetScreen} />
            <HomeStack.Screen name="Categories" component={CategoriesScreen} />
            <HomeStack.Screen name="Settings" component={SettingsScreen} />
            <HomeStack.Screen name="SavingsGoals" component={SavingsGoalsScreen} />
            <HomeStack.Screen name="Reports" component={ReportsScreen} />
          </HomeStack.Navigator>
        );
      }

          function MainTabs() {
            const { colors } = useTheme();
            const insets = useSafeAreaInsets();

            return (
              <Tab.Navigator
                screenOptions={{
                  headerShown: false,
                  tabBarActiveTintColor: colors.primary,
                  tabBarInactiveTintColor: colors.textMuted,
                  tabBarHideOnKeyboard: true,
                  tabBarStyle: {
                    backgroundColor: colors.tabBar,
                    borderTopColor: colors.tabBarBorder,
                    height: Platform.OS === "web" ? 70 : 56 + insets.bottom,
                    paddingBottom: Platform.OS === "web" ? 7 : insets.bottom,
                    paddingTop: 8,
                  },
                  tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: "500",
                    marginBottom: 2,
                  },
                  tabBarIconStyle: {
                    marginTop: 2,
                  },
                }}
              >
                <Tab.Screen
                  name="Home"
                  component={HomeStackScreen}
                  options={{
                    tabBarIcon: ({ color, size }) => (
                      <Feather name="home" size={size} color={color} />
                    ),
                  }}
                />
                <Tab.Screen
                  name="Add"
                  component={AddTransactionScreen}
                  options={{
                    tabBarIcon: ({ color, size }) => (
                      <Feather name="plus-circle" size={size} color={color} />
                    ),
                  }}
                />
                <Tab.Screen
                  name="Transactions"
                  component={TransactionsScreen}
                  options={{
                    tabBarIcon: ({ color, size }) => (
                      <Feather name="list" size={size} color={color} />
                    ),
                  }}
                />
              </Tab.Navigator>
            );
          }

          function AppContent() {
            const [user, setUser] = useState(null);
            const [loading, setLoading] = useState(true);
            const { loadingProfile } = useUser();
            const [fontsReady, setFontsReady] = useState(false);

            useEffect(() => {
              const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
                setUser(currentUser);
                setLoading(false);
              });

              initDatabase();
              requestNotificationPermission();

              Font.loadAsync({
                ...Feather.font,
              }).then(() => setFontsReady(true)).catch(() => setFontsReady(true));

              const netUnsubscribe = NetInfo.addEventListener((state) => {
                if (state.isConnected) {
                  syncPendingTransactions();
                }
              });

              return () => {
                unsubscribe();
                netUnsubscribe();
              };
            }, []);

            if (loading || loadingProfile || !fontsReady) return null;

            return (
              <NavigationContainer>
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                    {user ? (
                      <Stack.Screen name="Main" component={MainTabs} />
                    ) : (
                    <>
                      <Stack.Screen name="Login" component={LoginScreen} />
                      <Stack.Screen name="SignUp" component={SignUpScreen} />
                    </>
                  )}
                </Stack.Navigator>
              </NavigationContainer>
            );
          }

      export default function App() {
        return (
          <SafeAreaProvider>
            <ThemeProvider>
              <UserProvider>
                <AppContent />
              </UserProvider>
            </ThemeProvider>
          </SafeAreaProvider>
        );}