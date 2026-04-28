      import { initializeApp } from "firebase/app";
      import { getAuth } from "firebase/auth";
      import { getFirestore } from "firebase/firestore";

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

      export const auth = getAuth(app);
      export const db = getFirestore(app);