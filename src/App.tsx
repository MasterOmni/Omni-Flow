import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  RotateCw,
  Shield,
  User,
  X,
  LogOut,
  Search,
  Filter,
  ClipboardList,
  ArrowLeftRight,
  Ban,
  Inbox,
  Users,
  Plus,
} from "lucide-react";

/**
 * Omni-flow (GeoPal-style) — MVP (front-end only)
 * Self-contained, uses localStorage for demo persistence.
 */

// ---------------------------
// Types / constants
// ---------------------------
const STATUSES = {
  READY: "Ready",
  IN_PROGRESS: "In Progress",
  COMPLETE: "Complete",
  ABORT: "Abort",
  BAU: "BAU",
} as const;

type Status = (typeof STATUSES)[keyof typeof STATUSES];
type Role = "admin" | "operative";

type Auth = {
  user: string;
  role: Role;
  token: string;
};

type Job = {
  id: string;
  jobNumber: string;
  houseNo: string;
  address: string;
  area: string;
  status: Status;
  allocatedTo: string | null;
  updatedAt: string;
};

type WorkRequest = {
  id: string;
  requestedBy: string;
  notes: string;
  createdAt: string;
  status: "Open" | "Closed";
};

const ROLES = {
  ADMIN: "admin",
  OPERATIVE: "operative",
} as const;

const TABS = {
  MY_JOBS: "My Jobs",
  REQUESTS: "Request More Work",
  ADMIN: "Admin",
} as const;

type Tab = (typeof TABS)[keyof typeof TABS];

// ---------------------------
// Utilities
// ---------------------------
function nowIso() {
  return new Date().toISOString();
}

function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeId(prefix: string) {
  const anyCrypto = (globalThis as any).crypto;
  const uuid = anyCrypto?.randomUUID?.();
  if (uuid) return uuid as string;
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function makeDemoJobs(count = 120): Job[] {
  const areas = ["BS1", "BS2", "BS3", "BS4", "BS5", "BS6", "BS7", "BS8", "BS9", "BS10"];
  const roads = [
    "Crows Grove",
    "Station Road",
    "Church Lane",
    "High Street",
    "Meadow View",
    "Kingsway",
    "Brunel Way",
    "Oakfield Close",
    "Victoria Avenue",
    "Harbour Road",
  ];
  const towns = ["Bristol", "Bath", "Filton", "Keynsham", "Portishead", "Thornbury", "Yate", "Clevedon"];

  const jobs: Job[] = [];
  for (let i = 0; i < count; i++) {
    const houseNo = String(Math.floor(Math.random() * 220) + 1) + (Math.random() < 0.08 ? "A" : "");
    const address = `${randomFrom(roads)}, ${randomFrom(towns)}`;
    jobs.push({
      id: makeId("job"),
      jobNumber: `JOB-${String(100000 + i)}`,
      houseNo,
      address,
      area: randomFrom(areas),
      status: STATUSES.READY,
      allocatedTo: null,
      updatedAt: nowIso(),
    });
  }
  return jobs;
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------
// Storage (demo)
// ---------------------------
const LS_KEYS = {
  AUTH: "omniflow_auth_v1",
  JOBS: "omniflow_jobs_v1",
  REQUESTS: "omniflow_requests_v1",
};

function loadAuth(): Auth | null {
  return safeJsonParse<Auth | null>(localStorage.getItem(LS_KEYS.AUTH) || "", null);
}

function saveAuth(auth: Auth) {
  localStorage.setItem(LS_KEYS.AUTH, JSON.stringify(auth));
}

function clearAuth() {
  localStorage.removeItem(LS_KEYS.AUTH);
}

function loadJobs(): Job[] {
  const existing = safeJsonParse<Job[] | null>(localStorage.getItem(LS_KEYS.JOBS) || "", null);
  if (Array.isArray(existing) && existing.length) return existing;
  const seeded = makeDemoJobs(120);
  localStorage.setItem(LS_KEYS.JOBS, JSON.stringify(seeded));
  return seeded;
}

function saveJobs(jobs: Job[]) {
  localStorage.setItem(LS_KEYS.JOBS, JSON.stringify(jobs));
}

function loadRequests(): WorkRequest[] {
  const existing = safeJsonParse<WorkRequest[] | null>(localStorage.getItem(LS_KEYS.REQUESTS) || "", null);
  if (Array.isArray(existing)) return existing;
  localStorage.setItem(LS_KEYS.REQUESTS, JSON.stringify([]));
  return [];
}

function saveRequests(reqs: WorkRequest[]) {
  localStorage.setItem(LS_KEYS.REQUESTS, JSON.stringify(reqs));
}

// ---------------------------
// UI primitives
// ---------------------------
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl shadow-sm border border-slate-200 bg-white ${className}`}>{children}</div>;
}

type ButtonProps = {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  variant?: "primary" | "ghost" | "soft" | "danger" | "success" | "warn";
  disabled?: boolean;
  className?: string;
  title?: string;
  type?: "button" | "submit" | "reset";
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, onClick, variant = "primary", disabled, className = "", title, type = "button" },
  ref
) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed";
  const styles: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-900",
    soft: "bg-slate-100 hover:bg-slate-200 text-slate-900",
    danger: "bg-red-600 text-white hover:bg-red-500",
    success: "bg-emerald-600 text-white hover:bg-emerald-500",
    warn: "bg-amber-500 text-white hover:bg-amber-400",
  };
  return (
    <button
      ref={ref}
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
});

function Chip({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "blue" | "green" | "red" | "amber" | "purple";
}) {
  const tones: Record<NonNullable<typeof tone>, string> = {
    neutral: "bg-slate-100 text-slate-800 border-slate-200",
    blue: "bg-blue-50 text-blue-800 border-blue-200",
    green: "bg-emerald-50 text-emerald-800 border-emerald-200",
    red: "bg-red-50 text-red-800 border-red-200",
    amber: "bg-amber-50 text-amber-900 border-amber-200",
    purple: "bg-purple-50 text-purple-800 border-purple-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
      {label}
    </span>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  icon: Icon,
  className = "",
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  type?: string;
}) {
  return (
    <div className={`flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm ${className}`}>
      {Icon ? <Icon className="h-4 w-4 text-slate-500" /> : null}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent outline-none text-sm"
      />
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm ${className}`}>
      <Filter className="h-4 w-4 text-slate-500" />
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent outline-none text-sm">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Divider({ className = "" }: { className?: string }) {
  return <div className={`h-px w-full bg-slate-200 ${className}`} />;
}

function StatusChip({ status }: { status: Status }) {
  const tone =
    status === STATUSES.READY
      ? "blue"
      : status === STATUSES.IN_PROGRESS
      ? "purple"
      : status === STATUSES.COMPLETE
      ? "green"
      : status === STATUSES.ABORT
      ? "red"
      : status === STATUSES.BAU
      ? "amber"
      : "neutral";
  return <Chip label={status} tone={tone} />;
}

function TabButton({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition border ${
        active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-900 border-slate-200 hover:bg-slate-100"
      }`}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {label}
    </button>
  );
}

// ---------------------------
// Pages
// ---------------------------
function LoginPage({ onLogin }: { onLogin: (a: Auth) => void }) {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Enter a name / user ID");
      return;
    }

    const role: Role = pin === "9999" || username.trim().toLowerCase() === "admin" ? ROLES.ADMIN : ROLES.OPERATIVE;

    if (role === ROLES.OPERATIVE && pin && pin !== "1234") {
      setError("Incorrect PIN (demo operative PIN is 1234, or leave blank). Admin PIN is 9999.");
      return;
    }

    const auth: Auth = { user: username.trim(), role, token: "demo" };
    saveAuth(auth);
    onLogin(auth);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xl font-extrabold tracking-tight text-slate-900">Omni-flow</div>
              <div className="text-sm text-slate-600">Field job allocation & updates</div>
            </div>
          </div>

          <Divider className="my-5" />

          <form onSubmit={submit} className="space-y-3">
            <Input value={username} onChange={setUsername} placeholder="Name / User ID" icon={User} />
            <Input value={pin} onChange={setPin} placeholder="PIN (operative 1234, admin 9999)" type="password" />
            {error ? <div className="text-sm font-semibold text-red-600">{error}</div> : null}
            <Button type="submit" className="w-full">
              Login
            </Button>

            <div className="text-xs text-slate-500 leading-relaxed">
              Demo: operatives can use PIN <span className="font-semibold">1234</span> (or blank). Admin uses PIN{" "}
              <span className="font-semibold">9999</span>.
              <br />
              Live version will use real accounts.
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

function AppShell({ auth, onLogout }: { auth: Auth; onLogout: () => void }) {
  const [jobs, setJobs] = useState<Job[]>(() => loadJobs());
  const [requests, setRequests] = useState<WorkRequest[]>(() => loadRequests());
  const [tab, setTab] = useState<Tab>(TABS.MY_JOBS);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => saveJobs(jobs), [jobs]);
  useEffect(() => saveRequests(requests), [requests]);

  const isAdmin = auth.role === ROLES.ADMIN;

  useEffect(() => {
    if (!isAdmin && tab === TABS.ADMIN) setTab(TABS.MY_JOBS);
  }, [isAdmin, tab]);

  const selectedJob = useMemo(() => jobs.find((j) => j.id === selectedJobId) || null, [jobs, selectedJobId]);

  function updateJob(jobId: string, patch: Partial<Job>) {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              ...patch,
              updatedAt: nowIso(),
            }
          : j
      )
    );
  }

  function setStatus(jobId: string, status: Status) {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    if (!isAdmin && job.allocatedTo !== auth.user) return;
    updateJob(jobId, { status });
  }

  function allocate(jobId: string, assignee: string) {
    if (!isAdmin) return;
    const name = (assignee || "").trim();
    if (!name) return;
    updateJob(jobId, { allocatedTo: name, status: STATUSES.READY });
  }

  function unallocate(jobId: string) {
    if (!isAdmin) return;
    updateJob(jobId, { allocatedTo: null, status: STATUSES.READY });
  }

  function createRequest({ requestedBy, notes }: { requestedBy: string; notes: string }) {
    const req: WorkRequest = {
      id: makeId("req"),
      requestedBy,
      notes: notes?.trim() || "",
      createdAt: nowIso(),
      status: "Open",
    };
    setRequests((prev) => [req, ...prev]);
  }

  async function refresh() {
    setIsRefreshing(true);
    await new Promise((r) => setTimeout(r, clamp(500 + Math.random() * 700, 500, 1200)));
    setJobs((prev) => prev.map((j) => j));
    setRequests((prev) => prev.map((r) => r));
    setIsRefreshing(false);
  }

  function resetDemoData() {
    setJobs(makeDemoJobs(120));
    setRequests([]);
    setSelectedJobId(null);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-30 backdrop-blur bg-white/80 border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-extrabold tracking-tight text-slate-900">Omni-flow</div>
              <div className="text-xs text-slate-600">
                Logged in as <span className="font-semibold">{auth.user}</span> •{" "}
                <span className="font-semibold">{auth.role}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="soft" onClick={resetDemoData} title="Reset demo data">
              Reset
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                clearAuth();
                onLogout();
              }}
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-3 flex flex-wrap gap-2">
          <TabButton active={tab === TABS.MY_JOBS} label={TABS.MY_JOBS} icon={Users} onClick={() => setTab(TABS.MY_JOBS)} />
          <TabButton active={tab === TABS.REQUESTS} label={TABS.REQUESTS} icon={Inbox} onClick={() => setTab(TABS.REQUESTS)} />
          {isAdmin ? <TabButton active={tab === TABS.ADMIN} label={TABS.ADMIN} icon={Shield} onClick={() => setTab(TABS.ADMIN)} /> : null}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-4 pb-28">
        {tab === TABS.MY_JOBS ? <MyJobsView auth={auth} jobs={jobs} onOpenJob={setSelectedJobId} onSetStatus={setStatus} /> : null}
        {tab === TABS.REQUESTS ? <RequestsView auth={auth} requests={requests} onCreate={createRequest} /> : null}
        {tab === TABS.ADMIN && isAdmin ? (
          <AdminView jobs={jobs} requests={requests} onOpenJob={setSelectedJobId} onAllocate={allocate} onUnallocate={unallocate} />
        ) : null}
      </div>

      <div className="fixed left-1/2 -translate-x-1/2 z-40" style={{ bottom: "15vh" }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Button onClick={refresh} disabled={isRefreshing} className="shadow-lg">
            <RotateCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing" : "Refresh"}
          </Button>
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedJob ? (
          <JobDrawer
            key={selectedJob.id}
            auth={auth}
            job={selectedJob}
            onClose={() => setSelectedJobId(null)}
            onSetStatus={(status) => setStatus(selectedJob.id, status)}
            isAdmin={isAdmin}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function MyJobsView({
  auth,
  jobs,
  onOpenJob,
  onSetStatus,
}: {
  auth: Auth;
  jobs: Job[];
  onOpenJob: (id: string) => void;
  onSetStatus: (id: string, s: Status) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [areaFilter, setAreaFilter] = useState<string>("ALL");
  const [pageSize, setPageSize] = useState(30);

  const myJobs = useMemo(() => jobs.filter((j) => j.allocatedTo === auth.user), [jobs, auth.user]);

  const areas = useMemo(() => {
    const uniq = Array.from(new Set(myJobs.map((j) => j.area))).sort();
    return ["ALL", ...uniq];
  }, [myJobs]);

  const counts = useMemo(() => {
    const c = { total: myJobs.length, ready: 0, inProgress: 0, complete: 0, abort: 0, bau: 0 };
    for (const j of myJobs) {
      if (j.status === STATUSES.READY) c.ready++;
      else if (j.status === STATUSES.IN_PROGRESS) c.inProgress++;
      else if (j.status === STATUSES.COMPLETE) c.complete++;
      else if (j.status === STATUSES.ABORT) c.abort++;
      else if (j.status === STATUSES.BAU) c.bau++;
    }
    return c;
  }, [myJobs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return myJobs
      .filter((j) => {
        const matchesSearch =
          !q ||
          j.jobNumber.toLowerCase().includes(q) ||
          j.address.toLowerCase().includes(q) ||
          j.houseNo.toLowerCase().includes(q) ||
          j.area.toLowerCase().includes(q);

        const matchesStatus = statusFilter === "ALL" || j.status === statusFilter;
        const matchesArea = areaFilter === "ALL" || j.area === areaFilter;
        return matchesSearch && matchesStatus && matchesArea;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [myJobs, search, statusFilter, areaFilter]);

  const paged = filtered.slice(0, pageSize);

  return (
    <div>
      <div className="flex flex-wrap gap-2 items-center">
        <Chip label={`Allocated to you: ${counts.total}`} />
        <Chip label={`Ready: ${counts.ready}`} tone="blue" />
        <Chip label={`In Progress: ${counts.inProgress}`} tone="purple" />
        <Chip label={`Complete: ${counts.complete}`} tone="green" />
        <Chip label={`Abort: ${counts.abort}`} tone="red" />
        <Chip label={`BAU: ${counts.bau}`} tone="amber" />
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input value={search} onChange={setSearch} placeholder="Search job #, address, house no, area..." icon={Search} />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "ALL", label: "All statuses" },
            { value: STATUSES.READY, label: "Ready" },
            { value: STATUSES.IN_PROGRESS, label: "In Progress" },
            { value: STATUSES.COMPLETE, label: "Complete" },
            { value: STATUSES.ABORT, label: "Abort" },
            { value: STATUSES.BAU, label: "BAU" },
          ]}
        />
        <Select value={areaFilter} onChange={setAreaFilter} options={areas.map((a) => ({ value: a, label: a === "ALL" ? "All areas" : `Area ${a}` }))} />
      </div>

      {counts.total === 0 ? (
        <Card className="p-6 mt-4">
          <div className="text-sm font-semibold text-slate-700">No jobs allocated to you yet.</div>
          <div className="text-xs text-slate-500 mt-1">Use “Request More Work” to ping admin for allocation.</div>
        </Card>
      ) : null}

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
        {paged.map((job) => (
          <motion.button key={job.id} onClick={() => onOpenJob(job.id)} whileTap={{ scale: 0.995 }} className="text-left">
            <Card className="p-4 hover:shadow-md transition">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-sm font-extrabold text-slate-900">{job.jobNumber}</div>
                    <StatusChip status={job.status} />
                  </div>
                  <div className="mt-2 text-sm text-slate-900 font-semibold">
                    {job.houseNo} {job.address}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    Area: <span className="font-semibold">{job.area}</span> • Updated: {formatWhen(job.updatedAt)}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="soft"
                  className="px-3 py-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetStatus(job.id, STATUSES.IN_PROGRESS);
                  }}
                  disabled={job.status === STATUSES.COMPLETE || job.status === STATUSES.ABORT}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  Take
                </Button>
                <Button
                  variant="success"
                  className="px-3 py-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetStatus(job.id, STATUSES.COMPLETE);
                  }}
                  disabled={job.status === STATUSES.COMPLETE}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Complete
                </Button>
                <Button
                  variant="warn"
                  className="px-3 py-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetStatus(job.id, STATUSES.BAU);
                  }}
                  disabled={job.status === STATUSES.COMPLETE}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  BAU
                </Button>
                <Button
                  variant="danger"
                  className="px-3 py-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetStatus(job.id, STATUSES.ABORT);
                  }}
                  disabled={job.status === STATUSES.COMPLETE}
                >
                  <Ban className="h-4 w-4" />
                  Abort
                </Button>
              </div>
            </Card>
          </motion.button>
        ))}

        {paged.length === 0 && counts.total > 0 ? (
          <Card className="p-6">
            <div className="text-sm font-semibold text-slate-700">No jobs match your filters.</div>
            <div className="text-xs text-slate-500 mt-1">Try clearing search/filters.</div>
          </Card>
        ) : null}
      </div>

      {filtered.length > pageSize ? (
        <div className="mt-4 flex justify-center">
          <Button variant="soft" onClick={() => setPageSize((s) => s + 30)}>
            <Plus className="h-4 w-4" />
            Load 30 more
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function RequestsView({
  auth,
  requests,
  onCreate,
}: {
  auth: Auth;
  requests: WorkRequest[];
  onCreate: (x: { requestedBy: string; notes: string }) => void;
}) {
  const [notes, setNotes] = useState("");
  const myRequests = useMemo(() => requests.filter((r) => r.requestedBy === auth.user), [requests, auth.user]);

  function submit() {
    onCreate({ requestedBy: auth.user, notes });
    setNotes("");
  }

  return (
    <div>
      <Card className="p-5">
        <div className="text-sm font-extrabold text-slate-900">Request more work</div>
        <div className="text-xs text-slate-600 mt-1">This sends a request to admin to allocate more jobs to you.</div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <Input value={notes} onChange={setNotes} placeholder="Optional notes (area, tools needed, access issues...)" />
          </div>
          <Button onClick={submit}>
            <Inbox className="h-4 w-4" />
            Send request
          </Button>
        </div>
      </Card>

      <div className="mt-4">
        <div className="text-sm font-extrabold text-slate-900">Your requests</div>
        <div className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-3">
          {myRequests.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold text-slate-900">Request</div>
                  <div className="mt-1 text-xs text-slate-600">Created: {formatWhen(r.createdAt)}</div>
                  {r.notes ? <div className="mt-2 text-sm text-slate-800">{r.notes}</div> : <div className="mt-2 text-sm text-slate-500">No notes</div>}
                </div>
                <Chip label={r.status} tone={r.status === "Open" ? "blue" : "neutral"} />
              </div>
            </Card>
          ))}
          {myRequests.length === 0 ? (
            <Card className="p-6">
              <div className="text-sm font-semibold text-slate-700">No requests yet.</div>
              <div className="text-xs text-slate-500 mt-1">Tap “Send request” when you need more work allocated.</div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AdminView({
  jobs,
  requests,
  onOpenJob,
  onAllocate,
  onUnallocate,
}: {
  jobs: Job[];
  requests: WorkRequest[];
  onOpenJob: (id: string) => void;
  onAllocate: (jobId: string, assignee: string) => void;
  onUnallocate: (jobId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("UNALLOCATED");
  const [assignee, setAssignee] = useState("");
  const [pageSize, setPageSize] = useState(30);

  const areas = useMemo(() => {
    const uniq = Array.from(new Set(jobs.map((j) => j.area))).sort();
    return ["ALL", ...uniq];
  }, [jobs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs
      .filter((j) => {
        const matchesSearch =
          !q ||
          j.jobNumber.toLowerCase().includes(q) ||
          j.address.toLowerCase().includes(q) ||
          j.houseNo.toLowerCase().includes(q) ||
          j.area.toLowerCase().includes(q) ||
          (j.allocatedTo || "").toLowerCase().includes(q);

        const matchesArea = areaFilter === "ALL" || j.area === areaFilter;

        const matchesStatus =
          statusFilter === "ALL"
            ? true
            : statusFilter === "UNALLOCATED"
            ? !j.allocatedTo
            : statusFilter === "ALLOCATED"
            ? !!j.allocatedTo
            : j.status === statusFilter;

        return matchesSearch && matchesArea && matchesStatus;
      })
      .sort((a, b) => {
        const ra = a.allocatedTo ? 1 : 0;
        const rb = b.allocatedTo ? 1 : 0;
        if (ra !== rb) return ra - rb;
        return a.jobNumber.localeCompare(b.jobNumber);
      });
  }, [jobs, search, areaFilter, statusFilter]);

  const paged = filtered.slice(0, pageSize);
  const openReqs = useMemo(() => requests.filter((r) => r.status === "Open"), [requests]);

  function allocateTopN(n: number) {
    const name = assignee.trim();
    if (!name) return;
    const unallocated = filtered.filter((j) => !j.allocatedTo).slice(0, n);
    for (const j of unallocated) onAllocate(j.id, name);
  }

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="p-5 lg:col-span-2">
          <div className="text-sm font-extrabold text-slate-900">Allocate jobs</div>
          <div className="text-xs text-slate-600 mt-1">Filter unallocated jobs, then assign to an operative.</div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={search} onChange={setSearch} placeholder="Search job # / address / operative..." icon={Search} />
            <Select value={areaFilter} onChange={setAreaFilter} options={areas.map((a) => ({ value: a, label: a === "ALL" ? "All areas" : `Area ${a}` }))} />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "UNALLOCATED", label: "Unallocated" },
                { value: "ALLOCATED", label: "Allocated" },
                { value: "ALL", label: "All" },
                { value: STATUSES.READY, label: "Ready" },
                { value: STATUSES.IN_PROGRESS, label: "In Progress" },
                { value: STATUSES.COMPLETE, label: "Complete" },
                { value: STATUSES.ABORT, label: "Abort" },
                { value: STATUSES.BAU, label: "BAU" },
              ]}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <Input value={assignee} onChange={setAssignee} placeholder="Allocate to (name/user)" icon={User} />
            <Button variant="soft" onClick={() => allocateTopN(5)} title="Allocate top 5 unallocated jobs">
              <Users className="h-4 w-4" />
              Allocate next 5
            </Button>
            <Button variant="soft" onClick={() => allocateTopN(10)} title="Allocate top 10 unallocated jobs">
              <Users className="h-4 w-4" />
              Allocate next 10
            </Button>
          </div>

          <Divider className="my-5" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {paged.map((job) => (
              <motion.button key={job.id} onClick={() => onOpenJob(job.id)} whileTap={{ scale: 0.995 }} className="text-left">
                <Card className="p-4 hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-sm font-extrabold text-slate-900">{job.jobNumber}</div>
                        <StatusChip status={job.status} />
                        {job.allocatedTo ? <Chip label={`Assigned: ${job.allocatedTo}`} /> : <Chip label="Unallocated" tone="blue" />}
                      </div>
                      <div className="mt-2 text-sm text-slate-900 font-semibold">
                        {job.houseNo} {job.address}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Area: <span className="font-semibold">{job.area}</span> • Updated: {formatWhen(job.updatedAt)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="soft"
                      className="px-3 py-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!assignee.trim()) return;
                        onAllocate(job.id, assignee);
                      }}
                      disabled={!!job.allocatedTo && job.allocatedTo === assignee.trim()}
                    >
                      <Users className="h-4 w-4" />
                      Allocate
                    </Button>
                    <Button
                      variant="ghost"
                      className="px-3 py-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnallocate(job.id);
                      }}
                      disabled={!job.allocatedTo}
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                      Unassign
                    </Button>
                  </div>
                </Card>
              </motion.button>
            ))}

            {paged.length === 0 ? (
              <Card className="p-6">
                <div className="text-sm font-semibold text-slate-700">No jobs match your filters.</div>
                <div className="text-xs text-slate-500 mt-1">Try clearing search/filters.</div>
              </Card>
            ) : null}
          </div>

          {filtered.length > pageSize ? (
            <div className="mt-4 flex justify-center">
              <Button variant="soft" onClick={() => setPageSize((s) => s + 30)}>
                <Plus className="h-4 w-4" />
                Load 30 more
              </Button>
            </div>
          ) : null}
        </Card>

        <Card className="p-5">
          <div className="text-sm font-extrabold text-slate-900">Open work requests</div>
          <div className="text-xs text-slate-600 mt-1">When operatives request more work, they appear here.</div>

          <div className="mt-4 space-y-3">
            {openReqs.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">{r.requestedBy}</div>
                    <div className="mt-1 text-xs text-slate-600">Created: {formatWhen(r.createdAt)}</div>
                    {r.notes ? <div className="mt-2 text-sm text-slate-800">{r.notes}</div> : <div className="mt-2 text-sm text-slate-500">No notes</div>}
                  </div>
                  <Chip label={r.status} tone="blue" />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="soft"
                    className="px-3 py-2"
                    onClick={() => {
                      setAssignee(r.requestedBy);
                      allocateTopN(5);
                    }}
                  >
                    <Users className="h-4 w-4" />
                    Allocate 5
                  </Button>
                </div>
              </Card>
            ))}

            {openReqs.length === 0 ? <div className="text-sm text-slate-600">No open requests.</div> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function JobDrawer({
  auth,
  job,
  onClose,
  onSetStatus,
  isAdmin,
}: {
  auth: Auth;
  job: Job;
  onClose: () => void;
  onSetStatus: (s: Status) => void;
  isAdmin: boolean;
}) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeBtnRef.current?.focus?.();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canEdit = isAdmin || job.allocatedTo === auth.user;

  return (
    <motion.div className="fixed inset-0 z-50">
      <motion.div
        className="absolute inset-0 bg-slate-900/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl border-l border-slate-200"
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
      >
        <div className="p-5 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-lg font-extrabold text-slate-900">{job.jobNumber}</div>
              <StatusChip status={job.status} />
            </div>
            <div className="mt-2 text-sm text-slate-900 font-semibold">
              {job.houseNo} {job.address}
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Area: <span className="font-semibold">{job.area}</span>
            </div>
          </div>

          <Button ref={closeBtnRef} variant="ghost" onClick={onClose} title="Close" className="px-3 py-2">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Divider />

        <div className="p-5 space-y-4">
          <Card className="p-4">
            <div className="text-xs font-semibold text-slate-500">Details</div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-500">Job Number</div>
                <div className="text-sm font-semibold text-slate-900">{job.jobNumber}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Status</div>
                <div className="text-sm font-semibold text-slate-900">{job.status}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Area</div>
                <div className="text-sm font-semibold text-slate-900">{job.area}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Last Updated</div>
                <div className="text-sm font-semibold text-slate-900">{formatWhen(job.updatedAt)}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-slate-500">Address</div>
                <div className="text-sm font-semibold text-slate-900">
                  {job.houseNo} {job.address}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-slate-500">Allocated To</div>
                <div className="text-sm font-semibold text-slate-900">{job.allocatedTo || "Unallocated"}</div>
              </div>
            </div>
          </Card>

          {canEdit ? (
            <Card className="p-4">
              <div className="text-xs font-semibold text-slate-500">Actions</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="soft"
                  className="px-3 py-2"
                  onClick={() => onSetStatus(STATUSES.IN_PROGRESS)}
                  disabled={job.status === STATUSES.COMPLETE || job.status === STATUSES.ABORT}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  In Progress
                </Button>

                <Button
                  variant="success"
                  className="px-3 py-2"
                  onClick={() => onSetStatus(STATUSES.COMPLETE)}
                  disabled={job.status === STATUSES.COMPLETE}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Complete
                </Button>

                <Button
                  variant="warn"
                  className="px-3 py-2"
                  onClick={() => onSetStatus(STATUSES.BAU)}
                  disabled={job.status === STATUSES.COMPLETE}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  BAU
                </Button>

                <Button
                  variant="danger"
                  className="px-3 py-2"
                  onClick={() => onSetStatus(STATUSES.ABORT)}
                  disabled={job.status === STATUSES.COMPLETE}
                >
                  <Ban className="h-4 w-4" />
                  Abort
                </Button>

                <Button variant="ghost" className="px-3 py-2 ml-auto" onClick={onClose}>
                  <X className="h-4 w-4" />
                  Close
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-4">
              <div className="text-sm font-semibold text-slate-700">Read-only</div>
              <div className="text-xs text-slate-500 mt-1">Only admin or the allocated operative can update this job.</div>
            </Card>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------
// App root
// ---------------------------
export default function App() {
  const [auth, setAuth] = useState<Auth | null>(() => loadAuth());

  if (!auth) return <LoginPage onLogin={setAuth} />;

  return (
    <AppShell
      auth={auth}
      onLogout={() => {
        setAuth(null);
      }}
    />
  );
}


