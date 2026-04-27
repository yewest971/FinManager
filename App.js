      import React, { useState, useEffect } from "react";
      import { NavigationContainer } from "@react-navigation/native";
      import { createNativeStackNavigator } from "@react-navigation/native-stack";
      import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
      import { Text } from "react-native";
      import { onAuthStateChanged } from "firebase/auth";
      import { auth } from "./config/firebase";
      import { initDatabase } from "./services/localDatabase";
      import { syncPendingTransactions } from "./services/syncService";
      import { SafeAreaProvider } from "react-native-safe-area-context";
      import { ThemeProvider, useTheme } from "./context/ThemeContext";
      import { requestNotificationPermission } from "./services/notificationService";
      import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
      import { UserProvider } from "./context/UserContext";
      import { useUser } from "./context/UserContext";
      import NetInfo from "@react-native-community/netinfo";

      
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
      import ProfileSetupScreen from "./screens/ProfileSetupScreen";

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

        return (
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: colors.primary,
              tabBarInactiveTintColor: colors.textMuted,
              tabBarStyle: {
                paddingBottom: 8,
                paddingTop: 8,
                height: 60,
                backgroundColor: colors.tabBar,
                borderTopColor: colors.tabBarBorder,
              },
              tabBarLabelStyle: {
                fontSize: 11,
                fontWeight: "500",
              },
            }}
          >
            <Tab.Screen
              name="Home"
              component={HomeStackScreen}
              options={{
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="home" size={size} color={color} />
                ),
              }}
            />

            <Tab.Screen
              name="Add"
              component={AddTransactionScreen}
              options={{
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="add-circle" size={size + 4} color={color} />
                ),
              }}
            />

            <Tab.Screen
              name="Transactions"
              component={TransactionsScreen}
              options={{
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="receipt-outline" size={size} color={color} />
                ),
              }}
            />

          </Tab.Navigator>
        );
      }

        function AppContent() {
          const [user, setUser] = useState(null);
          const [loading, setLoading] = useState(true);
          const { profile, loadingProfile } = useUser();

          useEffect(() => {
            const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
              setUser(currentUser);
              setLoading(false);
            });

            initDatabase();

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

          if (loading || loadingProfile) return null;

          return (
            <NavigationContainer>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                {user ? (
                  profile ? (
                    <Stack.Screen name="Main" component={MainTabs} />
                  ) : (
                    <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
                  )
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