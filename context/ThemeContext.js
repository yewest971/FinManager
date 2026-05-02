import React, { createContext, useState, useEffect, useContext } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ThemeContext = createContext();

export const THEMES = {
  light: {
    name: "light",
    bg: "#FFFFFF",
    bgSecondary: "#F9FAFB",
    text: "#1a1a1a",
    textSecondary: "#555",
    textMuted: "#888",
    border: "#eee",
    borderDark: "#ddd",
    card: "#fff",
    inputBg: "#f9f9f9",
    tabBar: "#fff",
    tabBarBorder: "#eee",
    primary: "#4F46E5",
    income: "#10B981",
    incomeBg: "#ECFDF5",
    expense: "#EF4444",
    expenseBg: "#FEF2F2",
    balanceBg: "#EEF2FF",
    warning: "#D97706",
    warningBg: "#FEF3C7",
  },
  dark: {
    name: "dark",
    bg: "#111111",
    bgSecondary: "#1C1C1E",
    text: "#F5F5F5",
    textSecondary: "#A0A0A0",
    textMuted: "#8A8A8A",
    border: "#2C2C2E",
    borderDark: "#3A3A3C",
    card: "#1C1C1E",
    inputBg: "#2C2C2E",
    tabBar: "#1C1C1E",
    tabBarBorder: "#2C2C2E",
    primary: "#6366F1",
    income: "#34D399",
    incomeBg: "#064E3B",
    expense: "#F87171",
    expenseBg: "#7F1D1D",
    balanceBg: "#312E81",
    warning: "#FBBF24",
    warningBg: "#78350F",
  },
};

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState("system");

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem("themeMode");
      if (saved) setThemeMode(saved);
    } catch (e) {
      console.log("Error loading theme:", e);
    }
  };

  const changeTheme = async (mode) => {
    setThemeMode(mode);
    try {
      await AsyncStorage.setItem("themeMode", mode);
    } catch (e) {
      console.log("Error saving theme:", e);
    }
  };

  const resolvedTheme =
    themeMode === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : themeMode;

  const colors = THEMES[resolvedTheme];

  return (
    <ThemeContext.Provider value={{ colors, themeMode, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);