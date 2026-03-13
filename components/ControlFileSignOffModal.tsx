"use client";

import { useState } from "react";

type PersonnelRow = {
  name: string;
  email: string;
  channels: string[];
};

type Props = {
  clientId: string;
  clientName: string;
  camName: string;
  camEmail: string;
  personnelRows: PersonnelRow[];
  clientEmails: string[];
  onClose: () => void;
  session?: { id?: string; name?: string; surname?: string } | null;
};

const SIGNOFF_FORM_URL = "https://www.cognitoforms.com/OuterJoin1/ARIAMasterfileSignOffOUTERJOIN";

export default function ControlFileSignOffModal({
  clientId,
  clientName,
  camName,
  camEmail,
  personnelRows,
  clientEmails,
  onClose,
  session,
}: Props) {
  // Build default recipient list: all personnel with an email + client emails
  const personnelEmails = personnelRows
    .map((r) => r.email)
    .filter((e) => !!e && e.includes("@"));
  const allEmails = Array.from(new Set([...clientEmails, ...personnelEmails]));

  const firstName = personnelRows.length > 0 ? personnelRows[0].name.split(" ")[0] : "Team";

  const defaultSubject = `Control File Sign-off Required — ${clientName}`;
  const defaultBody = `Dear ${firstName},

Your control files are complete but we require sign-off from you.
Please can you fill in the form found at this link — ${SIGNOFF_FORM_URL}

You can sign off a single channel and single control at a time or you can sign off multiple control files and channels at once.

If you are not responsible for a channel/principal/brand, please do not sign them off.

If you have any questions, please do not hesitate to reach out.

Thank you
${camName}`;

  const [subject, setSubject] = useState(defaultSubject);
  const [bodyText, setBodyText] = useState(defaultBody);
  const [toInput, setToInput] = useState(allEmails.join(", "));
  const [ccInput, setCcInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const parseEmails = (val: string) =>
    val
      .split(/[,;\s]+/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));

  const handleSend = async () => {
    const recipients = parseEmails(toInput);
    if (recipients.length === 0) { setError("Please enter at least one recipient email."); return; }
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/clients/${clientId}/signoff-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients,
          cc: parseEmails(ccInput),
          customSubject: subject !== defaultSubject ? subject : undefined,
          customBody: bodyText !== defaultBody ? bodyText : undefined,
          userId: session?.id,
          userName: session ? `${session.name} ${session.surname}` : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to send email"); return; }
      setSent(true);
      setTimeout(() => onClose(), 1800);
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
            <h2 className="text-base font-bold text-oj-dark">Send Control File Sign-off Email</h2>
            <p className="text-xs text-oj-muted mt-0.5">Request client sign-off via Cognito form</p>
          </div>
          <button onClick={onClose} className="text-oj-muted hover:text-oj-dark transition-colors text-xl leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {/* To */}
          <div>
            <label className="block text-xs font-semibold text-oj-muted mb-1 uppercase tracking-wide">To</label>
            <input
              type="text"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              placeholder="email1@example.com, email2@example.com"
              className="w-full border border-oj-border rounded-lg px-3 py-2 text-sm text-oj-dark focus:outline-none focus:border-oj-blue"
            />
            <p className="text-xs text-oj-muted mt-1">Separate multiple emails with commas. Pre-filled from personnel form.</p>
          </div>

          {/* CC */}
          <div>
            <label className="block text-xs font-semibold text-oj-muted mb-1 uppercase tracking-wide">CC <span className="font-normal text-oj-muted">(optional)</span></label>
            <input
              type="text"
              value={ccInput}
              onChange={(e) => setCcInput(e.target.value)}
              placeholder="cc1@example.com, cc2@example.com"
              className="w-full border border-oj-border rounded-lg px-3 py-2 text-sm text-oj-dark focus:outline-none focus:border-oj-blue"
            />
          </div>

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

          {/* Body */}
          <div>
            <label className="block text-xs font-semibold text-oj-muted mb-1 uppercase tracking-wide">Message</label>
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={10}
              className="w-full border border-oj-border rounded-lg px-3 py-2 text-sm text-oj-dark resize-y focus:outline-none focus:border-oj-blue leading-relaxed font-mono"
            />
          </div>

          {/* Locked Cognito link note */}
          <div className="bg-oj-bg border border-oj-border rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-oj-muted mb-1">Cognito Sign-off Form Link</p>
            <p className="text-xs text-oj-blue break-all">{SIGNOFF_FORM_URL}</p>
            <p className="text-xs text-oj-muted mt-1">This link is embedded in the email body. Edit the body above if you need to change it.</p>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-oj-border flex items-center justify-between gap-3">
          <div className="text-xs text-oj-muted">
            <span className="font-semibold">Reply-to:</span>{" "}
            <span className="text-oj-dark">{camEmail}</span>
          </div>
          <div className="flex gap-2">
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
                <>✉ Confirm Send</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
