"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";

type TemplateInfo = { exists: boolean; fileName?: string; uploadedAt?: string };

type Placeholder = { token: string; source: string };

type TemplateKind = {
  kind: "nda" | "sla" | "eula";
  label: string; // e.g. "NDA"
  longLabel: string; // e.g. "NDA (Non-Disclosure Agreement)"
  placeholders: Placeholder[];
};

// Placeholders the SLA/EULA fill engine recognises (lib/docTemplate.ts →
// buildDocReplacements). Keep this list in sync with that map. Use any subset
// you need in the doc — unused phrases are simply ignored.
const AGREEMENT_PLACEHOLDERS: Placeholder[] = [
  { token: "CLIENT NAME", source: "Cognito — Company Name (or Trading As)" },
  { token: "TRADING AS", source: "Cognito — Trading As" },
  { token: "CLIENT REGISTRATION NUMBER", source: "Cognito — Company Registration Number" },
  { token: "CLIENT VAT NUMBER", source: "Cognito — VAT Number" },
  { token: "CLIENT ADDRESS", source: "Cognito — Physical Address (one line)" },
  { token: "CLIENT EMAIL", source: "Cognito — Main Email" },
  { token: "CLIENT PHONE", source: "Cognito — Phone" },
  { token: "SIGNATORY NAME", source: "Cognito — Contract Contact Person (full name)" },
  { token: "SIGNATORY FIRST NAME", source: "Cognito — Contract Contact Person (first)" },
  { token: "SIGNATORY LAST NAME", source: "Cognito — Contract Contact Person (last)" },
  { token: "SIGNATORY EMAIL", source: "Cognito — Contract Contact Person (email)" },
  { token: "BILLING CONTACT NAME", source: "Cognito — Billing Contact Person (full name)" },
  { token: "BILLING CONTACT EMAIL", source: "Cognito — Billing Contact Person (email)" },
  { token: "TODAY DATE", source: "Today's date (auto)" },
];

const TEMPLATES: TemplateKind[] = [
  {
    kind: "nda",
    label: "NDA",
    longLabel: "NDA — Non-Disclosure Agreement",
    placeholders: [
      { token: "CLIENT NAME", source: "Cognito — Company Name" },
      { token: "Client Company Registration Number", source: "Cognito — Company Registration Number" },
      { token: "Client Address", source: "Cognito — Physical Address" },
    ],
  },
  {
    kind: "sla",
    label: "SLA",
    longLabel: "SLA — Service Level Agreement",
    placeholders: AGREEMENT_PLACEHOLDERS,
  },
  {
    kind: "eula",
    label: "EULA",
    longLabel: "EULA — End User Licence Agreement",
    placeholders: AGREEMENT_PLACEHOLDERS,
  },
];

function TemplateCard({ tpl }: { tpl: TemplateKind }) {
  const [info, setInfo] = useState<TemplateInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const endpoint = `/api/admin/templates/${tpl.kind}`;

  const load = async () => {
    const res = await fetch(endpoint, { cache: "no-store" });
    const d = await res.json();
    setInfo(d);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".docx")) { setError("Only .docx files are accepted"); return; }
    setError(""); setSuccess(""); setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]); // strip data URL prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, base64 }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Upload failed"); return; }
      setSuccess("Template uploaded successfully.");
      await load();
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setError("Upload failed — please try again");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Remove the ${tpl.label} template? You will need to re-upload one to use it.`)) return;
    setDeleting(true);
    await fetch(endpoint, { method: "DELETE" });
    setInfo({ exists: false });
    setDeleting(false);
    setSuccess("Template removed.");
  };

  return (
    <div className="bg-oj-white border border-oj-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-oj-bg border-b border-oj-border">
        <span className="text-xs font-bold text-oj-muted uppercase tracking-wider">{tpl.longLabel}</span>
      </div>
      <div className="px-5 py-5">
        {info === null ? (
          <p className="text-sm text-oj-muted">Loading…</p>
        ) : info.exists ? (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-medium">
              <span>✓</span>
              <span>{info.fileName}</span>
            </div>
            <span className="text-xs text-oj-muted">
              Uploaded {info.uploadedAt ? new Date(info.uploadedAt).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : ""}
            </span>
            <div className="flex gap-2 ml-auto">
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-oj-blue text-white text-xs font-semibold hover:bg-oj-blue-hover transition-colors cursor-pointer">
                {uploading ? "Uploading…" : "↑ Replace"}
                <input ref={fileRef} type="file" accept=".docx" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1.5 rounded-lg border border-red-300 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {deleting ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-oj-muted">No {tpl.label} template uploaded yet.</p>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-oj-blue text-white text-sm font-semibold hover:bg-oj-blue-hover transition-colors cursor-pointer">
              {uploading ? (
                <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /> Uploading…</>
              ) : (
                <>↑ Upload {tpl.label} Template (.docx)</>
              )}
              <input ref={fileRef} type="file" accept=".docx" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
        )}

        {error && (
          <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}
        {success && (
          <p className="mt-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{success}</p>
        )}
      </div>

      {/* Placeholder guide */}
      <div className="px-5 py-4 bg-oj-bg border-t border-oj-border">
        <p className="text-xs font-semibold text-oj-muted mb-2 uppercase tracking-wide">Placeholder reference</p>
        {tpl.placeholders.length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-oj-muted">
                <th className="text-left pb-1 font-semibold">Literal text in Word doc</th>
                <th className="text-left pb-1 font-semibold">Filled from</th>
              </tr>
            </thead>
            <tbody className="text-oj-dark">
              {tpl.placeholders.map((p) => (
                <tr key={p.token}>
                  <td className="py-0.5 font-mono">{p.token}</td>
                  <td className="py-0.5 text-oj-muted">{p.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-oj-muted">
            Placeholder mapping for the {tpl.label} will be defined when its populate-and-send flow is built.
            For now this template is stored as-is.
          </p>
        )}
      </div>
    </div>
  );
}

export default function LegalTemplatesPage() {
  const { ready } = useAuth();
  if (!ready) return null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-sm text-oj-muted hover:text-oj-dark">← Control Centre</Link>
        <span className="text-oj-muted">/</span>
        <span className="text-sm font-semibold text-oj-dark">Legal Templates</span>
      </div>

      <h1 className="text-2xl font-bold text-oj-dark mb-1">Legal Templates</h1>
      <p className="text-sm text-oj-muted mb-8">
        Upload the Word (.docx) templates for each legal document. Placeholders are <strong>literal visible text</strong>{" "}
        in the document (e.g. <code className="bg-oj-bg px-1.5 py-0.5 rounded text-xs">CLIENT NAME</code>) — not{" "}
        <code className="bg-oj-bg px-1.5 py-0.5 rounded text-xs">{"{{mustache}}"}</code> — because Word splits braces
        across runs. Each placeholder is swapped with the linked Cognito data when the document is generated.
      </p>

      <div className="space-y-6">
        {TEMPLATES.map((tpl) => (
          <TemplateCard key={tpl.kind} tpl={tpl} />
        ))}
      </div>
    </div>
  );
}
