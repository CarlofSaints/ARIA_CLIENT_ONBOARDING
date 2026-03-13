import { getLogs, saveLogs, type ActivityLog } from "./dataStore";
import { randomUUID } from "crypto";

const MAX_ENTRIES = 500;

export async function addLog(entry: Omit<ActivityLog, "id" | "timestamp">): Promise<void> {
  try {
    const logs = await getLogs();
    const newEntry: ActivityLog = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    await saveLogs([newEntry, ...logs].slice(0, MAX_ENTRIES));
  } catch (err) {
    // Never throw — logging must never break a user-facing operation
    console.error("Activity log write failed:", err);
  }
}
