const SP_HOST = "exceler8xl.sharepoint.com";
export { SP_HOST };

type GraphOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

export async function getOJToken(): Promise<string> {
  const res = await fetch(
    `https://login.microsoftonline.com/${process.env.OJ_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.OJ_CLIENT_ID!,
        client_secret: process.env.OJ_CLIENT_SECRET!,
        scope: "https://graph.microsoft.com/.default",
      }).toString(),
    }
  );
  const data = await res.json();
  if (!data.access_token) throw new Error(`Graph token error: ${JSON.stringify(data)}`);
  return data.access_token as string;
}

export async function graph(token: string, path: string, options: GraphOptions = {}): Promise<Response> {
  const { headers = {}, ...rest } = options;
  const url = path.startsWith("http") ? path : `https://graph.microsoft.com/v1.0${path}`;
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...headers,
    },
    ...rest,
  });
}

export async function graphJson<T = unknown>(token: string, path: string, options: GraphOptions = {}): Promise<T> {
  const res = await graph(token, path, options);
  const text = await res.text();
  if (!res.ok) throw new Error(`Graph ${options.method ?? "GET"} ${path} → ${res.status}: ${text}`);
  return text ? (JSON.parse(text) as T) : (null as T);
}

// Poll a SharePoint copy operation monitor URL (no-auth monitor URL)
export async function pollSPCopy(monitorUrl: string, timeoutMs = 55000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const res = await fetch(monitorUrl);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status === "completed") return;
      if (data.status === "failed" || data.status === "deleted") {
        throw new Error(`SP copy failed: ${JSON.stringify(data.error ?? data)}`);
      }
    } catch (e: unknown) {
      if ((e as Error).message?.includes("SP copy failed")) throw e;
      // network error — retry
    }
  }
  throw new Error("SP copy operation timed out");
}

// Poll a Teams provisioning operation, returns the team ID
export async function pollTeamsOp(monitorUrl: string, token: string, timeoutMs = 55000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const res = await graph(token, monitorUrl);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status === "succeeded") {
        const id = data.targetResourceId ?? data.resourceId;
        if (!id) throw new Error("Succeeded but no targetResourceId in response");
        return id as string;
      }
      if (data.status === "failed") {
        throw new Error(`Teams provisioning failed: ${JSON.stringify(data.error ?? data)}`);
      }
    } catch (e: unknown) {
      if ((e as Error).message?.includes("Teams provisioning failed")) throw e;
    }
  }
  throw new Error("Teams provisioning timed out");
}
