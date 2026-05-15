// Dropbox Business API helper — mirrors the lib/graphOJ.ts pattern

const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY!;
const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET!;
const DROPBOX_REFRESH_TOKEN = process.env.DROPBOX_REFRESH_TOKEN!;

export const DROPBOX_BASE_PATH =
  process.env.DROPBOX_BASE_PATH ??
  "/OuterJoin/Projects/Excel Add-Ins/Clients/iRam Internal/Live files/iRAM_ADDIN_APP_01/ssf/sf/SFS/2PBI_DB/Support Tables";

export const DROPBOX_TEMPLATE_FOLDER = `${DROPBOX_BASE_PATH}/0_MasterTemplates`;

/** Exchange refresh token for a short-lived access token */
export async function getDropboxToken(): Promise<string> {
  const res = await fetch("https://api.dropbox.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: DROPBOX_REFRESH_TOKEN,
      client_id: DROPBOX_APP_KEY,
      client_secret: DROPBOX_APP_SECRET,
    }).toString(),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Dropbox token error: ${JSON.stringify(data)}`);
  }
  return data.access_token as string;
}

/** Raw POST to a Dropbox API endpoint */
export async function dropbox(
  token: string,
  endpoint: string,
  body: Record<string, unknown>
): Promise<Response> {
  return fetch(`https://api.dropboxapi.com/2/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

/** Typed JSON response from Dropbox API, throws on error */
export async function dropboxJson<T = unknown>(
  token: string,
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  const res = await dropbox(token, endpoint, body);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Dropbox ${endpoint} → ${res.status}: ${text}`);
  }
  return text ? (JSON.parse(text) as T) : (null as T);
}
