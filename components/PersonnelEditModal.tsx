"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type Channel = { id: string; name: string };
type RoleOption = { id: string; label: string; active: boolean; order: number };
type CustomField = {
  id: string; label: string;
  type: "text" | "email" | "tel" | "select";
  options?: string[];
  required: boolean; active: boolean; order: number;
};
type PersonnelConfig = { roleOptions: RoleOption[]; customFields: CustomField[] };

type PersonnelRow = {
  role: string;
  name: string;
  email: string;
  cell: string;
  channels: string[];
  principal?: string;
  brand?: string;
  customFields?: Record<string, string>;
};

type Row = PersonnelRow & { _key: string; principal: string; brand: string; customFields: Record<string, string> };

function makeRow(clientName = ""): Row {
  return { _key: crypto.randomUUID(), role: "", name: "", email: "", cell: "", channels: [], principal: clientName, brand: clientName, customFields: {} };
}

// Portal-based channel dropdown (escapes modal overflow)
function ChannelDropdown({ channels, selected, onChange }: {
  channels: Channel[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    function update() {
      if (buttonRef.current) setRect(buttonRef.current.getBoundingClientRect());
    }
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  const handleToggle = () => {
    if (!open && buttonRef.current) setRect(buttonRef.current.getBoundingClientRect());
    setOpen((o) => !o);
  };

  const toggleId = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  const selectedNames = channels.filter((c) => selected.includes(c.id)).map((c) => c.name);
  const panelStyle: React.CSSProperties = rect
    ? { position: "fixed", top: rect.bottom + 4, left: rect.left, width: 256, zIndex: 99999 }
    : { display: "none" };

  return (
    <div>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="w-full min-w-[180px] text-left text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white hover:border-[#3D6273] focus:outline-none focus:ring-2 focus:ring-[#3D6273] focus:ring-offset-1 flex items-center justify-between gap-2"
      >
        <span className={`truncate ${selected.length === 0 ? "text-gray-400" : "text-gray-800 font-medium"}`}>
          {selected.length === 0 ? "Select channels…" : `${selected.length} selected`}
        </span>
        <span className="shrink-0 text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {selectedNames.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selectedNames.map((name) => (
            <span key={name} className="text-xs bg-[#3D6273] text-white px-2 py-0.5 rounded-full font-medium">{name}</span>
          ))}
        </div>
      )}

      {open && typeof document !== "undefined" && createPortal(
        <div ref={panelRef} style={panelStyle} className="bg-white border-2 border-[#3D6273] rounded-xl shadow-2xl overflow-hidden">
          <div className="px-3 py-2 bg-[#3D6273]">
            <p className="text-xs font-bold text-white uppercase tracking-wide">Select channels</p>
          </div>
          {channels.length === 0 ? (
            <p className="text-xs text-gray-400 px-4 py-3">No channels assigned to this client</p>
          ) : (
            <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
              {channels.map((ch) => {
                const checked = selected.includes(ch.id);
                return (
                  <label key={ch.id} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${checked ? "bg-[#eef4f7]" : "hover:bg-gray-50"}`}>
                    <div className={`w-4 h-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${checked ? "bg-[#3D6273] border-[#3D6273]" : "border-gray-400 bg-white"}`}>
                      {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span className={`text-sm ${checked ? "text-[#3D6273] font-semibold" : "text-gray-700"}`}>{ch.name}</span>
                    <input type="checkbox" checked={checked} onChange={() => toggleId(ch.id)} className="sr-only" />
                  </label>
                );
              })}
            </div>
          )}
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
            <span className="text-xs text-gray-400">{selected.length} of {channels.length} selected</span>
            <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-[#3D6273] hover:text-[#2d4e5e]">Done</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function PersonnelEditModal({ clientId, clientName, initialRows, channels, onClose, onSaved }: {
  clientId: string;
  clientName: string;
  initialRows: PersonnelRow[];
  channels: Channel[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [personnelConfig, setPersonnelConfig] = useState<PersonnelConfig | null>(null);
  const [rows, setRows] = useState<Row[]>(() =>
    initialRows.length > 0
      ? initialRows.map((r) => ({ ...r, _key: crypto.randomUUID(), principal: r.principal ?? clientName, brand: r.brand ?? clientName, customFields: r.customFields ?? {} }))
      : [makeRow(clientName)]
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    fetch("/api/personnel-config").then((r) => r.json()).then(setPersonnelConfig);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const updateRow = (key: string, field: keyof Omit<Row, "_key" | "channels" | "customFields">, value: string) => {
    setRows((prev) => prev.map((r) => r._key === key ? { ...r, [field]: value } : r));
    setErrors((prev) => { const n = { ...prev }; delete n[`${key}-${field}`]; return n; });
  };

  const updateChannels = (key: string, ids: string[]) => {
    setRows((prev) => prev.map((r) => r._key === key ? { ...r, channels: ids } : r));
  };

  const updatePrincipal = (key: string, value: string) => {
    setRows((prev) => prev.map((r) => r._key === key ? { ...r, principal: value } : r));
  };

  const updateBrand = (key: string, value: string) => {
    setRows((prev) => prev.map((r) => r._key === key ? { ...r, brand: value } : r));
  };

  const updateCustomField = (key: string, fieldId: string, value: string) => {
    setRows((prev) => prev.map((r) => r._key === key ? { ...r, customFields: { ...r.customFields, [fieldId]: value } } : r));
  };

  const deleteRow = (key: string) => {
    setRows((prev) => prev.length > 1 ? prev.filter((r) => r._key !== key) : prev);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    rows.forEach((row) => {
      if (!row.role) errs[`${row._key}-role`] = "Required";
      if (!row.name.trim()) errs[`${row._key}-name`] = "Required";
      if (!row.email.trim()) errs[`${row._key}-email`] = "Required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errs[`${row._key}-email`] = "Invalid email";
      if (!row.cell.trim()) errs[`${row._key}-cell`] = "Required";
      personnelConfig?.customFields
        .filter((f) => f.active && f.required)
        .forEach((f) => {
          if (!row.customFields[f.id]?.trim()) errs[`${row._key}-${f.id}`] = "Required";
        });
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/clients/${clientId}/personnel`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rows.map(({ _key: _k, ...rest }) => rest) }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error ?? "Save failed. Please try again.");
        return;
      }
      onSaved();
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const roleOptions = (personnelConfig?.roleOptions ?? []).filter((r) => r.active).sort((a, b) => a.order - b.order);
  const activeCustomFields = (personnelConfig?.customFields ?? []).filter((f) => f.active).sort((a, b) => a.order - b.order);

  const modal = (
    <div className="fixed inset-0 z-[500] flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl">
        {/* Header */}
        <div className="bg-[#3D6273] text-white px-6 py-5 rounded-t-2xl flex items-start justify-between">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-[#9ecbd8] mb-1">OuterJoin ARIA</p>
            <h2 className="text-xl font-bold">Edit Personnel Information</h2>
            <p className="text-sm text-[#d0e6ef] mt-0.5">{clientName}</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-3xl leading-none mt-1">×</button>
        </div>

        {/* Body */}
        {!personnelConfig ? (
          <div className="flex items-center justify-center py-20 gap-3 text-[#3D6273]">
            <span className="animate-spin w-5 h-5 border-2 border-[#3D6273] border-t-transparent rounded-full inline-block"></span>
            <span className="text-sm">Loading…</span>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 border-b border-gray-100 text-sm text-gray-600 leading-relaxed">
              Edit personnel details below. Changes will be saved to SharePoint.
            </div>

            {/* Table — desktop */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="bg-[#F5F7F8] border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide w-[160px]">Role <span className="text-red-500">*</span></th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Name & Surname <span className="text-red-500">*</span></th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Email <span className="text-red-500">*</span></th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide w-[140px]">Cell <span className="text-red-500">*</span></th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide w-[200px]">Channels</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide w-[160px]">Principal</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide w-[160px]">Brand</th>
                    {activeCustomFields.map((f) => (
                      <th key={f.id} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
                        {f.label} {f.required && <span className="text-red-500">*</span>}
                      </th>
                    ))}
                    <th className="w-[40px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row) => (
                    <tr key={row._key} className="hover:bg-[#F5F7F8]/50">
                      <td className="px-4 py-3">
                        <select value={row.role} onChange={(e) => updateRow(row._key, "role", e.target.value)}
                          className={`w-full text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#3D6273] focus:ring-offset-1 ${errors[`${row._key}-role`] ? "border-red-400" : "border-gray-300"}`}>
                          <option value="">Select…</option>
                          {roleOptions.map((r) => <option key={r.id} value={r.label}>{r.label}</option>)}
                        </select>
                        {errors[`${row._key}-role`] && <p className="text-xs text-red-500 mt-0.5">{errors[`${row._key}-role`]}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <input type="text" value={row.name} onChange={(e) => updateRow(row._key, "name", e.target.value)} placeholder="Full name"
                          className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D6273] focus:ring-offset-1 ${errors[`${row._key}-name`] ? "border-red-400" : "border-gray-300"}`} />
                        {errors[`${row._key}-name`] && <p className="text-xs text-red-500 mt-0.5">{errors[`${row._key}-name`]}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <input type="email" value={row.email} onChange={(e) => updateRow(row._key, "email", e.target.value)} placeholder="email@company.com"
                          className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D6273] focus:ring-offset-1 ${errors[`${row._key}-email`] ? "border-red-400" : "border-gray-300"}`} />
                        {errors[`${row._key}-email`] && <p className="text-xs text-red-500 mt-0.5">{errors[`${row._key}-email`]}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <input type="tel" value={row.cell} onChange={(e) => updateRow(row._key, "cell", e.target.value)} placeholder="+27 00 000 0000"
                          className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D6273] focus:ring-offset-1 ${errors[`${row._key}-cell`] ? "border-red-400" : "border-gray-300"}`} />
                        {errors[`${row._key}-cell`] && <p className="text-xs text-red-500 mt-0.5">{errors[`${row._key}-cell`]}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <ChannelDropdown channels={channels} selected={row.channels} onChange={(ids) => updateChannels(row._key, ids)} />
                      </td>
                      <td className="px-4 py-3">
                        <input type="text" value={row.principal} onChange={(e) => updatePrincipal(row._key, e.target.value)} placeholder={clientName}
                          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D6273] focus:ring-offset-1" />
                      </td>
                      <td className="px-4 py-3">
                        <input type="text" value={row.brand} onChange={(e) => updateBrand(row._key, e.target.value)} placeholder={clientName}
                          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D6273] focus:ring-offset-1" />
                      </td>
                      {activeCustomFields.map((f) => (
                        <td key={f.id} className="px-4 py-3">
                          {f.type === "select" ? (
                            <select value={row.customFields[f.id] ?? ""} onChange={(e) => updateCustomField(row._key, f.id, e.target.value)}
                              className={`w-full text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#3D6273] ${errors[`${row._key}-${f.id}`] ? "border-red-400" : "border-gray-300"}`}>
                              <option value="">Select…</option>
                              {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input type={f.type} value={row.customFields[f.id] ?? ""} onChange={(e) => updateCustomField(row._key, f.id, e.target.value)}
                              className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D6273] ${errors[`${row._key}-${f.id}`] ? "border-red-400" : "border-gray-300"}`} />
                          )}
                          {errors[`${row._key}-${f.id}`] && <p className="text-xs text-red-500 mt-0.5">{errors[`${row._key}-${f.id}`]}</p>}
                        </td>
                      ))}
                      <td className="px-2 py-3 text-center">
                        <button type="button" onClick={() => deleteRow(row._key)} disabled={rows.length === 1}
                          className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-lg leading-none" title="Remove row">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile — card layout */}
            <div className="sm:hidden space-y-4 p-4">
              {rows.map((row, idx) => (
                <div key={row._key} className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#3D6273] uppercase tracking-wide">Person {idx + 1}</span>
                    <button type="button" onClick={() => deleteRow(row._key)} disabled={rows.length === 1} className="text-gray-300 hover:text-red-400 text-xl disabled:opacity-30">×</button>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Role <span className="text-red-500">*</span></label>
                    <select value={row.role} onChange={(e) => updateRow(row._key, "role", e.target.value)}
                      className={`w-full text-sm border rounded-lg px-3 py-2 bg-white ${errors[`${row._key}-role`] ? "border-red-400" : "border-gray-300"}`}>
                      <option value="">Select…</option>
                      {roleOptions.map((r) => <option key={r.id} value={r.label}>{r.label}</option>)}
                    </select>
                    {errors[`${row._key}-role`] && <p className="text-xs text-red-500 mt-0.5">{errors[`${row._key}-role`]}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Name & Surname <span className="text-red-500">*</span></label>
                    <input type="text" value={row.name} onChange={(e) => updateRow(row._key, "name", e.target.value)} placeholder="Full name"
                      className={`w-full text-sm border rounded-lg px-3 py-2 ${errors[`${row._key}-name`] ? "border-red-400" : "border-gray-300"}`} />
                    {errors[`${row._key}-name`] && <p className="text-xs text-red-500 mt-0.5">{errors[`${row._key}-name`]}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Email <span className="text-red-500">*</span></label>
                    <input type="email" value={row.email} onChange={(e) => updateRow(row._key, "email", e.target.value)} placeholder="email@company.com"
                      className={`w-full text-sm border rounded-lg px-3 py-2 ${errors[`${row._key}-email`] ? "border-red-400" : "border-gray-300"}`} />
                    {errors[`${row._key}-email`] && <p className="text-xs text-red-500 mt-0.5">{errors[`${row._key}-email`]}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Cell Number <span className="text-red-500">*</span></label>
                    <input type="tel" value={row.cell} onChange={(e) => updateRow(row._key, "cell", e.target.value)} placeholder="+27 00 000 0000"
                      className={`w-full text-sm border rounded-lg px-3 py-2 ${errors[`${row._key}-cell`] ? "border-red-400" : "border-gray-300"}`} />
                    {errors[`${row._key}-cell`] && <p className="text-xs text-red-500 mt-0.5">{errors[`${row._key}-cell`]}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Channels</label>
                    <ChannelDropdown channels={channels} selected={row.channels} onChange={(ids) => updateChannels(row._key, ids)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Principal</label>
                    <input type="text" value={row.principal} onChange={(e) => updatePrincipal(row._key, e.target.value)} placeholder={clientName}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Brand</label>
                    <input type="text" value={row.brand} onChange={(e) => updateBrand(row._key, e.target.value)} placeholder={clientName}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  {activeCustomFields.map((f) => (
                    <div key={f.id}>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label} {f.required && <span className="text-red-500">*</span>}</label>
                      {f.type === "select" ? (
                        <select value={row.customFields[f.id] ?? ""} onChange={(e) => updateCustomField(row._key, f.id, e.target.value)}
                          className={`w-full text-sm border rounded-lg px-3 py-2 bg-white ${errors[`${row._key}-${f.id}`] ? "border-red-400" : "border-gray-300"}`}>
                          <option value="">Select…</option>
                          {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input type={f.type} value={row.customFields[f.id] ?? ""} onChange={(e) => updateCustomField(row._key, f.id, e.target.value)}
                          className={`w-full text-sm border rounded-lg px-3 py-2 ${errors[`${row._key}-${f.id}`] ? "border-red-400" : "border-gray-300"}`} />
                      )}
                      {errors[`${row._key}-${f.id}`] && <p className="text-xs text-red-500 mt-0.5">{errors[`${row._key}-${f.id}`]}</p>}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Add person */}
            <div className="px-6 py-4 border-t border-gray-100">
              <button type="button" onClick={() => setRows((prev) => [...prev, makeRow(clientName)])}
                className="flex items-center gap-2 text-sm font-semibold text-[#3D6273] hover:text-[#2d4e5e] transition-colors">
                <span className="text-lg leading-none">+</span> Add person
              </button>
            </div>

            {/* Footer actions */}
            {saveError && (
              <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{saveError}</div>
            )}
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button type="button" onClick={onClose}
                className="px-6 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-600 hover:border-gray-400 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleSave} disabled={saving}
                className="bg-[#3D6273] text-white font-semibold text-sm px-8 py-2.5 rounded-xl hover:bg-[#2d4e5e] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
                {saving && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block"></span>}
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : null;
}
