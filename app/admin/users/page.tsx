"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";

type User = {
  id: string;
  name: string;
  surname: string;
  email: string;
  cell: string;
  roleId: string;
  active: boolean;
  forcePasswordChange: boolean;
  firstLoginAt: string | null;
  createdAt: string;
};

type Role = { id: string; name: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generatePassword(length = 12): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ─── Modal Shell ─────────────────────────────────────────────────────────────

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-oj-border">
          <div>
            <h3 className="text-base font-bold text-oj-dark">{title}</h3>
            {subtitle && <p className="text-xs text-oj-muted mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-oj-muted hover:text-oj-dark text-2xl leading-none mt-0.5 ml-4"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────

function EditModal({
  user,
  roles,
  onClose,
  onSaved,
}: {
  user: User;
  roles: Role[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: user.name,
    surname: user.surname,
    email: user.email,
    cell: user.cell,
    roleId: user.roleId,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Save failed");
    } else {
      onSaved();
      onClose();
    }
    setSaving(false);
  };

  return (
    <Modal
      title="Edit User"
      subtitle={`${user.name} ${user.surname} · ${user.email}`}
      onClose={onClose}
    >
      <div className="grid grid-cols-2 gap-3 mb-5">
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="First name"
          className="border border-oj-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue"
        />
        <input
          value={form.surname}
          onChange={(e) => setForm((f) => ({ ...f, surname: e.target.value }))}
          placeholder="Surname"
          className="border border-oj-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue"
        />
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="Email address"
          className="border border-oj-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue col-span-2"
        />
        <input
          value={form.cell}
          onChange={(e) => setForm((f) => ({ ...f, cell: e.target.value }))}
          placeholder="Cell number"
          className="border border-oj-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue"
        />
        <select
          value={form.roleId}
          onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))}
          className="border border-oj-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue bg-white"
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-oj-blue text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-oj-blue-hover transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
        <button onClick={onClose} className="text-sm text-oj-muted hover:text-oj-dark px-3">
          Cancel
        </button>
      </div>
    </Modal>
  );
}

// ─── Set Password Modal ───────────────────────────────────────────────────────

function PasswordModal({
  user,
  onClose,
  onSaved,
}: {
  user: User;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [forceChange, setForceChange] = useState(true);
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const mismatch = !!confirm && password !== confirm;
  const valid = password.length >= 6 && !mismatch && confirm === password;

  const handleGenerate = () => {
    const pw = generatePassword();
    setPassword(pw);
    setConfirm(pw);
    setShowPw(true);
  };

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password,
        forcePasswordChange: forceChange,
        notifyUser: notify,
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Save failed");
    } else {
      onSaved();
      onClose();
    }
    setSaving(false);
  };

  return (
    <Modal
      title="Set Password"
      subtitle={`${user.name} ${user.surname} · ${user.email}`}
      onClose={onClose}
    >
      <div className="space-y-3 mb-5">
        {/* Password field */}
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password (min 6 chars)"
            className="w-full border border-oj-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue pr-16 placeholder:text-oj-muted"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-oj-muted hover:text-oj-dark font-medium select-none"
          >
            {showPw ? "Hide" : "Show"}
          </button>
        </div>

        {/* Confirm field */}
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password"
            className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue pr-7 placeholder:text-oj-muted ${
              mismatch ? "border-red-400 bg-red-50" : "border-oj-border"
            }`}
          />
          {confirm && (
            <span
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold ${
                mismatch ? "text-red-500" : "text-green-500"
              }`}
            >
              {mismatch ? "✗" : "✓"}
            </span>
          )}
        </div>

        {/* Generate button */}
        <button
          type="button"
          onClick={handleGenerate}
          className="text-xs font-semibold text-oj-blue hover:text-oj-blue-hover"
        >
          Generate random password
        </button>
      </div>

      {/* Options */}
      <div className="bg-oj-bg rounded-lg px-4 py-3 space-y-2 mb-5">
        <label className="flex items-center gap-2.5 text-sm text-oj-dark cursor-pointer select-none">
          <input
            type="checkbox"
            checked={forceChange}
            onChange={(e) => setForceChange(e.target.checked)}
            className="accent-oj-blue"
          />
          Force password change on first login
        </label>
        <label className="flex items-center gap-2.5 text-sm text-oj-dark cursor-pointer select-none">
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            className="accent-oj-blue"
          />
          Email login credentials to user
        </label>
      </div>

      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !valid}
          className="bg-oj-blue text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-oj-blue-hover transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Set Password"}
        </button>
        <button onClick={onClose} className="text-sm text-oj-muted hover:text-oj-dark px-3">
          Cancel
        </button>
      </div>
    </Modal>
  );
}

// ─── Add User Form ────────────────────────────────────────────────────────────

const emptyForm = {
  name: "",
  surname: "",
  email: "",
  cell: "",
  roleId: "",
  password: "",
  confirmPassword: "",
  notifyUser: true,
  forcePasswordChange: true,
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ManageUsers() {
  const { ready } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editUser, setEditUser] = useState<User | null>(null);
  const [pwUser, setPwUser] = useState<User | null>(null);

  // Per-row notify state
  const [notifyingId, setNotifyingId] = useState<string | null>(null);
  const [notifyResult, setNotifyResult] = useState<{
    id: string;
    ok: boolean;
    text: string;
  } | null>(null);

  useEffect(() => {
    if (ready) {
      loadUsers();
      fetch("/api/roles")
        .then((r) => r.json())
        .then(setRoles);
    }
  }, [ready]);

  const loadUsers = async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    setUsers(await res.json());
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        surname: form.surname,
        email: form.email,
        cell: form.cell,
        roleId: form.roleId,
        password: form.password,
        notifyUser: form.notifyUser,
        forcePasswordChange: form.forcePasswordChange,
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed to add user");
    } else {
      setForm(emptyForm);
      setShowPw(false);
      await loadUsers();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    await loadUsers();
  };

  const handleToggleActive = async (user: User) => {
    await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    await loadUsers();
  };

  const handleNotify = async (user: User) => {
    setNotifyingId(user.id);
    setNotifyResult(null);
    const res = await fetch(`/api/users/${user.id}/notify`, { method: "POST" });
    const ok = res.ok;
    setNotifyResult({
      id: user.id,
      ok,
      text: ok ? "Notification sent" : "Send failed",
    });
    setNotifyingId(null);
    if (ok) setTimeout(() => setNotifyResult(null), 3500);
  };

  const roleNameFor = (roleId: string) =>
    roles.find((r) => r.id === roleId)?.name ?? roleId;

  if (!ready) return null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-oj-muted mb-6">
        <Link href="/admin" className="hover:text-oj-blue">
          Control Centre
        </Link>
        <span>/</span>
        <span className="text-oj-dark font-medium">Users</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="text-xs font-bold text-oj-orange tracking-widest mb-1 uppercase">
          Admin
        </div>
        <h1 className="text-2xl font-bold text-oj-blue mb-1">Manage Users</h1>
        <p className="text-sm text-oj-muted">
          Add, edit, set passwords, and manage system users.
        </p>
      </div>

      {/* ── Add form ─────────────────────────────────────────────────────── */}
      <form
        onSubmit={handleAdd}
        className="bg-oj-white border border-oj-border rounded-xl p-6 shadow-sm mb-6"
      >
        <h2 className="text-sm font-bold text-oj-dark mb-4">Add New User</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input
            type="text"
            required
            placeholder="First name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="border border-oj-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue placeholder:text-oj-muted"
          />
          <input
            type="text"
            required
            placeholder="Surname"
            value={form.surname}
            onChange={(e) => setForm((f) => ({ ...f, surname: e.target.value }))}
            className="border border-oj-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue placeholder:text-oj-muted"
          />
          <input
            type="email"
            required
            placeholder="Email address"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="border border-oj-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue placeholder:text-oj-muted"
          />
          <input
            type="tel"
            placeholder="Cell number"
            value={form.cell}
            onChange={(e) => setForm((f) => ({ ...f, cell: e.target.value }))}
            className="border border-oj-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue placeholder:text-oj-muted"
          />
          <select
            required
            value={form.roleId}
            onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))}
            className="border border-oj-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue bg-white text-oj-dark"
          >
            <option value="">Select role…</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          {/* Password */}
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              required
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full border border-oj-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue placeholder:text-oj-muted pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-oj-muted hover:text-oj-dark text-xs font-medium select-none"
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
          {/* Confirm password */}
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              required
              placeholder="Confirm password"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm((f) => ({ ...f, confirmPassword: e.target.value }))
              }
              className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue placeholder:text-oj-muted pr-10 ${
                form.confirmPassword && form.password !== form.confirmPassword
                  ? "border-red-400 bg-red-50"
                  : "border-oj-border"
              }`}
            />
            {form.confirmPassword && form.password !== form.confirmPassword && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 text-xs font-bold">
                ✗
              </span>
            )}
            {form.confirmPassword &&
              form.password === form.confirmPassword &&
              form.password && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-xs font-bold">
                  ✓
                </span>
              )}
          </div>
        </div>

        {/* Checkboxes */}
        <div className="flex gap-6 mb-4">
          <label className="flex items-center gap-2 text-sm text-oj-dark cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.notifyUser}
              onChange={(e) => setForm((f) => ({ ...f, notifyUser: e.target.checked }))}
              className="accent-oj-blue"
            />
            Send welcome email with login details
          </label>
          <label className="flex items-center gap-2 text-sm text-oj-dark cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.forcePasswordChange}
              onChange={(e) =>
                setForm((f) => ({ ...f, forcePasswordChange: e.target.checked }))
              }
              className="accent-oj-blue"
            />
            Force password change on first login
          </label>
        </div>

        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
        <button
          type="submit"
          disabled={
            saving ||
            (!!form.confirmPassword && form.password !== form.confirmPassword)
          }
          className="bg-oj-blue text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-oj-blue-hover transition-colors disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add User"}
        </button>
      </form>

      {/* ── Users list ───────────────────────────────────────────────────── */}
      <div className="bg-oj-white border border-oj-border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-oj-muted">Loading…</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-oj-muted">No users yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-oj-border bg-oj-bg">
                {["Name", "Email", "Role", "Status", "First Login", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-bold text-oj-muted uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <tr
                  key={user.id}
                  className={`border-b border-oj-border last:border-0 ${
                    i % 2 === 1 ? "bg-oj-bg/50" : ""
                  }`}
                >
                  {/* Name */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-oj-dark">
                      {user.name} {user.surname}
                    </div>
                    <div className="text-xs text-oj-muted">{user.cell || "—"}</div>
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3 text-oj-muted text-xs">{user.email}</td>

                  {/* Role */}
                  <td className="px-4 py-3 text-oj-dark text-xs">
                    {roleNameFor(user.roleId)}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          user.active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {user.active ? "Active" : "Inactive"}
                      </span>
                      {user.forcePasswordChange && (
                        <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                          Must change PW
                        </span>
                      )}
                    </div>
                  </td>

                  {/* First login */}
                  <td className="px-4 py-3 text-xs text-oj-muted">
                    {user.firstLoginAt
                      ? new Date(user.firstLoginAt).toLocaleDateString("en-ZA")
                      : "Never"}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-x-3 gap-y-1 justify-end items-center">
                      <button
                        onClick={() => setEditUser(user)}
                        className="text-xs font-semibold text-oj-blue hover:text-oj-blue-hover"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setPwUser(user)}
                        className="text-xs font-semibold text-oj-blue hover:text-oj-blue-hover"
                      >
                        Set Password
                      </button>

                      {/* Notify inline feedback */}
                      {notifyResult?.id === user.id ? (
                        <span
                          className={`text-xs font-medium ${
                            notifyResult.ok ? "text-green-600" : "text-red-500"
                          }`}
                        >
                          {notifyResult.text}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleNotify(user)}
                          disabled={notifyingId === user.id}
                          className="text-xs font-semibold text-oj-muted hover:text-oj-dark disabled:opacity-40"
                        >
                          {notifyingId === user.id ? "Sending…" : "Notify"}
                        </button>
                      )}

                      <button
                        onClick={() => handleToggleActive(user)}
                        className="text-xs font-semibold text-oj-muted hover:text-oj-dark"
                      >
                        {user.active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-xs font-semibold text-oj-orange hover:text-oj-orange-hover"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {editUser && (
        <EditModal
          user={editUser}
          roles={roles}
          onClose={() => setEditUser(null)}
          onSaved={loadUsers}
        />
      )}
      {pwUser && (
        <PasswordModal
          user={pwUser}
          onClose={() => setPwUser(null)}
          onSaved={loadUsers}
        />
      )}
    </div>
  );
}
