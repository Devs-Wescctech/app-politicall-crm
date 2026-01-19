import React, { useEffect, useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { api, moneyBRLFromCents } from "../lib/api";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { Select } from "../components/Select";
import { Plus, Trash2, Pencil, BadgeCheck } from "lucide-react";
import { cn } from "../lib/cn";

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

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "AGENT";
  leadScope: "OWN" | "ALL";
  active: boolean;
};

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
    ownerId: "",
  });

  // ===== Board horizontal scroll (wheel + click&drag) =====
  const boardRef = React.useRef<HTMLDivElement | null>(null);

  function onWheelBoard(e: React.WheelEvent<HTMLDivElement>) {
    // trackpad horizontal: não mexe
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

    // transforma vertical em horizontal
    e.preventDefault();
    const el = boardRef.current;
    if (!el) return;
    el.scrollLeft += e.deltaY;
  }

  const isPanningRef = React.useRef(false);
  const panStartXRef = React.useRef(0);
  const panScrollLeftRef = React.useRef(0);

  function endPan() {
    const el = boardRef.current;
    if (el) el.classList.remove("cursor-grabbing");
    isPanningRef.current = false;
  }

  function startPan(e: React.MouseEvent<HTMLDivElement>) {
    if (e.button !== 0) return;

    const el = boardRef.current;
    if (!el) return;

    const target = e.target as HTMLElement;

    // Não iniciar PAN em cima de coisas interativas
    if (target.closest("button, a, input, textarea, select, option, label")) return;

    // Não iniciar PAN em cima de cards (para não conflitar com DnD)
    if (target.closest("[data-no-pan]")) return;

    isPanningRef.current = true;
    panStartXRef.current = e.clientX;
    panScrollLeftRef.current = el.scrollLeft;

    el.classList.add("cursor-grabbing");

    const onMove = (ev: MouseEvent) => {
      if (!isPanningRef.current) return;
      const dx = ev.clientX - panStartXRef.current;
      el.scrollLeft = panScrollLeftRef.current - dx;
      ev.preventDefault();
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      endPan();
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // ===== Data =====
  const filteredLeads = useMemo(() => {
    const byStage: Record<string, Lead[]> = {};
    for (const s of stages) byStage[s.id] = [];
    for (const l of leads) byStage[l.stageId]?.push(l);
    return byStage;
  }, [stages, leads]);

  async function load() {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([
        api<{ stages: Stage[] }>("/stages"),
        api<{ leads: Lead[] }>(`/leads${q ? `?q=${encodeURIComponent(q)}` : ""}`),
      ]);

      setStages(s.stages);
      setLeads(l.leads);

      try {
        const u = await api<{ users: UserRow[] }>("/users");
        setUsers(u.users.filter((x) => x.active));
      } catch {
        setUsers([]);
      }

      if (s.stages.length && !form.stageId) {
        setForm((f: any) => ({ ...f, stageId: s.stages[0].id }));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      ownerId: "",
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
      ownerId: lead.owner?.id ?? "",
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
      body: JSON.stringify({ amountCents: cents, planName: "Plano padrão" }),
    });

    await load();
  }

  async function onDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const stageId = destination.droppableId;

    // otimista
    setLeads((prev) => prev.map((l) => (l.id === draggableId ? ({ ...l, stageId } as any) : l)));

    try {
      await api(`/leads/${draggableId}/move`, { method: "POST", body: JSON.stringify({ stageId }) });
      await load();
    } catch (e: any) {
      alert(e.message);
      await load();
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-panel/60 p-5 md:p-6 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="min-w-0">
            <div className="text-2xl font-semibold tracking-tight">Pipeline</div>
            <div className="mt-1 text-sm text-muted">
              Kanban de oportunidades • Arraste entre etapas • Etapas fechadas → Dar baixa
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <div className="w-full md:w-[360px]">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar lead..." />
            </div>
            <Button variant="outline" onClick={load}>
              Filtrar
            </Button>
            <Button onClick={openCreate}>
              <Plus size={16} /> Novo lead
            </Button>
          </div>
        </div>
      </div>

      {loading && <div className="text-sm text-muted">Carregando...</div>}

      {/* Board ocupa altura do viewport para ter "área vazia" clicável */}
      <div
        ref={boardRef}
        onWheel={onWheelBoard}
        onMouseDown={startPan}
        className={cn(
          "overflow-x-auto no-scrollbar scroll-smooth cursor-grab select-none",
          // altura para pegar a área vazia (ajusta sem quebrar o sistema)
          "h-[calc(100vh-330px)] min-h-[520px] pb-4"
        )}
      >
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-5 min-w-[1180px] h-full items-stretch">
            {stages.map((stage) => (
              <Droppable key={stage.id} droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    className="w-[360px] shrink-0 h-full"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    <div
                      className={cn(
                        "h-full rounded-2xl border border-border bg-panel/40 shadow-soft overflow-hidden flex flex-col",
                        snapshot.isDraggingOver && "ring-2 ring-primary/35"
                      )}
                    >
                      {/* Column header */}
                      <div className="border-b border-border bg-panel/80 px-5 py-4 backdrop-blur">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-[15px]">{stage.name}</div>
                            {stage.isClosed && (
                              <div className="mt-1 text-xs text-accent">
                                Etapa fechada • habilita “Dar baixa”
                              </div>
                            )}
                          </div>

                          <div className="shrink-0 inline-flex items-center rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
                            {filteredLeads[stage.id]?.length ?? 0}
                          </div>
                        </div>
                      </div>

                      {/* Cards area (scroll vertical interno) */}
                      <div className="flex-1 overflow-y-auto">
                        <div className="space-y-3 p-5">
                          {(filteredLeads[stage.id] ?? []).map((lead, idx) => (
                            <Draggable key={lead.id} draggableId={lead.id} index={idx}>
                              {(p, snap) => (
                                <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}>
                                  <div data-no-pan>
                                    <Card
                                      className={cn(
                                        "group p-5 bg-bg/40 hover:bg-bg/55 transition",
                                        "ring-1 ring-transparent hover:ring-border/60",
                                        snap.isDragging && "ring-2 ring-primary/35 shadow-soft"
                                      )}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <div className="font-semibold leading-tight truncate text-[15px]">
                                            {lead.name}
                                          </div>

                                          <div className="text-xs text-muted mt-1">
                                            {lead.city ? `${lead.city} • ` : ""}
                                            {lead.source ?? "Sem origem"}
                                          </div>

                                          <div className="text-xs text-muted mt-1 truncate">
                                            {lead.owner?.name ? `Resp: ${lead.owner.name}` : "Sem responsável"}
                                          </div>
                                        </div>

                                        <div className="flex gap-1 opacity-90">
                                          <button
                                            className="p-2 rounded-xl hover:bg-border/30 transition"
                                            onClick={() => openEdit(lead)}
                                            title="Editar"
                                          >
                                            <Pencil size={16} />
                                          </button>
                                          <button
                                            className="p-2 rounded-xl hover:bg-border/30 transition"
                                            onClick={() => deleteLead(lead.id)}
                                            title="Excluir"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </div>
                                      </div>

                                      <div className="mt-4 flex items-center justify-between gap-3">
                                        <div className="inline-flex items-center rounded-full bg-primary/15 px-3.5 py-1.5 text-sm font-semibold text-primary">
                                          {moneyBRLFromCents(lead.valueCents)}
                                        </div>

                                        <div className="flex items-center gap-2">
                                          {stage.isClosed && !lead.sale && (
                                            <Button size="sm" variant="outline" onClick={() => markSold(lead)}>
                                              <BadgeCheck size={16} /> Dar baixa
                                            </Button>
                                          )}

                                          {lead.sale && (
                                            <div className="text-xs font-semibold text-accent whitespace-nowrap">
                                              Baixado ✔
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </Card>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}

                          {provided.placeholder}

                          {(filteredLeads[stage.id] ?? []).length === 0 && (
                            <div className="rounded-2xl border border-border/70 bg-white/5 p-4 text-sm text-muted">
                              Sem leads nesta etapa.
                            </div>
                          )}

                          {/* Área extra vazia dentro da coluna (clicável para PAN) */}
                          <div className="h-10" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Droppable>
            ))}

            {/* Faixa vazia (clicável) abaixo do board inteiro para PAN */}
            <div className="w-[40px] shrink-0" />
          </div>
        </DragDropContext>
      </div>

      {/* Modal */}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title={editing ? "Editar Lead" : "Novo Lead"}>
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
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted mb-1">Responsável (se permitido)</div>
            <Select value={form.ownerId} onChange={(e) => setForm((f: any) => ({ ...f, ownerId: e.target.value }))}>
              <option value="">Automático</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </Select>
            <div className="text-xs text-muted mt-1">AGENT sempre cria/edita como ele mesmo.</div>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-muted mb-1">Notas</div>
            <textarea
              className="w-full min-h-[100px] rounded-xl border border-border bg-panel p-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              value={form.notes}
              onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpenModal(false)}>
            Cancelar
          </Button>
          <Button onClick={saveLead}>{editing ? "Salvar" : "Criar"}</Button>
        </div>
      </Modal>
    </div>
  );
}
