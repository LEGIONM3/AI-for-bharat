"use client";

import { useEffect, useState, use } from "react";
import PageContainer from "@/components/layout/PageContainer";
import { motion } from "framer-motion";
import { ArrowRight, Trophy, Check, Layers, PlayCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import apiClient from "@/services/apiClient";
import Button from "@/components/ui/Button";

export default function RecommendationPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [status, setStatus] = useState<"loading" | "ready" | "enrolling" | "error">("loading");
    const [currentRoadmap, setCurrentRoadmap] = useState<any>(null);
    const [nextRoadmapInfo, setNextRoadmapInfo] = useState<any>(null);

    useEffect(() => {
        if (!id) return;
        const fetchChainedData = async () => {
            try {
                // 1. Fetch the Roadmap the user just completed
                const { data: currentData } = await apiClient.get(`/learning/roadmap/${id}`);
                setCurrentRoadmap(currentData);

                // 2. Discover if there's a predefined chain node requested setup
                if (currentData.next_roadmap) {
                    const { data: presetResponse } = await apiClient.get(`/learning/preset-plans`);
                    // Find the preset plan definition within array
                    const targetPlan = Array.isArray(presetResponse.plans) 
                        ? presetResponse.plans.find((p: any) => p.roadmap_id === currentData.next_roadmap)
                        : null;
                    if (targetPlan) {
                        setNextRoadmapInfo(targetPlan);
                    }
                }
                setStatus("ready");
            } catch (err) {
                console.error("Failed to load recommendation data", err);
                setStatus("error");
            }
        };
        fetchChainedData();
    }, [id]);

    const handleEnroll = async () => {
        if (!nextRoadmapInfo) return;
        setStatus("enrolling");
        try {
            const { data } = await apiClient.post("/learning/request-plan", {
                plan_id: nextRoadmapInfo.roadmap_id
            });
            // Automatically push them to the new generated active roadmap
            router.push(`/learning/roadmap/${data.roadmap_id}`);
        } catch (err) {
            console.error(err);
            setStatus("error");
        }
    };

    if (status === "loading" || status === "enrolling") {
        return (
            <PageContainer>
                <div className="flex flex-col items-center justify-center min-h-[50vh]">
                    <Loader2 size={40} className="animate-spin text-saffron mb-4" />
                    <p className="text-white/40 uppercase tracking-[0.4em] text-xs font-bold">
                        {status === "loading" ? "Analyzing Profile Mastery..." : "Initializing Neural Node..."}
                    </p>
                </div>
            </PageContainer>
        );
    }

    if (status === "error") {
        return (
            <PageContainer>
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <p className="text-red-400 mb-4 font-bold tracking-widest uppercase text-xs">Failed to Generate Report</p>
                    <button onClick={() => router.push("/learning/dashboard")} className="py-3 px-6 rounded-full border border-white/20 text-white/50 text-xs font-black uppercase hover:bg-white/10">
                        Return to HQ
                    </button>
                </div>
            </PageContainer>
        );
    }

    const difficultyClass = nextRoadmapInfo?.difficulty === "master" ? "text-red-400" 
        : nextRoadmapInfo?.difficulty === "intermediate" ? "text-cyan-400" : "text-green-400";

    return (
        <PageContainer>
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="max-w-2xl mx-auto py-20 px-4"
            >
                <div className="lovable-card bg-black/40 border-saffron/20 p-12 text-center rounded-3xl relative overflow-hidden flex flex-col items-center">
                    <div className="absolute inset-0 bg-gradient-to-t from-saffron/5 to-transparent pointer-events-none" />
                    
                    <div className="relative z-10">
                        <div className="w-20 h-20 mx-auto rounded-3xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-8">
                            <Trophy size={32} className="text-green-400" />
                        </div>
                        
                        <h3 className="text-[10px] font-black text-saffron uppercase tracking-[0.4em] mb-3">JOURNEY ACCOMPLISHED</h3>
                        <h1 className="text-3xl md:text-5xl font-black text-white italic tracking-tighter uppercase mb-2">
                            {currentRoadmap?.title || currentRoadmap?.topic}
                        </h1>
                        <p className="text-white/40 text-sm italic font-medium mb-12 max-w-md mx-auto">
                            You have successfully traversed and mastered all neural nodes associated with this phase level. 
                        </p>

                        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-12" />

                        {nextRoadmapInfo ? (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 mb-8"
                            >
                                <h3 className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em] mb-4">RECOMMENDED DIRECTIVE</h3>
                                <div className="flex flex-col items-center gap-4">
                                    <div className={`px-4 py-1.5 rounded-full border border-white/10 text-[9px] font-black uppercase tracking-widest ${difficultyClass}`}>
                                        ELEVATED TO: {nextRoadmapInfo.difficulty}
                                    </div>
                                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                                        {nextRoadmapInfo.title || nextRoadmapInfo.topic}
                                    </h2>
                                    <p className="text-xs text-white/40 max-w-sm mt-2 mb-6">
                                        {nextRoadmapInfo.goal || "Continue pushing your boundaries into deeper system architectures."}
                                    </p>
                                    
                                    <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                                        <Button onClick={handleEnroll} variant="saffron" className="py-4 px-8 tracking-widest text-[10px] sm:w-auto w-full">
                                            CONTINUE JOURNEY <PlayCircle size={14} className="ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                             <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 mb-8 flex flex-col items-center"
                            >
                                <Layers size={40} className="text-white/20 mb-4" />
                                <h3 className="text-xs font-black text-white/50 uppercase tracking-[0.4em] mb-2">MAXIMUM MASTERY REACHED</h3>
                                <p className="text-xs text-white/30 text-center max-w-sm">
                                    You have ascended to the absolute peak structure of this discipline. Return to the global index to begin a completely new skill track across a new domain.
                                </p>
                            </motion.div>
                        )}

                        <button
                            onClick={() => router.push("/learning/dashboard")}
                            className="mt-4 text-[10px] font-black text-white/40 uppercase tracking-[0.3em] hover:text-white transition-colors"
                        >
                            Return to Global Index
                        </button>
                    </div>
                </div>
            </motion.div>
        </PageContainer>
    );
}
