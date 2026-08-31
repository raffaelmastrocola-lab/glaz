"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MEMBERS = [
  { id: "rafael", name: "Rafael", initials: "RM", color: "var(--member-rafael)" },
  { id: "cassius", name: "Cassius", initials: "CS", color: "var(--member-cassius)" },
];
const STAGES = [
  { id: "todo", label: "A Fazer" },
  { id: "doing", label: "Em Progresso" },
  { id: "review", label: "Em Revisão" },
  { id: "done", label: "Concluído" },
];
const PRIORITIES = [
  { id: "alta", label: "Alta" },
  { id: "media", label: "Média" },
  { id: "baixa", label: "Baixa" },
];
const WIP_LIMIT = 3;
const POLL_MS = 4000;

function member(id) {
  return MEMBERS.find((m) => m.id === id) || null;
}
function stage(id) {
  return STAGES.find((s) => s.id === id) || STAGES[0];
}
function priLabel(id) {
  return (PRIORITIES.find((p) => p.id === id) || {}).label || id;
}
function uid() {
  return "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00Z");
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" }).replace(".", "");
}
function isOverdue(t) {
  return !!t.dueDate && t.status !== "done" && t.dueDate < todayISO();
}
function fmtWhen(ts) {
  const d = new Date(ts);
  const diffH = Math.round((Date.now() - d.getTime()) / 36e5);
  if (diffH < 1) return "agora";
  if (diffH < 24) return diffH + "h";
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return diffD + "d";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

const ICON_PATHS = {
  plus: "M10 4v12M4 10h12",
  search: "M17 17l-3.5-3.5",
  x: "M5 5l10 10M15 5L5 15",
  calendar: "M3 8.5h14M7 3v3M13 3v3",
  check: "M4 10.5l3.5 3.5L16 5.5",
  trash: "M4 6h12M8 6V4.5A1.5 1.5 0 019.5 3h1A1.5 1.5 0 0112 4.5V6m-6.5 0l.6 9.4A1.5 1.5 0 007.6 17h4.8a1.5 1.5 0 001.5-1.6L14.5 6",
  alert: "M10 3l8.5 14.5H1.5L10 3zM10 8.5v4M10 15h.01",
  list: "M4 5h12M4 10h12M4 15h8",
};

function Icon({ name }) {
  if (name === "search") {
    return (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="9" cy="9" r="6" />
        <path d={ICON_PATHS.search} />
      </svg>
    );
  }
  if (name === "calendar") {
    return (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4.5" width="14" height="12.5" rx="2" />
        <path d={ICON_PATHS.calendar} />
      </svg>
    );
  }
  if (name === "dots") {
    return (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <circle cx="10" cy="4.5" r="1.4" />
        <circle cx="10" cy="10" r="1.4" />
        <circle cx="10" cy="15.5" r="1.4" />
      </svg>
    );
  }
  if (name === "grid") {
    return (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="6" height="6" rx="1.2" />
        <rect x="11" y="3" width="6" height="6" rx="1.2" />
        <rect x="3" y="11" width="6" height="6" rx="1.2" />
        <rect x="11" y="11" width="6" height="6" rx="1.2" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICON_PATHS[name] || ""} />
    </svg>
  );
}

function Avatar({ m, small }) {
  if (!m) return null;
  return (
    <span className={"avatar" + (small ? " sz-sm" : "")} style={{ background: m.color }} title={m.name}>
      {m.initials}
    </span>
  );
}

export default function BoardPage() {
  const router = useRouter();
  const [state, setState] = useState(null);
  const [view, setView] = useState("kanban");
  const [filters, setFilters] = useState({ q: "", assignee: "all", priority: "all" });
  const [who, setWho] = useState(null);
  const [showIdentity, setShowIdentity] = useState(false);
  const [taskModal, setTaskModal] = useState(null); // { task } or { task: null } to create
  const [openKebab, setOpenKebab] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [readOnly, setReadOnly] = useState(false);

  const saveTimer = useRef(null);
  const pollTimer = useRef(null);
  const modalOpenRef = useRef(false);
  const draggingId = useRef(null);

  useEffect(() => {
    modalOpenRef.current = !!taskModal;
  }, [taskModal]);

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToastMsg(""), 2600);
  }, []);

  const load = useCallback(
    async (silent) => {
      try {
        const res = await fetch("/api/state", { cache: "no-store" });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setState((prev) => (modalOpenRef.current ? prev : data));
        } else if (!silent) {
          showToast("Não foi possível carregar o quadro.");
        }
      } catch {
        if (!silent) showToast("Sem conexão.");
      }
    },
    [router, showToast]
  );

  useEffect(() => {
    try {
      setWho(localStorage.getItem("glaz-whoami"));
    } catch {}
    load(false).then(() => {
      try {
        if (!localStorage.getItem("glaz-whoami")) setShowIdentity(true);
      } catch {}
    });
    pollTimer.current = window.setInterval(() => {
      if (!modalOpenRef.current) load(true);
    }, POLL_MS);
    return () => window.clearInterval(pollTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(nextState) {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nextState),
        });
        if (res.status === 401) {
          setReadOnly(true);
          router.push("/login");
          return;
        }
        if (!res.ok) showToast("Não foi possível salvar. Tentando de novo...");
      } catch {
        showToast("Sem conexão. Suas alterações serão salvas assim que possível.");
      }
    }, 500);
  }

  function moveTask(id, newStatus) {
    setState((prev) => {
      if (!prev) return prev;
      const t = prev.tasks.find((x) => x.id === id);
      if (!t || t.status === newStatus) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      const nt = next.tasks.find((x) => x.id === id);
      nt.status = newStatus;
      nt.updatedAt = todayISO();
      const whoName = (member(who) || {}).name || "Alguém";
      const label = newStatus === "done" ? whoName + ' concluiu "' + nt.title + '"' : whoName + ' moveu "' + nt.title + '" para ' + stage(newStatus).label;
      next.activity = [{ ts: new Date().toISOString(), who: who || "rafael", text: label }, ...next.activity].slice(0, 14);
      persist(next);
      return next;
    });
  }

  function saveTaskForm(id, data) {
    setState((prev) => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      const whoName = (member(who) || {}).name || "Alguém";
      if (id) {
        const t = next.tasks.find((x) => x.id === id);
        const statusChanged = data.status !== t.status;
        Object.assign(t, data, { updatedAt: todayISO() });
        const label = statusChanged
          ? data.status === "done"
            ? whoName + ' concluiu "' + t.title + '"'
            : whoName + ' moveu "' + t.title + '" para ' + stage(t.status).label
          : whoName + ' atualizou "' + t.title + '"';
        next.activity = [{ ts: new Date().toISOString(), who: who || "rafael", text: label }, ...next.activity].slice(0, 14);
      } else {
        const t = {
          id: uid(),
          ...data,
          createdAt: todayISO(),
          updatedAt: todayISO(),
        };
        next.tasks.push(t);
        next.activity = [{ ts: new Date().toISOString(), who: who || "rafael", text: whoName + ' criou "' + t.title + '"' }, ...next.activity].slice(0, 14);
      }
      persist(next);
      return next;
    });
  }

  function deleteTask(id) {
    setState((prev) => {
      if (!prev) return prev;
      const t = prev.tasks.find((x) => x.id === id);
      if (!t) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      next.tasks = next.tasks.filter((x) => x.id !== id);
      const whoName = (member(who) || {}).name || "Alguém";
      next.activity = [{ ts: new Date().toISOString(), who: who || "rafael", text: whoName + ' excluiu "' + t.title + '"' }, ...next.activity].slice(0, 14);
      persist(next);
      return next;
    });
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    router.push("/login");
  }

  function pickIdentity(id) {
    setWho(id);
    try {
      localStorage.setItem("glaz-whoami", id);
    } catch {}
    setShowIdentity(false);
  }

  if (!state) {
    return (
      <div className="login-shell">
        <p style={{ color: "var(--ink-muted)" }}>Carregando quadro...</p>
      </div>
    );
  }

  const filteredTasks = state.tasks.filter((t) => {
    if (filters.assignee !== "all" && t.assignee !== filters.assignee) return false;
    if (filters.priority !== "all" && t.priority !== filters.priority) return false;
    if (filters.q) {
      const hay = (t.title + " " + (t.tags || []).join(" ")).toLowerCase();
      if (hay.indexOf(filters.q.toLowerCase()) === -1) return false;
    }
    return true;
  });

  return (
    <div id="app">
      <Topbar
        project={state.project}
        view={view}
        setView={setView}
        who={who}
        onIdentity={() => setShowIdentity(true)}
        onNewTask={() => setTaskModal({ task: null })}
        onLogout={handleLogout}
        readOnly={readOnly}
      />
      {readOnly && (
        <div className="banner warn">
          <Icon name="alert" /> Você está em modo leitura — sua sessão pode ter expirado. Faça login novamente para editar.
        </div>
      )}
      <main>
        {view === "kanban" ? (
          <Kanban
            tasks={filteredTasks}
            filters={filters}
            setFilters={setFilters}
            openKebab={openKebab}
            setOpenKebab={setOpenKebab}
            onOpenTask={(t) => setTaskModal({ task: t })}
            onMoveTask={moveTask}
            onDeleteTask={(t) => {
              if (window.confirm('Excluir a tarefa "' + t.title + '"?')) deleteTask(t.id);
            }}
            draggingId={draggingId}
            readOnly={readOnly}
          />
        ) : (
          <Dashboard state={state} />
        )}
      </main>

      {taskModal && (
        <TaskModal
          task={taskModal.task}
          onClose={() => setTaskModal(null)}
          onSave={(id, data) => {
            saveTaskForm(id, data);
            setTaskModal(null);
          }}
          onDelete={(t) => {
            if (window.confirm('Excluir a tarefa "' + t.title + '"? Essa ação não pode ser desfeita.')) {
              deleteTask(t.id);
              setTaskModal(null);
            }
          }}
        />
      )}

      {showIdentity && <IdentityModal onPick={pickIdentity} canClose={!!who} onClose={() => setShowIdentity(false)} />}

      <div className={"toast" + (toastMsg ? " show" : "")} role="status" aria-live="polite">
        {toastMsg}
      </div>
    </div>
  );
}

function Topbar({ project, view, setView, who, onIdentity, onNewTask, onLogout, readOnly }) {
  const m = member(who);
  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark">G</div>
        <div className="brand-text">
          <h1>{project || "Glaz"}</h1>
          <span>Gestão compartilhada de tarefas</span>
        </div>
      </div>
      <div className="view-toggle" role="tablist" aria-label="Visualização">
        <button role="tab" aria-pressed={view === "kanban"} onClick={() => setView("kanban")}>
          <Icon name="grid" /> Quadro
        </button>
        <button role="tab" aria-pressed={view === "dashboard"} onClick={() => setView("dashboard")}>
          <Icon name="list" /> Painel
        </button>
      </div>
      <div className="topbar-spacer" />
      <div className="whoami">
        {m ? (
          <>
            <Avatar m={m} small />
            <span>{m.name}</span>
          </>
        ) : (
          <span>Identifique-se</span>
        )}
        <button className="link" onClick={onIdentity}>
          trocar
        </button>
      </div>
      <button className="btn btn-ghost" onClick={onLogout}>
        Sair
      </button>
      <button className="btn btn-accent" onClick={onNewTask} disabled={readOnly}>
        <Icon name="plus" /> Nova tarefa
      </button>
    </div>
  );
}

function Kanban({ tasks, filters, setFilters, openKebab, setOpenKebab, onOpenTask, onMoveTask, onDeleteTask, draggingId, readOnly }) {
  const [dragOverCol, setDragOverCol] = useState(null);

  return (
    <>
      <div className="filters">
        <div className="search">
          <Icon name="search" />
          <input
            type="text"
            placeholder="Buscar tarefas ou tags"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            aria-label="Buscar tarefas"
          />
        </div>
        <div className="chipset" role="group" aria-label="Filtrar por responsável">
          <button className="chip" aria-pressed={filters.assignee === "all"} onClick={() => setFilters({ ...filters, assignee: "all" })}>
            Todos
          </button>
          {MEMBERS.map((m) => (
            <button key={m.id} className="chip" aria-pressed={filters.assignee === m.id} onClick={() => setFilters({ ...filters, assignee: m.id })}>
              {m.name}
            </button>
          ))}
        </div>
        <div className="chipset" role="group" aria-label="Filtrar por prioridade">
          <button className="chip" aria-pressed={filters.priority === "all"} onClick={() => setFilters({ ...filters, priority: "all" })}>
            Toda prioridade
          </button>
          {PRIORITIES.map((p) => (
            <button key={p.id} className="chip" aria-pressed={filters.priority === p.id} onClick={() => setFilters({ ...filters, priority: p.id })}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="board">
        {STAGES.map((s) => {
          const colTasks = tasks.filter((t) => t.status === s.id);
          const isDoing = s.id === "doing";
          const overLimit = isDoing && colTasks.length > WIP_LIMIT;
          return (
            <div
              key={s.id}
              className={"column" + (dragOverCol === s.id ? " drag-over" : "")}
              onDragOver={(e) => {
                if (readOnly) return;
                e.preventDefault();
                setDragOverCol(s.id);
              }}
              onDragLeave={() => setDragOverCol((c) => (c === s.id ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverCol(null);
                if (readOnly) return;
                const id = e.dataTransfer.getData("text/plain") || draggingId.current;
                if (id) onMoveTask(id, s.id);
              }}
            >
              <div className="column-head">
                <span className="stage-swatch" style={{ background: "var(--stage-" + s.id + ")" }} />
                <h2>{s.label}</h2>
                <span className={"column-count" + (overLimit ? " limit" : "")}>
                  {colTasks.length}
                  {isDoing ? "/" + WIP_LIMIT : ""}
                </span>
              </div>
              <div className="column-body">
                {colTasks.length === 0 && <div className="column-empty">Sem tarefas</div>}
                {colTasks.map((t) => (
                  <Card
                    key={t.id}
                    t={t}
                    open={openKebab === t.id}
                    onToggleKebab={() => setOpenKebab(openKebab === t.id ? null : t.id)}
                    onCloseKebab={() => setOpenKebab(null)}
                    onOpen={() => onOpenTask(t)}
                    onMove={(status) => {
                      setOpenKebab(null);
                      onMoveTask(t.id, status);
                    }}
                    onDelete={() => {
                      setOpenKebab(null);
                      onDeleteTask(t);
                    }}
                    draggingId={draggingId}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Card({ t, open, onToggleKebab, onCloseKebab, onOpen, onMove, onDelete, draggingId, readOnly }) {
  const m = member(t.assignee);
  const overdue = isOverdue(t);
  const doneSub = (t.subtasks || []).filter((s) => s.done).length;
  const totalSub = (t.subtasks || []).length;
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onCloseKebab();
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open, onCloseKebab]);

  return (
    <div
      className="card"
      draggable={!readOnly}
      onDragStart={(e) => {
        draggingId.current = t.id;
        e.dataTransfer.setData("text/plain", t.id);
      }}
      onDragEnd={() => {
        draggingId.current = null;
      }}
    >
      <div className="card-top">
        <button className="card-title" onClick={onOpen}>
          {t.title}
        </button>
        <div className="kebab-menu" ref={ref}>
          <button className="icon-btn" onClick={onToggleKebab} aria-haspopup="true" aria-expanded={open} aria-label="Mover tarefa">
            <Icon name="dots" />
          </button>
          {open && (
            <div className="kebab-panel" role="menu">
              {STAGES.filter((s) => s.id !== t.status).map((s) => (
                <button key={s.id} onClick={() => onMove(s.id)}>
                  <span className="stage-swatch" style={{ background: "var(--stage-" + s.id + ")" }} /> Mover para {s.label}
                </button>
              ))}
              <button onClick={onDelete} style={{ color: "var(--danger)" }}>
                <Icon name="trash" /> Excluir
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="tag-row">
        <span className={"pri-pill pri-" + t.priority}>
          {t.priority === "alta" && <Icon name="alert" />}
          {priLabel(t.priority)}
        </span>
        {(t.tags || []).slice(0, 2).map((tag) => (
          <span className="tag" key={tag}>
            {tag}
          </span>
        ))}
        {(t.tags || []).length > 2 && <span className="tag">+{t.tags.length - 2}</span>}
      </div>
      <div className="card-meta">
        {t.dueDate && (
          <span className={"due" + (overdue ? " overdue" : "")}>
            <Icon name="calendar" /> {fmtDate(t.dueDate)}
          </span>
        )}
        {totalSub > 0 && (
          <span className="subtasks">
            <Icon name="check" /> {doneSub}/{totalSub}
          </span>
        )}
        <span className="card-meta-spacer" />
        {m && <Avatar m={m} small />}
      </div>
    </div>
  );
}

function statTile(v, label, isAccent) {
  return (
    <div className={"stat-tile" + (isAccent ? " accent" : "")} key={label}>
      <div className="v num">{v}</div>
      <div className="l">{label}</div>
    </div>
  );
}

function Dashboard({ state }) {
  const tasks = state.tasks;
  const byStatus = {};
  STAGES.forEach((s) => (byStatus[s.id] = tasks.filter((t) => t.status === s.id).length));
  const overdue = tasks.filter(isOverdue).length;
  const maxStatus = Math.max(...STAGES.map((s) => byStatus[s.id]), 1);

  const byPri = {};
  PRIORITIES.forEach((p) => (byPri[p.id] = tasks.filter((t) => t.priority === p.id && t.status !== "done").length));
  const maxPri = Math.max(...PRIORITIES.map((p) => byPri[p.id]), 1);

  const upcoming = tasks
    .filter((t) => t.dueDate && t.status !== "done")
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
    .slice(0, 6);

  function activeFor(id) {
    return tasks.filter((t) => t.assignee === id && t.status !== "done").length;
  }
  const maxActive = Math.max(...MEMBERS.map((m) => activeFor(m.id)), 1);

  return (
    <>
      <div className="stat-row">
        {statTile(tasks.length, "Total de tarefas")}
        {statTile(byStatus.todo, "A fazer")}
        {statTile(byStatus.doing, "Em progresso")}
        {statTile(byStatus.review, "Em revisão")}
        {statTile(byStatus.done, "Concluídas")}
        {statTile(overdue, "Atrasadas", true)}
      </div>

      <div className="dash-grid">
        <div>
          <div className="panel">
            <h3>Distribuição por status</h3>
            {STAGES.map((s) => (
              <div className="bar-row" key={s.id}>
                <span className="bar-label">{s.label}</span>
                <span className="bar-track">
                  <span className="bar-fill" style={{ width: (byStatus[s.id] / maxStatus) * 100 + "%", background: "var(--stage-" + s.id + ")" }} />
                </span>
                <span className="bar-count num">{byStatus[s.id]}</span>
              </div>
            ))}
          </div>

          <div className="panel">
            <h3>Prioridade (tarefas em aberto)</h3>
            {PRIORITIES.map((p) => (
              <div className="bar-row" key={p.id}>
                <span className="bar-label">{p.label}</span>
                <span className="bar-track">
                  <span className="bar-fill" style={{ width: (byPri[p.id] / maxPri) * 100 + "%", background: "var(--pri-" + p.id + ")" }} />
                </span>
                <span className="bar-count num">{byPri[p.id]}</span>
              </div>
            ))}
          </div>

          <div className="panel">
            <h3>Atividade recente</h3>
            {state.activity.length === 0 ? (
              <p className="empty-note">Sem atividade ainda.</p>
            ) : (
              state.activity.slice(0, 8).map((a, i) => {
                const m = member(a.who);
                return (
                  <div className="activity-item" key={i}>
                    <span className="dot" style={{ background: m ? m.color : "var(--ink-muted)" }} />
                    <span className="txt">{a.text}</span>
                    <span className="when">{fmtWhen(a.ts)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div>
          <div className="panel">
            <h3>Carga por responsável</h3>
            {MEMBERS.map((m) => {
              const v = activeFor(m.id);
              const overWip = tasks.filter((t) => t.assignee === m.id && t.status === "doing").length > WIP_LIMIT;
              return (
                <div className="member-row" key={m.id}>
                  <Avatar m={m} />
                  <div className="info">
                    <div className="name">{m.name}</div>
                    <div className="count">
                      {v} tarefa{v === 1 ? "" : "s"} ativa{v === 1 ? "" : "s"}
                      {overWip ? " · acima do limite" : ""}
                    </div>
                  </div>
                  <span className="bar-track">
                    <span className="bar-fill" style={{ width: (v / maxActive) * 100 + "%", background: m.color }} />
                  </span>
                </div>
              );
            })}
          </div>

          <div className="panel">
            <h3>Próximos prazos</h3>
            {upcoming.length === 0 ? (
              <p className="empty-note">Nenhum prazo em aberto.</p>
            ) : (
              upcoming.map((t) => {
                const over = isOverdue(t);
                return (
                  <div className="list-row" key={t.id}>
                    <span className="pri-dot" style={{ background: "var(--pri-" + t.priority + ")" }} />
                    <span className="title">{t.title}</span>
                    <span className={"due-badge" + (over ? " overdue" : "")}>
                      {over ? "Atrasada · " : ""}
                      {fmtDate(t.dueDate)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function TaskModal({ task, onClose, onSave, onDelete }) {
  const t = task;
  const [title, setTitle] = useState(t ? t.title : "");
  const [description, setDescription] = useState(t ? t.description : "");
  const [status, setStatus] = useState(t ? t.status : "todo");
  const [priority, setPriority] = useState(t ? t.priority : "media");
  const [assignee, setAssignee] = useState(t && t.assignee ? t.assignee : "");
  const [dueDate, setDueDate] = useState(t && t.dueDate ? t.dueDate : "");
  const [tagsText, setTagsText] = useState(t ? (t.tags || []).join(", ") : "");
  const [subtasks, setSubtasks] = useState(t ? (t.subtasks || []).slice() : []);
  const [newSubtask, setNewSubtask] = useState("");
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current && titleRef.current.focus();
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function addSubtask() {
    if (!newSubtask.trim()) return;
    setSubtasks([...subtasks, { text: newSubtask.trim(), done: false }]);
    setNewSubtask("");
  }

  function handleSave() {
    if (!title.trim()) {
      titleRef.current && titleRef.current.focus();
      return;
    }
    onSave(t ? t.id : null, {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assignee: assignee || null,
      dueDate: dueDate || null,
      tags: tagsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      subtasks,
    });
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">{t ? "Editar tarefa" : "Nova tarefa"}</h2>

        <div className="field">
          <label htmlFor="f-title">Título</label>
          <input id="f-title" ref={titleRef} type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Enviar proposta ao cliente" />
        </div>

        <div className="field">
          <label htmlFor="f-desc">Descrição</label>
          <textarea id="f-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes opcionais" />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="f-status">Status</label>
            <select id="f-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-priority">Prioridade</label>
            <select id="f-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="f-assignee">Responsável</label>
            <select id="f-assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="">Ninguém</option>
              {MEMBERS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-due">Prazo</label>
            <input id="f-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="f-tags">Tags (separadas por vírgula)</label>
          <input id="f-tags" type="text" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="Ex.: Cliente, Financeiro" />
        </div>

        <div className="field">
          <label>Subtarefas</label>
          <div>
            {subtasks.map((s, i) => (
              <div className="subtask-row" key={i}>
                <input
                  type="checkbox"
                  checked={s.done}
                  onChange={(e) => {
                    const copy = subtasks.slice();
                    copy[i] = { ...copy[i], done: e.target.checked };
                    setSubtasks(copy);
                  }}
                />
                <input
                  type="text"
                  value={s.text}
                  onChange={(e) => {
                    const copy = subtasks.slice();
                    copy[i] = { ...copy[i], text: e.target.value };
                    setSubtasks(copy);
                  }}
                />
                <button type="button" className="icon-btn" aria-label="Remover subtarefa" onClick={() => setSubtasks(subtasks.filter((_, idx) => idx !== i))}>
                  <Icon name="x" />
                </button>
              </div>
            ))}
          </div>
          <div className="add-subtask">
            <input
              type="text"
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              placeholder="Adicionar subtarefa"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSubtask();
                }
              }}
            />
            <button type="button" className="icon-btn" aria-label="Adicionar subtarefa" onClick={addSubtask}>
              <Icon name="plus" />
            </button>
          </div>
        </div>

        <div className="modal-actions">
          {t && (
            <button className="btn btn-danger" onClick={() => onDelete(t)}>
              <Icon name="trash" /> Excluir
            </button>
          )}
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Icon name="check" /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function IdentityModal({ onPick, canClose, onClose }) {
  return (
    <div className="overlay" onClick={(e) => canClose && e.target === e.currentTarget && onClose()}>
      <div className="modal identity-card" role="dialog" aria-modal="true" aria-labelledby="id-title">
        <h2 id="id-title">Quem é você?</h2>
        <p>Isso ajuda a atribuir tarefas e registrar a atividade no quadro do Projeto Glaz.</p>
        <div className="identity-options">
          {MEMBERS.map((m) => (
            <button type="button" className="identity-btn" key={m.id} onClick={() => onPick(m.id)}>
              <Avatar m={m} />
              <span>{m.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
