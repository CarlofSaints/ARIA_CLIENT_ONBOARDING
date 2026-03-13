"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useAuth, clearSession } from "@/lib/useAuth";
import { useRouter } from "next/navigation";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";

type Client = {
  id: string;
  name: string;
  camId: string;
  channelIds: string[];
  startDate: string;
  status: string;
  contactName: string;
  createdAt: string;
  archived?: boolean;
  archivedAt?: string;
  cognitoEntryId?: string;
  checklist: Record<string, { completed: boolean; channelStates?: Record<string, { completed: boolean }> }>;
};

type CAM = { id: string; name: string; surname: string };

type EditDraft = {
  name: string;
  camId: string;
  status: string;
  startDate: string;
};

const phases = [
  { number: "01", title: "Client Intake", description: "CAM captures initial client details, channel selection, and contact information.", href: "/onboarding/new", status: "active" as const, owner: "OJ Internal", icon: "📋" },
  { number: "02", title: "Cognito Data Sync", description: "Pull and verify client billing data from Cognito form submissions. Link entries to clients from each client's detail page.", href: "/", status: "active" as const, owner: "OJ Internal", icon: "🔄" },
  { number: "03", title: "Client Portal Setup", description: "Configure the client-facing portal with branding and access credentials.", href: "#", status: "coming-soon" as const, owner: "OJ + Client", icon: "🏛️" },
  { number: "04", title: "Data Configuration", description: "CAM schedules and conducts a bespoke reporting workshop with the client. Tracked via onboarding checklist.", href: "/", status: "active" as const, owner: "OJ Internal", icon: "⚙️" },
  { number: "05", title: "Client Sign-off", description: "Client signs off on all control files via the Cognito sign-off form. CAM initiates from each client's detail page.", href: "/", status: "active" as const, owner: "Client", icon: "✅" },
];

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

export default function HomePage() {
  const { session, ready } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [cams, setCams] = useState<CAM[]>([]);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  // Edit modal
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [draft, setDraft] = useState<EditDraft>({ name: "", camId: "", status: "", startDate: "" });
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);

  // Row action menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const loadData = async () => {
    const [c, cm] = await Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/cams").then((r) => r.json()),
    ]);
    setClients(c);
    setCams(cm);
  };

  useEffect(() => {
    if (!ready) return;
    loadData();
  }, [ready]);

  // Close kebab menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleArchive = async (client: Client, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(null);
    await fetch(`/api/clients/${client.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true, archivedAt: new Date().toISOString() }),
    });
    await loadData();
  };

  const handleRestore = async (client: Client, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(null);
    await fetch(`/api/clients/${client.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false, archivedAt: null }),
    });
    await loadData();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteClient) return;
    await fetch(`/api/clients/${deleteClient.id}`, { method: "DELETE" });
    setDeleteClient(null);
    await loadData();
  };

  const openEdit = (client: Client, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditClient(client);
    setDraft({
      name: client.name,
      camId: client.camId,
      status: client.status,
      startDate: client.startDate,
    });
  };

  const handleSave = async () => {
    if (!editClient || !draft.name.trim()) return;
    setSaving(true);
    await fetch(`/api/clients/${editClient.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name.trim(),
        camId: draft.camId,
        status: draft.status,
        startDate: draft.startDate,
      }),
    });
    setEditClient(null);
    await loadData();
    setSaving(false);
  };

  if (!ready) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Hero + sign-out */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="text-xs font-bold text-oj-orange tracking-widest mb-2 uppercase">OuterJoin ARIA</p>
          <h1 className="text-3xl font-bold text-oj-blue mb-2">Client Onboarding</h1>
          <p className="text-oj-muted text-base max-w-xl">
            Manage the end-to-end onboarding process for new ARIA clients.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {session && (
            <span className="text-xs text-oj-muted border border-oj-border rounded-lg px-3 py-1.5 bg-oj-white">
              {session.name} {session.surname}
            </span>
          )}
          <button
            onClick={() => { clearSession(); router.push("/login"); }}
            className="text-sm text-oj-muted hover:text-oj-dark border border-oj-border rounded-lg px-4 py-2 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Clients table */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            <h2 className="text-lg font-bold text-oj-dark mr-4">Clients</h2>
            {(["active", "archived"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors capitalize ${
                  activeTab === tab
                    ? "bg-oj-blue text-white"
                    : "text-oj-muted hover:text-oj-dark hover:bg-oj-bg"
                }`}
              >
                {tab}
                <span className="ml-1.5 text-xs opacity-70">
                  ({clients.filter((c) => tab === "archived" ? c.archived === true : !c.archived).length})
                </span>
              </button>
            ))}
          </div>
          <Link href="/onboarding/new" className="text-sm font-semibold text-oj-blue hover:text-oj-blue-hover">
            + New Client
          </Link>
        </div>

        {(() => {
          const filtered = clients.filter((c) =>
            activeTab === "archived" ? c.archived === true : !c.archived
          );

          if (clients.length === 0) {
            return (
              <div className="bg-oj-white border border-oj-border rounded-xl p-8 text-center">
                <p className="text-oj-muted text-sm mb-3">No clients onboarded yet.</p>
                <Link
                  href="/onboarding/new"
                  className="bg-oj-blue text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-oj-blue-hover transition-colors"
                >
                  Create First Client
                </Link>
              </div>
            );
          }

          if (filtered.length === 0) {
            return (
              <div className="bg-oj-white border border-oj-border rounded-xl p-8 text-center">
                <p className="text-oj-muted text-sm">
                  {activeTab === "archived" ? "No archived clients." : "No active clients."}
                </p>
              </div>
            );
          }

          return (
            <div className="bg-oj-white border border-oj-border rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-oj-bg border-b border-oj-border">
                    <th className="text-left px-5 py-3 text-xs font-bold text-oj-muted uppercase tracking-wider">Client</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-oj-muted uppercase tracking-wider">CAM</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-oj-muted uppercase tracking-wider">Date Created</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-oj-muted uppercase tracking-wider">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-oj-muted uppercase tracking-wider">Cognito</th>
                    <th className="px-5 py-3 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((client, i) => {
                    const cam = cams.find((c) => c.id === client.camId);
                    const isMenuOpen = openMenuId === client.id;
                    return (
                      <tr
                        key={client.id}
                        onClick={() => router.push(`/clients/${client.id}`)}
                        className={`border-b border-oj-border last:border-0 cursor-pointer hover:bg-oj-bg/60 transition-colors ${i % 2 === 1 ? "bg-oj-bg/30" : ""}`}
                      >
                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-oj-dark">{client.name}</span>
                          {client.contactName && (
                            <span className="block text-xs text-oj-muted mt-0.5">{client.contactName}</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-oj-dark">
                          {cam ? `${cam.name} ${cam.surname}` : <span className="text-oj-muted">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-oj-muted whitespace-nowrap">
                          {formatDate(client.createdAt)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                            client.status === "live"   ? "bg-green-100 text-green-700" :
                            client.status === "active" ? "bg-blue-100 text-blue-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {client.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {client.cognitoEntryId ? (
                            <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">✓ Linked</span>
                          ) : (
                            <span className="text-xs text-oj-muted">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => openEdit(client, e)}
                              className="text-xs font-semibold text-oj-blue hover:text-oj-blue-hover px-2 py-1 rounded hover:bg-oj-blue-light transition-colors"
                            >
                              Edit
                            </button>
                            <div className="relative" ref={isMenuOpen ? menuRef : null}>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setOpenMenuId(isMenuOpen ? null : client.id);
                                }}
                                className="w-7 h-7 flex items-center justify-center text-oj-muted hover:text-oj-dark hover:bg-oj-bg rounded-md transition-colors text-base"
                                title="More actions"
                              >
                                ⋮
                              </button>
                              {isMenuOpen && (
                                <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-oj-border rounded-xl shadow-lg z-30 py-1 overflow-hidden">
                                  {client.archived ? (
                                    <button
                                      onClick={(e) => handleRestore(client, e)}
                                      className="w-full text-left px-4 py-2 text-sm text-oj-dark hover:bg-oj-bg transition-colors"
                                    >
                                      Restore
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => handleArchive(client, e)}
                                      className="w-full text-left px-4 py-2 text-sm text-oj-dark hover:bg-oj-bg transition-colors"
                                    >
                                      Archive
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      setDeleteClient(client);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
      </section>

      {/* Phase cards */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-oj-dark mb-4">Onboarding Phases</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {phases.map((phase) => (
            <PhaseCard key={phase.number} {...phase} />
          ))}
        </div>
      </div>

      {/* Admin link */}
      <div className="pt-8 border-t border-oj-border flex items-center justify-between">
        <p className="text-sm text-oj-muted">Need to manage CAMs, channels, or users?</p>
        <Link href="/admin" className="text-sm font-semibold text-oj-blue hover:text-oj-blue-hover underline underline-offset-2">
          Control Centre →
        </Link>
      </div>

      {/* Delete modal */}
      {deleteClient && (
        <ConfirmDeleteModal
          clientName={deleteClient.name}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteClient(null)}
        />
      )}

      {/* Edit modal */}
      {editClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditClient(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-oj-border">
              <h2 className="text-base font-bold text-oj-dark">Edit Client</h2>
              <p className="text-xs text-oj-muted mt-0.5">{editClient.name}</p>
            </div>
            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-oj-dark mb-1.5">Client Name</label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  className="w-full border border-oj-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue"
                />
              </div>

              {/* CAM */}
              <div>
                <label className="block text-xs font-semibold text-oj-dark mb-1.5">Account Manager (CAM)</label>
                <select
                  value={draft.camId}
                  onChange={(e) => setDraft((d) => ({ ...d, camId: e.target.value }))}
                  className="w-full border border-oj-border rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-oj-blue"
                >
                  <option value="">— Select CAM —</option>
                  {cams.map((cam) => (
                    <option key={cam.id} value={cam.id}>{cam.name} {cam.surname}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-oj-dark mb-1.5">Status</label>
                <select
                  value={draft.status}
                  onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
                  className="w-full border border-oj-border rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-oj-blue"
                >
                  <option value="intake">Intake</option>
                  <option value="active">Active</option>
                  <option value="live">Live</option>
                </select>
              </div>

              {/* Start date */}
              <div>
                <label className="block text-xs font-semibold text-oj-dark mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={draft.startDate}
                  onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
                  className="w-full border border-oj-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue"
                />
              </div>
            </div>
            <div className="p-6 border-t border-oj-border flex gap-3 justify-end">
              <button
                onClick={() => setEditClient(null)}
                className="px-4 py-2 text-sm text-oj-muted border border-oj-border rounded-lg hover:text-oj-dark transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !draft.name.trim()}
                className="px-5 py-2 text-sm font-semibold bg-oj-blue text-white rounded-lg hover:bg-oj-blue-hover transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PhaseCard({ number, title, description, href, status, owner, icon }: {
  number: string; title: string; description: string; href: string;
  status: "active" | "coming-soon"; owner: string; icon: string;
}) {
  const isActive = status === "active";
  const card = (
    <div className={`rounded-xl border p-6 h-full flex flex-col gap-4 transition-all ${
      isActive ? "bg-oj-white border-oj-border shadow-sm hover:shadow-md hover:border-oj-blue cursor-pointer"
               : "bg-oj-white border-oj-border opacity-55 cursor-not-allowed"}`}>
      <div className="flex items-start justify-between">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
          isActive ? "bg-oj-blue text-white" : "bg-oj-border text-oj-muted"}`}>
          {isActive ? "Active" : "Coming Soon"}
        </span>
      </div>
      <div>
        <div className="text-xs font-bold text-oj-orange tracking-wider mb-1">PHASE {number}</div>
        <h2 className="text-lg font-bold text-oj-dark mb-2">{title}</h2>
        <p className="text-sm text-oj-muted leading-relaxed">{description}</p>
      </div>
      <div className="mt-auto">
        <span className="text-xs text-oj-muted">Owner: <strong className="text-oj-dark font-semibold">{owner}</strong></span>
      </div>
    </div>
  );
  return isActive ? <Link href={href}>{card}</Link> : <div>{card}</div>;
}
