    import { Platform } from "react-native";

    export const a11y = (label, role = "button") => {
    if (Platform.OS === "web") {
        return {
        "aria-label": label,
        role,
        };
    }
    return {
        accessible: true,
        accessibilityLabel: label,
        accessibilityRole: role,
    };
    };

    export const a11yHeader = (label) => {
    if (Platform.OS === "web") {
        return {
        "aria-label": label,
        role: "heading",
        };
    }
    return {
        accessible: true,
        accessibilityLabel: label,
        accessibilityRole: "header",
    };
    };

    export const a11yText = (label) => {
    if (Platform.OS === "web") {
        return {
        "aria-label": label,
        role: "text",
        };
    }
    return {
        accessible: true,
        accessibilityLabel: label,
        accessibilityRole: "text",
    };
    };

    export const a11yImage = (label) => {
    if (Platform.OS === "web") {
        return {
        "aria-label": label,
        role: "img",
        };
    }
    return {
        accessible: true,
        accessibilityLabel: label,
        accessibilityRole: "image",
    };
    };