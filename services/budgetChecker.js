                import { getBudgets, getTransactions, getSettings } from "./firestoreService";

                const getDateRange = (period, customStart, customEnd) => {
                const now = new Date();

                if (period === "weekly") {
                    const day = now.getDay();
                    const start = new Date(now);
                    start.setDate(now.getDate() - day);
                    start.setHours(0, 0, 0, 0);
                    const end = new Date(start);
                    end.setDate(start.getDate() + 6);
                    end.setHours(23, 59, 59, 999);
                    return { start, end };
                }

                if (period === "monthly") {
                    const start = new Date(now.getFullYear(), now.getMonth(), 1);
                    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                    return { start, end };
                }

                if (period === "yearly") {
                    const start = new Date(now.getFullYear(), 0, 1);
                    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                    return { start, end };
                }

                if (period === "custom" && customStart && customEnd) {
                    return {
                    start: new Date(customStart + "T00:00:00"),
                    end: new Date(customEnd + "T23:59:59"),
                    };
                }

                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                return { start, end };
                };

                const calculateSpending = (transactions, budget, range) => {
                let totalSpent = 0;
                for (const t of transactions) {
                    if (t.type !== "expense") continue;
                    if (!t.date) continue;
                    const d = new Date(t.date);
                    if (d < range.start || d > range.end) continue;
                    if (budget.category && t.category !== budget.category) continue;
                    totalSpent += t.amount;
                }
                return totalSpent;
                };

                export const checkBudgetAlerts = async (newTransaction) => {
                try {
                    if (newTransaction.type !== "expense") return [];

                    const [budgets, transactions, settings] = await Promise.all([
                    getBudgets(),
                    getTransactions(),
                    getSettings(),
                    ]);

                    const threshold = settings.budgetAlertThreshold || 90;
                    const alerts = [];

                    for (const budget of budgets) {
                    if (budget.category && budget.category !== newTransaction.category) {
                        continue;
                    }

                    const range = getDateRange(
                        budget.period || "monthly",
                        budget.customStart || "",
                        budget.customEnd || ""
                    );
                    if (!range) continue;

                    const totalSpent = calculateSpending(transactions, budget, range);
                    const percentage = (totalSpent / budget.limit) * 100;
                    const budgetName = budget.name || budget.category || "Budget";

                    if (percentage >= 100) {
                        alerts.push({
                        type: "over",
                        name: budgetName,
                        spent: totalSpent,
                        limit: budget.limit,
                        percentage: Math.round(percentage),
                        });
                    } else if (percentage >= threshold) {
                        alerts.push({
                        type: "warning",
                        name: budgetName,
                        spent: totalSpent,
                        limit: budget.limit,
                        percentage: Math.round(percentage),
                        threshold,
                        });
                    }
                    }

                    return alerts;
                } catch (error) {
                    console.log("Budget check error:", error);
                    return [];
                }
                };

                export const getAllBudgetStatuses = async () => {
                try {
                    const [budgets, transactions, settings] = await Promise.all([
                    getBudgets(),
                    getTransactions(),
                    getSettings(),
                    ]);

                    const threshold = settings.budgetAlertThreshold || 90;
                    const statuses = [];

                    for (const budget of budgets) {
                    const range = getDateRange(
                        budget.period || "monthly",
                        budget.customStart || "",
                        budget.customEnd || ""
                    );
                    if (!range) continue;

                    const totalSpent = calculateSpending(transactions, budget, range);
                    const percentage = (totalSpent / budget.limit) * 100;

                    if (percentage >= threshold) {
                        statuses.push({
                        type: percentage >= 100 ? "over" : "warning",
                        name: budget.name || budget.category || "Budget",
                        spent: totalSpent,
                        limit: budget.limit,
                        percentage: Math.round(percentage),
                        threshold,
                        });
                    }
                    }

                    return statuses;
                } catch (error) {
                    console.log("Budget status error:", error);
                    return [];
                }
                };