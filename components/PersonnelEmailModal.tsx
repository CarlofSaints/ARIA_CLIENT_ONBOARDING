"use client";

import { useState } from "react";

type Props = {
  clientId: string;
  clientName: string;
  contactName: string;
  camName: string;
  camEmail: string;
  personnelToken: string;
  clientEmails: string[];
  onClose: () => void;
};

export default function PersonnelEmailModal({
  clientId,
  clientName,
  contactName,
  camName,
  camEmail,
  personnelToken,
  clientEmails,
  onClose,
}: Props) {
  const formUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/personnel/${personnelToken}`
      : `/personnel/${personnelToken}`;

  const defaultSubject = `Personnel Information Form — ${clientName}`;
  const defaultBody = `Good day ${contactName},

My name is ${camName} and I am your Account Manager (CAM) at OuterJoin.

I am responsible for your onboarding process and the administration of your account. I will also assist with ad hoc reporting as and when you need it.

For now, I would like to get to know your team so I know how to direct my communication. Could you please fill in the form at the link below:`;

  const [subject, setSubject] = useState(defaultSubject);
  const [bodyText, setBodyText] = useState(defaultBody);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/clients/${clientId}/send-personnel-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customBody: bodyText !== defaultBody ? bodyText : undefined,
          customSubject: subject !== defaultSubject ? subject : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send email");
        return;
      }
      setSent(true);
      setTimeout(() => {
        onClose();
      }, 1800);
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
            <h2 className="text-base font-bold text-oj-dark">Email Personnel Form</h2>
            <p className="text-xs text-oj-muted mt-0.5">Preview and edit before sending</p>
          </div>
          <button
            onClick={onClose}
            className="text-oj-muted hover:text-oj-dark transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-oj-muted mb-1 uppercase tracking-wide">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-oj-border rounded-lg px-3 py-2 text-sm text-oj-dark focus:outline-none focus:border-oj-blue"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-semibold text-oj-muted mb-1 uppercase tracking-wide">
              Message
            </label>
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={8}
              className="w-full border border-oj-border rounded-lg px-3 py-2 text-sm text-oj-dark resize-y focus:outline-none focus:border-oj-blue leading-relaxed"
            />
          </div>

          {/* Locked form link */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-xs font-semibold text-oj-muted uppercase tracking-wide">
                Personnel Form Link
              </span>
              <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                🔒 locked
              </span>
            </div>
            <div className="border border-oj-border rounded-lg px-4 py-3 bg-oj-bg">
              <div className="inline-block bg-oj-blue text-white text-sm font-semibold px-4 py-2 rounded-lg mb-2">
                Complete Personnel Form →
              </div>
              <p className="text-xs text-oj-muted break-all">{formUrl}</p>
            </div>
            <p className="text-xs text-oj-muted mt-1.5">
              This link is always included in the email and cannot be removed.
            </p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-oj-border flex items-center justify-between gap-3">
          <div className="text-xs text-oj-muted space-y-0.5">
            <p>
              <span className="font-semibold">From:</span>{" "}
              <span className="text-oj-dark">{camEmail}</span>
            </p>
            <p>
              <span className="font-semibold">To:</span>{" "}
              <span className="text-oj-dark">
                {clientEmails.length > 0 ? clientEmails.join(", ") : "No recipients on record"}
              </span>
            </p>
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
