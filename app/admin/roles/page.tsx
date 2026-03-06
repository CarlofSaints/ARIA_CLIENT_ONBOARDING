"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";

type Permission = { id: string; name: string; description: string };
type Role = { id: string; name: string; description: string; builtIn: boolean; permissionIds: string[] };

export default function ManageRoles() {
  const { ready } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [draftPermIds, setDraftPermIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    if (!ready) return;
    Promise.all([
      fetch("/api/roles").then((r) => r.json()),
      fetch("/api/permissions").then((r) => r.json()),
    ]).then(([r, p]) => {
      setRoles(r);
      setPermissions(p);
      if (r.length > 0) {
        setSelectedRoleId(r[0].id);
        setDraftPermIds(r[0].permissionIds);
      }
      setLoading(false);
    });
  }, [ready]);

  const selectRole = (role: Role) => {
    setSelectedRoleId(role.id);
    setDraftPermIds([...role.permissionIds]);
    setSavedMsg(false);
  };

  const togglePerm = (permId: string) => {
    setDraftPermIds((ids) =>
      ids.includes(permId) ? ids.filter((id) => id !== permId) : [...ids, permId]
    );
    setSavedMsg(false);
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    await fetch(`/api/roles/${selectedRoleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissionIds: draftPermIds }),
    });
    // Refresh roles
    const updated = await fetch("/api/roles").then((r) => r.json());
    setRoles(updated);
    setSaving(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  if (!ready) return null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 text-sm text-oj-muted mb-6">
        <Link href="/admin" className="hover:text-oj-blue">Control Centre</Link>
        <span>/</span>
        <span className="text-oj-dark font-medium">Roles & Permissions</span>
      </div>

      <div className="mb-8">
        <div className="text-xs font-bold text-oj-orange tracking-widest mb-1 uppercase">Admin</div>
        <h1 className="text-2xl font-bold text-oj-blue mb-1">Roles & Permissions</h1>
        <p className="text-sm text-oj-muted">
          Select a role to view and edit its permission assignments.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-oj-muted">Loading...</div>
      ) : (
        <div className="flex gap-6">
          {/* Role list */}
          <div className="w-56 shrink-0">
            <div className="bg-oj-white border border-oj-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-oj-border bg-oj-bg">
                <span className="text-xs font-bold text-oj-muted uppercase tracking-wider">Roles</span>
              </div>
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => selectRole(role)}
                  className={`w-full text-left px-4 py-3 border-b border-oj-border last:border-0 transition-colors text-sm ${
                    selectedRoleId === role.id
                      ? "bg-oj-blue-light text-oj-blue font-semibold"
                      : "text-oj-dark hover:bg-oj-bg"
                  }`}
                >
                  <div>{role.name}</div>
                  {role.builtIn && (
                    <div className="text-xs text-oj-muted font-normal mt-0.5">Built-in</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions panel */}
          <div className="flex-1">
            {selectedRole ? (
              <div className="bg-oj-white border border-oj-border rounded-xl shadow-sm">
                <div className="px-6 py-4 border-b border-oj-border flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-oj-dark">{selectedRole.name}</h2>
                    <p className="text-xs text-oj-muted mt-0.5">{selectedRole.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {savedMsg && (
                      <span className="text-xs text-green-600 font-medium">Saved!</span>
                    )}
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-oj-blue text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-oj-blue-hover transition-colors disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 gap-2">
                    {permissions.map((perm) => {
                      const checked = draftPermIds.includes(perm.id);
                      return (
                        <label
                          key={perm.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors select-none ${
                            checked
                              ? "border-oj-blue bg-oj-blue-light"
                              : "border-oj-border hover:border-oj-blue hover:bg-oj-blue-light/30"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePerm(perm.id)}
                            className="mt-0.5 accent-oj-blue shrink-0"
                          />
                          <div>
                            <div className={`text-sm font-medium ${checked ? "text-oj-blue" : "text-oj-dark"}`}>
                              {perm.name}
                            </div>
                            <div className="text-xs text-oj-muted mt-0.5">{perm.description}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <div className="mt-4 text-xs text-oj-muted">
                    {draftPermIds.length} of {permissions.length} permissions selected
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-oj-muted">Select a role to manage permissions.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
