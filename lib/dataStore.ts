import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");

// Use Vercel KV in production, filesystem in local dev
const useKV = !!process.env.KV_REST_API_URL;

function readJsonSync<T>(filename: string): T {
  return JSON.parse(fs.readFileSync(path.join(dataDir, filename), "utf-8")) as T;
}

function writeJsonSync(filename: string, data: unknown): void {
  fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(data, null, 2), "utf-8");
}

async function readData<T>(filename: string): Promise<T> {
  if (!useKV) return readJsonSync<T>(filename);

  const { kv } = await import("@vercel/kv");
  const key = `aria:${filename.replace(".json", "")}`;
  const cached = await kv.get<T>(key);
  if (cached !== null && cached !== undefined) return cached;

  // First run on this deployment: seed from bundled JSON file
  const data = readJsonSync<T>(filename);
  await kv.set(key, data);
  return data;
}

async function writeData(filename: string, data: unknown): Promise<void> {
  if (!useKV) {
    writeJsonSync(filename, data);
    return;
  }
  const { kv } = await import("@vercel/kv");
  await kv.set(`aria:${filename.replace(".json", "")}`, data);
}

// --- Types ---

export type CAM = {
  id: string;
  name: string;
  surname: string;
  email: string;
  cell: string;
};

export type Channel = {
  id: string;
  name: string;
  logoFileName?: string;
  mandateFileName?: string;
  mandateBase64?: string;
  mandateEmailSubject?: string;
  mandateEmailBody?: string;
};

export type Permission = {
  id: string;
  name: string;
  description: string;
};

export type Role = {
  id: string;
  name: string;
  description: string;
  builtIn: boolean;
  permissionIds: string[];
};

export type User = {
  id: string;
  name: string;
  surname: string;
  email: string;
  cell: string;
  roleId: string;
  passwordHash: string;
  active: boolean;
  forcePasswordChange: boolean;
  firstLoginAt: string | null;
  createdAt: string;
};

export type ChecklistItemDef = {
  id: string;
  label: string;
  description?: string;
  section: "onboarding" | "legal" | "channels" | "technical" | "training" | "signoff";
  type: "manual" | "auto" | "either";
  dynamic: boolean;
  order: number;
  active: boolean;
  optional?: boolean;
};

export type ChecklistItemState = {
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  channelStates?: Record<string, { completed: boolean; completedAt?: string }>;
};

export type PersonnelRow = {
  role: string;
  name: string;
  email: string;
  cell: string;
  channels: string[];
  principal?: string;
  brand?: string;
  customFields?: Record<string, string>;
};

export type PersonnelFieldOption = {
  id: string;
  label: string;
  active: boolean;
  order: number;
};

export type PersonnelCustomField = {
  id: string;
  label: string;
  type: "text" | "email" | "tel" | "select";
  options?: string[];
  required: boolean;
  active: boolean;
  order: number;
};

export type PersonnelConfig = {
  roleOptions: PersonnelFieldOption[];
  customFields: PersonnelCustomField[];
};

export type Client = {
  id: string;
  name: string;
  logoBase64?: string;
  website?: string;
  camId: string;
  emails: string[];
  startDate: string;
  channelIds: string[];
  contactName: string;
  status: "intake" | "active" | "live";
  checklist: Record<string, ChecklistItemState>;
  createdAt: string;
  sharepointStatus?: "created" | "error";
  teamsStatus?: "creating" | "created" | "error";
  teamsId?: string;
  teamsError?: string;
  teamsWarnings?: string[];
  personnelToken?: string;
  personnelSubmittedAt?: string;
  personnelSpUrl?: string;
  personnelSubmission?: PersonnelRow[];
  cognitoEntryId?: string;
  cognitoData?: Record<string, unknown>;
  cognitoLinkedAt?: string;
  xeroContactId?: string;
  xeroContactUrl?: string;
  ndaSentAt?: string;
  signOffEmailSentAt?: string;
  archived?: boolean;
  archivedAt?: string;
};

// --- CAMs ---
export async function getCams(): Promise<CAM[]> { return readData<CAM[]>("cams.json"); }
export async function saveCams(cams: CAM[]): Promise<void> { return writeData("cams.json", cams); }

// --- Channels ---
export async function getChannels(): Promise<Channel[]> { return readData<Channel[]>("channels.json"); }
export async function saveChannels(channels: Channel[]): Promise<void> { return writeData("channels.json", channels); }

// --- Permissions ---
export async function getPermissions(): Promise<Permission[]> { return readData<Permission[]>("permissions.json"); }

// --- Roles ---
export async function getRoles(): Promise<Role[]> { return readData<Role[]>("roles.json"); }
export async function saveRoles(roles: Role[]): Promise<void> { return writeData("roles.json", roles); }

// --- Users ---
export async function getUsers(): Promise<User[]> { return readData<User[]>("users.json"); }
export async function saveUsers(users: User[]): Promise<void> { return writeData("users.json", users); }

// --- Clients ---
export async function getClients(): Promise<Client[]> { return readData<Client[]>("clients.json"); }
export async function saveClients(clients: Client[]): Promise<void> { return writeData("clients.json", clients); }

// --- Checklist ---
export async function getChecklistItems(): Promise<ChecklistItemDef[]> { return readData<ChecklistItemDef[]>("checklist.json"); }
export async function saveChecklistItems(items: ChecklistItemDef[]): Promise<void> { return writeData("checklist.json", items); }

// --- Personnel Config ---
export async function getPersonnelConfig(): Promise<PersonnelConfig> { return readData<PersonnelConfig>("personnelConfig.json"); }
export async function savePersonnelConfig(c: PersonnelConfig): Promise<void> { return writeData("personnelConfig.json", c); }

// --- NDA Template (stored in KV only — not a JSON file) ---
export type NdaTemplate = {
  fileName: string;
  base64: string; // raw base64, no data URL prefix
  uploadedAt: string;
};

export async function getNdaTemplate(): Promise<NdaTemplate | null> {
  if (!useKV) {
    // Local dev: read from data/nda-template.json if exists
    const filePath = path.join(dataDir, "nda-template.json");
    if (!require("fs").existsSync(filePath)) return null;
    return readJsonSync<NdaTemplate>("nda-template.json");
  }
  const { kv } = await import("@vercel/kv");
  return kv.get<NdaTemplate>("aria:nda_template");
}

export async function saveNdaTemplate(t: NdaTemplate): Promise<void> {
  if (!useKV) {
    writeJsonSync("nda-template.json", t);
    return;
  }
  const { kv } = await import("@vercel/kv");
  await kv.set("aria:nda_template", t);
}

export async function deleteNdaTemplate(): Promise<void> {
  if (!useKV) {
    const filePath = path.join(dataDir, "nda-template.json");
    if (require("fs").existsSync(filePath)) require("fs").unlinkSync(filePath);
    return;
  }
  const { kv } = await import("@vercel/kv");
  await kv.del("aria:nda_template");
}

// --- Activity Log ---

export type ActivityLog = {
  id: string;
  timestamp: string;
  action: string;
  clientId?: string;
  clientName?: string;
  userId?: string;
  userName?: string;
  details?: string;
  success: boolean;
  error?: string;
};

export async function getLogs(): Promise<ActivityLog[]> { return readData<ActivityLog[]>("logs.json"); }
export async function saveLogs(logs: ActivityLog[]): Promise<void> { return writeData("logs.json", logs); }

// --- Score calculation (synchronous, takes data as params) ---
// Optional items are excluded from the denominator (they don't count against the score).
export function computeScore(
  checklistDefs: ChecklistItemDef[],
  clientChecklist: Record<string, ChecklistItemState>,
  channelIds: string[]
): number {
  const activeItems = checklistDefs.filter((i) => i.active && !i.optional);
  if (activeItems.length === 0) return 0;
  let totalPoints = 0;
  let earnedPoints = 0;
  for (const item of activeItems) {
    totalPoints += 1;
    const state = clientChecklist[item.id];
    if (item.dynamic) {
      if (state?.channelStates && channelIds.length > 0) {
        const completedCount = channelIds.filter((chId) => state.channelStates![chId]?.completed).length;
        earnedPoints += completedCount / channelIds.length;
      }
    } else {
      if (state?.completed) earnedPoints += 1;
    }
  }
  return Math.round((earnedPoints / totalPoints) * 100);
}
