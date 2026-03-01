"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    CheckCircle2,
    Circle,
    ChevronRight,
    Zap,
    Code2,
    BookOpen,
    Brain,
    ShieldCheck,
    Rocket,
    GitBranch,
    Database,
    Globe,
    Cpu,
    Lock,
    TestTube2,
    BarChart3,
    Layers
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
type CheckItem = { id: string; label: string; done: boolean };

type RoadmapPhase = {
    phase: string;
    label: string;
    description: string;
    icon: React.ElementType;
    color: string;
    status: "completed" | "active" | "locked";
    estimatedTime: string;
    items: CheckItem[];
};

// ─── Demo Data — replace with backend response when ready ─────────────────────
const DEMO_ROADMAP: RoadmapPhase[] = [
    {
        phase: "Phase 01",
        label: "Core Foundations",
        description: "Establish the base — programming syntax, data types, control flow and how computers process instructions.",
        icon: BookOpen,
        color: "text-blue-400",
        status: "completed",
        estimatedTime: "1 Week · 8h",
        items: [
            { id: "cf1", label: "Variables, data types & operators", done: true },
            { id: "cf2", label: "Control flow: if / else / switch", done: true },
            { id: "cf3", label: "Loops: for, while, forEach", done: true },
            { id: "cf4", label: "Functions & scope", done: true },
            { id: "cf5", label: "Arrays and objects / dictionaries", done: true },
        ],
    },
    {
        phase: "Phase 02",
        label: "Object-Oriented Programming",
        description: "Master classes, inheritance, polymorphism and encapsulation — the four pillars that power real-world codebases.",
        icon: Layers,
        color: "text-purple-400",
        status: "completed",
        estimatedTime: "1 Week · 10h",
        items: [
            { id: "oo1", label: "Classes and constructors", done: true },
            { id: "oo2", label: "Inheritance and method overriding", done: true },
            { id: "oo3", label: "Encapsulation and access modifiers", done: true },
            { id: "oo4", label: "Polymorphism and abstract classes", done: true },
            { id: "oo5", label: "Interfaces and design contracts", done: false },
        ],
    },
    {
        phase: "Phase 03",
        label: "Data Structures & Algorithms",
        description: "Learn the structures that underpin all efficient software: arrays, linked lists, trees, graphs, stacks and queues.",
        icon: Brain,
        color: "text-saffron",
        status: "active",
        estimatedTime: "2 Weeks · 20h",
        items: [
            { id: "ds1", label: "Arrays & dynamic arrays", done: true },
            { id: "ds2", label: "Linked lists (singly & doubly)", done: true },
            { id: "ds3", label: "Stacks and queues", done: false },
            { id: "ds4", label: "Trees: binary, BST, AVL", done: false },
            { id: "ds5", label: "Graphs: BFS & DFS traversal", done: false },
            { id: "ds6", label: "Hash maps and collision handling", done: false },
            { id: "ds7", label: "Sorting: quicksort, mergesort", done: false },
            { id: "ds8", label: "Searching: binary search, Dijkstra", done: false },
        ],
    },
    {
        phase: "Phase 04",
        label: "System Design Fundamentals",
        description: "Think at the architecture level — design scalable, fault-tolerant systems that handle millions of users.",
        icon: Cpu,
        color: "text-cyan-400",
        status: "locked",
        estimatedTime: "2 Weeks · 16h",
        items: [
            { id: "sd1", label: "Monolith vs microservices", done: false },
            { id: "sd2", label: "Load balancing strategies", done: false },
            { id: "sd3", label: "CAP theorem and consistency models", done: false },
            { id: "sd4", label: "Caching: Redis, CDN, in-memory", done: false },
            { id: "sd5", label: "Message queues: Kafka, RabbitMQ", done: false },
            { id: "sd6", label: "API Gateway and rate limiting", done: false },
        ],
    },
    {
        phase: "Phase 05",
        label: "Databases & SQL",
        description: "Master relational and non-relational databases, query optimization and data modelling for production systems.",
        icon: Database,
        color: "text-green-bharat",
        status: "locked",
        estimatedTime: "1.5 Weeks · 14h",
        items: [
            { id: "db1", label: "SQL: SELECT, JOIN, GROUP BY", done: false },
            { id: "db2", label: "Database design & normalization", done: false },
            { id: "db3", label: "Indexes and query optimization", done: false },
            { id: "db4", label: "Transactions and ACID properties", done: false },
            { id: "db5", label: "NoSQL: MongoDB, Cassandra basics", done: false },
            { id: "db6", label: "ORM patterns and migrations", done: false },
        ],
    },
    {
        phase: "Phase 06",
        label: "APIs & Backend Engineering",
        description: "Build and integrate REST & GraphQL APIs, handle authentication, and learn the full backend request lifecycle.",
        icon: Globe,
        color: "text-orange-400",
        status: "locked",
        estimatedTime: "2 Weeks · 18h",
        items: [
            { id: "api1", label: "REST API design principles", done: false },
            { id: "api2", label: "GraphQL schemas and resolvers", done: false },
            { id: "api3", label: "JWT and OAuth2 authentication", done: false },
            { id: "api4", label: "Middleware, CORS and rate limiting", done: false },
            { id: "api5", label: "WebSockets and real-time events", done: false },
            { id: "api6", label: "Error handling and API versioning", done: false },
        ],
    },
    {
        phase: "Phase 07",
        label: "Version Control & DevOps",
        description: "Work with Git like a pro, set up CI/CD pipelines, Docker containers and deploy to cloud infrastructure.",
        icon: GitBranch,
        color: "text-pink-400",
        status: "locked",
        estimatedTime: "1.5 Weeks · 12h",
        items: [
            { id: "vo1", label: "Git: branching, merging, rebasing", done: false },
            { id: "vo2", label: "GitHub PR workflow & code review", done: false },
            { id: "vo3", label: "Docker: images, containers, Compose", done: false },
            { id: "vo4", label: "CI/CD: GitHub Actions, pipelines", done: false },
            { id: "vo5", label: "Cloud: AWS / GCP / Azure basics", done: false },
            { id: "vo6", label: "K8s concepts: pods, services", done: false },
        ],
    },
    {
        phase: "Phase 08",
        label: "Testing & Code Quality",
        description: "Write tests that catch bugs before production — unit, integration, and end-to-end testing with mocking.",
        icon: TestTube2,
        color: "text-yellow-400",
        status: "locked",
        estimatedTime: "1 Week · 10h",
        items: [
            { id: "tq1", label: "Unit testing with Jest / PyTest", done: false },
            { id: "tq2", label: "Integration and contract tests", done: false },
            { id: "tq3", label: "End-to-end testing with Playwright", done: false },
            { id: "tq4", label: "Mocking and test doubles", done: false },
            { id: "tq5", label: "Code coverage and quality gates", done: false },
        ],
    },
    {
        phase: "Phase 09",
        label: "Security Engineering",
        description: "Secure your code from common vulnerabilities — SQL injection, XSS, CSRF — and understand OWASP top 10.",
        icon: Lock,
        color: "text-red-400",
        status: "locked",
        estimatedTime: "1 Week · 8h",
        items: [
            { id: "se1", label: "OWASP Top 10 vulnerabilities", done: false },
            { id: "se2", label: "SQL injection prevention", done: false },
            { id: "se3", label: "XSS and CSRF protection", done: false },
            { id: "se4", label: "Secure password hashing (bcrypt)", done: false },
            { id: "se5", label: "HTTPS, TLS and certificate basics", done: false },
        ],
    },
    {
        phase: "Phase 10",
        label: "AI & ML Integration",
        description: "Integrate AI models into real applications — LLMs, vector databases, embeddings and prompt engineering.",
        icon: Zap,
        color: "text-saffron",
        status: "locked",
        estimatedTime: "2 Weeks · 20h",
        items: [
            { id: "ai1", label: "ML fundamentals: supervised vs unsupervised", done: false },
            { id: "ai2", label: "Building with LLM APIs (OpenAI, Gemini)", done: false },
            { id: "ai3", label: "Prompt engineering and few-shot learning", done: false },
            { id: "ai4", label: "Vector databases: FAISS, Pinecone", done: false },
            { id: "ai5", label: "RAG pipelines and embeddings", done: false },
            { id: "ai6", label: "Fine-tuning and model evaluation", done: false },
        ],
    },
    {
        phase: "Phase 11",
        label: "Capstone — Portfolio Project",
        description: "Build a production-grade full-stack project from scratch. Deploy it, document it, and present it like a professional.",
        icon: Rocket,
        color: "text-green-bharat",
        status: "locked",
        estimatedTime: "2 Weeks · 30h",
        items: [
            { id: "cp1", label: "Define project scope and tech stack", done: false },
            { id: "cp2", label: "Design system architecture diagram", done: false },
            { id: "cp3", label: "Build MVP with core features", done: false },
            { id: "cp4", label: "Write tests and fix all critical bugs", done: false },
            { id: "cp5", label: "Deploy on cloud with CI/CD pipeline", done: false },
            { id: "cp6", label: "Write full README and documentation", done: false },
            { id: "cp7", label: "Present to peer review panel", done: false },
        ],
    },
    {
        phase: "Phase 12",
        label: "Interview & Career Readiness",
        description: "Crack technical interviews with confidence — DSA practice, system design rounds, and behavioural Q&A.",
        icon: ShieldCheck,
        color: "text-white",
        status: "locked",
        estimatedTime: "1 Week · 12h",
        items: [
            { id: "ir1", label: "Resume and LinkedIn optimisation", done: false },
            { id: "ir2", label: "50 DSA problems: arrays to graphs", done: false },
            { id: "ir3", label: "5 system design mock sessions", done: false },
            { id: "ir4", label: "Behavioural STAR questions", done: false },
            { id: "ir5", label: "Mock technical interview x3", done: false },
            { id: "ir6", label: "Salary negotiation and offer review", done: false },
        ],
    },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function LearningRoadmap({ roadmap = DEMO_ROADMAP, roadmapId, topic }: { roadmap?: RoadmapPhase[], roadmapId?: string, topic?: string }) {
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        roadmap.forEach(phase => phase.items.forEach(item => { initial[item.id] = item.done; }));
        return initial;
    });
    const [expandedPhases, setExpandedPhases] = useState<Record<number, boolean>>(() => {
        const initial: Record<number, boolean> = {};
        roadmap.forEach((_, i) => { initial[i] = i <= 2; }); // first 3 expanded by default
        return initial;
    });

    const toggle = (id: string) => setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
    const togglePhase = (i: number) => setExpandedPhases(prev => ({ ...prev, [i]: !prev[i] }));

    const totalItems = roadmap.reduce((a, p) => a + p.items.length, 0);
    const doneItems = Object.values(checkedItems).filter(Boolean).length;
    const overallPct = Math.round((doneItems / totalItems) * 100);

    const STATUS_STYLES = {
        completed: "border-green-bharat/30 bg-green-bharat/5",
        active: "border-saffron/40 bg-saffron/5",
        locked: "border-white/5 bg-white/[0.02]",
    };
    const STATUS_BADGE = {
        completed: "bg-green-bharat/10 border-green-bharat/20 text-green-bharat",
        active: "bg-saffron/10 border-saffron/30 text-saffron",
        locked: "bg-white/5 border-white/10 text-white/20",
    };

    return (
        <div className="space-y-6">
            {/* Header + overall progress */}
            <div className="flex items-end justify-between mb-2 px-1">
                <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Full Learning Roadmap</h3>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mt-1">12 Phases · Developer to Architect</p>
                </div>
                <span className="text-[10px] font-black text-saffron uppercase tracking-widest">{doneItems}/{totalItems} completed</span>
            </div>

            {/* Master progress bar */}
            <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-8">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${overallPct}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-saffron to-green-bharat rounded-full"
                />
            </div>

            {/* Vertical timeline */}
            <div className="relative space-y-4">
                {/* Spine */}
                <div className="absolute left-[27px] top-4 bottom-4 w-px bg-white/5 z-0" />

                {roadmap.map((phase, i) => {
                    const Icon = phase.icon;
                    const phaseChecked = phase.items.filter(it => checkedItems[it.id]).length;
                    const phasePct = Math.round((phaseChecked / phase.items.length) * 100);
                    const isExpanded = expandedPhases[i];
                    const isLocked = phase.status === "locked";

                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -16 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: Math.min(i * 0.06, 0.5) }}
                            className="relative z-10 flex gap-6 group"
                        >
                            {/* Phase icon node */}
                            <div className="flex-shrink-0 flex flex-col items-center">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 shadow-xl flex-shrink-0
                                    ${phase.status === "completed"
                                        ? "bg-green-bharat border-green-bharat/40 text-white shadow-green-bharat/20"
                                        : phase.status === "active"
                                            ? "bg-saffron border-saffron/40 text-white shadow-saffron/20"
                                            : "bg-black border-white/10 text-white/20 group-hover:border-white/20"}`}>
                                    {phase.status === "completed"
                                        ? <CheckCircle2 size={22} />
                                        : <Icon size={20} />}
                                </div>
                            </div>

                            {/* Phase card */}
                            <div className={`flex-1 rounded-[2rem] border transition-all duration-300 overflow-hidden ${STATUS_STYLES[phase.status]}`}>
                                {/* Card header — always visible */}
                                <button
                                    onClick={() => togglePhase(i)}
                                    className="w-full text-left p-6 flex items-center gap-4"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                                            <span className={`text-[9px] font-black uppercase tracking-[0.4em] ${phase.status === "active" ? "text-saffron" : phase.status === "completed" ? "text-green-bharat" : "text-white/20"}`}>
                                                {phase.phase}
                                            </span>
                                            <span className={`text-[8px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-widest ${STATUS_BADGE[phase.status]}`}>
                                                {phase.status === "active" ? "In Progress" : phase.status === "completed" ? "Done" : "Locked"}
                                            </span>
                                            {phase.status === "active" && (
                                                <motion.span
                                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                                    transition={{ duration: 2, repeat: Infinity }}
                                                    className="text-[8px] font-black px-2.5 py-0.5 rounded-full bg-saffron/20 border border-saffron/40 text-saffron uppercase tracking-widest"
                                                >
                                                    Current
                                                </motion.span>
                                            )}
                                        </div>
                                        <h4 className={`text-base font-black uppercase tracking-tight ${isLocked ? "text-white/30" : "text-white"}`}>
                                            {phase.label}
                                        </h4>
                                        {/* Mini progress bar inside header */}
                                        <div className="flex items-center gap-3 mt-2">
                                            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden max-w-[160px]">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${phase.status === "completed" ? "bg-green-bharat" : "bg-saffron"}`}
                                                    style={{ width: `${phasePct}%` }}
                                                />
                                            </div>
                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{phaseChecked}/{phase.items.length}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest hidden md:block">{phase.estimatedTime}</span>
                                        <ChevronRight size={16} className={`text-white/20 transition-transform duration-300 ${isExpanded ? "rotate-90" : ""}`} />
                                    </div>
                                </button>

                                {/* Expandable checklist */}
                                {isExpanded && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="px-6 pb-6 border-t border-white/5"
                                    >
                                        <p className="text-[11px] text-white/30 leading-relaxed pt-4 pb-5 italic">{phase.description}</p>
                                        <div className="space-y-3">
                                            {phase.items.map(item => {
                                                const checked = checkedItems[item.id];
                                                return (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => {
                                                            if (!isLocked && roadmapId && topic) {
                                                                const sPhaseMatch = phase.phase.match(/\d+/);
                                                                const phaseNum = sPhaseMatch ? sPhaseMatch[0].replace(/^0+/, '') : "1";
                                                                window.location.href = `/learning/lesson?roadmap=${roadmapId}&topic=${topic}&concept=${item.id}&phase=phase_${phaseNum}`;
                                                            }
                                                        }}
                                                        disabled={isLocked}
                                                        className={`w-full flex items-center gap-4 p-3.5 rounded-2xl border transition-all text-left group/item
                                                            ${checked
                                                                ? "bg-green-bharat/5 border-green-bharat/20"
                                                                : "bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]"}
                                                            ${isLocked ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
                                                    >
                                                        {checked
                                                            ? <CheckCircle2 size={16} className="text-green-bharat flex-shrink-0" />
                                                            : <Circle size={16} className="text-white/20 flex-shrink-0 group-hover/item:text-white/50 transition-colors" />
                                                        }
                                                        <span className={`text-xs font-semibold leading-snug flex-1 ${checked ? "line-through text-white/30" : "text-white/70"}`}>
                                                            {item.label}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* CTA for active phase */}
                                        {phase.status === "active" && (
                                            <Link href={roadmapId && topic ? `/learning/lesson?roadmap=${roadmapId}&topic=${topic}&concept=${phase.items.find(i => !checkedItems[i.id])?.id || phase.items[0]?.id}&phase=phase_${phase.phase.match(/\d+/) ? phase.phase.match(/\d+/)?.[0].replace(/^0+/, '') : "1"}` : "/learning/lesson"} className="mt-6 flex items-center gap-2 text-[10px] font-black text-saffron uppercase tracking-widest hover:gap-4 transition-all w-fit">
                                                Continue Learning <ChevronRight size={14} />
                                            </Link>
                                        )}
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Bottom summary pill */}
            <div className="flex items-center justify-center gap-3 pt-4">
                <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/[0.03] border border-white/5 text-[10px] font-black text-white/30 uppercase tracking-widest">
                    <BarChart3 size={14} className="text-saffron" />
                    Overall Progress: <span className="text-saffron">{overallPct}%</span> &mdash; {doneItems} of {totalItems} objectives cleared
                </div>
            </div>
        </div>
    );
}