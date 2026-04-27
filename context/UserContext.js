        import React, { createContext, useState, useEffect, useContext } from "react";
        import { getUserProfile } from "../services/firestoreService";
        import { auth } from "../config/firebase";
        import { onAuthStateChanged } from "firebase/auth";

        const UserContext = createContext();

        const COUNTRIES = [
        { name: "United Arab Emirates", code: "AE", currency: "AED", symbol: "د.إ" },
        { name: "United States", code: "US", currency: "USD", symbol: "$" },
        { name: "United Kingdom", code: "GB", currency: "GBP", symbol: "£" },
        { name: "European Union", code: "EU", currency: "EUR", symbol: "€" },
        { name: "India", code: "IN", currency: "INR", symbol: "₹" },
        { name: "Pakistan", code: "PK", currency: "PKR", symbol: "Rs" },
        { name: "Saudi Arabia", code: "SA", currency: "SAR", symbol: "ر.س" },
        { name: "Qatar", code: "QA", currency: "QAR", symbol: "ر.ق" },
        { name: "Kuwait", code: "KW", currency: "KWD", symbol: "د.ك" },
        { name: "Bahrain", code: "BH", currency: "BHD", symbol: ".د.ب" },
        { name: "Oman", code: "OM", currency: "OMR", symbol: "ر.ع" },
        { name: "Canada", code: "CA", currency: "CAD", symbol: "C$" },
        { name: "Australia", code: "AU", currency: "AUD", symbol: "A$" },
        { name: "Japan", code: "JP", currency: "JPY", symbol: "¥" },
        { name: "China", code: "CN", currency: "CNY", symbol: "¥" },
        { name: "South Korea", code: "KR", currency: "KRW", symbol: "₩" },
        { name: "Singapore", code: "SG", currency: "SGD", symbol: "S$" },
        { name: "Malaysia", code: "MY", currency: "MYR", symbol: "RM" },
        { name: "Philippines", code: "PH", currency: "PHP", symbol: "₱" },
        { name: "Thailand", code: "TH", currency: "THB", symbol: "฿" },
        { name: "Indonesia", code: "ID", currency: "IDR", symbol: "Rp" },
        { name: "Bangladesh", code: "BD", currency: "BDT", symbol: "৳" },
        { name: "Sri Lanka", code: "LK", currency: "LKR", symbol: "Rs" },
        { name: "Nepal", code: "NP", currency: "NPR", symbol: "Rs" },
        { name: "Egypt", code: "EG", currency: "EGP", symbol: "E£" },
        { name: "South Africa", code: "ZA", currency: "ZAR", symbol: "R" },
        { name: "Nigeria", code: "NG", currency: "NGN", symbol: "₦" },
        { name: "Kenya", code: "KE", currency: "KES", symbol: "KSh" },
        { name: "Turkey", code: "TR", currency: "TRY", symbol: "₺" },
        { name: "Brazil", code: "BR", currency: "BRL", symbol: "R$" },
        { name: "Mexico", code: "MX", currency: "MXN", symbol: "MX$" },
        { name: "Switzerland", code: "CH", currency: "CHF", symbol: "CHF" },
        { name: "Sweden", code: "SE", currency: "SEK", symbol: "kr" },
        { name: "Norway", code: "NO", currency: "NOK", symbol: "kr" },
        { name: "Denmark", code: "DK", currency: "DKK", symbol: "kr" },
        { name: "New Zealand", code: "NZ", currency: "NZD", symbol: "NZ$" },
        { name: "Jordan", code: "JO", currency: "JOD", symbol: "د.ا" },
        { name: "Lebanon", code: "LB", currency: "LBP", symbol: "ل.ل" },
        { name: "Iraq", code: "IQ", currency: "IQD", symbol: "ع.د" },
        ];

        export { COUNTRIES };

        export function UserProvider({ children }) {
        const [profile, setProfile] = useState(null);
        const [currencySymbol, setCurrencySymbol] = useState("");
        const [displayName, setDisplayName] = useState("");
        const [loadingProfile, setLoadingProfile] = useState(true);

        useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
            await loadProfile();
            } else {
            setProfile(null);
            setCurrencySymbol("");
            setDisplayName("");
            }
            setLoadingProfile(false);
        });
        return unsubscribe;
        }, []);

        const loadProfile = async () => {
        try {
            const data = await getUserProfile();
            if (data) {
            setProfile(data);
            setCurrencySymbol(data.currencySymbol || "");
            setDisplayName(data.name || "");
            }
        } catch (error) {
            console.log("Error loading profile:", error);
        }
        };

        const refreshProfile = async () => {
        await loadProfile();
        };

        const formatAmount = (amount) => {
        const formatted = Math.abs(amount).toFixed(2);
        return currencySymbol ? `${currencySymbol} ${formatted}` : formatted;
        };

        return (
        <UserContext.Provider value={{ profile, currencySymbol, displayName, formatAmount, refreshProfile, loadingProfile }}>
            {children}
        </UserContext.Provider>
        );
        }

        export const useUser = () => useContext(UserContext);