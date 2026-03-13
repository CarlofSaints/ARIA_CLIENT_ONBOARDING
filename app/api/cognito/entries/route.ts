import { NextResponse } from "next/server";

const COGNITO_BASE = "https://www.cognitoforms.com/api";

function getCognitoConfig() {
  const apiKey = process.env.COGNITO_API_KEY?.replace(/\s/g, "");
  const formId = process.env.COGNITO_FORM_ID ?? "4";
  if (!apiKey) throw new Error("COGNITO_API_KEY is not set");
  return { apiKey, formId };
}

// Fallback: the API key may not have "list entries" permission.
// In that case, fetch individual entries by sequential number in parallel batches.
async function fetchEntriesByNumber(
  apiKey: string,
  formId: string
): Promise<Record<string, unknown>[]> {
  const maxEntry = 300; // fetch up to this entry number
  const batchSize = 50;
  const allEntries: Record<string, unknown>[] = [];
  let consecutiveEmptyBatches = 0;

  for (
    let start = 1;
    start <= maxEntry && consecutiveEmptyBatches < 2;
    start += batchSize
  ) {
    const end = Math.min(start + batchSize - 1, maxEntry);
    const nums = Array.from({ length: end - start + 1 }, (_, i) => start + i);

    const batch = await Promise.all(
      nums.map(async (n) => {
        const r = await fetch(
          `${COGNITO_BASE}/forms/${formId}/entries/${n}`,
          {
            headers: { Authorization: `Bearer ${apiKey}` },
            cache: "no-store",
          }
        );
        if (!r.ok) return null;
        return r.json().catch(() => null);
      })
    );

    const valid = batch.filter(Boolean) as Record<string, unknown>[];
    allEntries.push(...valid);

    if (valid.length === 0) consecutiveEmptyBatches++;
    else consecutiveEmptyBatches = 0;
  }

  return allEntries;
}

// GET /api/cognito/entries?search=acme
export async function GET(request: Request) {
  try {
    const { apiKey, formId } = getCognitoConfig();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() ?? "";

    // First try the list endpoint (works if API key has "list entries" permission)
    let entries: Record<string, unknown>[] = [];
    const listRes = await fetch(
      `${COGNITO_BASE}/forms/${formId}/entries?$top=200`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: "no-store",
      }
    );

    if (listRes.ok) {
      const raw = await listRes.json();
      entries = Array.isArray(raw)
        ? raw
        : ((raw as Record<string, unknown>)?.value as Record<string, unknown>[] ?? []);
    } else {
      // Fallback: fetch by entry number (slower but works without list permission)
      entries = await fetchEntriesByNumber(apiKey, formId);
    }

    // Filter client-side if search provided — match against any string value
    const filtered = search
      ? entries.filter((e) =>
          Object.values(e).some(
            (v) => typeof v === "string" && v.toLowerCase().includes(search.toLowerCase())
          )
        )
      : entries;

    return NextResponse.json(filtered);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
