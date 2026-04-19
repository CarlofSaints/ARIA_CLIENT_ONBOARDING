export type ChecklistItemDef = {
  id: string;
  label: string;
  description?: string;
  section: string;
  type: "manual" | "auto" | "either";
  dynamic: boolean;
  order: number;
  active: boolean;
  optional?: boolean;
  step?: number;
  assignedTo?: "admin" | "cam" | "both";
  skippable?: boolean;
};

export type ChecklistItemState = {
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  channelStates?: Record<string, { completed: boolean; completedAt?: string }>;
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
  status: string;
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

export type PersonnelRow = {
  role: string;
  name: string;
  email: string;
  cell: string;
  channels: string[];
  customFields?: Record<string, string>;
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

export type Session = {
  id?: string;
  name?: string;
  surname?: string;
  role?: string;
  permissions?: string[];
  email?: string;
} | null;
