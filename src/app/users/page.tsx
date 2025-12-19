"use client";

import { useEffect, useMemo, useState } from "react";
import type { UserDto, UserRole, ApiErrorShape } from "@/lib/client/api";
import { clientApi } from "@/lib/client/api";

type EditState = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
};

function isApiError(e: unknown): e is ApiErrorShape {
  return !!e && typeof e === "object" && "error" in (e as any);
}

export default function UsersPage() {
  const [meRole, setMeRole] = useState<UserRole | null>(null);
  const [loadedMe, setLoadedMe] = useState(false);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<EditState | null>(null);
  const [creating, setCreating] = useState<EditState | null>(null);

  const canManage = meRole === "ADMIN";

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const me = await clientApi.getMe();
      setMeRole(me.user?.role ?? null);
      setLoadedMe(true);
      if (me.user?.role !== "ADMIN") {
        setUsers([]);
        return;
      }
      const list = await clientApi.listUsers();
      setUsers(list.users);
    } catch (e) {
      if (isApiError(e)) setError(e.error.message);
      else setError("Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const sorted = useMemo(() => {
    return [...users].sort((a, b) => a.email.localeCompare(b.email));
  }, [users]);

  async function onDelete(id: string) {
    if (!confirm("Delete this user?")) return;
    setLoading(true);
    setError(null);
    try {
      await clientApi.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e) {
      if (isApiError(e)) setError(e.error.message);
      else setError("Delete failed");
    } finally {
      setLoading(false);
    }
  }

  async function onSaveEdit() {
    if (!editing) return;
    setLoading(true);
    setError(null);
    try {
      const { id, name, email, role, password } = editing;
      const patch: any = { name, email, role };
      if (password && password.trim().length > 0) patch.password = password;
      const res = await clientApi.updateUser(id, patch);
      setUsers((prev) => prev.map((u) => (u.id === id ? res.user : u)));
      setEditing(null);
    } catch (e) {
      if (isApiError(e)) setError(e.error.message);
      else setError("Save failed");
    } finally {
      setLoading(false);
    }
  }

  async function onCreate() {
    if (!creating) return;
    setLoading(true);
    setError(null);
    try {
      const res = await clientApi.createUser({
        name: creating.name,
        email: creating.email,
        role: creating.role,
        password: creating.password ?? "",
      });
      setUsers((prev) => [res.user, ...prev]);
      setCreating(null);
    } catch (e) {
      if (isApiError(e)) setError(e.error.message);
      else setError("Create failed");
    } finally {
      setLoading(false);
    }
  }

  if (loadedMe && !canManage) {
    return (
      <main className="page">
        <h1 className="h1">Users</h1>
        <p className="muted">Admin only.</p>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="row" style={{ justifyContent: "space-between", gap: 12 }}>
        <h1 className="h1">Users</h1>
        <div className="row" style={{ gap: 8 }}>
          <button
            className="btn btn-secondary"
            onClick={() =>
              setCreating({
                id: "",
                name: "",
                email: "",
                role: "CLIENT",
                password: "",
              })
            }
            disabled={loading}
          >
            New user
          </button>
          <button className="btn" onClick={() => void load()} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: "#f99" }}>
          <div className="muted">{error}</div>
        </div>
      )}

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="table" style={{ minWidth: 720 }}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th style={{ width: 1, whiteSpace: "nowrap" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.name}</td>
                <td>{u.role}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() =>
                      setEditing({
                        id: u.id,
                        name: u.name,
                        email: u.email,
                        role: u.role,
                        password: "",
                      })
                    }
                    disabled={loading}
                  >
                    Edit
                  </button>{" "}
                  <button className="btn btn-danger" onClick={() => void onDelete(u.id)} disabled={loading}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  {loading ? "Loading..." : "No users"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(editing || creating) && (
        <div className="modalOverlay">
          <div className="modal">
            <h2 className="h2">{editing ? "Edit user" : "Create user"}</h2>
            <div className="grid" style={{ gap: 10 }}>
              <label className="label">
                <span className="muted">Email</span>
                <input
                  className="input"
                  value={(editing ?? creating)!.email}
                  onChange={(e) => {
                    const v = e.target.value;
                    editing
                      ? setEditing((s) => (s ? { ...s, email: v } : s))
                      : setCreating((s) => (s ? { ...s, email: v } : s));
                  }}
                  disabled={loading}
                />
              </label>
              <label className="label">
                <span className="muted">Name</span>
                <input
                  className="input"
                  value={(editing ?? creating)!.name}
                  onChange={(e) => {
                    const v = e.target.value;
                    editing
                      ? setEditing((s) => (s ? { ...s, name: v } : s))
                      : setCreating((s) => (s ? { ...s, name: v } : s));
                  }}
                  disabled={loading}
                />
              </label>
              <label className="label">
                <span className="muted">Role</span>
                <select
                  className="input"
                  value={(editing ?? creating)!.role}
                  onChange={(e) => {
                    const v = e.target.value as UserRole;
                    editing
                      ? setEditing((s) => (s ? { ...s, role: v } : s))
                      : setCreating((s) => (s ? { ...s, role: v } : s));
                  }}
                  disabled={loading}
                >
                  <option value="CLIENT">CLIENT</option>
                  <option value="BUSINESS">BUSINESS</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </label>
              <label className="label">
                <span className="muted">Password {editing ? "(optional)" : ""}</span>
                <input
                  className="input"
                  type="password"
                  value={(editing ?? creating)!.password ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    editing
                      ? setEditing((s) => (s ? { ...s, password: v } : s))
                      : setCreating((s) => (s ? { ...s, password: v } : s));
                  }}
                  disabled={loading}
                />
                <div className="muted" style={{ fontSize: 12 }}>
                  Min 8 chars.
                </div>
              </label>
            </div>

            <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setEditing(null);
                  setCreating(null);
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="btn"
                onClick={() => void (editing ? onSaveEdit() : onCreate())}
                disabled={loading}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
