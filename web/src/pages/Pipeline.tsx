import React, { useEffect, useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { api, moneyBRLFromCents } from "../lib/api";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { Plus, Trash2, Pencil, BadgeCheck, CheckCircle2, Filter, X } from "lucide-react";
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

function parseBRLToCents(v: string | number) {
  const s = String(v ?? "")
    .trim()
    .replace(/\./g, "") // remove separador de milhar se vier (ex: 1.234,56)
    .replace(",", "."); // decimal BR -> .
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 100));
}

function centsToBRLInput(cents: number) {
  const n = Number(cents ?? 0) / 100;
  // mostra sem forçar 2 casas para não ficar “brigando” com digitação
  return String(n).replace(".", ",");
}

function RightDrawer({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onMouseDown={onClose} />

      {/* panel */}
      <div
        className={cn(
          "absolute right-0 top-0 h-full w-full max-w-[560px]",
          "bg-panel/95 border-l border-border shadow-2xl",
          "flex flex-col"
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/60">
          <div className="min-w-0">
            <div className="text-sm text-muted">Cadastro</div>
            <div className="text-lg font-semibold tracking-tight truncate">{title}</div>
          </div>
          <button
            className="p-2 rounded-xl hover:bg-white/5 border border-border/60"
            onClick={onClose}
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5">{children}</div>

        {footer && <div className="px-5 py-4 border-t border-border/60 bg-panel/70">{footer}</div>}
      </div>
    </div>
  );
}

function CenterDialog({
  open,
  title,
  description,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onMouseDown={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4" onMouseDown={onClose}>
        <div
          className={cn(
            "w-full max-w-[520px] rounded-2xl border border-border bg-panel/95 shadow-2xl",
            "overflow-hidden"
          )}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-5 py-4 border-b border-border/60">
            <div className="text-lg font-semibold tracking-tight">{title}</div>
            {description && <div className="mt-1 text-sm text-muted">{description}</div>}
          </div>

          <div className="px-5 py-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function Pipeline() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [q, setQ] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<string>(""); // filtro por responsável
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Drawer (Criar/Editar)
  const [openDrawer, setOpenDrawer] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);

  const [form, setForm] = useState<any>({
    name: "",
    phone: "",
    email: "",
    city: "",
    source: "",
    notes: "",
    valueCents: 0, // mantém em centavos (API)
    stageId: "",
    ownerId: "",
  });

  // Modais bonitos (Excluir / Baixar)
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [soldTarget, setSoldTarget] = useState<Lead | null>(null);
  const [soldAmount, setSoldAmount] = useState<string>("");

  // ===== refs =====
  const boardRef = React.useRef<HTMLDivElement | null>(null);
  const panSurfaceRef = React.useRef<HTMLDivElement | null>(null);

  // ===== wheel: vertical -> horizontal =====
  function onWheelBoard(e: React.WheelEvent<HTMLDivElement>) {
    // trackpad horizontal: mantém
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

    e.preventDefault();
    const el = boardRef.current;
    if (!el) return;
    el.scrollLeft += e.deltaY;
  }

  // ===== pan: click & drag no vazio =====
  const isPanningRef = React.useRef(false);
  const panStartXRef = React.useRef(0);
  const panScrollLeftRef = React.useRef(0);

  function stopPan() {
    isPanningRef.current = false;
    boardRef.current?.classList.remove("cursor-grabbing");
    panSurfaceRef.current?.classList.remove("cursor-grabbing");
  }

  // listener no panSurface (wrapper maior) e mexe no scrollLeft do board
  function startPan(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    if (e.button !== 0) return;

    const board = boardRef.current;
    if (!board) return;

    const target = e.target as HTMLElement;

    // Não iniciar pan em elementos interativos
    if (target.closest("button, a, input, textarea, select, option, label")) return;

    // Não iniciar pan em cima de card (pra não brigar com DnD)
    if (target.closest("[data-pan-block='true']")) return;

    isPanningRef.current = true;
    panStartXRef.current = e.clientX;
    panScrollLeftRef.current = board.scrollLeft;

    board.classList.add("cursor-grabbing");
    panSurfaceRef.current?.classList.add("cursor-grabbing");

    e.preventDefault();
    e.stopPropagation();

    try {
      (e.currentTarget as any).setPointerCapture?.(e.pointerId);
    } catch {}

    const onMove = (ev: PointerEvent) => {
      if (!isPanningRef.current) return;
      const dx = ev.clientX - panStartXRef.current;
      board.scrollLeft = panScrollLeftRef.current - dx;
      ev.preventDefault();
    };

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);

      try {
        (e.currentTarget as any).releasePointerCapture?.(e.pointerId);
      } catch {}

      stopPan();
      ev.preventDefault();
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp, { passive: false });
  }

  // ===== Data (filtros locais) =====
  // - baixado (sale) NÃO aparece
  // - filtro por responsável
  // - busca
  const leadsVisible = useMemo(() => {
    const txt = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (l.sale) return false; // baixado some do kanban

      if (ownerFilter) {
        const oid = l.owner?.id ?? "";
        if (oid !== ownerFilter) return false;
      }

      if (!txt) return true;

      const hay = [l.name ?? "", l.city ?? "", l.source ?? "", l.owner?.name ?? "", l.email ?? "", l.phone ?? ""]
        .join(" ")
        .toLowerCase();

      return hay.includes(txt);
    });
  }, [leads, q, ownerFilter]);

  const filteredLeads = useMemo(() => {
    const byStage: Record<string, Lead[]> = {};
    for (const s of stages) byStage[s.id] = [];
    for (const l of leadsVisible) byStage[l.stageId]?.push(l);
    return byStage;
  }, [stages, leadsVisible]);

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
    setOpenDrawer(true);
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
    setOpenDrawer(true);
  }

  async function saveLead() {
    // (2) somente nome obrigatório
    if (!form.name?.trim()) return;

    if (editing) {
      await api(`/leads/${editing.id}`, { method: "PUT", body: JSON.stringify(form) });
    } else {
      await api(`/leads`, { method: "POST", body: JSON.stringify(form) });
    }

    setOpenDrawer(false);
    await load();
  }

  function askDelete(lead: Lead) {
    setDeleteTarget(lead);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await api(`/leads/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    await load();
  }

  function askSold(lead: Lead) {
    setSoldTarget(lead);
    setSoldAmount(String((lead.valueCents ?? 0) / 100).replace(".", ",")); // pré-preenche em R$
  }

  async function confirmSold() {
    if (!soldTarget) return;
    const cents = parseBRLToCents(soldAmount);

    await api(`/leads/${soldTarget.id}/mark-sold`, {
      method: "POST",
      body: JSON.stringify({ amountCents: cents, planName: "Plano padrão" }),
    });

    setSoldTarget(null);
    setSoldAmount("");
    await load(); // some do kanban porque agora sale existe
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
    <div className="h-full min-h-0 flex flex-col gap-5">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-panel/60 p-4 md:p-5 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="min-w-0">
            <div className="text-2xl font-semibold tracking-tight">Pipeline</div>
            <div className="mt-1 text-sm text-muted">Kanban de oportunidades • Arraste entre etapas</div>
          </div>

          <div className="flex-1" />

          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <div className="w-full md:w-[320px]">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar lead..." />
            </div>

            {/* filtro por responsável */}
            <div className="w-full md:w-[260px]">
              <Select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
                <option value="">Todos responsáveis</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </Select>
            </div>

            <Button variant="outline" onClick={load}>
              <Filter size={16} /> Filtrar
            </Button>

            <Button onClick={openCreate}>
              <Plus size={16} /> Novo lead
            </Button>
          </div>
        </div>
      </div>

      {loading && <div className="text-sm text-muted">Carregando...</div>}

      {/* Pan surface */}
      <div ref={panSurfaceRef} onPointerDownCapture={startPan} className={cn("flex-1 min-h-0", "cursor-grab")}>
        {/* BOARD */}
        <div
          ref={boardRef}
          onWheel={onWheelBoard}
          className={cn("h-full min-h-[520px] pb-4", "overflow-x-auto no-scrollbar scroll-smooth select-none")}
        >
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 min-w-[1100px] h-full items-stretch">
              {stages.map((stage) => (
                <Droppable key={stage.id} droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div className="w-[340px] shrink-0 h-full" ref={provided.innerRef} {...provided.droppableProps}>
                      <div
                        className={cn(
                          "h-full rounded-2xl border border-border bg-panel/40 shadow-soft overflow-hidden flex flex-col",
                          snapshot.isDraggingOver && "ring-2 ring-primary/35"
                        )}
                      >
                        {/* Column header */}
                        <div className="sticky top-0 z-10 border-b border-border bg-panel/80 px-4 py-3 backdrop-blur">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate font-semibold">{stage.name}</div>
                              {/* (4) texto de fechados removido */}
                            </div>
                            <div className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
                              {filteredLeads[stage.id]?.length ?? 0}
                            </div>
                          </div>
                        </div>

                        {/* Cards */}
                        <div className="flex-1 overflow-y-auto">
                          <div className="space-y-3 p-4 min-h-full">
                            {(filteredLeads[stage.id] ?? []).map((lead, idx) => (
                              <Draggable key={lead.id} draggableId={lead.id} index={idx}>
                                {(p) => (
                                  <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}>
                                    <div data-pan-block="true">
                                      <Card className="group p-4 bg-bg/40 hover:bg-bg/55 transition ring-1 ring-transparent hover:ring-border/60">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="min-w-0">
                                            <div className="font-semibold leading-tight truncate">{lead.name}</div>
                                            <div className="text-xs text-muted">
                                              {lead.city ? `${lead.city} • ` : ""}
                                              {lead.source ?? "Sem origem"}
                                            </div>
                                            <div className="text-xs text-muted mt-1 truncate">
                                              {lead.owner?.name ? `Resp: ${lead.owner.name}` : "Sem responsável"}
                                            </div>
                                          </div>
                                          <div className="flex gap-1">
                                            <button
                                              className="p-2 rounded-xl hover:bg-border/30"
                                              onClick={() => openEdit(lead)}
                                              title="Editar"
                                            >
                                              <Pencil size={16} />
                                            </button>
                                            <button
                                              className="p-2 rounded-xl hover:bg-border/30"
                                              onClick={() => askDelete(lead)}
                                              title="Excluir"
                                            >
                                              <Trash2 size={16} />
                                            </button>
                                          </div>
                                        </div>

                                        <div className="mt-3 flex items-center justify-between gap-2">
                                          <div className="inline-flex items-center rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-primary">
                                            {moneyBRLFromCents(lead.valueCents)}
                                          </div>

                                          {/* (1) Baixado: ícone com mesmo badge/layout (não aparece no kanban por regra, mas fica pronto) */}
                                          {lead.sale && (
                                            <span
                                              className="inline-flex items-center justify-center rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-primary"
                                              title="Baixado"
                                            >
                                              <CheckCircle2 size={16} />
                                            </span>
                                          )}

                                          {/* Baixa */}
                                          {stage.isClosed && !lead.sale && (
                                            <Button size="sm" variant="outline" onClick={() => askSold(lead)}>
                                              <BadgeCheck size={16} /> Dar baixa
                                            </Button>
                                          )}
                                        </div>
                                      </Card>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}

                            {provided.placeholder}
                            <div className="h-24" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Droppable>
              ))}

              <div className="w-4 shrink-0" />
            </div>
          </DragDropContext>
        </div>
      </div>

      {/* Drawer Criar/Editar (direita) */}
      <RightDrawer
        open={openDrawer}
        onClose={() => setOpenDrawer(false)}
        title={editing ? "Editar Lead" : "Novo Lead"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpenDrawer(false)}>
              Cancelar
            </Button>
            <Button onClick={saveLead}>{editing ? "Salvar" : "Criar"}</Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <div className="text-xs text-muted mb-1">
              Nome <span className="text-accent">*</span>
            </div>
            <Input value={form.name} onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))} />
            <div className="text-xs text-muted mt-1">Somente o nome é obrigatório.</div>
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

          {/* (3) VALOR EM R$ (reais) */}
          <div>
            <div className="text-xs text-muted mb-1">Valor (R$)</div>
            <Input
              inputMode="decimal"
              value={centsToBRLInput(form.valueCents)}
              onChange={(e) => {
                const cents = parseBRLToCents(e.target.value);
                setForm((f: any) => ({ ...f, valueCents: cents }));
              }}
              placeholder="Ex.: 100,00"
            />
            <div className="text-xs text-muted mt-1">Digite em reais. Ex.: 100 = R$ 100,00</div>
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
              className="w-full min-h-[110px] rounded-xl border border-border bg-panel p-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              value={form.notes}
              onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
      </RightDrawer>

      {/* Modal padrão: excluir */}
      <CenterDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Excluir lead"
        description={deleteTarget ? `Tem certeza que deseja excluir "${deleteTarget.name}"?` : undefined}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            Cancelar
          </Button>
          <Button variant="outline" onClick={confirmDelete}>
            <Trash2 size={16} /> Excluir
          </Button>
        </div>
      </CenterDialog>

      {/* Modal padrão: baixa */}
      <CenterDialog
        open={!!soldTarget}
        onClose={() => {
          setSoldTarget(null);
          setSoldAmount("");
        }}
        title="Dar baixa (venda)"
        description={soldTarget ? `Informe o valor da venda para "${soldTarget.name}".` : undefined}
      >
        <div className="space-y-4">
          <div>
            <div className="text-xs text-muted mb-1">Valor da venda (R$)</div>
            <Input
              inputMode="decimal"
              value={soldAmount}
              onChange={(e) => setSoldAmount(e.target.value)}
              placeholder="Ex.: 150,00"
            />
            <div className="text-xs text-muted mt-1">Digite em reais. Ex.: 100 = R$ 100,00</div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setSoldTarget(null);
                setSoldAmount("");
              }}
            >
              Cancelar
            </Button>
            <Button variant="outline" onClick={confirmSold}>
              <BadgeCheck size={16} /> Confirmar baixa
            </Button>
          </div>
        </div>
      </CenterDialog>
    </div>
  );
}
