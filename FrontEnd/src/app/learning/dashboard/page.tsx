"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import PageContainer from "@/components/layout/PageContainer";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Layout, Zap, Sparkles, RefreshCcw, Archive, ArrowRight, BookOpen, Target } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";
import useLearning from "@/hooks/useLearning";
import apiClient from "@/services/apiClient";
import { useRouter } from "next/navigation";

// DYNAMIC CORE COMPONENTS FOR SPEED
const LearningOverview = dynamic(() => import("@/components/learning/LearningOverview"), { ssr: false });
const LearningRoadmap = dynamic(() => import("@/components/learning/LearningRoadmap"), { ssr: false });
const NextStepSuggestions = dynamic(() => import("@/components/learning/NextStepSuggestions"), { ssr: false });
const LearningSetup = dynamic(() => import("@/components/learning/LearningSetup"), { ssr: false });

export default function LearningDashboardPage() {
    const { roadmap, progress } = useLearning();
    const { t } = useLanguage();
    const [isInitialized, setIsInitialized] = useState(false);
    const [currentView, setCurrentView] = useState<"landing" | "overview" | "setup" | "journeys">("landing");

    // Real journey data from GET /api/repos/history (past repo scans = the closest
    // available backend data since there is no dedicated "list roadmaps" endpoint)
    const [repoJourneys, setRepoJourneys] = useState<any[]>([]);
    const [loadingJourneys, setLoadingJourneys] = useState(false);

    useEffect(() => {
        if (roadmap && roadmap.length > 0) {
            setIsInitialized(true);
        }
    }, [roadmap]);

    const loadJourneys = async () => {
        setLoadingJourneys(true);
        try {
            const { data } = await apiClient.get("/learning/roadmaps");
            setRepoJourneys(Array.isArray(data) ? data : []);
        } catch {
            setRepoJourneys([]);
        } finally {
            setLoadingJourneys(false);
        }
    };

    const handleViewJourneys = () => {
        setCurrentView("journeys");
        loadJourneys();
    };

    const router = useRouter();

    const handleNewPlan = (data: any) => {
        if (data.roadmapId) {
            router.push(`/learning/roadmap/${data.id || data.roadmapId}`);
        } else {
            setIsInitialized(true);
            setCurrentView("overview");
        }
    };

    return (
        <PageContainer>
            <AnimatePresence mode="wait">
                {currentView === "landing" ? (
                    <motion.div
                        key="landing"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="max-w-6xl mx-auto py-20 px-4"
                    >
                        {/* THEMATIC LANDING HEADER */}
                        <div className="mb-20 text-center">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-saffron/10 border border-saffron/20 mb-8">
                                <Sparkles size={16} className="text-saffron animate-pulse" />
                                <span className="text-[10px] font-black text-saffron uppercase tracking-[0.4em]">
                                    {t("integrated_learning_node")}
                                </span>
                            </div>
                            <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase italic leading-none mb-6">
                                <span className="lovable-text-gradient">{t("learning_hq").split(' ')[0]}</span> <span className="text-white">{t("learning_hq").split(' ')[1]}</span>
                            </h1>
                            <p className="text-white/40 text-sm font-bold uppercase tracking-[0.6em] max-w-2xl mx-auto">
                                {t("initialize_new_roadmap")}
                            </p>
                        </div>

                        {/* TWO CONTAINERS ENTRY POINT */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Create New Plan Card */}
                            <motion.div
                                whileHover={{ y: -10 }}
                                onClick={() => setCurrentView("setup")}
                                className="lovable-card p-12 md:p-16 bg-gradient-to-br from-saffron/20 to-transparent border-saffron/20 group cursor-pointer relative overflow-hidden flex flex-col items-center text-center transition-all hover:border-saffron/30"
                            >
                                <div className="w-20 h-20 md:w-24 md:h-24 rounded-[2rem] md:rounded-[2.5rem] bg-saffron text-white flex items-center justify-center mb-10 shadow-3xl shadow-saffron/20 group-hover:rotate-12 transition-transform duration-500">
                                    <Plus size={40} strokeWidth={3} />
                                </div>
                                <h2 className="text-3xl md:text-4xl font-black text-white italic uppercase tracking-tighter mb-4">{t("create_new_plan")}</h2>
                                <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.4em] mb-10">{t("neural_roadmap_desc")}</p>
                                <div className="mt-auto px-8 py-3 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-white/60 uppercase tracking-widest group-hover:bg-saffron group-hover:text-white transition-all">
                                    {t("initialize_protocol")}
                                </div>

                                <Target className="absolute -bottom-10 -right-10 text-white/[0.03] rotate-12" size={180} />
                            </motion.div>

                            {/* Mastery Journey Card */}
                            <motion.div
                                whileHover={{ y: -10 }}
                                onClick={handleViewJourneys}
                                className="lovable-card p-12 md:p-16 border-white/10 group cursor-pointer relative overflow-hidden flex flex-col items-center text-center transition-all hover:border-white/30 bg-gradient-to-br from-white/[0.05] to-transparent"
                            >
                                <div className="w-20 h-20 md:w-24 md:h-24 rounded-[2rem] md:rounded-[2.5rem] bg-white text-black flex items-center justify-center mb-10 shadow-3xl group-hover:-rotate-12 transition-transform duration-500">
                                    <BookOpen size={40} />
                                </div>
                                <h2 className="text-3xl md:text-4xl font-black text-white italic uppercase tracking-tighter mb-4">{t("mastery_journey")}</h2>
                                <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.4em] mb-10">{t("training_protocols_desc")}</p>
                                <div className="mt-auto px-8 py-3 border border-white/10 rounded-full text-[10px] font-black text-white uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                                    {t("access_vault")}
                                </div>

                                <Zap className="absolute -bottom-10 -right-10 text-white/[0.03] -rotate-12" size={180} />
                            </motion.div>
                        </div>
                    </motion.div>
                ) : currentView === "journeys" ? (
                    <motion.div
                        key="journeys"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="max-w-6xl mx-auto py-20 px-4"
                    >
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                            <div>
                                <button
                                    onClick={() => setCurrentView("landing")}
                                    className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-6 italic flex items-center gap-2 group hover:text-white transition-colors"
                                >
                                    <RefreshCcw size={12} className="group-hover:rotate-180 transition-transform duration-500" />
                                    {t("back_to_hq")}
                                </button>
                                <h3 className="text-[10px] font-black text-saffron uppercase tracking-[0.4em] mb-2 italic flex items-center gap-2">
                                    <Archive size={12} /> {t("journey_vault")}
                                </h3>
                                <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
                                    <span className="lovable-text-gradient">{t("active_roadmaps").split(' ')[0]}</span> <span className="text-white">{t("active_roadmaps").split(' ')[1]}</span>
                                </h1>
                            </div>
                        </div>

                        {loadingJourneys && (
                            <div className="flex justify-center py-20">
                                <div className="w-12 h-12 border-4 border-t-saffron border-r-transparent border-b-green-bharat border-l-transparent rounded-full animate-spin" />
                            </div>
                        )}

                        {!loadingJourneys && repoJourneys.length === 0 && (
                            <div className="text-center py-20">
                                <p className="text-white/20 text-[11px] font-black uppercase tracking-[0.4em]">
                                    No repositories scanned yet. Go to Code Lab to begin.
                                </p>
                            </div>
                        )}

                        {!loadingJourneys && repoJourneys.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {repoJourneys.map((journey: any) => (
                                    <div key={journey.id} className="relative group">
                                        <Link
                                            href={`/learning/roadmap/${journey.id}`}
                                            className="lovable-card p-8 bg-white/[0.02] border border-white/5 hover:border-saffron/40 transition-all flex flex-col h-full block"
                                        >
                                            <div className="flex justify-between items-start mb-10">
                                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-saffron group-hover:text-white transition-all">
                                                    <Zap size={20} />
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${journey.status === 'completed' ? 'border-green-bharat/30 bg-green-bharat/10 text-green-bharat' : 'border-saffron/30 bg-saffron/10 text-saffron'
                                                    }`}>
                                                    {journey.status?.toUpperCase() || "ACTIVE"}
                                                </div>
                                            </div>

                                            <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2 group-hover:text-saffron transition-colors">
                                                {journey.goal || "New Roadmap"}
                                            </h4>
                                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-10">
                                                Progress: {journey.progress || 0}% • {journey.current_level?.toUpperCase() || "BEGINNER"}
                                            </p>

                                            <div className="mt-auto pt-4 flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-[0.3em] group-hover:text-white transition-colors">
                                                {journey.status === 'completed' ? t("review_mastery") : t("resume_training")} <ArrowRight size={12} />
                                            </div>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                ) : currentView === "setup" ? (
                    <motion.div
                        key="setup"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="px-4"
                    >
                        <div className="flex justify-between items-center mb-8">
                            <button
                                onClick={() => setCurrentView("landing")}
                                className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] hover:text-white transition-colors flex items-center gap-2 group"
                            >
                                <RefreshCcw size={12} className="group-hover:rotate-180 transition-transform duration-500" />
                                {t("back_to_hq")}
                            </button>
                        </div>
                        <LearningSetup onSuccess={handleNewPlan} />
                    </motion.div>
                ) : (
                    <motion.div
                        key="overview"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-12 px-4"
                    >
                        {/* TACTICAL HEADER WITH QUICK SWITCH */}
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                            <div className="flex flex-col">
                                <button
                                    onClick={() => setCurrentView("landing")}
                                    className="text-[10px] font-black text-saffron uppercase tracking-[0.4em] mb-4 italic flex items-center gap-3 hover:gap-5 transition-all w-fit"
                                >
                                    <RefreshCcw size={12} /> Training Progression / HQ
                                </button>
                                <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
                                    <span className="lovable-text-gradient">{t("active_protocol").split(' ')[0]}</span> <span className="text-white">{t("active_protocol").split(' ')[1]}</span>
                                </h1>
                            </div>

                            <div className="flex items-center gap-4 bg-white/[0.03] border border-white/5 p-2 rounded-[2rem]">
                                <button
                                    onClick={() => setCurrentView("setup")}
                                    className="px-8 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 text-white/40 hover:text-white hover:bg-white/5"
                                >
                                    <Plus size={14} />
                                    <span>Re-route Link</span>
                                </button>
                                <div className="h-6 w-px bg-white/10 mx-2" />
                                <div className="px-6 py-4 text-[10px] font-black text-saffron uppercase tracking-widest flex items-center gap-2">
                                    <Zap size={14} fill="#FF9933" />
                                    <span>{t("sync_active")}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-8 space-y-12">
                                <LearningOverview progress={progress} />
                                <LearningRoadmap />
                            </div>
                            <div className="lg:col-span-4 flex flex-col gap-8">
                                <NextStepSuggestions />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </PageContainer>
    );
}