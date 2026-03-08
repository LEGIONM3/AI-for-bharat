"use client";

import { useState, useEffect } from "react";
import PageContainer from "@/components/layout/PageContainer";
import { motion, AnimatePresence } from "framer-motion";
import {
    Lock, Unlock, BookOpen, GitBranch, Sparkles, Loader2,
    Check, RefreshCw, Trophy, Target, Star,
    User, Code2, Globe, Clock, Zap, Send,
    TrendingUp, AlertTriangle, Bug, FileText, Layers, ExternalLink
} from "lucide-react";
import apiClient from "@/services/apiClient";

interface BeginnerIssue {
    title: string;
    label: string;
    effort: "Easy" | "Medium";
}

interface SkillGap {
    skill: string;
    user_level: string;
    required_level: string;
    gap: "None" | "Small" | "Medium" | "Large";
}

interface RepoRec {
    name: string;
    display_name: string;
    description: string;
    language: string;
    stars: string;
    forks: string;
    tags: string[];
    matching_score: number;
    match_reason: string;
    difficulty: "Beginner" | "Intermediate" | "Advanced";
    estimated_effort: string;
    contribution_areas: string[];
    beginner_issues: BeginnerIssue[];
    skill_gap_mapping: SkillGap[];
}

interface RepoFeed {
    repos: RepoRec[];
    generated_at: string;
    total_repos: number;
}

interface UnlockStatus {
    unlocked: boolean;
    completed_courses: number;
    completed_assessments: number;
    courses_needed: number;
    assessments_needed: number;
    roadmap_topics: string[];
}

interface AIFields {
    bio: string;
    skills: string[];
    preferred_language: string;
    open_source_goals: string;
    availability: string;
    contribution_areas: string[];
    experience_level: string;
    motivation: string;
}

interface FormData {
    github_username: string;
    bio: string;
    skills: string[];
    preferred_language: string;
    open_source_goals: string;
    availability: string;
    contribution_areas: string[];
    experience_level: string;
    motivation: string;
    linkedin: string;
}

export default function ContributionPage() {
    const [unlockStatus, setUnlockStatus] = useState<UnlockStatus | null>(null);
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [loadingAI, setLoadingAI] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [repoFeed, setRepoFeed] = useState<RepoFeed | null>(null);
    const [loadingFeed, setLoadingFeed] = useState(false);
    const [expandedRepo, setExpandedRepo] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>({
        github_username: "",
        bio: "",
        skills: [],
        preferred_language: "",
        open_source_goals: "",
        availability: "Weekends",
        contribution_areas: [],
        experience_level: "Beginner",
        motivation: "",
        linkedin: "",
    });
    const [skillInput, setSkillInput] = useState("");
    const [aiFilled, setAiFilled] = useState(false);

    const fetchRepoFeed = async () => {
        setLoadingFeed(true);
        try {
            const { data } = await apiClient.post("/contribution/repo-feed");
            setRepoFeed(data);
        } catch (e) {
            console.error("Repo feed failed", e);
        } finally {
            setLoadingFeed(false);
        }
    };

    useEffect(() => {
        apiClient.get("/contribution/unlock-status")
            .then(({ data }) => {
                setUnlockStatus(data);
                if (data.unlocked) fetchRepoFeed(); // auto-load feed when unlocked
            })
            .catch(() => setUnlockStatus({
                unlocked: false, completed_courses: 0, completed_assessments: 0,
                courses_needed: 5, assessments_needed: 5, roadmap_topics: []
            }))
            .finally(() => setLoadingStatus(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleAIFill = async () => {
        setLoadingAI(true);
        try {
            const { data } = await apiClient.post("/contribution/ai-fill");
            if (data.success && data.fields) {
                const f: AIFields = data.fields;
                setFormData(prev => ({
                    ...prev,
                    bio: f.bio || prev.bio,
                    skills: f.skills || prev.skills,
                    preferred_language: f.preferred_language || prev.preferred_language,
                    open_source_goals: f.open_source_goals || prev.open_source_goals,
                    availability: f.availability || prev.availability,
                    contribution_areas: f.contribution_areas || prev.contribution_areas,
                    experience_level: f.experience_level || prev.experience_level,
                    motivation: f.motivation || prev.motivation,
                }));
                setAiFilled(true);
            }
        } catch (e) {
            console.error("AI fill failed", e);
        } finally {
            setLoadingAI(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.github_username.trim()) {
            alert("GitHub username is required.");
            return;
        }
        setSubmitting(true);
        try {
            // Simulate saving — extend with real endpoint when needed
            await new Promise(res => setTimeout(res, 1500));
            setSubmitted(true);
        } finally {
            setSubmitting(false);
        }
    };

    const addSkill = () => {
        const s = skillInput.trim();
        if (s && !formData.skills.includes(s)) {
            setFormData(prev => ({ ...prev, skills: [...prev.skills, s] }));
        }
        setSkillInput("");
    };

    const removeSkill = (skill: string) => {
        setFormData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
    };

    const toggleArea = (area: string) => {
        setFormData(prev => ({
            ...prev,
            contribution_areas: prev.contribution_areas.includes(area)
                ? prev.contribution_areas.filter(a => a !== area)
                : [...prev.contribution_areas, area]
        }));
    };

    if (loadingStatus) {
        return (
            <PageContainer>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 size={32} className="animate-spin text-saffron" />
                </div>
            </PageContainer>
        );
    }

    // ─── LOCKED STATE ─────────────────────────────────────────────────────────
    if (!unlockStatus?.unlocked) {
        const courseProgress = Math.min(100, ((unlockStatus?.completed_courses || 0) / 5) * 100);
        const assessProgress = Math.min(100, ((unlockStatus?.completed_assessments || 0) / 5) * 100);

        return (
            <PageContainer>
                <div className="max-w-3xl mx-auto px-4 py-16 flex flex-col items-center text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col items-center"
                    >
                        {/* Lock Icon */}
                        <div className="relative mb-12">
                            <div className="w-32 h-32 rounded-3xl bg-white/[0.03] border border-white/10 flex items-center justify-center shadow-2xl">
                                <Lock size={48} className="text-white/20" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-saffron/20 border border-saffron/40 flex items-center justify-center">
                                <Sparkles size={16} className="text-saffron animate-pulse" />
                            </div>
                        </div>

                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-saffron/10 border border-saffron/20 mb-6">
                            <span className="text-[10px] font-black text-saffron uppercase tracking-[0.3em]">Access Restricted</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter uppercase leading-none mb-4">
                            Unlock <span className="text-white/20">to</span> Contribute
                        </h1>
                        <p className="text-white/40 text-sm font-medium max-w-lg mb-12">
                            Complete at least <span className="text-white font-bold">5 learning courses</span> or pass <span className="text-white font-bold">5 repo analysis assessments</span> to unlock your contribution profile.
                        </p>

                        {/* Progress Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-12">
                            {/* Learning Courses */}
                            <div className="lovable-card p-8 bg-black/40 border-white/5 text-left">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-saffron/10 border border-saffron/20 flex items-center justify-center">
                                        <BookOpen size={18} className="text-saffron" />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Learning Courses</h3>
                                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-0.5">Complete Roadmaps</p>
                                    </div>
                                </div>
                                <div className="flex items-end justify-between mb-3">
                                    <span className="text-4xl font-black text-white italic">{unlockStatus?.completed_courses || 0}</span>
                                    <span className="text-white/30 text-sm font-black">/5</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${courseProgress}%` }}
                                        transition={{ duration: 1, delay: 0.2 }}
                                        className="h-full bg-saffron rounded-full shadow-[0_0_12px_rgba(255,153,51,0.4)]"
                                    />
                                </div>
                                {unlockStatus?.courses_needed && unlockStatus.courses_needed > 0 ? (
                                    <p className="text-[10px] text-white/30 mt-3 font-bold uppercase tracking-widest">
                                        {unlockStatus.courses_needed} more needed
                                    </p>
                                ) : (
                                    <p className="text-[10px] text-green-400 mt-3 font-bold uppercase tracking-widest flex items-center gap-1">
                                        <Check size={10} /> Requirement met!
                                    </p>
                                )}
                            </div>

                            {/* Repo Assessments */}
                            <div className="lovable-card p-8 bg-black/40 border-white/5 text-left">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                        <GitBranch size={18} className="text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Repo Assessments</h3>
                                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-0.5">Analysis Sessions</p>
                                    </div>
                                </div>
                                <div className="flex items-end justify-between mb-3">
                                    <span className="text-4xl font-black text-white italic">{unlockStatus?.completed_assessments || 0}</span>
                                    <span className="text-white/30 text-sm font-black">/5</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${assessProgress}%` }}
                                        transition={{ duration: 1, delay: 0.3 }}
                                        className="h-full bg-purple-500 rounded-full shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                                    />
                                </div>
                                {unlockStatus?.assessments_needed && unlockStatus.assessments_needed > 0 ? (
                                    <p className="text-[10px] text-white/30 mt-3 font-bold uppercase tracking-widest">
                                        {unlockStatus.assessments_needed} more needed
                                    </p>
                                ) : (
                                    <p className="text-[10px] text-green-400 mt-3 font-bold uppercase tracking-widest flex items-center gap-1">
                                        <Check size={10} /> Requirement met!
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* CTAs */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <a href="/learning/setup" className="flex items-center gap-3 px-8 py-4 bg-saffron text-black font-black text-xs uppercase tracking-widest rounded-full hover:scale-105 transition-transform shadow-lg shadow-saffron/20">
                                <BookOpen size={16} /> Start a Learning Plan
                            </a>
                            <a href="/repo-analysis" className="flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest rounded-full hover:bg-white/10 transition-all">
                                <GitBranch size={16} /> Analyze a Repo
                            </a>
                        </div>
                    </motion.div>
                </div>
            </PageContainer>
        );
    }

    // ─── SUBMITTED SUCCESS ─────────────────────────────────────────────────────
    if (submitted) {
        return (
            <PageContainer>
                <div className="max-w-2xl mx-auto px-4 py-20 flex flex-col items-center text-center">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.6 }}>
                        <div className="w-28 h-28 rounded-3xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-8 shadow-2xl mx-auto">
                            <Trophy size={48} className="text-green-400" />
                        </div>
                    </motion.div>
                    <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-4">Profile Submitted!</h1>
                    <p className="text-white/50 text-sm mb-10">Your contribution profile has been saved. Our team will match you with open-source projects fitting your skills.</p>
                    <a href="/dashboard" className="px-10 py-4 bg-saffron text-black font-black uppercase tracking-widest text-xs rounded-full hover:scale-105 transition-transform">
                        Back to Dashboard
                    </a>
                </div>
            </PageContainer>
        );
    }

    // ─── UNLOCKED FORM ─────────────────────────────────────────────────────────
    const availabilityOptions = ["Weekends", "Evenings", "Part-time", "Full-time"];
    const levelOptions = ["Beginner", "Intermediate", "Advanced", "Expert"];
    const areaOptions = ["Bug Fixes", "New Features", "Documentation", "Testing", "Code Review", "Security", "Performance", "UI/UX", "DevOps", "Mentoring"];

    return (
        <PageContainer>
            <div className="max-w-4xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="mb-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
                        <Unlock size={12} className="text-green-400" />
                        <span className="text-[10px] font-black text-green-400 uppercase tracking-[0.3em]">Contribution Access Unlocked</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter uppercase leading-none mb-4">
                        Your <span className="text-white/20">Impact</span> Profile
                    </h1>
                    <p className="text-white/40 text-sm">Fill in your details — or let AI pre-fill them from your learning activity.</p>
                </div>

                {/* AI Fill Banner */}
                <div className="lovable-card p-6 bg-saffron/5 border-saffron/20 mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-saffron/10 border border-saffron/20 flex items-center justify-center shrink-0">
                            <Sparkles size={20} className="text-saffron" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">AI Auto-Fill</h3>
                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-0.5">
                                {aiFilled ? "Fields pre-filled from your learning data. Review and edit below." : "Let AI analyze your activity and suggest profile values."}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleAIFill}
                        disabled={loadingAI}
                        className="flex items-center gap-2 px-6 py-3 bg-saffron text-black font-black text-[10px] uppercase tracking-widest rounded-full hover:scale-105 transition-transform disabled:opacity-50 shrink-0"
                    >
                        {loadingAI ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                        {loadingAI ? "Analyzing..." : aiFilled ? "Re-Generate" : "Fill with AI"}
                    </button>
                </div>

                <div className="space-y-8">
                    {/* Row 1: GitHub + LinkedIn */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FieldBlock icon={<Code2 size={16} />} label="GitHub Username" required>
                            <input
                                type="text"
                                placeholder="your-github-handle"
                                value={formData.github_username}
                                onChange={e => setFormData(prev => ({ ...prev, github_username: e.target.value }))}
                                className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm font-mono focus:outline-none focus:border-saffron/50 transition-colors"
                            />
                        </FieldBlock>
                        <FieldBlock icon={<Globe size={16} />} label="LinkedIn (optional)">
                            <input
                                type="text"
                                placeholder="linkedin.com/in/yourprofile"
                                value={formData.linkedin}
                                onChange={e => setFormData(prev => ({ ...prev, linkedin: e.target.value }))}
                                className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm font-mono focus:outline-none focus:border-saffron/50 transition-colors"
                            />
                        </FieldBlock>
                    </div>

                    {/* Bio */}
                    <FieldBlock icon={<User size={16} />} label="Professional Bio" aiFilled={aiFilled && !!formData.bio}>
                        <textarea
                            rows={3}
                            placeholder="Tell the community about yourself..."
                            value={formData.bio}
                            onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                            className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-saffron/50 transition-colors resize-none"
                        />
                    </FieldBlock>

                    {/* Skills */}
                    <FieldBlock icon={<Star size={16} />} label="Skills & Technologies" aiFilled={aiFilled && formData.skills.length > 0}>
                        <div className="flex gap-3 mb-3">
                            <input
                                type="text"
                                placeholder="Add a skill (e.g. React, Python)..."
                                value={skillInput}
                                onChange={e => setSkillInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && addSkill()}
                                className="flex-1 bg-black/60 border border-white/10 rounded-2xl px-6 py-3 text-white text-sm focus:outline-none focus:border-saffron/50 transition-colors"
                            />
                            <button onClick={addSkill} className="px-5 py-3 bg-saffron/10 border border-saffron/30 text-saffron rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-saffron hover:text-black transition-all">
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.skills.map(skill => (
                                <span key={skill} className="flex items-center gap-2 px-4 py-2 bg-saffron/10 border border-saffron/30 text-saffron rounded-full text-[10px] font-black uppercase tracking-widest">
                                    {skill}
                                    <button onClick={() => removeSkill(skill)} className="hover:text-white transition-colors">×</button>
                                </span>
                            ))}
                            {formData.skills.length === 0 && (
                                <span className="text-[10px] text-white/20 italic">No skills added yet.</span>
                            )}
                        </div>
                    </FieldBlock>

                    {/* Row: Language + Experience Level */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FieldBlock icon={<Code2 size={16} />} label="Preferred Language" aiFilled={aiFilled && !!formData.preferred_language}>
                            <input
                                type="text"
                                placeholder="e.g. Python, TypeScript..."
                                value={formData.preferred_language}
                                onChange={e => setFormData(prev => ({ ...prev, preferred_language: e.target.value }))}
                                className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-saffron/50 transition-colors"
                            />
                        </FieldBlock>
                        <FieldBlock icon={<Target size={16} />} label="Experience Level" aiFilled={aiFilled && !!formData.experience_level}>
                            <div className="flex gap-2 flex-wrap">
                                {levelOptions.map(lvl => (
                                    <button key={lvl} onClick={() => setFormData(prev => ({ ...prev, experience_level: lvl }))}
                                        className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${formData.experience_level === lvl ? "bg-white text-black border-white" : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"}`}>
                                        {lvl}
                                    </button>
                                ))}
                            </div>
                        </FieldBlock>
                    </div>

                    {/* Availability */}
                    <FieldBlock icon={<Clock size={16} />} label="Availability" aiFilled={aiFilled && !!formData.availability}>
                        <div className="flex gap-3 flex-wrap">
                            {availabilityOptions.map(opt => (
                                <button key={opt} onClick={() => setFormData(prev => ({ ...prev, availability: opt }))}
                                    className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${formData.availability === opt ? "bg-saffron text-black border-saffron shadow-lg shadow-saffron/20" : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"}`}>
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </FieldBlock>

                    {/* Contribution Areas */}
                    <FieldBlock icon={<GitBranch size={16} />} label="Contribution Areas" aiFilled={aiFilled && formData.contribution_areas.length > 0}>
                        <div className="flex flex-wrap gap-2">
                            {areaOptions.map(area => {
                                const active = formData.contribution_areas.includes(area);
                                return (
                                    <button key={area} onClick={() => toggleArea(area)}
                                        className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${active ? "bg-purple-500/20 border-purple-500 text-purple-300" : "bg-white/[0.03] border-white/5 text-white/30 hover:bg-white/10"}`}>
                                        {active && <Check size={8} className="inline mr-1" />}{area}
                                    </button>
                                );
                            })}
                        </div>
                    </FieldBlock>

                    {/* Goals */}
                    <FieldBlock icon={<Globe size={16} />} label="Open Source Goals" aiFilled={aiFilled && !!formData.open_source_goals}>
                        <textarea
                            rows={2}
                            placeholder="What do you want to contribute to and why?"
                            value={formData.open_source_goals}
                            onChange={e => setFormData(prev => ({ ...prev, open_source_goals: e.target.value }))}
                            className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-saffron/50 transition-colors resize-none"
                        />
                    </FieldBlock>

                    {/* Motivation */}
                    <FieldBlock icon={<Sparkles size={16} />} label="Motivation" aiFilled={aiFilled && !!formData.motivation}>
                        <textarea
                            rows={2}
                            placeholder="Why do you want to contribute to open-source?"
                            value={formData.motivation}
                            onChange={e => setFormData(prev => ({ ...prev, motivation: e.target.value }))}
                            className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-saffron/50 transition-colors resize-none"
                        />
                    </FieldBlock>

                    {/* Submit */}
                    <div className="pt-8 border-t border-white/5 flex justify-end">
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex items-center gap-3 px-14 py-5 bg-saffron text-black font-black text-sm uppercase tracking-widest rounded-full hover:scale-105 transition-all shadow-lg shadow-saffron/20 disabled:opacity-50"
                        >
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            {submitting ? "Submitting..." : "Submit Profile"}
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── PERSONALIZED REPO FEED ─────────────────────────── */}
            <div className="mt-16 max-w-4xl mx-auto px-4 pb-20">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-3">
                            <TrendingUp size={12} className="text-purple-400" />
                            <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em]">Personalized Repo Feed</span>
                        </div>
                        <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">
                            Recommended <span className="text-white/20">for You</span>
                        </h2>
                        <p className="text-white/30 text-xs mt-1">AI-matched open-source repos based on your learning journey</p>
                    </div>
                    <button
                        onClick={fetchRepoFeed}
                        disabled={loadingFeed}
                        className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white/50 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-40"
                    >
                        <RefreshCw size={12} className={loadingFeed ? "animate-spin" : ""} />
                        {loadingFeed ? "Generating..." : "Refresh Feed"}
                    </button>
                </div>

                {loadingFeed && (
                    <div className="space-y-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-48 bg-white/[0.02] rounded-3xl animate-pulse border border-white/5" />
                        ))}
                    </div>
                )}

                {!loadingFeed && repoFeed && repoFeed.repos.length > 0 && (
                    <div className="space-y-6">
                        {repoFeed.repos.map((repo, idx) => (
                            <RepoCard
                                key={repo.name}
                                repo={repo}
                                index={idx}
                                expanded={expandedRepo === repo.name}
                                onToggle={() => setExpandedRepo(expandedRepo === repo.name ? null : repo.name)}
                            />
                        ))}
                    </div>
                )}

                {!loadingFeed && (!repoFeed || repoFeed.repos.length === 0) && (
                    <div className="text-center py-20 lovable-card border-white/5 bg-black/20">
                        <TrendingUp size={32} className="text-white/10 mx-auto mb-4" />
                        <p className="text-white/30 text-xs uppercase tracking-widest font-black">No feed generated yet</p>
                        <p className="text-white/20 text-[10px] mt-1">Click Refresh Feed to generate personalized recommendations</p>
                    </div>
                )}
            </div>
        </PageContainer>
    );
}

// ─── Field Block Component ─────────────────────────────────────────────────────
function FieldBlock({ icon, label, required, aiFilled, children }: {
    icon: React.ReactNode;
    label: string;
    required?: boolean;
    aiFilled?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="lovable-card p-6 bg-black/30 border-white/5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/40">
                        {icon}
                    </div>
                    <span className="text-xs font-black text-white uppercase tracking-widest">
                        {label} {required && <span className="text-saffron">*</span>}
                    </span>
                </div>
                {aiFilled && (
                    <span className="flex items-center gap-1 text-[9px] font-black text-saffron uppercase tracking-widest px-3 py-1 bg-saffron/10 border border-saffron/20 rounded-full">
                        <Zap size={8} /> AI Filled
                    </span>
                )}
            </div>
            {children}
        </div>
    );
}

// ─── Repo Card Component ────────────────────────────────────────────────────────
function RepoCard({ repo, index, expanded, onToggle }: {
    repo: RepoRec;
    index: number;
    expanded: boolean;
    onToggle: () => void;
}) {
    const difficultyColors = {
        Beginner: "text-green-400 bg-green-400/10 border-green-400/20",
        Intermediate: "text-saffron bg-saffron/10 border-saffron/20",
        Advanced: "text-red-400 bg-red-400/10 border-red-400/20",
    };

    const gapColors: Record<string, string> = {
        None: "text-green-400 bg-green-400/10",
        Small: "text-saffron bg-saffron/10",
        Medium: "text-orange-400 bg-orange-400/10",
        Large: "text-red-400 bg-red-400/10",
    };

    const scoreColor = repo.matching_score >= 85 ? "text-green-400" : repo.matching_score >= 70 ? "text-saffron" : "text-orange-400";

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className="lovable-card bg-black/30 border-white/5 overflow-hidden"
        >
            {/* Header row */}
            <button className="w-full p-6 text-left" onClick={onToggle}>
                <div className="flex items-start gap-5">
                    {/* Match score ring */}
                    <div className="shrink-0 flex flex-col items-center gap-1">
                        <div className={`text-2xl font-black italic ${scoreColor}`}>{repo.matching_score}%</div>
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">match</span>
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="text-base font-black text-white tracking-tight">{repo.display_name}</h3>
                            <span className={`px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${difficultyColors[repo.difficulty]}`}>
                                {repo.difficulty}
                            </span>
                            <span className="px-3 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-white/5 text-white/40 border border-white/5">
                                {repo.language}
                            </span>
                        </div>
                        <p className="text-white/40 text-xs mb-3 line-clamp-2">{repo.description}</p>

                        {/* Tags row */}
                        <div className="flex flex-wrap gap-1.5">
                            {repo.tags?.map(tag => (
                                <span key={tag} className="text-[9px] font-bold text-purple-400/70 bg-purple-400/10 border border-purple-400/10 px-2 py-0.5 rounded-full">{tag}</span>
                            ))}
                        </div>
                    </div>

                    {/* Stars / Forks */}
                    <div className="shrink-0 flex flex-col items-end gap-1 text-right">
                        <span className="text-xs font-black text-white/30 flex items-center gap-1"><Star size={10} /> {repo.stars}</span>
                        <span className="text-xs font-black text-white/20 flex items-center gap-1"><GitBranch size={10} /> {repo.forks}</span>
                        <span className="text-[9px] text-white/15 mt-2 flex items-center gap-1"><Clock size={9} /> {repo.estimated_effort}</span>
                    </div>
                </div>
            </button>

            {/* Expanded details */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden border-t border-white/5"
                    >
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Why Recommended */}
                            <div className="lovable-card p-5 bg-purple-500/5 border-purple-500/15 md:col-span-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles size={12} className="text-purple-400" />
                                    <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Why This Repo Is Recommended</span>
                                </div>
                                <p className="text-white/60 text-sm">{repo.match_reason}</p>
                            </div>

                            {/* Contribution Areas */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Layers size={12} className="text-saffron" />
                                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Suggested Contribution Areas</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {repo.contribution_areas?.map(area => (
                                        <span key={area} className="px-3 py-1 bg-saffron/10 border border-saffron/20 text-saffron text-[9px] font-black uppercase tracking-widest rounded-full">{area}</span>
                                    ))}
                                </div>
                            </div>

                            {/* Estimated Effort */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Clock size={12} className="text-blue-400" />
                                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Estimated Effort</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="px-5 py-2 bg-blue-400/10 border border-blue-400/20 text-blue-300 text-sm font-black rounded-2xl">{repo.estimated_effort}</span>
                                    <a href={`https://github.com/${repo.name}`} target="_blank" rel="noopener noreferrer"
                                       className="flex items-center gap-1 text-[9px] text-white/30 hover:text-white transition-colors font-black uppercase tracking-widest">
                                        <ExternalLink size={11} /> View on GitHub
                                    </a>
                                </div>
                            </div>

                            {/* Beginner Issues */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Bug size={12} className="text-green-400" />
                                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Beginner-Friendly Issues</span>
                                </div>
                                <div className="space-y-2">
                                    {repo.beginner_issues?.length > 0 ? repo.beginner_issues.map((issue, i) => (
                                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                            <span className={`mt-0.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shrink-0 ${issue.effort === "Easy" ? "bg-green-400/10 text-green-400" : "bg-saffron/10 text-saffron"}`}>
                                                {issue.effort}
                                            </span>
                                            <div>
                                                <p className="text-white/70 text-xs font-medium">{issue.title}</p>
                                                <p className="text-[9px] text-white/25 font-bold mt-0.5">{issue.label}</p>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="text-white/20 text-[10px] italic">No beginner issues listed</p>
                                    )}
                                </div>
                            </div>

                            {/* Skill Gap Mapping */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <TrendingUp size={12} className="text-orange-400" />
                                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Skill Gap Mapping</span>
                                </div>
                                <div className="space-y-2">
                                    {repo.skill_gap_mapping?.length > 0 ? repo.skill_gap_mapping.map((gap, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                            <div>
                                                <p className="text-white/60 text-xs font-bold">{gap.skill}</p>
                                                <p className="text-[9px] text-white/25">You: {gap.user_level} → Needed: {gap.required_level}</p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${gapColors[gap.gap] || "text-white/30 bg-white/5"}`}>
                                                {gap.gap === "None" ? "✓ Ready" : `Gap: ${gap.gap}`}
                                            </span>
                                        </div>
                                    )) : (
                                        <p className="text-white/20 text-[10px] italic">No skill gaps identified</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

