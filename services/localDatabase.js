import * as SQLite from "expo-sqlite";

let db = null;

export const initDatabase = async () => {
  if (db) return db;
  db = await SQLite.openDatabaseAsync("finmanager.db");

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS pending_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      amount REAL,
      type TEXT,
      category TEXT,
      account TEXT,
      date TEXT,
      synced INTEGER DEFAULT 0
    );
  `);

  return db;
};

export const savePendingTransaction = async (transaction) => {
  const database = await initDatabase();
  await database.runAsync(
    `INSERT INTO pending_transactions (title, amount, type, category, account, date, synced) VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [
      transaction.title,
      transaction.amount,
      transaction.type,
      transaction.category,
      transaction.account,
      transaction.date,
    ]
  );
};

export const getPendingTransactions = async () => {
  const database = await initDatabase();
  const rows = await database.getAllAsync(
    `SELECT * FROM pending_transactions WHERE synced = 0`
  );
  return rows;
};

export const markAsSynced = async (id) => {
  const database = await initDatabase();
  await database.runAsync(
    `UPDATE pending_transactions SET synced = 1 WHERE id = ?`,
    [id]
  );
};

export const clearSyncedTransactions = async () => {
  const database = await initDatabase();
  await database.runAsync(
    `DELETE FROM pending_transactions WHERE synced = 1`
  );
};