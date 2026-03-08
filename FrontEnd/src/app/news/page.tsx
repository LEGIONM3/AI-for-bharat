"use client";

import { motion } from "framer-motion";
import PageContainer from "@/components/layout/PageContainer";
import {
    BookMarked, Bug, Users, FileText, Shield, Code2, Puzzle,
    Sparkles, ArrowRight, Clock, Zap, GitBranch, Globe, Lock,
    MessageSquare, Cpu, Layers, CheckCircle
} from "lucide-react";

interface Feature {
    id: number;
    icon: React.ElementType;
    accentColor: string;
    glowColor: string;
    tag: string;
    title: string;
    subtitle: string;
    description: string;
    howItWorks: string[];
    benefits: string[];
    status: "planned" | "in-progress" | "research";
    eta: string;
}

const FEATURES: Feature[] = [
    {
        id: 1,
        icon: BookMarked,
        accentColor: "text-saffron",
        glowColor: "shadow-saffron/20 border-saffron/20 bg-saffron/5",
        tag: "Learning Intelligence",
        title: "Repo-to-Learning Modules",
        subtitle: "Turn any GitHub repo into a structured mastery curriculum",
        description:
            "Today, Thenali AI can analyze a repository and extract intelligence — but you can't use a repo as a learning path. This feature bridges that gap. Instead of just reading analysis, you'll be able to click 'Convert to Learning Module' on any analyzed repo and Thenali AI will generate a complete, structured lesson plan built around that exact codebase. You will master the repo file-by-file, concept-by-concept.",
        howItWorks: [
            "Paste or select a GitHub repository you want to master",
            "AI decomposes the codebase into logical learning layers — architecture, core flows, modules, patterns",
            "Each layer becomes a standalone lesson with explanation, sandbox exercises, and quizzes",
            "Progress is tracked per-file and per-concept, just like normal learning roadmaps",
            "AI builds a dependency graph so you learn in the correct order (e.g., learn the router before the controllers)"
        ],
        benefits: [
            "Master open-source codebases before raising a PR",
            "Onboard to a new company's codebase in days, not weeks",
            "Complement the contribution system — understand a repo fully before contributing"
        ],
        status: "planned",
        eta: "Q3 2025"
    },
    {
        id: 2,
        icon: Bug,
        accentColor: "text-red-400",
        glowColor: "shadow-red-500/20 border-red-500/20 bg-red-500/5",
        tag: "Developer Tools",
        title: "AI Debugging Assistant",
        subtitle: "Point out your bug, understand it deeply, never repeat it",
        description:
            "Whether you're coding in Thenali AI's Playground or your own editor (VS Code, terminal, etc.), you can consult Thenali AI's Debugging Assistant to not just fix your error — but understand why it happened, how to solve it yourself, and how to permanently avoid it in future code. This isn't a simple stack trace parser. It's a context-aware debugging tutor that explains root causes and teaches defensive coding habits.",
        howItWorks: [
            "Paste your error message, stack trace, or problematic code snippet into the Assistant",
            "AI identifies the root cause (type error, off-by-one, async race condition, etc.)",
            "Provides a plain-language breakdown of WHY this error occurs in general",
            "Gives a targeted fix for your specific code",
            "Teaches you the general pattern to avoid this entire category of bug in the future",
            "Optionally adds a quiz at the end to reinforce the lesson"
        ],
        benefits: [
            "Stops the cycle of Googling the same error repeatedly",
            "Works across all languages supported by the playground",
            "Builds genuine debugging instincts, not just copy-paste fixes"
        ],
        status: "planned",
        eta: "Q3 2025"
    },
    {
        id: 3,
        icon: Users,
        accentColor: "text-purple-400",
        glowColor: "shadow-purple-500/20 border-purple-500/20 bg-purple-500/5",
        tag: "Community",
        title: "Collaborative Learning Spaces",
        subtitle: "Learn together with developers across the globe in real-time",
        description:
            "Learning alone can only take you so far. Collaborative Learning brings a real-time group learning experience directly into Thenali AI. Think of it as a ChatGPT group chat meets a coding bootcamp. Developers from anywhere in the world can join or create a Learning Space around a specific topic, work through content together, share code snippets, ask the AI, and help each other pass quizzes.",
        howItWorks: [
            "Create or join a public/private Learning Space for any roadmap topic",
            "Each space has a live group chat where all members can post, help, and discuss",
            "A shared sandbox lets members run and review each other's code in real-time",
            "The AI participates in the group chat — you can tag it (@ThenaliAI) to ask questions or get hints",
            "Progress is tracked per member, and you can see who's ahead on which concepts",
            "Voice/video support planned for later phase (async audio notes initially)"
        ],
        benefits: [
            "Breaks the isolation of solo learning",
            "Peer accountability increases completion rates significantly",
            "Great for study groups, bootcamp cohorts, or office learning circles"
        ],
        status: "research",
        eta: "Q4 2025"
    },
    {
        id: 4,
        icon: FileText,
        accentColor: "text-blue-400",
        glowColor: "shadow-blue-500/20 border-blue-500/20 bg-blue-500/5",
        tag: "Repo Intelligence",
        title: "README Autogeneration",
        subtitle: "AI-crafted documentation for any codebase, instantly",
        description:
            "When Thenali AI analyzes a repository, it understands its architecture, purpose, dependencies, and API surfaces deeply. This feature takes that understanding one step further — generating a perfectly structured, human-readable README from scratch. Whether it's a project you're analyzing (to understand it better) or your own project (that needs better docs), the AI generates a full README tailored to the audience.",
        howItWorks: [
            "After any repo analysis, a 'Generate README' button appears in the Intelligence Report",
            "AI reads the folder structure, main entry points, dependencies, and code comments",
            "Chooses the right README template (library, CLI tool, web app, API, etc.) automatically",
            "Generates sections: Project Overview, Tech Stack, Installation, Usage, API Docs, Contributing, License",
            "You can preview, edit inline, and export as markdown or copy to clipboard",
            "For your own projects: paste your code and AI builds the README from scratch"
        ],
        benefits: [
            "Saves hours of documentation writing",
            "Makes analyzed repos easier to understand during contribution research",
            "Helps open-source maintainers attract contributors with better docs"
        ],
        status: "planned",
        eta: "Q3 2025"
    },
    {
        id: 5,
        icon: Shield,
        accentColor: "text-green-400",
        glowColor: "shadow-green-500/20 border-green-500/20 bg-green-500/5",
        tag: "Security & Auth",
        title: "Verified Auth & Security Overhaul",
        subtitle: "Enterprise-grade security, GitHub OAuth, Google Sign-In, and more",
        description:
            "The current login system is functional but minimal. The Security Overhaul brings a hardened authentication and authorization layer to Thenali AI. This includes GitHub OAuth and Google OAuth for one-click sign-in, email verification flows, rate limiting on all API endpoints to prevent abuse, moving security-sensitive operations fully server-side, and a comprehensive audit trail for all user actions.",
        howItWorks: [
            "GitHub OAuth: Sign in with your GitHub account in one click — syncs your username and public repos",
            "Google Auth: Standard Google OAuth2 for users who prefer it over email registration",
            "Email Verification: Required for new accounts — prevents bot signups and protects your profile",
            "API Rate Limiting: Prevents brute force and abuse attacks on all critical endpoints",
            "Server-Side Secrets: JWT signing keys, API credentials, and model configs moved to secure server context",
            "Session Management: Token refresh, device tracking, and forced logout for suspicious activity"
        ],
        benefits: [
            "Dramatically reduces account takeover risk",
            "GitHub OAuth enables future features like auto-reading your repos",
            "Protects AI inference costs from abuse via rate limiting"
        ],
        status: "in-progress",
        eta: "Q2 2025"
    },
    {
        id: 6,
        icon: Code2,
        accentColor: "text-cyan-400",
        glowColor: "shadow-cyan-500/20 border-cyan-500/20 bg-cyan-500/5",
        tag: "Playground AI",
        title: "Code Simplification & Optimization Advisor",
        subtitle: "AI reviews your code live and suggests smarter, cleaner alternatives",
        description:
            "As you write code in the Thenali AI Playground, the AI Optimization Advisor reviews your code (on demand) and suggests smarter, more efficient alternatives. This isn't a linter — it's a mentor. It identifies unnecessarily complex logic, redundant operations, performance bottlenecks, memory issues, and style inconsistencies — then shows you side-by-side comparisons of your code vs. the optimized version with a full explanation.",
        howItWorks: [
            "After writing code, click 'Optimize' or 'Simplify' in the Playground toolbar",
            "AI analyzes time complexity, space complexity, readability, and idiomatic patterns",
            "Returns a side-by-side diff: your code on the left, optimized version on the right",
            "Each suggested change has a tooltip explaining WHY it's better",
            "You can accept all, accept individual suggestions, or reject with a reason (AI learns your style preferences)",
            "Optionally shows Big-O complexity before and after for algorithms"
        ],
        benefits: [
            "Teaches better coding habits through active comparison, not just warnings",
            "Catches performance anti-patterns that tests often miss",
            "Supports all playground languages — Python, JavaScript, TypeScript, and more"
        ],
        status: "planned",
        eta: "Q3 2025"
    },
    {
        id: 7,
        icon: Puzzle,
        accentColor: "text-orange-400",
        glowColor: "shadow-orange-500/20 border-orange-500/20 bg-orange-500/5",
        tag: "Dev Tools",
        title: "VS Code Extension",
        subtitle: "Bring Thenali AI into your local development environment",
        description:
            "Everything Thenali AI does in the browser, the VS Code Extension brings directly into your editor workflow. Analyze any file, get debugging assistance on your current error, run Playground sessions from within VS Code, and track your learning progress without leaving your editor. The extension integrates with your existing GitHub setup and syncs your Thenali AI platform data bidirectionally.",
        howItWorks: [
            "Install from VS Code Marketplace and sign in with your Thenali AI account",
            "Highlight any code block → right-click → 'Analyze with Thenali AI'",
            "Error underlines get a 'Debug with Thenali AI' action that opens the assistant inline",
            "Sidebar panel shows your active learning roadmap and current concept",
            "Inline Playground: run code snippets without leaving the editor",
            "Git integration: after a commit, AI suggests relevant learning modules based on what you just built"
        ],
        benefits: [
            "Eliminate context switching between your editor and the browser",
            "Thenali AI becomes part of your daily dev workflow, not just a study tool",
            "Repo analysis runs on your local files — no upload needed"
        ],
        status: "research",
        eta: "Q1 2026"
    }
];

const statusConfig = {
    planned: { label: "Planned", color: "bg-saffron/10 text-saffron border-saffron/20" },
    "in-progress": { label: "In Progress", color: "bg-green-500/10 text-green-400 border-green-500/20" },
    research: { label: "Research Phase", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
};

export default function NewsPage() {
    return (
        <PageContainer>
            {/* Header */}
            <div className="max-w-4xl mx-auto px-4 pt-12 pb-16">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-saffron/10 border border-saffron/20 mb-6">
                        <span className="w-2 h-2 rounded-full bg-saffron animate-pulse" />
                        <span className="text-[10px] font-black text-saffron uppercase tracking-[0.3em]">Product Roadmap — 2025</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter uppercase italic leading-none mb-6">
                        <span className="lovable-text-gradient">What's</span>{" "}
                        <span className="text-white">Coming.</span>
                    </h1>
                    <p className="text-white/40 text-sm max-w-2xl leading-relaxed">
                        A detailed look at the features being built into Thenali AI. Every item here is designed to make you a fundamentally better developer — not just give you more tools.
                    </p>
                </motion.div>

                {/* Status legend */}
                <div className="flex flex-wrap gap-3 mt-8">
                    {Object.entries(statusConfig).map(([key, cfg]) => (
                        <span key={key} className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${cfg.color}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {cfg.label}
                        </span>
                    ))}
                </div>
            </div>

            {/* Feature Cards */}
            <div className="max-w-4xl mx-auto px-4 pb-24 space-y-10">
                {FEATURES.map((feature, idx) => {
                    const Icon = feature.icon;
                    const status = statusConfig[feature.status];
                    return (
                        <motion.div
                            key={feature.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.07 }}
                            className={`lovable-card border overflow-hidden ${feature.glowColor}`}
                        >
                            {/* Card header */}
                            <div className="p-8 pb-6">
                                <div className="flex items-start justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${feature.glowColor}`}>
                                            <Icon size={26} className={feature.accentColor} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${feature.accentColor}`}>{feature.tag}</span>
                                                <span className="text-white/10">·</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-white/20">{feature.id} of {FEATURES.length}</span>
                                            </div>
                                            <h2 className="text-2xl font-black text-white tracking-tight">{feature.title}</h2>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${status.color}`}>
                                            {status.label}
                                        </span>
                                        <span className="flex items-center gap-1 text-[9px] text-white/20 font-bold uppercase tracking-widest">
                                            <Clock size={9} /> {feature.eta}
                                        </span>
                                    </div>
                                </div>

                                <p className={`text-sm font-bold mb-3 ${feature.accentColor} opacity-80`}>{feature.subtitle}</p>
                                <p className="text-white/50 text-sm leading-relaxed">{feature.description}</p>
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-white/5 mx-8" />

                            {/* How it works */}
                            <div className="p-8 pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Zap size={12} className={feature.accentColor} />
                                        <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">How It Works</span>
                                    </div>
                                    <ol className="space-y-2.5">
                                        {feature.howItWorks.map((step, i) => (
                                            <li key={i} className="flex items-start gap-3">
                                                <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black mt-0.5 ${feature.glowColor} border ${feature.accentColor}`}>
                                                    {i + 1}
                                                </span>
                                                <span className="text-white/50 text-xs leading-relaxed">{step}</span>
                                            </li>
                                        ))}
                                    </ol>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <CheckCircle size={12} className={feature.accentColor} />
                                        <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Key Benefits</span>
                                    </div>
                                    <ul className="space-y-2.5">
                                        {feature.benefits.map((benefit, i) => (
                                            <li key={i} className="flex items-start gap-3">
                                                <ArrowRight size={12} className={`shrink-0 mt-0.5 ${feature.accentColor}`} />
                                                <span className="text-white/50 text-xs leading-relaxed">{benefit}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {/* Bottom CTA */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="lovable-card p-10 border-white/5 bg-white/[0.02] text-center mt-16"
                >
                    <Sparkles size={28} className="text-saffron mx-auto mb-4" />
                    <h3 className="text-2xl font-black text-white italic tracking-tight uppercase mb-3">More Coming Soon</h3>
                    <p className="text-white/30 text-sm max-w-lg mx-auto mb-6">
                        This roadmap is a living document. New features are added based on community feedback and developer needs. Keep checking back.
                    </p>
                    <div className="flex justify-center">
                        <a
                            href="/dashboard"
                            className="flex items-center gap-2 px-8 py-4 bg-saffron text-black font-black text-xs uppercase tracking-widest rounded-full hover:scale-105 transition-transform shadow-lg shadow-saffron/20"
                        >
                            <Zap size={14} /> Back to Dashboard
                        </a>
                    </div>
                </motion.div>
            </div>
        </PageContainer>
    );
}
