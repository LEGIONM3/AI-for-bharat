"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, CheckCircle2, Star, ArrowRight, RefreshCcw, Sparkles, Plus, AlertTriangle, Layout } from "lucide-react";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import apiClient from "@/services/apiClient";
import Loader from "@/components/ui/Loader";
import { useRouter } from "next/navigation";

interface RoadmapMasteryProps {
    onReview: () => void;
    topic?: string;
}

export default function RoadmapMastery({
    onReview,
    topic
}: RoadmapMasteryProps) {
    const { t } = useLanguage();
    const router = useRouter();

    const [nextLevel, setNextLevel] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!topic) return;
        const checkLevel = async () => {
            setLoading(true);
            try {
                const { data } = await apiClient.get(`/learning/available-levels/${topic}`);
                if (data.next_level) {
                    setNextLevel(data.next_level);
                }
            } catch (err) {
                console.error("Failed to fetch available levels", err);
            } finally {
                setLoading(false);
            }
        };
        checkLevel();
    }, [topic]);

    const handleCreateNextLevel = async () => {
        if (!topic || !nextLevel) return;
        setLoading(true);
        try {
            const { data } = await apiClient.post("/learning/roadmap", {
                goal: `${nextLevel} level mastery in ${topic}`,
                stack: [topic],
                timeline: nextLevel === "intermediate" ? "4 weeks" : "8 weeks",
                current_level: nextLevel
            });
            if (data && data.id) {
                router.push(`/learning/roadmap/${data.id}`);
            } else {
                router.push("/learning/dashboard");
            }
        } catch (e) {
            console.error("Failed creating next level", e);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lovable-card p-12 md:p-20 bg-black/60 border-saffron/30 shadow-[0_0_100px_rgba(255,153,51,0.2)] relative overflow-hidden text-center"
        >
            {/* Decorative Fireworks/Sparkles */}
            <div className="absolute inset-0 pointer-events-none">
                <Sparkles className="absolute top-10 left-10 text-saffron/20 animate-pulse" size={40} />
                <Sparkles className="absolute bottom-10 right-10 text-green-bharat/20 animate-pulse" size={60} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-saffron/10 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 flex flex-col items-center">
                {/* Progress Trophy */}
                <motion.div
                    initial={{ rotate: -10, y: 20 }}
                    animate={{ rotate: 0, y: 0 }}
                    transition={{ type: "spring", bounce: 0.5, duration: 1 }}
                    className="w-40 h-40 rounded-[3.5rem] bg-gradient-to-tr from-saffron to-orange-400 flex items-center justify-center mb-10 shadow-[0_25px_80px_rgba(255,153,51,0.5)]"
                >
                    <Trophy size={80} className="text-white" />
                </motion.div>

                <h3 className="text-[12px] font-black text-saffron uppercase tracking-[0.6em] mb-4 italic">{t("roadmap_synced")}</h3>
                <h2 className="text-6xl md:text-8xl font-black text-white italic tracking-tighter uppercase leading-none mb-8">
                    {t("legendary_mastery_title").split(' ')[0]} <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/20">{t("legendary_mastery_title").split(' ')[1]}</span>
                </h2>

                {nextLevel ? (
                    <div className="p-8 rounded-[2.5rem] bg-saffron/10 border border-saffron/30 mb-12 max-w-2xl">
                        <div className="flex items-center justify-center gap-3 text-saffron mb-4 px-2">
                            <Star size={20} />
                            <span className="text-xs font-black uppercase tracking-[0.3em] italic">Level Unlocked</span>
                        </div>
                        <p className="text-white/70 text-lg font-medium italic leading-relaxed">
                            You have mastered this tier! The {nextLevel.toUpperCase()} pathway for {topic} is now available.
                        </p>
                    </div>
                ) : (
                    <p className="text-white/50 text-xl font-medium italic mb-12 max-w-2xl mx-auto">
                        {t("all_protocols_mastered")} You have achieved maximum proficiency.
                    </p>
                )}

                {/* Action Grid */}
                <div className="flex flex-col md:flex-row gap-6 w-full max-w-lg">
                    {nextLevel ? (
                        <Button
                            variant="saffron"
                            size="lg"
                            onClick={handleCreateNextLevel}
                            className="flex-1 py-8 italic tracking-tighter"
                        >
                            Start {nextLevel} Journey
                            <ArrowRight size={20} />
                        </Button>
                    ) : (
                        <Link href="/learning/dashboard" className="flex-1">
                            <Button
                                variant="saffron"
                                size="lg"
                                className="w-full py-8 italic tracking-tighter"
                            >
                                Return to HQ
                                <Layout size={20} />
                            </Button>
                        </Link>
                    )}

                    <button
                        onClick={onReview}
                        className="flex-1 py-6 rounded-[2rem] bg-white/5 border border-white/10 text-[10px] font-black text-white/40 uppercase tracking-[0.3em] hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-3"
                    >
                        <RefreshCcw size={14} />
                        {t("recall_journey")}
                    </button>
                </div>

                <div className="mt-16 flex items-center gap-3 text-green-bharat">
                    <CheckCircle2 size={16} />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">SYSTEM STATUS: {nextLevel ? t("partial_core") : t("all_protocols_mastered")}</span>
                </div>
            </div>
        </motion.div>
    );
}
