"use client";

import dynamic from "next/dynamic";
import PageContainer from "@/components/layout/PageContainer";
import RepoInput from "@/components/repo/RepoInput";
import RepoUploader from "@/components/repo/RepoUploader";
import RepoOverview from "@/components/repo/RepoOverview";
import FolderTree from "@/components/repo/FolderTree";
import ComplexityGauge from "@/components/repo/ComplexityGauge";
import RepoIssues from "@/components/repo/RepoIssues";
import ContributionIdeas from "@/components/repo/ContributionIdeas";
import useRepoAnalysis from "@/hooks/useRepoAnalysis";
import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search, History, BookOpen, Code as CodeIcon, Cpu, Sparkles,
    Layout, MessageSquare, Shield, Target, ChevronLeft,
    Database, Info, ArrowRight, Download, AlertTriangle
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

// DYNAMIC NEURAL COMPONENTS
const RepoChat = dynamic(() => import("@/components/repo/RepoChat"), { ssr: false });
const RepoChatHistory = dynamic(() => import("@/components/repo/RepoChatHistory"), { ssr: false });
const RepoAssessment = dynamic(() => import("@/components/repo/RepoAssessment"), { ssr: false });
const RepoArchitecture = dynamic(() => import("@/components/repo/RepoArchitecture"), { ssr: false });

function RepoAnalysisPageContent() {
    const { repoData, loading, error, previousChats, assessment, analyzeRepo, loadHistoryItem, resetRepo } = useRepoAnalysis();
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState("overview");
    const searchParams = useSearchParams();

    // Handle deep linking from notifications
    useEffect(() => {
        const repoId = searchParams.get('repo_id');
        if (repoId && !loading && (!repoData || repoData.id !== repoId)) {
            loadHistoryItem(repoId);
            setActiveTab('overview');
        }
    }, [searchParams, loadHistoryItem, loading, repoData]);

    const handleChangeTarget = () => {
        resetRepo?.();
        setActiveTab("overview");
    };

    const handleHistorySelect = async (id: string) => {
        await loadHistoryItem(id);
        setActiveTab("overview");
    };

    const handleDownloadReport = () => {
        if (!repoData) return;

        const reportData = {
            metadata: {
                target: repoData.repo_name,
                timestamp: new Date().toISOString(),
                engine: "Thenali AI Neural Intel v2.0",
                status: "DECRYPTED"
            },
            analysis: repoData
        };

        const dataStr = JSON.stringify(reportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `BHARAT_AI_${repoData.repo_name.toUpperCase()}_INTEL_MANIFEST.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const scrollToSection = useCallback((id: string) => {
        setTimeout(() => {
            const element = document.getElementById(id);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
            }
        }, 50);
    }, []);

    return (
        <PageContainer>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 relative z-10 px-4">
                <div>
                    <div className="mb-4 px-4 py-1.5 rounded-full bg-saffron/10 border border-saffron/20 inline-flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-saffron animate-pulse" />
                        <span className="text-[10px] font-bold text-saffron uppercase tracking-[0.2em]">Neural Intel Engine v2.0</span>
                    </div>

                    {repoData ? (
                        <div className="flex flex-col gap-4">
                            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter uppercase italic leading-none">
                                <span className="text-white">{t("target")} /</span> <span className="lovable-text-gradient">{repoData.repo_name}</span>
                            </h1>
                            <div className="flex items-center gap-4">
                                <div className="px-4 py-1 bg-green-bharat/10 border border-green-bharat/30 rounded-full text-[10px] font-black text-green-bharat uppercase tracking-widest flex items-center gap-2">
                                    <Target size={12} />
                                    {t("active_repo_synced")}
                                </div>
                                <button
                                    onClick={handleChangeTarget}
                                    className="text-[10px] font-bold text-white/20 hover:text-saffron uppercase tracking-widest flex items-center gap-2 transition-colors"
                                >
                                    <ChevronLeft size={12} />
                                    {t("change_target")}
                                </button>
                                <div className="h-4 w-px bg-white/10" />
                                <button
                                    onClick={handleDownloadReport}
                                    className="px-4 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-white/40 hover:text-white hover:border-saffron/40 hover:bg-saffron/10 transition-all flex items-center gap-2"
                                >
                                    <Download size={12} className="text-saffron" />
                                    EXPORT INTEL
                                </button>
                            </div>
                        </div>
                    ) : (
                        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter uppercase italic leading-none"><span className="lovable-text-gradient">{t("repo_lab")}</span> <span className="text-white">/ {t("ai_code_intel")}</span></h1>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex bg-white/[0.03] p-1.5 rounded-full border border-white/5 backdrop-blur-xl flex-wrap">
                    <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")} icon={<Layout size={14} />} label={t("overview")} />
                    <TabButton active={activeTab === "chat"} onClick={() => setActiveTab("chat")} icon={<MessageSquare size={14} />} label={t("repo_intel")} />
                    <TabButton active={activeTab === "history"} onClick={() => setActiveTab("history")} icon={<History size={14} />} label={t("recall_memory")} />
                    <TabButton active={activeTab === "assessment"} onClick={() => setActiveTab("assessment")} icon={<BookOpen size={14} />} label={t("assessments")} />
                </div>
            </div>

            {/* Input Grid (Disappears after analysis) */}
            <AnimatePresence>
                {!repoData && activeTab === "overview" && !loading && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 px-4"
                    >
                        <RepoInput onAnalyze={analyzeRepo} />
                        <RepoUploader />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error State */}
            {error && !loading && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 px-4"
                >
                    <div className="flex items-start gap-4 p-6 bg-red-500/10 border border-red-500/30 rounded-[24px]">
                        <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-red-400 uppercase tracking-wider mb-1">Analysis Failed</p>
                            <p className="text-sm text-red-300/70">{error}</p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Loading / Placeholder Block */}
            {loading && (
                <div className="w-full h-[600px] mb-12 px-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-full flex flex-col items-center justify-center bg-white/[0.02] border border-white/5 rounded-[40px] relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-saffron/5 via-transparent to-green-bharat/5 opacity-50" />
                        <div className="relative z-10 flex flex-col items-center text-center px-10">
                            <div className="w-20 h-20 border-4 border-t-saffron border-r-transparent border-b-green-bharat border-l-transparent rounded-full animate-spin mb-10 shadow-[0_0_40px_rgba(255,153,51,0.2)]"></div>
                            <div className="text-sm font-black text-white/40 tracking-[0.4em] uppercase animate-pulse italic">Neural Pulse Scan Active...</div>
                            <p className="text-[10px] text-white/10 uppercase tracking-widest mt-6 max-w-xs">Cloning repository, parsing code, building vector index and generating AI intelligence report.</p>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* EMPTY STATE - RECALL MEMORY HINT */}
            {!repoData && !loading && !error && activeTab === "overview" && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-[500px] w-full flex flex-col items-center justify-center p-8 md:p-20 bg-white/[0.03] border border-white/10 rounded-[40px] border-dashed text-center mb-12"
                >
                    <div className="w-24 h-24 rounded-[32px] bg-white text-saffron flex items-center justify-center shadow-2xl mb-10 transform -rotate-12 transition-transform hover:rotate-0 cursor-pointer">
                        <Search size={36} />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-extrabold italic text-white mb-6 uppercase tracking-tighter">{t("awaiting_logic")}</h2>
                    <p className="text-white/30 text-lg max-w-lg mb-12 font-medium leading-relaxed">{t("repo_input_desc")}</p>
                    <div className="flex flex-wrap justify-center gap-6">
                        <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-full border border-white/5">
                            <Sparkles size={16} className="text-saffron" />
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none">{t("arch_scan_ready")}</span>
                        </div>
                        <button onClick={() => setActiveTab("history")} className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-colors">
                            <History size={16} className="text-white/40" />
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">{t("access_memory")}</span>
                        </button>
                    </div>
                </motion.div>
            )}

            {/* VIEWS */}
            <AnimatePresence mode="wait">

                {/* HISTORY VIEW */}
                {activeTab === "history" && !loading && (
                    <motion.div
                        key="history-view"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="grid grid-cols-1 lg:grid-cols-12 gap-12 pb-32 px-4"
                    >
                        <div className="lg:col-span-4 h-[700px]">
                            {/* previousChats is now real data from GET /api/repos/history */}
                            <RepoChatHistory history={previousChats} onSelect={handleHistorySelect} />
                        </div>
                        <div className="lg:col-span-8 flex flex-col h-[700px]">
                            <div className="lovable-card flex-1 p-12 md:p-20 flex flex-col items-center justify-center text-center bg-white/[0.01]">
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-[40px] md:rounded-[50px] bg-black/40 border border-white/10 flex items-center justify-center mb-12 text-white/10">
                                    <Database size={48} />
                                </div>
                                <h3 className="text-3xl md:text-5xl font-black text-white/20 italic tracking-tighter uppercase mb-6 leading-none">{t("memory_retrieval").split(' ').slice(0, 2).join(' ')} <br /> {t("memory_retrieval").split(' ').slice(2).join(' ')}</h3>
                                <p className="text-white/10 text-xs font-bold uppercase tracking-[0.5em] max-w-md leading-loose">{t("archived_desc")}</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* OVERVIEW VIEW */}
                {repoData && !loading && activeTab === "overview" && (
                    <motion.div
                        key="overview-view"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="w-full space-y-24 pb-32 px-4"
                    >
                        {/* 1. COMMAND DASHBOARD HUB */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <DashboardCard
                                icon={<Cpu size={24} />}
                                title={t("architecture")}
                                desc="System schematics"
                                color="bg-saffron/10 border-saffron/30 text-saffron"
                                onClick={() => scrollToSection("architecture-pulse")}
                            />
                            <DashboardCard
                                icon={<Target size={24} />}
                                title={t("metrics")}
                                desc="Intelligence levels"
                                color="bg-green-bharat/10 border-green-bharat/30 text-green-bharat"
                                onClick={() => scrollToSection("intelligence-metrics")}
                            />
                            <DashboardCard
                                icon={<Shield size={24} />}
                                title={t("optimization")}
                                desc="Contribution vectors"
                                color="bg-blue-500/10 border-blue-500/30 text-blue-400"
                                onClick={() => scrollToSection("optimization-hub")}
                            />
                            <DashboardCard
                                icon={<CodeIcon size={24} />}
                                title={t("structural")}
                                desc="File hierarchy tree"
                                color="bg-purple-500/10 border-purple-500/30 text-purple-400"
                                onClick={() => scrollToSection("structural-pulse")}
                            />
                        </div>

                        {/* 2. REPO DESCRIPTION */}
                        <div className="relative">
                            <div className="absolute -top-4 left-10 px-6 py-2 bg-white/10 border border-white/20 backdrop-blur-xl rounded-full text-[10px] font-black text-white/60 tracking-[0.3em] uppercase z-10">Neural Overview Precept</div>
                            <div className="lovable-card p-10 md:p-20 bg-gradient-to-br from-white/[0.05] to-transparent border-white/10 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-12 pr-16 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Info size={120} className="text-white" />
                                </div>
                                <div className="flex gap-4 mb-8 items-center">
                                    <div className="w-1.5 h-12 bg-saffron rounded-full shadow-[0_0_15px_rgba(255,153,51,0.5)]" />
                                    <h3 className="text-2xl font-black italic text-white/40 uppercase tracking-tighter">{t("repo_essence")}</h3>
                                </div>
                                <p className="text-lg md:text-xl font-medium text-white/90 leading-relaxed tracking-tight max-w-5xl">
                                    {repoData.description && repoData.description.length > 500
                                        ? repoData.description.substring(0, 500) + "..."
                                        : repoData.description || "No overview available."}
                                </p>
                            </div>
                        </div>

                        {/* 3. SYSTEM ARCHITECTURE PULSE */}
                        <div id="architecture-pulse" className="relative scroll-mt-32">
                            <div className="absolute -top-6 left-12 px-6 py-2 bg-saffron rounded-full text-[10px] font-black italic tracking-widest z-10 shadow-lg shadow-saffron/20 text-white">SYSTEM ARCHITECTURE PULSE</div>
                            <RepoArchitecture />
                        </div>

                        {/* 4. NEURAL TACTICAL SYSTEM */}
                        <div className="relative pt-10">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 px-8 py-2 bg-white/[0.05] border border-white/10 rounded-full text-[11px] font-black text-white/30 tracking-[0.4em] uppercase backdrop-blur-3xl z-10">{t("neural_tactical")}</div>

                            <div className="lovable-card bg-black/40 border-white/5 rounded-[40px] md:rounded-[60px] overflow-hidden">
                                <div className="p-8 md:p-20 space-y-20">
                                    {/* Header */}
                                    <div className="flex items-center gap-6 border-b border-white/5 pb-10">
                                        <div className="w-16 h-16 rounded-3xl bg-saffron/10 flex items-center justify-center border border-saffron/20">
                                            <Target className="text-saffron" size={32} />
                                        </div>
                                        <div>
                                            <h4 className="text-2xl md:text-3xl font-extrabold italic tracking-tight text-white uppercase">Neural Component Insight</h4>
                                            <p className="text-[11px] font-bold text-white/20 uppercase tracking-[0.3em] mt-2 italic">Logic Stream: Distributed Intelligence</p>
                                        </div>
                                    </div>

                                    {/* Tactical Intel Components */}
                                    <div id="intelligence-metrics" className="grid grid-cols-1 md:grid-cols-3 gap-10 scroll-mt-32">
                                        <div className="md:col-span-1">
                                            {/* Pass real language from techStack, no mock stars */}
                                            <RepoOverview repoName={repoData.repo_name} language={repoData.techStack?.[0]} />
                                        </div>
                                        <div className="md:col-span-1">
                                            {/* Real complexity score from backend */}
                                            <ComplexityGauge complexity={repoData.complexity} />
                                        </div>
                                        <div className="md:col-span-1 border border-white/5 rounded-[32px] p-10 bg-white/[0.03] flex flex-col justify-end min-h-[250px]">
                                            <span className="text-[11px] font-black text-white/20 uppercase tracking-[0.2em] mb-6">Tech Stack Signature</span>
                                            <div className="flex flex-wrap gap-3">
                                                {repoData.techStack && repoData.techStack.length > 0 ? (
                                                    repoData.techStack.map((tech: string, i: number) => (
                                                        <span key={i} className="px-5 py-2 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-white uppercase tracking-widest">{tech}</span>
                                                    ))
                                                ) : (
                                                    <span className="text-white/20 text-[11px] font-bold uppercase tracking-widest">No tech stack detected</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div id="optimization-hub" className="grid grid-cols-1 lg:grid-cols-2 gap-10 scroll-mt-32">
                                        {/* Real risks and recommendations from backend */}
                                        <RepoIssues issues={repoData.issues} />
                                        <ContributionIdeas ideas={repoData.contributionIdeas} />
                                    </div>

                                    <div id="structural-pulse" className="w-full scroll-mt-32">
                                        <FolderTree files={repoData.folder_structure || []} />
                                    </div>

                                    {/* Footer */}
                                    <div className="pt-12 border-t border-white/5 flex flex-col items-center gap-6">
                                        <div className="px-10 py-3 bg-white/5 border border-white/5 rounded-full text-[11px] font-black text-white/20 uppercase tracking-[0.4em] flex items-center gap-4">
                                            <Sparkles size={16} />
                                            TACTICAL CORE SYNCHRONIZED
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* REPO INTEL CHAT VIEW */}
                {activeTab === "chat" && (
                    <motion.div
                        key="chat-view"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="max-w-5xl mx-auto w-full pb-32 px-4"
                    >
                        <div className="mb-12 text-center">
                            <h2 className="text-3xl md:text-4xl font-black text-white italic uppercase tracking-tighter mb-4">
                                {t("repo_intel")} <span className="text-white/20">/</span>{" "}
                                {repoData?.repo_name ? (
                                    <span className="text-saffron">{repoData.repo_name}</span>
                                ) : (
                                    <span className="text-white/20">No Repo Loaded</span>
                                )}
                            </h2>
                            {!repoData && (
                                <p className="text-yellow-400/60 text-[11px] font-bold uppercase tracking-[0.3em] mt-2">
                                    ⚠ Scan a repository in the Overview tab to enable RAG-powered chat
                                </p>
                            )}
                            {repoData && (
                                <p className="text-white/20 text-[10px] font-bold uppercase tracking-[0.4em]">Autonomous AI Specialist Synchronized with this Target Architecture</p>
                            )}
                        </div>
                        <div className="lovable-card p-4 bg-white/[0.02] border-white/5 shadow-3xl">
                            {/* repoData?.id is the repo_id returned by POST /repos/upload and GET /repos/intelligence */}
                            <RepoChat repoName={repoData?.repo_name} repoId={repoData?.id} />
                        </div>
                    </motion.div>
                )}

                {/* ASSESSMENT VIEW */}
                {activeTab === "assessment" && (
                    <motion.div key="assessment-view" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="px-4">
                        <RepoAssessment
                            repoId={repoData?.id ?? null}
                            repoName={repoData?.repo_name}
                            techStack={repoData?.techStack ?? []}
                            onBackToOverview={() => setActiveTab("overview")}
                        />
                    </motion.div>
                )}

            </AnimatePresence>
        </PageContainer>
    );
}

export default function RepoAnalysisPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center text-white">Loading...</div>}>
            <RepoAnalysisPageContent />
        </Suspense>
    );
}

function TabButton({ active, onClick, icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-4 px-6 md:px-10 py-5 rounded-full text-[11px] font-black uppercase tracking-[0.3em] transition-all duration-500 overflow-hidden relative group ${active
                ? "bg-saffron text-white shadow-[0_15px_40px_rgba(255,153,51,0.5)] scale-105"
                : "text-white/40 hover:text-white"
                }`}
        >
            <span className="relative z-10">{icon}</span>
            <span className="relative z-10">{label}</span>
            {active && (
                <motion.div
                    layoutId="activeTabGlow"
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.8 }}
                />
            )}
        </button>
    );
}

function DashboardCard({ icon, title, desc, color, onClick }: any) {
    return (
        <motion.div
            whileHover={{ y: -5, scale: 1.02 }}
            onClick={onClick}
            className={`lovable-card cursor-pointer p-6 relative overflow-hidden group border-white/5 hover:border-white/20 transition-all ${color}`}
        >
            <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:opacity-[0.15] transition-opacity">
                {icon}
            </div>
            <div className="mb-4 w-12 h-12 rounded-[16px] bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h4 className="text-lg font-black italic uppercase tracking-tight mb-1 text-white">{title}</h4>
            <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em]">{desc}</p>

            <div className="mt-6 flex items-center gap-2">
                <span className="text-[8px] font-black text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Engage</span>
                <ArrowRight size={10} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
        </motion.div>
    );
}