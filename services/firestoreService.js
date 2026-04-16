import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../config/firebase";

// ============ TRANSACTIONS ============

export const addTransaction = async (transaction) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  return await addDoc(collection(db, "transactions"), {
    ...transaction,
    userId: user.uid,
    createdAt: serverTimestamp(),
  });
};

export const getTransactions = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  const q = query(
    collection(db, "transactions"),
    where("userId", "==", user.uid),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

export const updateTransaction = async (id, updates) => {
  const ref = doc(db, "transactions", id);
  return await updateDoc(ref, updates);
};

export const deleteTransaction = async (id) => {
  const ref = doc(db, "transactions", id);
  return await deleteDoc(ref);
};

// ============ CATEGORIES ============

export const addCategory = async (category) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  return await addDoc(collection(db, "categories"), {
    ...category,
    userId: user.uid,
  });
};

export const getCategories = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  const q = query(
    collection(db, "categories"),
    where("userId", "==", user.uid)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

export const deleteCategory = async (id) => {
  const ref = doc(db, "categories", id);
  return await deleteDoc(ref);
};

// ============ BUDGETS ============

export const setBudget = async (budget) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  return await addDoc(collection(db, "budgets"), {
    ...budget,
    userId: user.uid,
  });
};

export const getBudgets = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  const q = query(
    collection(db, "budgets"),
    where("userId", "==", user.uid)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

export const updateBudget = async (id, updates) => {
  const ref = doc(db, "budgets", id);
  return await updateDoc(ref, updates);
};

export const deleteBudget = async (id) => {
  const ref = doc(db, "budgets", id);
  return await deleteDoc(ref);
};

// ============ ACCOUNTS ============

export const DEFAULT_ACCOUNTS = [
  { name: "Cash", type: "cash", icon: "💵" },
  { name: "Bank Account", type: "bank", icon: "🏦" },
  { name: "Credit Card", type: "credit", icon: "💳" },
];

export const addAccount = async (account) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  return await addDoc(collection(db, "accounts"), {
    ...account,
    userId: user.uid,
  });
};

export const getAccounts = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  const q = query(
    collection(db, "accounts"),
    where("userId", "==", user.uid)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

export const updateAccount = async (id, updates) => {
  const ref = doc(db, "accounts", id);
  return await updateDoc(ref, updates);
};


export const deleteAccount = async (id) => {
  const ref = doc(db, "accounts", id);
  return await deleteDoc(ref);
};

export const initializeDefaultAccounts = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  const existing = await getAccounts();
  if (existing.length > 0) return;

  for (const acc of DEFAULT_ACCOUNTS) {
    await addAccount(acc);
  }
};

// ============ DEFAULT CATEGORIES ============

export const DEFAULT_CATEGORIES = [
  // Essentials
  { name: "Food & Dining", icon: "🍔" },
  { name: "Groceries", icon: "🛒" },
  { name: "Rent & Housing", icon: "🏠" },
  { name: "Utilities", icon: "⚡" },
  { name: "Internet & Phone", icon: "📶" },
  
  // Transport
  { name: "Car", icon: "🚗" },
  { name: "Petrol", icon: "⛽" },
  { name: "Transport", icon: "🚇" },
  { name: "Taxi", icon: "🚕" },
  { name: "Parking", icon: "🅿️" },

  // Lifestyle
  { name: "Shopping", icon: "🛍️" },
  { name: "Clothing", icon: "👕" },
  { name: "Entertainment", icon: "🎮" },
  { name: "Subscriptions", icon: "📺" },
  { name: "Coffee & Drinks", icon: "☕" },

  // Health & growth
  { name: "Health", icon: "💊" },
  { name: "Gym & Fitness", icon: "🏋️" },
  { name: "Education", icon: "🎓" },
  { name: "Books", icon: "📚" },

  // Financial
  { name: "Salary", icon: "💰" },
  { name: "Freelance", icon: "💻" },
  { name: "Investments", icon: "📈" },
  { name: "Insurance", icon: "🛡️" },

  // Other
  { name: "Travel", icon: "✈️" },
  { name: "Gifts", icon: "🎁" },
  { name: "Personal Care", icon: "💈" },
  { name: "Pets", icon: "🐾" },
  { name: "Donations", icon: "❤️" },
  { name: "Other", icon: "📌" },
];

// ============ DELETED DEFAULTS TRACKING ============

export const getDeletedDefaults = async () => {
  const user = auth.currentUser;
  if (!user) return [];

  const q = query(
    collection(db, "deletedDefaults"),
    where("userId", "==", user.uid)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data().name.toLowerCase());
};

export const trackDeletedDefault = async (name) => {
  const user = auth.currentUser;
  if (!user) return;

  await addDoc(collection(db, "deletedDefaults"), {
    name: name,
    userId: user.uid,
  });
};

export const syncDefaultCategories = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  const existing = await getCategories();
  const existingNames = existing.map((c) => c.name.toLowerCase());
  const deletedNames = await getDeletedDefaults();

  const missing = DEFAULT_CATEGORIES.filter(
    (cat) =>
      !existingNames.includes(cat.name.toLowerCase()) &&
      !deletedNames.includes(cat.name.toLowerCase())
  );

  for (const cat of missing) {
    await addCategory(cat);
  }
};
