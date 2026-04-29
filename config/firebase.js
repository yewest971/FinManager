import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyCUDrx_eILIQfrPgLlL7geU-Z6KzsIBHvg",
  authDomain: "finmanager-989a6.firebaseapp.com",
  projectId: "finmanager-989a6",
  storageBucket: "finmanager-989a6.firebasestorage.app",
  messagingSenderId: "561021736486",
  appId: "1:561021736486:web:ddbd68ccd7732c7c8738e7",
  measurementId: "G-XTW7VGNF9M",
};

const app = initializeApp(firebaseConfig);

let auth;
if (Platform.OS === "web") {
  const { getAuth, browserLocalPersistence, setPersistence } = require("firebase/auth");
  auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence);
} else {
  const { initializeAuth, getReactNativePersistence } = require("firebase/auth");
  const AsyncStorage = require("@react-native-async-storage/async-storage").default;
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

export { auth };
export const db = getFirestore(app);