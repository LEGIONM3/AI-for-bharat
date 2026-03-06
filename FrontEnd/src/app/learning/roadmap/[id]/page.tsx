"use client";

import { useEffect, useState, use } from "react";
import PageContainer from "@/components/layout/PageContainer";
import { motion } from "framer-motion";
import { BookOpen, RefreshCcw, Layers, Brain, Cpu, Database, GitBranch, Rocket } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import apiClient from "@/services/apiClient";
import LearningRoadmap from "@/components/learning/LearningRoadmap";
import Loader from "@/components/ui/Loader";
import { useRouter } from "next/navigation";

// A small icon map to give variety to phases
const phaseIcons = [BookOpen, Layers, Brain, Cpu, Database, GitBranch, Rocket];
const phaseColors = ["text-blue-400", "text-purple-400", "text-saffron", "text-cyan-400", "text-green-bharat", "text-pink-400", "text-orange-400"];

export default function MasteryJourneyPage({ params }: { params: Promise<{ id: string }> }) {
    const { t } = useLanguage();
    const router = useRouter();
    const { id } = use(params);
    const [roadmapData, setRoadmapData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchRoadmap = async () => {
        try {
            const { data } = await apiClient.get(`/learning/roadmap/${id}`);
            setRoadmapData(data);
        } catch (error) {
            console.error("Failed to load roadmap", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchRoadmap();
    }, [id]);

    if (loading) {
        return (
            <PageContainer>
                <Loader />
            </PageContainer>
        );
    }

    if (!roadmapData) {
        return (
            <PageContainer>
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <p className="text-white/40 mb-4 tracking-widest uppercase text-xs">Journey not found</p>
                    <button
                        onClick={() => router.push("/learning/dashboard")}
                        className="py-3 px-6 rounded-full border border-white/10 hover:bg-white/5 transition-all text-xs font-black uppercase text-white/70"
                    >
                        Return to HQ
                    </button>
                </div>
            </PageContainer>
        );
    }

    // Map backend response to the component's expected prop type
    let mappedPhases = [];
    if (roadmapData.phases && Array.isArray(roadmapData.phases)) {
        let foundActive = false;

        mappedPhases = roadmapData.phases.map((p: any, index: number) => {
            const allItemsDone = p.concepts?.every((c: any) => c.completed) && p.concepts?.length > 0;
            const anyItemDone = p.concepts?.some((c: any) => c.completed);

            let status = "locked";
            if (allItemsDone) {
                status = "completed";
            } else if (!foundActive && (!allItemsDone || anyItemDone)) {
                status = "active";
                foundActive = true;
            }

            return {
                phase: `Phase ${index + 1 < 10 ? '0' : ''}${index + 1}`,
                label: p.title || `Phase ${index + 1}`,
                description: p.objectives?.join(", ") || "",
                icon: phaseIcons[index % phaseIcons.length],
                color: phaseColors[index % phaseColors.length],
                status: status,
                estimatedTime: `${p.duration_weeks || 1} Week${p.duration_weeks > 1 ? 's' : ''}`,
                items: (p.concepts || []).map((c: any) => ({
                    id: c.id || c.name,
                    label: c.name,
                    done: c.completed || false
                }))
            };
        });

        // Ensure at least the first is active if all are locked
        if (!foundActive && mappedPhases.length > 0) {
            mappedPhases[0].status = "active";
        }
    }

    return (
        <PageContainer>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto py-10 px-4"
            >
                <div className="flex justify-between items-center mb-12">
                    <button
                        onClick={() => router.push("/learning/dashboard")}
                        className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] hover:text-white transition-colors flex items-center gap-2 group"
                    >
                        <RefreshCcw size={12} className="group-hover:rotate-180 transition-transform duration-500" />
                        {t("back_to_hq")}
                    </button>

                    <div className="px-4 py-1.5 rounded-full border border-saffron/30 bg-saffron/10 text-saffron text-[10px] font-black uppercase tracking-widest">
                        {roadmapData.current_level?.toUpperCase() || "MASTERY"}
                    </div>
                </div>

                <div className="mb-16">
                    <h1 className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-tighter mb-4">
                        {roadmapData.goal || "Learning Roadmap"}
                    </h1>
                    {roadmapData.stack && roadmapData.stack.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                            {roadmapData.stack.map((tech: string, i: number) => (
                                <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-bold text-white/50 uppercase tracking-widest">
                                    {tech}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {mappedPhases.length > 0 ? (
                    <LearningRoadmap
                        roadmap={mappedPhases}
                        roadmapId={roadmapData.id || roadmapData.roadmap_id || id}
                        topic={roadmapData.stack?.[0] || roadmapData.goal}
                        onRefresh={fetchRoadmap}
                    />
                ) : (
                    <div className="text-center py-20 text-white/30 text-sm font-bold tracking-widest uppercase">
                        No phases found for this roadmap.
                    </div>
                )}
            </motion.div>
        </PageContainer>
    );
}
