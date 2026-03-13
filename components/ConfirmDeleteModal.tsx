"use client";

import { useState } from "react";

type Props = {
  clientName: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
};

export default function ConfirmDeleteModal({ clientName, onConfirm, onClose }: Props) {
  const [field1, setField1] = useState("");
  const [field2, setField2] = useState("");
  const [loading, setLoading] = useState(false);

  const canDelete = field1 === "DELETE" && field2 === clientName;

  const handleConfirm = async () => {
    if (!canDelete) return;
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="p-6 border-b border-red-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-oj-dark">Delete {clientName}</h2>
              <p className="text-xs text-red-600 mt-0.5 font-medium">This is permanent and cannot be undone.</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-oj-muted leading-relaxed">
            All client data, checklist progress, personnel records, and linked integrations will be permanently removed. There is no recovery.
          </p>

          <div>
            <label className="block text-xs font-semibold text-oj-dark mb-1.5">
              Type <span className="font-mono bg-red-50 text-red-600 px-1 rounded">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={field1}
              onChange={(e) => setField1(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full border border-oj-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 font-mono"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-oj-dark mb-1.5">
              Type the client name to confirm
            </label>
            <input
              type="text"
              value={field2}
              onChange={(e) => setField2(e.target.value)}
              placeholder={clientName}
              className="w-full border border-oj-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-oj-border flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm text-oj-muted border border-oj-border rounded-lg hover:text-oj-dark transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canDelete || loading}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                Deleting…
              </>
            ) : (
              "Delete Client"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
