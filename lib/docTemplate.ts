// Shared document-template fill engine for legal docs (NDA / SLA / EULA).
//
// Placeholders are LITERAL VISIBLE TEXT in the .docx (e.g. "CLIENT NAME"), not
// {{mustache}} — Word splits braces across XML runs, which breaks templating
// libraries. We string-replace the matching <w:t> text nodes directly.

import PizZip from "pizzip";
import type { DocTemplateKind } from "./dataStore";

export type Replacement = { find: string; replace: string };

const escXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Escape a literal phrase for safe use inside a RegExp.
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Fill a .docx template (base64) by replacing literal placeholder phrases.
 * Each phrase must sit within a single <w:t> run in the document (keep the
 * placeholder's formatting uniform so Word doesn't split it across runs).
 */
export function fillDocx(templateBase64: string, replacements: Replacement[]): Buffer {
  const zip = new PizZip(Buffer.from(templateBase64, "base64"));
  let xml: string = zip.file("word/document.xml")?.asText() ?? "";

  for (const { find, replace } of replacements) {
    if (!find) continue;
    const re = new RegExp(`<w:t(?:[^>]*)>${escRe(find)}</w:t>`, "g");
    xml = xml.replace(re, `<w:t xml:space="preserve">${escXml(replace)}</w:t>`);
  }

  // Strip any stray mustache braces left in the doc.
  xml = xml
    .replace(/<w:t(?:[^>]*)>\{\{<\/w:t>/g, "<w:t></w:t>")
    .replace(/<w:t(?:[^>]*)>\}\}<\/w:t>/g, "<w:t></w:t>");

  zip.file("word/document.xml", xml);
  return Buffer.from(zip.generate({ type: "nodebuffer" }));
}

// ── Cognito → placeholder mapping ───────────────────────────────────────────
//
// Every entry here is replaced wherever its phrase appears in the document.
// Phrases that don't appear in a given .docx are simply ignored, so this list
// can be generous — each template uses whichever subset it needs.
//
// To add/rename a placeholder: edit the phrase string (left side) to match the
// EXACT literal text in the Word doc. The replace is case- and whitespace-
// sensitive.

type CognitoPerson = { First?: string; Last?: string; FirstAndLast?: string; Email?: string };

export function buildDocReplacements(
  cognito: Record<string, unknown>,
  clientName: string,
): Replacement[] {
  const s = (k: string): string => (typeof cognito[k] === "string" ? (cognito[k] as string).trim() : "");
  const obj = (k: string): Record<string, string> =>
    cognito[k] && typeof cognito[k] === "object" ? (cognito[k] as Record<string, string>) : {};

  const addr = obj("Address");
  const contract = obj("ContractContactPerson") as CognitoPerson;
  const billing = obj("BillingContactPerson") as CognitoPerson;

  const fullName = (p: CognitoPerson): string =>
    (p.FirstAndLast || [p.First, p.Last].filter(Boolean).join(" ")).trim();

  const address = [addr.Line1, addr.Line2, addr.City, addr.Region ?? addr.State, addr.PostalCode, addr.Country]
    .filter(Boolean)
    .join(", ");

  const today = new Date().toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" });

  // phrase → value. Aliases (e.g. the NDA's existing phrasing) point at the same value.
  const map: Record<string, string> = {
    "CLIENT NAME": s("CompanyName") || s("TradingAs") || clientName,
    "TRADING AS": s("TradingAs"),

    "CLIENT REGISTRATION NUMBER": s("CompanyRegistrationNumber"),
    "Client Company Registration Number": s("CompanyRegistrationNumber"), // NDA alias

    "CLIENT VAT NUMBER": s("VATNumber2"),

    "CLIENT ADDRESS": address,
    "Client Address": address, // NDA alias

    "CLIENT EMAIL": s("Email"),
    "CLIENT PHONE": s("Phone"),

    // Person responsible for signing = the contract contact person
    "SIGNATORY NAME": fullName(contract),
    "SIGNATORY FIRST NAME": contract.First ?? "",
    "SIGNATORY LAST NAME": contract.Last ?? "",
    "SIGNATORY EMAIL": contract.Email || s("Email3") || s("Email"),

    "BILLING CONTACT NAME": fullName(billing),
    "BILLING CONTACT EMAIL": billing.Email || s("Email2") || s("Email"),

    "TODAY DATE": today,
  };

  return Object.entries(map).map(([find, replace]) => ({ find, replace }));
}

// Human-friendly labels for the admin placeholder reference (used on the Legal
// Templates page). Keep in sync with buildDocReplacements above.
export const PLACEHOLDER_REFERENCE: { phrase: string; source: string }[] = [
  { phrase: "CLIENT NAME", source: "Cognito — Company Name (or Trading As)" },
  { phrase: "TRADING AS", source: "Cognito — Trading As" },
  { phrase: "CLIENT REGISTRATION NUMBER", source: "Cognito — Company Registration Number" },
  { phrase: "CLIENT VAT NUMBER", source: "Cognito — VAT Number" },
  { phrase: "CLIENT ADDRESS", source: "Cognito — Physical Address (one line)" },
  { phrase: "CLIENT EMAIL", source: "Cognito — Main Email" },
  { phrase: "CLIENT PHONE", source: "Cognito — Phone" },
  { phrase: "SIGNATORY NAME", source: "Cognito — Contract Contact Person (full name)" },
  { phrase: "SIGNATORY FIRST NAME", source: "Cognito — Contract Contact Person (first)" },
  { phrase: "SIGNATORY LAST NAME", source: "Cognito — Contract Contact Person (last)" },
  { phrase: "SIGNATORY EMAIL", source: "Cognito — Contract Contact Person (email)" },
  { phrase: "BILLING CONTACT NAME", source: "Cognito — Billing Contact Person (full name)" },
  { phrase: "BILLING CONTACT EMAIL", source: "Cognito — Billing Contact Person (email)" },
  { phrase: "TODAY DATE", source: "Today's date (auto)" },
];

export function documentLabel(kind: DocTemplateKind): string {
  return kind === "nda" ? "NDA" : kind === "sla" ? "SLA" : "EULA";
}

export function documentFileName(kind: DocTemplateKind, clientName: string): string {
  return `${documentLabel(kind)} - ${clientName}.docx`;
}
