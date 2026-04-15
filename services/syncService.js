import NetInfo from "@react-native-community/netinfo";
import { addTransaction } from "./firestoreService";
import {
  getPendingTransactions,
  markAsSynced,
  clearSyncedTransactions,
} from "./localDatabase";

let isSyncing = false;

export const syncPendingTransactions = async () => {
  // Prevent multiple syncs at the same time
  if (isSyncing) return;

  try {
    isSyncing = true;

    // Check if online
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return;

    // Get all unsynced transactions
    const pending = await getPendingTransactions();
    if (pending.length === 0) return;

    console.log(`Syncing ${pending.length} pending transactions...`);

    for (const tx of pending) {
      try {
        await addTransaction({
          title: tx.title,
          amount: tx.amount,
          type: tx.type,
          category: tx.category,
          account: tx.account,
          date: tx.date,
        });
        await markAsSynced(tx.id);
      } catch (error) {
        console.log("Failed to sync transaction:", tx.id, error);
        // Stop syncing if one fails — will retry next time
        break;
      }
    }

    // Clean up synced entries
    await clearSyncedTransactions();
    console.log("Sync complete!");
  } catch (error) {
    console.log("Sync error:", error);
  } finally {
    isSyncing = false;
  }
};

export const isOnline = async () => {
  const state = await NetInfo.fetch();
  return state.isConnected;
};