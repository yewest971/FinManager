import { Platform } from "react-native";

let Notifications = null;

const loadNotifications = async () => {
  if (Platform.OS !== "web" && !Notifications) {
    try {
      Notifications = require("expo-notifications");
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    } catch (e) {
      console.log("expo-notifications not available");
    }
  }
};

export const requestNotificationPermission = async () => {
  if (Platform.OS === "web") {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    return false;
  }

  try {
    await loadNotifications();
    if (!Notifications) return false;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === "granted";
  } catch (e) {
    console.log("Notification permission error:", e);
    return false;
  }
};

export const sendBudgetNotification = async (title, body) => {
  if (Platform.OS === "web") {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
    return;
  }

  try {
    await loadNotifications();
    if (!Notifications) return;

    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
  } catch (e) {
    console.log("Send notification error:", e);
  }
};

export const sendBudgetAlerts = async (alerts) => {
  if (!alerts || alerts.length === 0) return;

  for (const alert of alerts) {
    if (alert.type === "over") {
      await sendBudgetNotification(
        `🚨 Budget Exceeded: ${alert.name}`,
        `You've spent ${alert.spent.toFixed(2)} of your ${alert.limit.toFixed(2)} limit (${alert.percentage}% used)`
      );
    } else if (alert.type === "warning") {
      await sendBudgetNotification(
        `⚠️ Budget Warning: ${alert.name}`,
        `You've used ${alert.percentage}% of your budget (${alert.spent.toFixed(2)} / ${alert.limit.toFixed(2)})`
      );
    }
  }
};