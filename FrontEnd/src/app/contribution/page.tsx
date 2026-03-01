"use client";

import { useState } from "react";
import PageContainer from "@/components/layout/PageContainer";
import ContributionScore from "@/components/contribution/ContributionScore";
import SuggestedPRs from "@/components/contribution/SuggestedPRs";
import ContributionTimeline from "@/components/contribution/ContributionTimeline";
import ContributionHistory from "@/components/contribution/ContributionHistory";
import ContributionBadges from "@/components/contribution/ContributionBadges";
import { useLanguage } from "@/context/LanguageContext";
import { useContribution } from "@/hooks/useContribution";
import { motion } from "framer-motion";
import { Sparkles, GitMerge, Users, RefreshCw } from "lucide-react";

export default function ContributionPage() {
    const { t } = useLanguage();
    const { data, isLoading, isRefreshing, refresh } = useContribution();

    if (isLoading) {
        return (
            <PageContainer>
                <div className="flex flex-col mb-12 px-4 space-y-4">
                    <div className="h-6 w-48 bg-white/5 animate-pulse rounded-full"></div>
                    <div className="h-16 w-3/4 bg-white/5 animate-pulse rounded-xl"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 px-4">
                    <div className="h-64 bg-white/5 animate-pulse rounded-2xl"></div>
                    <div className="h-64 bg-white/5 animate-pulse rounded-2xl"></div>
                </div>
                <div className="px-4 mb-8">
                    <div className="h-64 bg-white/5 animate-pulse rounded-2xl"></div>
                </div>
            </PageContainer>
        );
    }

    const score = data?.readiness_score ?? 0;
    const isNewUser = score < 20;

    return (
        <PageContainer>
            <div className="relative w-full min-h-[80vh] flex flex-col items-center justify-center">
                {/* Overlay Text */}
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none">
                    <div className="bg-black/80 px-16 py-12 rounded-3xl border border-white/10 backdrop-blur-xl flex flex-col items-center shadow-2xl shadow-black/50">
                        <Sparkles size={48} className="text-saffron mb-6 animate-pulse" />
                        <h2 className="text-6xl md:text-8xl font-black text-white italic tracking-tighter uppercase mb-2 drop-shadow-2xl">Upcoming</h2>
                        <p className="text-white/40 text-xs md:text-sm font-bold uppercase tracking-[0.4em]">Contribution Protocol in Development</p>
                    </div>
                </div>

                {/* Blurred Content */}
                <div className="w-full blur-md opacity-30 pointer-events-none select-none transition-all duration-1000">
                    {/* Page Header */}
                    <div className="flex flex-col mb-12 px-4 relative">
                        <div className="absolute right-4 top-0 z-10">
                            <button
                                onClick={refresh}
                                disabled={isRefreshing}
                                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/50 transition-all disabled:opacity-50"
                            >
                                <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
                                Refresh AI Analysis
                            </button>
                        </div>
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-4 mb-4"
                        >
                            <div className="px-3 py-1 bg-green-bharat/10 border border-green-bharat/20 rounded-full flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-bharat animate-pulse" />
                                <span className="text-[10px] font-black text-green-bharat uppercase tracking-widest">Active Contribution Node</span>
                            </div>
                            {isNewUser && (
                                <div className="px-3 py-1 bg-saffron/10 border border-saffron/20 rounded-full flex items-center gap-2">
                                    <Users size={12} className="text-saffron" />
                                    <span className="text-[10px] font-black text-saffron uppercase tracking-widest">New Contributor — Starter Mode</span>
                                </div>
                            )}
                        </motion.div>

                        <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tighter uppercase italic leading-none mb-4">
                            {t("contribution_readiness").split(' ')[0]} <span className="text-white/20">/</span> <span className="lovable-text-gradient">{t("contribution_readiness").split(' ')[1]}.</span>
                        </h1>
                        <p className="text-white/20 text-xs font-bold uppercase tracking-[0.4em] italic">Open Source Impact — Track · Log · Grow</p>
                    </div>

                    {/* TOP ROW: Score + Timeline */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 px-4">
                        <ContributionScore
                            score={score}
                            totalPRs={data?.this_month_count ?? 0}
                            streak={data?.day_streak ?? 0}
                            rank={data?.rank ?? "Novice"}
                        />
                        <ContributionTimeline data={data?.monthly_activity} />
                    </div>

                    {/* MIDDLE ROW: Recommended Repos */}
                    <div className="px-4 mb-8">
                        <SuggestedPRs isNewUser={isNewUser} data={data?.recommended_repos ?? []} />
                    </div>

                    {/* BOTTOM ROW: History + Badges */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-4 mb-12">
                        <ContributionHistory history={data?.contribution_history ?? []} />
                        <ContributionBadges data={data?.achievements ?? []} />
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}
