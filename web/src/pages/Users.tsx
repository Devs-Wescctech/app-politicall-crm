import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader } from "../components/Card";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

type Role = "ADMIN" | "MANAGER" | "AGENT";
type LeadScope = "OWN" | "ALL";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  leadScope: LeadScope;
  active: boolean;
  createdAt: string;
};

export default function Users() {
  const { user } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  const [form, setForm] = useState<any>({
    name: "",
    email: "",
    password: "",
    role: "AGENT",
    leadScope: "OWN",
    active: true
  });

  async function load() {
    setLoading(true);
    try {
      const data = await api<{ users: UserRow[] }>("/users");
      setRows(data.users);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", email: "", password: "", role: "AGENT", leadScope: "OWN", active: true });
    setOpen(true);
  }

  function openEdit(u: UserRow) {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role, leadScope: u.leadScope, active: u.active });
    setOpen(true);
  }

  async function save() {
    if (!form.name || !form.email) return;
    if (!editing && !form.password) return;

    if (editing) {
      const payload: any = { ...form };
      if (!payload.password) delete payload.password;
      await api(`/users/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
    } else {
      await api(`/users`, { method: "POST", body: JSON.stringify(form) });
    }
    setOpen(false);
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Desativar usuário?")) return;
    await api(`/users/${id}`, { method: "DELETE" });
    await load();
  }

  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    return (
      <div className="space-y-2">
        <div className="text-2xl font-semibold">Usuários</div>
        <div className="text-sm text-muted">Sem permissão para gerenciar usuários.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div>
          <div className="text-2xl font-semibold">Usuários</div>
          <div className="text-sm text-muted">CRUD + permissão + visibilidade de leads (AGENT)</div>
        </div>
        <div className="flex-1" />
        <Button onClick={openCreate}><Plus size={16} /> Novo</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="text-sm text-muted">{loading ? "Carregando..." : `${rows.length} usuários`}</div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted">
                <tr className="border-b border-border">
                  <th className="text-left py-2">Nome</th>
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">Role</th>
                  <th className="text-left py-2">LeadScope</th>
                  <th className="text-left py-2">Ativo</th>
                  <th className="text-right py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="py-2">{r.name}</td>
                    <td className="py-2 text-muted">{r.email}</td>
                    <td className="py-2">{r.role}</td>
                    <td className="py-2">{r.leadScope}</td>
                    <td className="py-2">{r.active ? "Sim" : "Não"}</td>
                    <td className="py-2">
                      <div className="flex justify-end gap-1">
                        <button className="p-2 rounded-lg hover:bg-white/5" onClick={() => openEdit(r)} title="Editar">
                          <Pencil size={16} />
                        </button>
                        <button className="p-2 rounded-lg hover:bg-white/5" onClick={() => remove(r.id)} title="Desativar">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && !loading && (
                  <tr><td colSpan={6} className="py-6 text-center text-muted">Nenhum usuário.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar usuário" : "Novo usuário"}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <div className="text-xs text-muted mb-1">Nome</div>
            <Input value={form.name} onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-muted mb-1">Email</div>
            <Input value={form.email} onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-muted mb-1">Senha {editing ? "(opcional)" : ""}</div>
            <Input type="password" value={form.password} onChange={(e) => setForm((f: any) => ({ ...f, password: e.target.value }))} />
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Role</div>
            <Select value={form.role} onChange={(e) => setForm((f: any) => ({ ...f, role: e.target.value }))}>
              <option value="ADMIN">ADMIN</option>
              <option value="MANAGER">MANAGER</option>
              <option value="AGENT">AGENT</option>
            </Select>
          </div>
          <div>
            <div className="text-xs text-muted mb-1">LeadScope (AGENT)</div>
            <Select value={form.leadScope} onChange={(e) => setForm((f: any) => ({ ...f, leadScope: e.target.value }))}>
              <option value="OWN">Somente meus leads (OWN)</option>
              <option value="ALL">Ver todos (ALL)</option>
            </Select>
          </div>
          <div className="md:col-span-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f: any) => ({ ...f, active: e.target.checked }))}
              />
              Ativo
            </label>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save}>{editing ? "Salvar" : "Criar"}</Button>
        </div>
      </Modal>
    </div>
  );
}
