import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_KEY = "pending_transactions";

export const initDatabase = async () => {
  // No setup needed for AsyncStorage
  return true;
};

export const savePendingTransaction = async (transaction) => {
  const pending = await getPendingTransactions();
  const newEntry = {
    id: Date.now(),
    ...transaction,
    synced: 0,
  };
  pending.push(newEntry);
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending));
};

export const getPendingTransactions = async () => {
  try {
    const data = await AsyncStorage.getItem(PENDING_KEY);
    if (!data) return [];
    const all = JSON.parse(data);
    return all.filter((t) => t.synced === 0);
  } catch {
    return [];
  }
};

export const markAsSynced = async (id) => {
  try {
    const data = await AsyncStorage.getItem(PENDING_KEY);
    if (!data) return;
    const all = JSON.parse(data);
    const updated = all.map((t) =>
      t.id === id ? { ...t, synced: 1 } : t
    );
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(updated));
  } catch {
    console.log("Error marking as synced");
  }
};

export const clearSyncedTransactions = async () => {
  try {
    const data = await AsyncStorage.getItem(PENDING_KEY);
    if (!data) return;
    const all = JSON.parse(data);
    const unsynced = all.filter((t) => t.synced === 0);
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(unsynced));
  } catch {
    console.log("Error clearing synced");
  }
};

// ============ OFFLINE CACHE ============

const CACHE_KEYS = {
  transactions: "cache_transactions",
  accounts: "cache_accounts",
  categories: "cache_categories",
  budgets: "cache_budgets",
  goals: "cache_goals",
};

export const cacheData = async (key, data) => {
  try {
    await AsyncStorage.setItem(CACHE_KEYS[key], JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch (err) {
    console.log("Cache write error:", err);
  }
};

export const getCachedData = async (key) => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEYS[key]);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.data;
  } catch {
    return null;
  }
};