"use client";

import Link from "next/link";
import {
    Zap,
    ArrowRight,
    Terminal,
    BookOpen,
    Github,
    Linkedin,
    Globe,
    Cpu,
    ShieldCheck,
    Star,
    ChevronRight,
    Sparkles,
    Layout,
    Code,
    Database,
    Server,
    Monitor
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import useAuth from "@/hooks/useAuth";
import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

const developers = [
    { name: "Saranraj U", role: "Frontend Designer", initial: "S", linkedin: "https://www.linkedin.com/in/saranraj-u-663615352" },
    { name: "Mohith R", role: "Backend Developer", initial: "M", linkedin: "https://www.linkedin.com/in/mohithr3" },
    { name: "Sabarivasan E", role: "Database Architect", initial: "S", linkedin: "https://www.linkedin.com/in/sabarivasan-e-2aa50233b" },
    { name: "Kishore E", role: "DevOps Engineer", initial: "K", linkedin: "https://www.linkedin.com/in/kishore-e-69b331293" },
];

export default function HomePage() {
    const { user } = useAuth();
    const { t } = useLanguage();

    return (
        <>
            {/* === FLOATING NAVBAR — outside <main> so no parent transform breaks position:fixed === */}
            <nav className="lovable-nav">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-saffron to-orange-400 flex items-center justify-center shadow-xl shadow-saffron/20">
                        <Zap size={20} className="text-white fill-white" />
                    </div>
                    <span className="text-lg font-extrabold tracking-tight">Thenali AI</span>
                </div>

                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
                    {[
                        { label: t("overview"), id: "overview" },
                        { label: t("features"), id: "features" },
                        { label: t("tech_stack"), id: "stack" },
                        { label: t("team"), id: "team" },
                    ].map(({ label, id }) => (
                        <button
                            key={id}
                            onClick={() => {
                                const el = document.getElementById(id);
                                if (el) {
                                    const top = el.getBoundingClientRect().top + window.scrollY - 110;
                                    window.scrollTo({ top, behavior: "smooth" });
                                }
                            }}
                            className="hover:text-white transition-colors cursor-pointer"
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    {user ? (
                        <Link href="/dashboard">
                            <Button variant="saffron" size="sm">{t("go_to_dashboard")}</Button>
                        </Link>
                    ) : (
                        <>
                            <Link href="/auth/login" className="text-sm font-medium hover:text-saffron transition-colors">{t("login")}</Link>
                            <Link href="/auth/signup">
                                <Button variant="primary" size="sm" className="hidden sm:inline-flex">{t("get_started")}</Button>
                            </Link>
                        </>
                    )}
                </div>
            </nav>

            <main className="min-h-screen lovable-mesh selection:bg-saffron/30 text-white">

                {/* HERO SECTION */}
                <section className="relative pt-40 pb-32 px-6 flex flex-col items-center justify-center text-center min-h-screen">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="mb-8 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl text-xs font-semibold text-white/60 flex items-center gap-2"
                    >
                        <span className="w-2 h-2 rounded-full bg-saffron animate-pulse" />
                        {t("future_indian_dev")}
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-6xl md:text-8xl lg:text-9xl font-extrabold tracking-tight mb-8"
                    >
                        {t("code_with_intelligence").split(' ').slice(0, 2).join(' ')} <br />
                        <span className="lovable-text-gradient">{t("code_with_intelligence").split(' ').slice(2).join(' ')}</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="text-lg md:text-xl text-white/50 max-w-2xl mb-12 leading-relaxed"
                    >
                        {t("eco_system_desc")}
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center"
                    >
                        {user ? (
                            <Link href="/dashboard">
                                <Button variant="saffron" size="lg" className="w-full sm:w-auto">
                                    {t("go_to_dashboard")}
                                    <ArrowRight size={18} />
                                </Button>
                            </Link>
                        ) : (
                            <Link href="/auth/signup">
                                <Button variant="saffron" size="lg" className="w-full sm:w-auto">
                                    {t("start_building")}
                                    <ArrowRight size={18} />
                                </Button>
                            </Link>
                        )}
                        <Link href="/repo-analysis">
                            <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                                {t("analyze_repo")}
                            </Button>
                        </Link>
                    </motion.div>
                </section>

                {/* PROJECT OVERVIEW SECTION */}
                <section id="overview" className="py-32 px-6 max-w-5xl mx-auto relative z-10 scroll-mt-28">
                    <div className="lovable-card p-12 md:p-20 border-saffron/20 bg-gradient-to-br from-white/[0.05] to-transparent">
                        <div className="flex items-center gap-4 mb-8">
                            <Sparkles className="text-saffron" size={32} />
                            <h2 className="text-3xl md:text-4xl font-extrabold">{t("project_overview")}</h2>
                        </div>
                        <p className="text-lg md:text-xl text-white/70 leading-relaxed font-medium">
                            Thenali AI is a next-generation Developer Intelligence Platform designed to empower the 1.4 billion residents of India with cutting-edge software capabilities. We bridge the critical gap between conceptual learning and high-impact global contributions. By leveraging advanced AI models, we provide deep-tissue repository analysis, personalized mastery roadmaps, and automated skill-gap diagnostics. Our mission is to transform elite Indian talent into world-class architects through an autonomous, intelligence-driven ecosystem.
                        </p>
                    </div>
                </section>

                {/* TECH STACK SECTION */}
                <section id="stack" className="py-32 px-6 max-w-7xl mx-auto relative z-10 scroll-mt-28">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-extrabold mb-4">{t("infrastructure")}</h2>
                        <p className="text-white/40 max-w-xl mx-auto">{t("infrastructure_desc")}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <StackCard
                            icon={<Monitor className="text-saffron" size={32} />}
                            title="Frontend"
                            tech="Next.js 15+, Tailwind CSS v4, Framer Motion"
                            desc="Ultra-fluid, high-performance client interface with real-time AI synchronization."
                        />
                        <StackCard
                            icon={<Server className="text-blue-400" size={32} />}
                            title="Backend"
                            tech="FastAPI, Python Core, Groq/OpenAI Intelligence"
                            desc="Highly concurrent asynchronous backbone managing complex neural computations."
                        />
                        <StackCard
                            icon={<Database className="text-green-bharat" size={32} />}
                            title="Database"
                            tech="PostgreSQL, FAISS Vector Store, Boto3 S3"
                            desc="Multi-modal storage architecture supporting massive-scale semantic search and retrieval."
                        />
                    </div>
                </section>

                {/* FEATURES BENTO GRID */}
                <section id="features" className="py-32 px-6 max-w-7xl mx-auto scroll-mt-28">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-extrabold mb-4">{t("crafted_excellence")}</h2>
                        <p className="text-white/40 max-w-xl mx-auto">Powerful tools to monitor, learn, and contribute to the global software ecosystem.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[280px] md:auto-rows-[250px]">
                        <div className="md:col-span-8 group">
                            <div className="lovable-card h-full p-10 flex flex-col justify-end bg-gradient-to-br from-white/[0.05] to-transparent">
                                <div className="absolute top-10 right-10 w-24 h-24 bg-saffron/10 rounded-full blur-3xl group-hover:blur-2xl transition-all" />
                                <div className="w-12 h-12 rounded-2xl bg-saffron/20 border border-saffron/30 flex items-center justify-center mb-6">
                                    <Terminal className="text-saffron" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2 uppercase italic tracking-tighter">{t("deep_repo_scan")}</h3>
                                <p className="text-white/40 text-sm max-w-md">Our AI analyzes your entire codebase to find architectural flaws, security risks, and technical debt in seconds.</p>
                            </div>
                        </div>

                        <div className="md:col-span-4 group">
                            <div className="lovable-card h-full p-10 flex flex-col justify-end">
                                <div className="w-12 h-12 rounded-2xl bg-green-bharat/20 border border-green-bharat/30 flex items-center justify-center mb-6">
                                    <Globe className="text-green-bharat" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2 uppercase italic tracking-tighter">{t("global_readiness")}</h3>
                                <p className="text-white/40 text-sm">Measure your readiness for high-impact open source contributions.</p>
                            </div>
                        </div>

                        <div className="md:col-span-4 group">
                            <div className="lovable-card h-full p-10 flex flex-col justify-end">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-6">
                                    <Cpu className="text-blue-400" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2 uppercase italic tracking-tighter">{t("ai_mastery")}</h3>
                                <p className="text-white/40 text-sm">Personalized learning paths that evolve as you grow.</p>
                            </div>
                        </div>

                        <div className="md:col-span-8 group">
                            <div className="lovable-card h-full p-10 flex flex-col justify-end bg-gradient-to-tr from-green-bharat/[0.05] to-transparent">
                                <div className="absolute top-10 right-10 w-32 h-32 bg-green-bharat/10 rounded-full blur-3xl group-hover:blur-2xl transition-all" />
                                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-6">
                                    <Star className="text-white" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2 uppercase italic tracking-tighter">{t("z_fighters_code")}</h3>
                                <p className="text-white/40 text-sm max-w-md">Join an elite roster of Indian developers pushing the boundaries of what's possible with AI.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* TEAM SECTION */}
                <section id="team" className="py-32 px-6 max-w-7xl mx-auto relative z-10 scroll-mt-28">
                    <div className="text-center mb-24">
                        <h2 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tighter italic uppercase">{t("architects")}</h2>
                        <p className="text-[11px] font-bold text-white/30 uppercase tracking-[0.6em]">ELITE TEAM Z FIGHTERS</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {developers.map((dev, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ y: -10 }}
                                className="lovable-card p-10 flex flex-col items-center text-center group"
                            >
                                <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl font-black text-white group-hover:bg-saffron/10 group-hover:border-saffron/30 transition-all duration-500 mb-8">
                                    {dev.initial}
                                </div>
                                <h4 className="text-2xl font-bold mb-2">{dev.name}</h4>
                                <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-8">{dev.role}</p>
                                <Link href={dev.linkedin} target="_blank" className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                                    <Linkedin size={20} className="text-white/40 group-hover:text-blue-400" />
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </section>



                {/* CTA SECTION */}
                <section className="py-32 px-6">
                    <div className="max-w-4xl mx-auto lovable-card p-12 md:p-20 text-center relative overflow-hidden">
                        {/* Animated Glow in CTA */}
                        <div className="absolute -bottom-[50%] -left-[20%] w-[100%] h-[100%] bg-saffron/20 blur-[120px] rounded-full pointer-events-none" />

                        <h2 className="text-4xl md:text-6xl font-extrabold mb-8 relative z-10">{t("ready_to_transform")}</h2>
                        <p className="text-white/40 mb-12 max-w-lg mx-auto relative z-10">{t("start_journey")}</p>
                        <div className="flex flex-wrap justify-center gap-6 relative z-10">
                            {user ? (
                                <Link href="/dashboard">
                                    <Button variant="saffron" size="lg">{t("go_to_dashboard")}</Button>
                                </Link>
                            ) : (
                                <>
                                    <Link href="/auth/signup">
                                        <Button variant="saffron" size="lg">{t("initialize_now")}</Button>
                                    </Link>
                                    <Link href="/auth/login">
                                        <Button variant="outline" size="lg">{t("login_to_command")}</Button>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                {/* FOOTER */}
                <footer className="py-20 px-6 border-t border-white/5 bg-black/40 backdrop-blur-3xl relative z-50">
                    <div className="max-w-7xl mx-auto flex flex-col gap-16">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-12">
                            <div className="flex flex-col gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-saffron flex items-center justify-center shadow-lg shadow-saffron/20">
                                        <Zap size={16} fill="white" className="text-white" />
                                    </div>
                                    <span className="font-bold text-xl">Thenali AI</span>
                                </div>
                                <p className="text-sm text-white/30 max-w-xs leading-relaxed">
                                    Empowering Bharat's code creators with artificial intelligence and global-scale contribution readiness.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-16 text-sm">
                                <div className="flex flex-col gap-4">
                                    <span className="font-bold text-white/20 uppercase tracking-widest text-xs">Intelligence</span>
                                    <Link href="/learning/dashboard" className="text-white/40 hover:text-saffron transition-colors">Neural Wiki</Link>
                                    <Link href="/repo-analysis" className="text-white/40 hover:text-saffron transition-colors">System Schematics</Link>
                                    <Link href="/playground" className="text-white/40 hover:text-saffron transition-colors">Sandbox Manual</Link>
                                    <Link href="/evaluation" className="text-white/40 hover:text-saffron transition-colors">Assessment Pulse</Link>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <span className="font-bold text-white/20 uppercase tracking-widest text-xs">Protocols</span>
                                    <Link href="/privacy" className="text-white/40 hover:text-saffron transition-colors">Data Privacy Node</Link>
                                    <Link href="/terms" className="text-white/40 hover:text-saffron transition-colors">Neural Agreement</Link>
                                    <Link href="/security" className="text-white/40 hover:text-saffron transition-colors">Security Registry</Link>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <span className="font-bold text-white/20 uppercase tracking-widest text-xs">Signal</span>
                                    <Link href="https://github.com/saranraj1/AI-FOR-BHARAT-_-Z-FIGHTERS" target="_blank" className="text-white/40 hover:text-blue-400 transition-colors flex items-center gap-2">
                                        <Github size={12} />
                                        GitHub Hub
                                    </Link>
                                    <Link href="/changelog" className="text-white/40 hover:text-blue-400 transition-colors flex items-center gap-2">
                                        <Globe size={12} />
                                        Global Comms
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className="pt-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                            <p className="text-xs text-white/20 font-medium">© 2025 Thenali AI. All Rights Reserved.</p>
                            <div className="flex items-center gap-6">
                                <div className="px-4 py-1.5 rounded-full border border-saffron/30 bg-saffron/5 text-[10px] font-bold text-saffron uppercase tracking-widest">
                                    LICENSED FOR Z FIGHTERS
                                </div>
                                <span className="text-[10px] text-white/10 uppercase tracking-[0.2em]">Deployment: v1.0.4-Alpha</span>
                            </div>
                        </div>
                    </div>
                </footer>

            </main>
        </>
    );
}

function StackCard({ icon, title, tech, desc }: any) {
    return (
        <div className="lovable-card p-10 group overflow-hidden">
            <div className="mb-8 p-4 bg-white/5 rounded-2xl inline-block group-hover:scale-110 transition-transform duration-500">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-4 uppercase italic tracking-tighter">{title}</h3>
            <p className="text-saffron text-sm font-bold mb-6 tracking-tight mb-4">{tech}</p>
            <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
        </div>
    );
}