import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import Papa from "papaparse";
import { Platform } from "react-native";

// ============ CSV EXPORT ============

export const exportCSV = async (transactions, filename) => {
  const data = transactions.map((t) => ({
    Date: t.date ? new Date(t.date).toLocaleString() : "",
    Type: t.type || "",
    Category: t.category || "",
    Account: t.account || "",
    Amount: t.amount ? t.amount.toFixed(2) : "0.00",
    Note: t.title || "",
  }));

  const csv = Papa.unparse(data);

  if (Platform.OS === "web") {
    downloadWeb(csv, `${filename}.csv`, "text/csv");
    return;
  }

  // Mobile: try dynamic import
  try {
    const FileSystem = require("expo-file-system");
    const Sharing = require("expo-sharing");
    const filePath = `${FileSystem.documentDirectory}${filename}.csv`;
    await FileSystem.writeAsStringAsync(filePath, csv, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, { mimeType: "text/csv" });
    }
  } catch (e) {
    console.log("Mobile export not available:", e);
  }
};

// ============ PDF EXPORT (HTML-based) ============

export const exportPDF = async (reportData, filename) => {
  const {
    period,
    totalIncome,
    totalExpenses,
    netSavings,
    savingsRate,
    txCount,
    avgPerTx,
    categoryData,
    incomeData,
    transactions,
  } = reportData;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1a1a1a; font-size: 13px; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    h2 { font-size: 16px; margin: 24px 0 12px; color: #333; }
    .period { color: #4F46E5; font-size: 14px; margin-bottom: 24px; }
    .summary { display: flex; gap: 12px; margin-bottom: 24px; }
    .summary-card { flex: 1; padding: 14px; border-radius: 10px; text-align: center; }
    .summary-card.income { background: #ECFDF5; }
    .summary-card.expense { background: #FEF2F2; }
    .summary-card.savings { background: #EEF2FF; }
    .summary-card.rate { background: #F9FAFB; }
    .summary-label { font-size: 11px; color: #555; margin-bottom: 4px; }
    .summary-value { font-size: 20px; font-weight: bold; }
    .summary-value.green { color: #10B981; }
    .summary-value.red { color: #EF4444; }
    .summary-value.blue { color: #4F46E5; }
    .stats { display: flex; gap: 20px; margin-bottom: 24px; padding: 14px; border: 1px solid #eee; border-radius: 10px; justify-content: space-around; text-align: center; }
    .stat-value { font-size: 18px; font-weight: bold; }
    .stat-label { font-size: 11px; color: #888; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #F9FAFB; padding: 10px; text-align: left; font-size: 12px; color: #555; border-bottom: 2px solid #eee; }
    td { padding: 10px; border-bottom: 1px solid #f0f0f0; font-size: 12px; }
    .amount-income { color: #10B981; font-weight: 600; }
    .amount-expense { color: #EF4444; font-weight: 600; }
    .bar-container { height: 6px; background: #f0f0f0; border-radius: 3px; width: 80px; display: inline-block; }
    .bar-fill { height: 100%; border-radius: 3px; }
    .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #eee; font-size: 11px; color: #aaa; text-align: center; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>FinManager Report</h1>
  <div class="period">${period}</div>

  <div class="summary">
    <div class="summary-card income">
      <div class="summary-label">Total Income</div>
      <div class="summary-value green">${totalIncome.toFixed(2)}</div>
    </div>
    <div class="summary-card expense">
      <div class="summary-label">Total Expenses</div>
      <div class="summary-value red">${totalExpenses.toFixed(2)}</div>
    </div>
    <div class="summary-card savings">
      <div class="summary-label">Net Savings</div>
      <div class="summary-value ${netSavings >= 0 ? "green" : "red"}">${netSavings.toFixed(2)}</div>
    </div>
    <div class="summary-card rate">
      <div class="summary-label">Savings Rate</div>
      <div class="summary-value blue">${savingsRate.toFixed(0)}%</div>
    </div>
  </div>

  <div class="stats">
    <div><div class="stat-value">${txCount}</div><div class="stat-label">Transactions</div></div>
    <div><div class="stat-value">${isNaN(avgPerTx) ? "0" : avgPerTx.toFixed(0)}</div><div class="stat-label">Avg Expense</div></div>
    <div><div class="stat-value">${categoryData.length}</div><div class="stat-label">Categories</div></div>
  </div>

  ${categoryData.length > 0 ? `
  <h2>Expense Breakdown</h2>
  <table>
    <thead><tr><th>#</th><th>Category</th><th>Amount</th><th>%</th><th></th></tr></thead>
    <tbody>
      ${categoryData.map((cat, i) => {
        const pct = totalExpenses > 0 ? ((cat.amount / totalExpenses) * 100).toFixed(1) : "0";
        const clrs = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];
        return `<tr>
          <td>${i + 1}</td>
          <td>${cat.name}</td>
          <td class="amount-expense">${cat.amount.toFixed(2)}</td>
          <td>${pct}%</td>
          <td><div class="bar-container"><div class="bar-fill" style="width:${pct}%;background:${clrs[i % clrs.length]}"></div></div></td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>` : ""}

  ${incomeData.length > 0 ? `
  <h2>Income Breakdown</h2>
  <table>
    <thead><tr><th>#</th><th>Category</th><th>Amount</th><th>%</th></tr></thead>
    <tbody>
      ${incomeData.map((cat, i) => {
        const pct = totalIncome > 0 ? ((cat.amount / totalIncome) * 100).toFixed(1) : "0";
        return `<tr><td>${i + 1}</td><td>${cat.name}</td><td class="amount-income">${cat.amount.toFixed(2)}</td><td>${pct}%</td></tr>`;
      }).join("")}
    </tbody>
  </table>` : ""}

  <h2>All Transactions</h2>
  <table>
    <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Account</th><th>Amount</th><th>Note</th></tr></thead>
    <tbody>
      ${transactions.map((t) => `<tr>
        <td>${t.date ? new Date(t.date).toLocaleDateString() : ""}</td>
        <td>${t.type || ""}</td>
        <td>${t.category || ""}</td>
        <td>${t.account || ""}</td>
        <td class="${t.type === "income" ? "amount-income" : "amount-expense"}">${t.type === "income" ? "+" : "-"}${t.amount ? t.amount.toFixed(2) : "0.00"}</td>
        <td>${t.title && t.title !== "No note" ? t.title : ""}</td>
      </tr>`).join("")}
    </tbody>
  </table>

  <div class="footer">Generated by FinManager · ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
</body>
</html>`;

  if (Platform.OS === "web") {
    const newWindow = window.open("", "_blank");
    newWindow.document.write(html);
    newWindow.document.close();
    setTimeout(() => newWindow.print(), 500);
    return;
  }

  try {
    const FileSystem = require("expo-file-system");
    const Sharing = require("expo-sharing");
    const filePath = `${FileSystem.documentDirectory}${filename}.html`;
    await FileSystem.writeAsStringAsync(filePath, html, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, { mimeType: "text/html" });
    }
  } catch (e) {
    console.log("Mobile export not available:", e);
  }
};

// ============ WEB DOWNLOAD HELPER ============

const downloadWeb = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};