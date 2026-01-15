import React, { useEffect, useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { api, moneyBRLFromCents } from "../lib/api";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { Select } from "../components/Select";
import { Plus, Trash2, Pencil, BadgeCheck } from "lucide-react";

type Stage = { id: string; name: string; order: number; isClosed: boolean };
type Lead = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  source?: string | null;
  notes?: string | null;
  valueCents: number;
  status: "OPEN" | "CLOSED" | "SOLD";
  stageId: string;
  stage: Stage;
  owner?: { id: string; name: string } | null;
  sale?: { id: string } | null;
};

type UserRow = { id: string; name: string; email: string; role: "ADMIN"|"MANAGER"|"AGENT"; leadScope: "OWN"|"ALL"; active: boolean };

export default function Pipeline() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);

  const [form, setForm] = useState<any>({
    name: "",
    phone: "",
    email: "",
    city: "",
    source: "",
    notes: "",
    valueCents: 0,
    stageId: "",
    ownerId: ""
  });

  const filteredLeads = useMemo(() => {
    const byStage: Record<string, Lead[]> = {};
    for (const s of stages) byStage[s.id] = [];
    for (const l of leads) byStage[l.stageId]?.push(l);
    // ordena por updatedAt? API já vem ordenado, então mantém
    return byStage;
  }, [stages, leads]);

  async function load() {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([
        api<{ stages: Stage[] }>("/stages"),
        api<{ leads: Lead[] }>(`/leads${q ? `?q=${encodeURIComponent(q)}` : ""}`)
      ]);
      setStages(s.stages);
      setLeads(l.leads);

      // Usuários só se tiver permissão (API pode bloquear)
      try {
        const u = await api<{ users: UserRow[] }>("/users");
        setUsers(u.users.filter(x => x.active));
      } catch {
        setUsers([]);
      }

      // seta stageId default para o primeiro
      if (s.stages.length && !form.stageId) {
        setForm((f: any) => ({ ...f, stageId: s.stages[0].id }));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      phone: "",
      email: "",
      city: "",
      source: "",
      notes: "",
      valueCents: 0,
      stageId: stages[0]?.id ?? "",
      ownerId: ""
    });
    setOpenModal(true);
  }

  function openEdit(lead: Lead) {
    setEditing(lead);
    setForm({
      name: lead.name ?? "",
      phone: lead.phone ?? "",
      email: lead.email ?? "",
      city: lead.city ?? "",
      source: lead.source ?? "",
      notes: lead.notes ?? "",
      valueCents: lead.valueCents ?? 0,
      stageId: lead.stageId,
      ownerId: lead.owner?.id ?? ""
    });
    setOpenModal(true);
  }

  async function saveLead() {
    if (!form.name?.trim()) return;
    if (editing) {
      await api(`/leads/${editing.id}`, { method: "PUT", body: JSON.stringify(form) });
    } else {
      await api(`/leads`, { method: "POST", body: JSON.stringify(form) });
    }
    setOpenModal(false);
    await load();
  }

  async function deleteLead(id: string) {
    if (!confirm("Excluir lead?")) return;
    await api(`/leads/${id}`, { method: "DELETE" });
    await load();
  }

  async function markSold(lead: Lead) {
    const amount = prompt("Valor da venda (R$):", ((lead.valueCents ?? 0) / 100).toString());
    if (amount == null) return;
    const cents = Math.max(0, Math.round(Number(amount.replace(",", ".")) * 100));
    await api(`/leads/${lead.id}/mark-sold`, {
      method: "POST",
      body: JSON.stringify({ amountCents: cents, planName: "Plano padrão" })
    });
    await load();
  }

  async function onDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const stageId = destination.droppableId;
    // otimista
    setLeads((prev) => prev.map(l => l.id === draggableId ? { ...l, stageId } as any : l));
    try {
      await api(`/leads/${draggableId}/move`, { method: "POST", body: JSON.stringify({ stageId }) });
      await load();
    } catch (e: any) {
      alert(e.message);
      await load();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end gap-3">
        <div>
          <div className="text-2xl font-semibold">Pipeline</div>
          <div className="text-sm text-muted">Kanban • criar/editar/excluir • Fechados → Dar baixa</div>
        </div>
        <div className="flex-1" />
        <div className="flex gap-2 w-full md:w-auto">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar lead..." />
          <Button variant="outline" onClick={load}>Filtrar</Button>
          <Button onClick={openCreate}><Plus size={16} /> Novo</Button>
        </div>
      </div>

      {loading && <div className="text-sm text-muted">Carregando...</div>}

      <div className="overflow-x-auto">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 min-w-[900px]">
            {stages.map((stage) => (
              <Droppable key={stage.id} droppableId={stage.id}>
                {(provided) => (
                  <div className="w-[320px]" ref={provided.innerRef} {...provided.droppableProps}>
                    <div className="sticky top-0 z-10 mb-2">
                      <div className="rounded-2xl border border-border bg-panel px-4 py-3 shadow-soft">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">{stage.name}</div>
                          <div className="text-xs text-muted">{filteredLeads[stage.id]?.length ?? 0}</div>
                        </div>
                        {stage.isClosed && <div className="text-xs text-accent mt-1">Fechados: habilita “Dar baixa”</div>}
                      </div>
                    </div>

                    <div className="space-y-2 pb-4">
                      {(filteredLeads[stage.id] ?? []).map((lead, idx) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={idx}>
                          {(p) => (
                            <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}>
                              <Card className="p-4">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="font-semibold">{lead.name}</div>
                                    <div className="text-xs text-muted">
                                      {lead.city ? `${lead.city} • ` : ""}{lead.source ?? "Sem origem"}
                                    </div>
                                    <div className="text-xs text-muted mt-1">
                                      {lead.owner?.name ? `Resp: ${lead.owner.name}` : "Sem responsável"}
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <button className="p-2 rounded-lg hover:bg-white/5" onClick={() => openEdit(lead)} title="Editar">
                                      <Pencil size={16} />
                                    </button>
                                    <button className="p-2 rounded-lg hover:bg-white/5" onClick={() => deleteLead(lead.id)} title="Excluir">
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between">
                                  <div className="text-sm font-medium">{moneyBRLFromCents(lead.valueCents)}</div>
                                  {stage.isClosed && !lead.sale && (
                                    <Button size="sm" variant="outline" onClick={() => markSold(lead)}>
                                      <BadgeCheck size={16} /> Dar baixa
                                    </Button>
                                  )}
                                  {lead.sale && (
                                    <div className="text-xs text-accent">Baixado ✔</div>
                                  )}
                                </div>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </div>

      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title={editing ? "Editar Lead" : "Novo Lead"}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <div className="text-xs text-muted mb-1">Nome</div>
            <Input value={form.name} onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Telefone</div>
            <Input value={form.phone} onChange={(e) => setForm((f: any) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Email</div>
            <Input value={form.email} onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Cidade</div>
            <Input value={form.city} onChange={(e) => setForm((f: any) => ({ ...f, city: e.target.value }))} />
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Origem</div>
            <Input value={form.source} onChange={(e) => setForm((f: any) => ({ ...f, source: e.target.value }))} />
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Valor (centavos)</div>
            <Input
              type="number"
              value={form.valueCents}
              onChange={(e) => setForm((f: any) => ({ ...f, valueCents: Number(e.target.value) }))}
            />
            <div className="text-xs text-muted mt-1">Dica: 10000 = R$ 100,00</div>
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Stage</div>
            <Select value={form.stageId} onChange={(e) => setForm((f: any) => ({ ...f, stageId: e.target.value }))}>
              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Responsável (se permitido)</div>
            <Select value={form.ownerId} onChange={(e) => setForm((f: any) => ({ ...f, ownerId: e.target.value }))}>
              <option value="">Automático</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </Select>
            <div className="text-xs text-muted mt-1">AGENT sempre cria/edita como ele mesmo.</div>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-muted mb-1">Notas</div>
            <textarea
              className="w-full min-h-[90px] rounded-xl border border-border bg-panel p-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              value={form.notes}
              onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpenModal(false)}>Cancelar</Button>
          <Button onClick={saveLead}>{editing ? "Salvar" : "Criar"}</Button>
        </div>
      </Modal>
    </div>
  );
}
