// Xero OAuth 2.0 helpers — server-side only, import only in API routes

import { put, get, del } from "@vercel/blob";

const XERO_AUTH_URL = "https://login.xero.com/identity/connect/authorize";
const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";
const XERO_CONNECTIONS_URL = "https://api.xero.com/connections";
const XERO_API_BASE = "https://api.xero.com/api.xro/2.0";
const SCOPES = "accounting.contacts offline_access openid profile email";
const REDIRECT_URI = "https://aria.outerjoin.co.za/api/xero/callback";

const TOKENS_KEY = "aria/xero-tokens.json";
const STATES_KEY = "aria/xero-states.json";
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export type XeroTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // ms timestamp
  tenant_id: string;
  tenant_name: string;
};

type StateStore = Record<string, number>; // { [state]: createdAt timestamp }

function credentials() {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("XERO_CLIENT_ID or XERO_CLIENT_SECRET not configured");
  return { clientId, clientSecret };
}

function basicAuth(): string {
  const { clientId, clientSecret } = credentials();
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

// ── Blob helpers ─────────────────────────────────────────────────────────────

async function readBlob<T>(key: string): Promise<T | null> {
  try {
    const result = await get(key, { access: "public" });
    if (result && result.statusCode === 200) {
      const text = await new Response(result.stream).text();
      return JSON.parse(text) as T;
    }
  } catch {
    // blob doesn't exist
  }
  return null;
}

async function writeBlob(key: string, data: unknown): Promise<void> {
  await put(key, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

// ── State (CSRF) ─────────────────────────────────────────────────────────────

export async function saveState(state: string): Promise<void> {
  const store = (await readBlob<StateStore>(STATES_KEY)) ?? {};
  // Prune expired states while we're at it
  const now = Date.now();
  for (const [k, ts] of Object.entries(store)) {
    if (now - ts > STATE_TTL_MS) delete store[k];
  }
  store[state] = now;
  await writeBlob(STATES_KEY, store);
}

export async function verifyAndDeleteState(state: string): Promise<boolean> {
  const store = (await readBlob<StateStore>(STATES_KEY)) ?? {};
  const ts = store[state];
  if (ts === undefined) return false;
  if (Date.now() - ts > STATE_TTL_MS) {
    delete store[state];
    await writeBlob(STATES_KEY, store);
    return false; // expired
  }
  delete store[state];
  await writeBlob(STATES_KEY, store);
  return true;
}

// ── Auth URL ─────────────────────────────────────────────────────────────────

export function buildAuthUrl(state: string): string {
  const { clientId } = credentials();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
  });
  return `${XERO_AUTH_URL}?${params.toString()}`;
}

// ── Token storage ────────────────────────────────────────────────────────────

async function saveTokens(tokens: XeroTokens): Promise<void> {
  await writeBlob(TOKENS_KEY, tokens);
}

export async function getTokens(): Promise<XeroTokens | null> {
  return readBlob<XeroTokens>(TOKENS_KEY);
}

export async function clearTokens(): Promise<void> {
  try {
    const result = await get(TOKENS_KEY, { access: "public" });
    if (result) await del(result.blob.url);
  } catch {
    // already gone
  }
}

// ── Token exchange & refresh ─────────────────────────────────────────────────

export async function exchangeCode(code: string): Promise<XeroTokens> {
  const res = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuth(),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number };

  // Get the Xero tenant (organisation) this token belongs to
  const connRes = await fetch(XERO_CONNECTIONS_URL, {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const conns = await connRes.json() as { tenantId: string; tenantName: string }[];
  const tenant = conns[0];
  if (!tenant) throw new Error("No Xero organisation found for this token");

  const tokens: XeroTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    tenant_id: tenant.tenantId,
    tenant_name: tenant.tenantName,
  };
  await saveTokens(tokens);
  return tokens;
}

async function refreshTokens(tokens: XeroTokens): Promise<XeroTokens> {
  const res = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuth(),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  const data = await res.json() as { access_token: string; refresh_token?: string; expires_in: number };
  const updated: XeroTokens = {
    ...tokens,
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? tokens.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  await saveTokens(updated);
  return updated;
}

export async function getValidTokens(): Promise<XeroTokens> {
  const tokens = await getTokens();
  if (!tokens) throw new Error("Xero not connected");
  // Refresh proactively if within 5 min of expiry
  if (Date.now() > tokens.expires_at - 5 * 60 * 1000) {
    return refreshTokens(tokens);
  }
  return tokens;
}

// ── API helpers ──────────────────────────────────────────────────────────────

async function xeroFetch(
  method: "GET" | "POST" | "PUT",
  path: string,
  body?: unknown
): Promise<unknown> {
  const tokens = await getValidTokens();
  const res = await fetch(`${XERO_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Xero-tenant-id": tokens.tenant_id,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Xero ${method} ${path} failed (${res.status}): ${err}`);
  }
  return res.json();
}

export const xeroGet = (path: string) => xeroFetch("GET", path);
export const xeroPost = (path: string, body: unknown) => xeroFetch("POST", path, body);
export const xeroPut = (path: string, body: unknown) => xeroFetch("PUT", path, body);

// ── Cognito → Xero contact mapping ──────────────────────────────────────────

type CognitoAddress = {
  Line1?: string;
  Line2?: string;
  City?: string;
  Region?: string;
  PostalCode?: string;
  State?: string;
  Country?: string;
};

type CognitoContactPerson = {
  First?: string;
  Last?: string;
  FirstAndLast?: string;
  Email?: string;
};

export function buildXeroContact(cognito: Record<string, unknown>) {
  const s = (k: string): string => {
    const v = cognito[k];
    return typeof v === "string" ? v.trim() : "";
  };
  const obj = (k: string) => (cognito[k] && typeof cognito[k] === "object" ? cognito[k] as Record<string, string> : {});

  const addr = obj("Address") as CognitoAddress;
  const billing = obj("BillingContactPerson") as CognitoContactPerson;
  const contract = obj("ContractContactPerson") as CognitoContactPerson;

  const phones = [];
  if (s("Phone")) phones.push({ PhoneType: "DEFAULT", PhoneNumber: s("Phone") });

  const addresses = [];
  if (addr.City || addr.PostalCode || addr.Line1) {
    addresses.push({
      AddressType: "STREET",
      ...(addr.Line1 ? { AddressLine1: addr.Line1 } : {}),
      ...(addr.Line2 ? { AddressLine2: addr.Line2 } : {}),
      City: addr.City ?? "",
      Region: addr.Region ?? addr.State ?? "",
      PostalCode: addr.PostalCode ?? "",
      Country: addr.Country ?? "South Africa",
    });
  }

  const contactPersons = [];
  if (billing.First || billing.Last) {
    contactPersons.push({
      FirstName: billing.First ?? "",
      LastName: billing.Last ?? "",
      EmailAddress: s("Email2") || s("Email"),
      IncludeInEmails: true,
    });
  }
  if (contract.First || contract.Last) {
    contactPersons.push({
      FirstName: contract.First ?? "",
      LastName: contract.Last ?? "",
      EmailAddress: s("Email3") || s("Email"),
      IncludeInEmails: false,
    });
  }

  return {
    Name: s("CompanyName") || s("TradingAs"),
    EmailAddress: s("Email"),
    TaxNumber: s("VATNumber2"),
    CompanyNumber: s("CompanyRegistrationNumber"),
    ...(phones.length ? { Phones: phones } : {}),
    ...(addresses.length ? { Addresses: addresses } : {}),
    ...(contactPersons.length ? { ContactPersons: contactPersons } : {}),
  };
}
