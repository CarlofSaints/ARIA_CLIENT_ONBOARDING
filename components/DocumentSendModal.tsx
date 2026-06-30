"use client";

import { useState } from "react";

export type DocKind = "sla" | "eula";

type Props = {
  clientId: string;
  kind: DocKind;
  label: string; // "SLA" | "EULA"
  longLabel: string; // "Service Level Agreement"
  clientName: string;
  contactName: string;
  camName: string;
  camEmail: string;
  defaultRecipients: string[];
  attachment: { fileName: string; base64: string };
  userId?: string;
  userName?: string;
  onClose: () => void;
  onSent: (sentAt: string) => void;
};

// ── Recipient chip editor ───────────────────────────────────────────────────
function RecipientField({
  title,
  values,
  onChange,
}: {
  title: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const parts = draft
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const next = Array.from(new Set([...values, ...parts]));
    onChange(next);
    setDraft("");
  };

  const remove = (email: string) => onChange(values.filter((v) => v !== email));

  return (
    <div>
      <label className="block text-xs font-semibold text-oj-muted mb-1 uppercase tracking-wide">{title}</label>
      <div className="flex flex-wrap items-center gap-1.5 border border-oj-border rounded-lg px-2 py-1.5 focus-within:border-oj-blue">
        {values.map((email) => (
          <span
            key={email}
            className="inline-flex items-center gap-1 bg-oj-bg border border-oj-border rounded-full pl-2.5 pr-1 py-0.5 text-xs text-oj-dark"
          >
            {email}
            <button
              type="button"
              onClick={() => remove(email)}
              className="w-4 h-4 rounded-full hover:bg-red-100 text-oj-muted hover:text-red-600 flex items-center justify-center leading-none"
              aria-label={`Remove ${email}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "," || e.key === ";") {
              e.preventDefault();
              add();
            } else if (e.key === "Backspace" && draft === "" && values.length > 0) {
              remove(values[values.length - 1]);
            }
          }}
          onBlur={add}
          placeholder={values.length === 0 ? "Add email…" : ""}
          className="flex-1 min-w-[120px] text-sm text-oj-dark px-1 py-0.5 focus:outline-none bg-transparent"
        />
      </div>
    </div>
  );
}

export default function DocumentSendModal({
  clientId,
  kind,
  label,
  longLabel,
  clientName,
  contactName,
  camName,
  defaultRecipients,
  attachment,
  userId,
  userName,
  onClose,
  onSent,
}: Props) {
  const [to, setTo] = useState<string[]>(defaultRecipients);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [showCcBcc, setShowCcBcc] = useState(false);

  const [subject, setSubject] = useState(`${longLabel} — ${clientName}`);
  const [body, setBody] = useState(
    `Dear ${contactName || "Sir/Madam"},\n\nPlease find attached the ${longLabel} (${label}) for ${clientName}.\n\nKindly review, sign, and return the signed copy to your Account Manager, ${camName}.\n\nThank you,\nThe OuterJoin Team`,
  );

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const downloadHref = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${attachment.base64}`;

  const handleSend = async () => {
    if (to.length === 0) {
      setError("Add at least one TO recipient.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/clients/${clientId}/document/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          to,
          cc,
          bcc,
          subject,
          body,
          fileName: attachment.fileName,
          attachmentBase64: attachment.base64,
          userId,
          userName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send email");
        return;
      }
      setSent(true);
      onSent(data.sentAt ?? new Date().toISOString());
      setTimeout(() => onClose(), 1600);
    } catch {
      setError("Network error — please try again");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-oj-border">
          <div>
            <h2 className="text-base font-bold text-oj-dark">Email {label}</h2>
            <p className="text-xs text-oj-muted mt-0.5">Edit recipients and message, then send</p>
          </div>
          <button onClick={onClose} className="text-oj-muted hover:text-oj-dark transition-colors text-xl leading-none">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* TO */}
          <RecipientField title="To" values={to} onChange={setTo} />

          {/* CC / BCC toggle */}
          {!showCcBcc ? (
            <button
              type="button"
              onClick={() => setShowCcBcc(true)}
              className="text-xs font-semibold text-oj-blue hover:text-oj-blue-hover"
            >
              + Add Cc / Bcc
            </button>
          ) : (
            <>
              <RecipientField title="Cc" values={cc} onChange={setCc} />
              <RecipientField title="Bcc" values={bcc} onChange={setBcc} />
            </>
          )}

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-oj-muted mb-1 uppercase tracking-wide">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-oj-border rounded-lg px-3 py-2 text-sm text-oj-dark focus:outline-none focus:border-oj-blue"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-semibold text-oj-muted mb-1 uppercase tracking-wide">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={9}
              className="w-full border border-oj-border rounded-lg px-3 py-2 text-sm text-oj-dark resize-y focus:outline-none focus:border-oj-blue leading-relaxed"
            />
          </div>

          {/* Attachment */}
          <div>
            <label className="block text-xs font-semibold text-oj-muted mb-1 uppercase tracking-wide">Attachment</label>
            <div className="flex items-center gap-3 border border-oj-border rounded-lg px-3 py-2.5 bg-oj-bg">
              <span className="text-lg leading-none">📄</span>
              <span className="text-sm text-oj-dark flex-1 truncate">{attachment.fileName}</span>
              <a
                href={downloadHref}
                download={attachment.fileName}
                className="text-xs font-semibold text-oj-blue hover:text-oj-blue-hover whitespace-nowrap"
              >
                ↓ Preview
              </a>
            </div>
            <p className="text-xs text-oj-muted mt-1.5">
              This is the exact document that will be attached. Click Preview to re-check it before sending.
            </p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-oj-border flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2 rounded-lg border border-oj-border text-sm font-medium text-oj-dark hover:border-oj-blue transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || sent}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-oj-blue text-white text-sm font-semibold hover:bg-oj-blue-hover transition-colors disabled:opacity-60"
          >
            {sent ? (
              <>✓ Sent!</>
            ) : sending ? (
              <>
                <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                Sending…
              </>
            ) : (
              <>✉ Send {label}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
