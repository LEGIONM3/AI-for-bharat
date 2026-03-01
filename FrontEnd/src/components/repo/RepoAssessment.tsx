"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Target, BookOpen, CheckCircle2, XCircle, ChevronRight, Loader2,
    AlertTriangle, RotateCcw, LayoutDashboard, Sparkles, ArrowRight,
    Trophy, TrendingUp, Brain, Mic, MicOff, Volume2, Lock,
    MessageSquare, Headphones,
} from "lucide-react";
import useAssessment from "@/hooks/useAssessment";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { assessmentVoiceService } from "@/services/assessmentVoiceService";

// ─── Types ────────────────────────────────────────────────────────────────────

type AssessmentMode = "text" | "voice";

type Props = {
    repoId?: string | null;
    repoName?: string;
    techStack?: string[];
    onBackToOverview?: () => void;
    // Legacy props — ignored but kept so existing callers don't break
    questions?: any[];
    skipTopic?: boolean;
    initialTopic?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NUM_OPTIONS = [3, 5, 10] as const;

function scoreColor(pct: number) {
    if (pct >= 80) return "text-green-400";
    if (pct >= 60) return "text-yellow-400";
    return "text-red-400";
}

function scoreBg(pct: number) {
    if (pct >= 80) return "bg-green-400/10 border-green-400/30";
    if (pct >= 60) return "bg-yellow-400/10 border-yellow-400/30";
    return "bg-red-400/10 border-red-400/30";
}

function optionLetter(opt: string) {
    return opt.charAt(0);
}

function fmtDuration(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

// ─── VoiceAnswerButton ─────────────────────────────────────────────────────────

interface VoiceAnswerButtonProps {
    assessmentId: string;
    questionId: string;
    onAnswerComplete: (transcript: string) => void;
    onCancelAutoPlay?: () => void;
}

function VoiceAnswerButton({
    assessmentId,
    questionId,
    onAnswerComplete,
    onCancelAutoPlay,
}: VoiceAnswerButtonProps) {
    const { state, duration, error, startRecording, stopRecording } =
        useVoiceRecorder();
    const [transcript, setTranscript] = useState<string | null>(null);
    const [isLocked, setIsLocked] = useState(false);
    const [processingMsg, setProcessingMsg] = useState("");

    const handleClick = async () => {
        if (isLocked || state === "processing") return;

        if (state === "idle" || state === "error") {
            // FIRST CLICK — cancel auto-play, start recording
            onCancelAutoPlay?.();
            await startRecording();
        } else if (state === "recording") {
            // SECOND CLICK — lock immediately, stop + transcribe + submit
            setIsLocked(true);
            try {
                const blob = await stopRecording();
                setProcessingMsg("Transcribing your answer…");
                const text = await assessmentVoiceService.transcribeAnswer(
                    blob,
                    assessmentId,
                    questionId
                );
                setTranscript(text || "[No speech detected]");
                onAnswerComplete(text || "[No speech detected]");
            } catch {
                const fallback = "[Voice transcription failed]";
                setTranscript(fallback);
                onAnswerComplete(fallback);
            } finally {
                setProcessingMsg("");
            }
        }
    };

    // Locked + transcript = done state display
    if (isLocked && transcript) {
        return (
            <div className="rounded-2xl border border-white/10 p-5 bg-white/5 space-y-2">
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Lock size={10} /> Answer Locked — We Heard:
                </p>
                <p className="text-white text-sm italic leading-relaxed">
                    &ldquo;{transcript}&rdquo;
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-3 w-full">
            <button
                id={`voice-btn-${questionId}`}
                onClick={handleClick}
                disabled={isLocked || (state === "processing")}
                className={`
                    w-full py-5 rounded-2xl font-black tracking-wider uppercase text-sm
                    transition-all duration-200 flex items-center justify-center gap-3
                    ${state === "recording"
                        ? "bg-red-500 hover:bg-red-600 text-white shadow-xl shadow-red-500/30 animate-pulse"
                        : state === "processing" || processingMsg
                            ? "bg-white/10 text-white/40 cursor-wait"
                            : isLocked
                                ? "bg-white/5 text-white/20 cursor-not-allowed"
                                : "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20"
                    }
                `}
            >
                {state === "idle" && !isLocked && (
                    <><Mic size={16} /> CLICK TO ANSWER</>
                )}
                {state === "recording" && (
                    <>
                        <span className="w-3 h-3 rounded-full bg-white" />
                        REC {fmtDuration(duration)} — CLICK TO STOP &amp; SUBMIT
                    </>
                )}
                {(state === "processing" || processingMsg) && (
                    <><Loader2 size={16} className="animate-spin" /> {processingMsg || "PROCESSING…"}</>
                )}
                {isLocked && !processingMsg && (
                    <><Lock size={14} /> ANSWER SUBMITTED</>
                )}
            </button>

            {error && (
                <p className="text-red-400 text-xs text-center font-bold">
                    <AlertTriangle size={12} className="inline mr-1" />{error}
                </p>
            )}

            {state === "idle" && !isLocked && (
                <p className="text-white/25 text-[10px] text-center font-bold uppercase tracking-widest">
                    ⚠ Click once to start · Click again to stop and submit · No retakes
                </p>
            )}
        </div>
    );
}

// ─── QuestionAudioPlayer ───────────────────────────────────────────────────────

interface QuestionAudioPlayerProps {
    assessmentId: string;
    questionId: string;
    questionText: string;
    autoPlayDelay?: number; // ms, default 5000
    onCountdownCancel?: () => void;
    cancelRef: React.MutableRefObject<(() => void) | null>;
}

function QuestionAudioPlayer({
    assessmentId,
    questionId,
    questionText,
    autoPlayDelay = 5000,
    cancelRef,
}: QuestionAudioPlayerProps) {
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [countdown, setCountdown] = useState(autoPlayDelay / 1000);
    const [cancelled, setCancelled] = useState(false);
    const [fetchError, setFetchError] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const cdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const autoPlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const cancel = useCallback(() => {
        if (cdIntervalRef.current) clearInterval(cdIntervalRef.current);
        if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
        setCancelled(true);
    }, []);

    // Expose cancel via ref so VoiceAnswerButton can call it
    useEffect(() => {
        cancelRef.current = cancel;
    }, [cancel, cancelRef]);

    const playAudio = useCallback(
        (url?: string) => {
            cancel();
            const src = url ?? audioUrl;
            if (!src) return;
            const audio = new Audio(src);
            audioRef.current = audio;
            audio.onplay = () => setIsPlaying(true);
            audio.onended = () => setIsPlaying(false);
            audio.onerror = () => setIsPlaying(false);
            audio.play().catch(() => setIsPlaying(false));
        },
        [audioUrl, cancel]
    );

    useEffect(() => {
        let mounted = true;
        setAudioUrl(null);
        setFetchError(false);
        setCancelled(false);
        setCountdown(autoPlayDelay / 1000);

        const fetch = async () => {
            setIsLoading(true);
            try {
                const url = await assessmentVoiceService.getQuestionAudio(
                    assessmentId,
                    questionId,
                    questionText
                );
                if (!mounted) return;
                setAudioUrl(url);

                // Start countdown
                let count = autoPlayDelay / 1000;
                cdIntervalRef.current = setInterval(() => {
                    count -= 1;
                    if (mounted) setCountdown(count);
                    if (count <= 0 && cdIntervalRef.current) {
                        clearInterval(cdIntervalRef.current);
                    }
                }, 1000);

                autoPlayTimeoutRef.current = setTimeout(() => {
                    if (mounted && !cancelled) playAudio(url);
                }, autoPlayDelay);
            } catch {
                if (mounted) setFetchError(true);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        fetch();

        return () => {
            mounted = false;
            if (cdIntervalRef.current) clearInterval(cdIntervalRef.current);
            if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
            audioRef.current?.pause();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [questionId]);

    if (fetchError) {
        return (
            <div className="flex items-center gap-2 text-white/30 text-xs">
                <AlertTriangle size={12} className="text-yellow-500/50" />
                <span>Audio unavailable — read the question above.</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <button
                onClick={() => playAudio()}
                disabled={isLoading || !audioUrl}
                title="Play question audio"
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${isPlaying
                    ? "bg-saffron/20 border-saffron/50 border text-saffron animate-pulse"
                    : isLoading
                        ? "bg-white/5 border border-white/10 text-white/20"
                        : "bg-saffron/10 border border-saffron/30 text-saffron hover:bg-saffron/20"
                    }`}
            >
                {isLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                ) : (
                    <Volume2 size={14} />
                )}
            </button>

            <div className="flex-1 min-w-0">
                {isLoading ? (
                    <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
                        Generating audio…
                    </p>
                ) : !cancelled && countdown > 0 ? (
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                        Auto-playing in{" "}
                        <span className="text-saffron font-black">{countdown}s</span>
                        {"  ·  "}
                        <button
                            onClick={cancel}
                            className="underline text-white/30 hover:text-white transition-colors"
                        >
                            cancel
                        </button>
                    </p>
                ) : isPlaying ? (
                    <p className="text-saffron text-[10px] font-black uppercase tracking-widest animate-pulse">
                        ▶ Playing…
                    </p>
                ) : (
                    <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
                        Click 🔊 to replay the question
                    </p>
                )}
            </div>
        </div>
    );
}

// ─── Mode Selection Screen ────────────────────────────────────────────────────

function ModeSelectionScreen({
    onSelect,
}: {
    onSelect: (mode: AssessmentMode) => void;
}) {
    return (
        <motion.div
            key="mode-select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl mx-auto"
        >
            <div className="lovable-card p-12 md:p-16 bg-black/40 border-white/5 rounded-[48px] text-center">
                <div className="w-16 h-16 rounded-[20px] bg-saffron/10 border border-saffron/20 flex items-center justify-center mx-auto mb-8">
                    <Brain className="text-saffron" size={28} />
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">
                    How Do You Want to Answer?
                </h2>
                <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.3em] mb-12">
                    This applies to all questions in this assessment
                </p>

                <div className="grid grid-cols-2 gap-6">
                    {/* Text mode */}
                    <button
                        id="mode-text"
                        onClick={() => onSelect("text")}
                        className="group flex flex-col items-center gap-5 p-8 rounded-[28px] border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/30 transition-all"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <MessageSquare size={24} className="text-blue-400" />
                        </div>
                        <div className="text-center">
                            <p className="text-white font-black text-sm uppercase tracking-widest mb-2">
                                💬 Text Based
                            </p>
                            <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                                Type your answers using keyboard
                            </p>
                        </div>
                    </button>

                    {/* Voice mode */}
                    <button
                        id="mode-voice"
                        onClick={() => onSelect("voice")}
                        className="group flex flex-col items-center gap-5 p-8 rounded-[28px] border border-saffron/20 bg-saffron/5 hover:bg-saffron/10 hover:border-saffron/40 transition-all"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-saffron/10 border border-saffron/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Headphones size={24} className="text-saffron" />
                        </div>
                        <div className="text-center">
                            <p className="text-white font-black text-sm uppercase tracking-widest mb-2">
                                🎤 Voice Based
                            </p>
                            <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                                Speak your answers aloud — AI listens
                            </p>
                        </div>
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RepoAssessment({
    repoId,
    repoName,
    techStack = [],
    onBackToOverview,
}: Props) {
    const ass = useAssessment();

    const defaultTopic = techStack[0] || "";
    const [selectedTopic, setSelectedTopic] = useState(defaultTopic || ass.topic || "");
    const [numQuestions, setNumQuestions] = useState<3 | 5 | 10>(5);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);

    // Voice mode state
    const [assessmentMode, setAssessmentMode] = useState<AssessmentMode | null>(null);
    const [showModeSelect, setShowModeSelect] = useState(false);
    const cancelAutoPlayRef = useRef<(() => void) | null>(null);

    // Cleanup voice audio when assessment finishes
    const handleCleanupAndFetch = useCallback(
        async (assessmentId: string) => {
            if (assessmentMode === "voice") {
                assessmentVoiceService.cleanupAudio(assessmentId); // fire and forget
            }
            ass.fetchResults(assessmentId);
        },
        [assessmentMode, ass]
    );

    // ── No repo loaded ──────────────────────────────────────────────────────
    if (!repoId) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-[500px] w-full flex flex-col items-center justify-center p-20 bg-white/[0.03] border border-white/10 rounded-[40px] border-dashed text-center"
            >
                <div className="w-24 h-24 rounded-[32px] bg-white/5 text-white/10 flex items-center justify-center mb-10">
                    <Target size={36} />
                </div>
                <h2 className="text-4xl font-extrabold italic text-white/20 mb-6 uppercase tracking-tighter">
                    Target Identification Required
                </h2>
                <p className="text-white/10 text-lg max-w-lg mb-10 font-medium leading-relaxed">
                    Please synchronize a repository in the Overview tab to begin your assessment.
                </p>
                {onBackToOverview && (
                    <button
                        onClick={onBackToOverview}
                        className="flex items-center gap-3 px-8 py-3 rounded-full bg-saffron/10 border border-saffron/30 text-[11px] font-black text-saffron uppercase tracking-widest hover:bg-saffron hover:text-white transition-all"
                    >
                        <LayoutDashboard size={14} /> Go to Overview
                    </button>
                )}
            </motion.div>
        );
    }

    // ── SCREEN 1 — SETUP ───────────────────────────────────────────────────
    if (ass.screen === "setup" && !showModeSelect) {
        const topicOptions = [
            ...(techStack.length > 0 ? techStack : []),
            "General Programming",
        ].filter((v, i, a) => a.indexOf(v) === i);

        return (
            <motion.div
                key="screen-ready"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-3xl mx-auto"
            >
                <div className="lovable-card p-10 md:p-16 bg-black/40 border-white/5 rounded-[48px] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 pr-16 opacity-[0.025] pointer-events-none">
                        <BookOpen size={200} />
                    </div>

                    <div className="flex items-center gap-5 mb-10 relative z-10">
                        <div className="w-14 h-14 rounded-[18px] bg-saffron/10 border border-saffron/20 flex items-center justify-center shrink-0">
                            <Target className="text-saffron" size={26} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-widest leading-none">
                                Repository Assessment
                            </h2>
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] mt-2">
                                AI-generated questions from repo intelligence
                            </p>
                        </div>
                    </div>

                    {/* Repo + tech-stack badge */}
                    <div className="mb-10 p-6 bg-white/[0.03] border border-white/5 rounded-3xl relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                            <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">
                                Active Repository Synchronized
                            </span>
                        </div>
                        <p className="text-lg font-black text-white uppercase tracking-tight mb-4">
                            {repoName || "Repository"}
                        </p>
                        {techStack.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {techStack.map((tech, i) => (
                                    <span
                                        key={i}
                                        className="px-4 py-1.5 rounded-full bg-saffron/10 border border-saffron/20 text-[10px] font-bold text-saffron uppercase tracking-widest"
                                    >
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Topic select */}
                    <div className="mb-8 relative z-10">
                        <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-3">
                            Topic to Assess
                        </label>
                        {topicOptions.length > 0 ? (
                            <select
                                value={selectedTopic}
                                onChange={(e) => setSelectedTopic(e.target.value)}
                                className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-6 py-4 text-white text-sm font-bold focus:outline-none focus:border-saffron/50 transition-all appearance-none cursor-pointer"
                            >
                                {topicOptions.map((t, i) => (
                                    <option key={i} value={t} className="bg-[#0d0f11]">
                                        {t}
                                    </option>
                                ))}
                                <option value="__custom__" className="bg-[#0d0f11]">
                                    ✏️ Enter custom topic...
                                </option>
                            </select>
                        ) : (
                            <input
                                type="text"
                                placeholder="e.g. Java, Python, React..."
                                value={selectedTopic}
                                onChange={(e) => setSelectedTopic(e.target.value)}
                                className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-6 py-4 text-white text-sm font-bold placeholder:text-white/20 focus:outline-none focus:border-saffron/50 transition-all"
                            />
                        )}
                        {selectedTopic === "__custom__" && (
                            <input
                                type="text"
                                placeholder="Enter topic..."
                                className="w-full mt-3 bg-white/[0.04] border border-white/10 rounded-2xl px-6 py-4 text-white text-sm font-bold placeholder:text-white/20 focus:outline-none focus:border-saffron/50 transition-all"
                                onChange={(e) => setSelectedTopic(e.target.value || "__custom__")}
                            />
                        )}
                    </div>

                    {/* Num questions */}
                    <div className="mb-10 relative z-10">
                        <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-3">
                            Number of Questions
                        </label>
                        <div className="flex gap-3">
                            {NUM_OPTIONS.map((n) => (
                                <button
                                    key={n}
                                    onClick={() => setNumQuestions(n)}
                                    className={`flex-1 py-3 rounded-2xl text-sm font-black uppercase tracking-widest border transition-all ${numQuestions === n
                                        ? "bg-saffron text-white border-saffron shadow-lg shadow-saffron/30"
                                        : "bg-white/[0.03] text-white/40 border-white/10 hover:border-white/30 hover:text-white"
                                        }`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>

                    {ass.error && (
                        <div className="mb-6 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl relative z-10">
                            <AlertTriangle size={16} className="text-red-400 shrink-0" />
                            <p className="text-sm text-red-300">{ass.error}</p>
                        </div>
                    )}

                    <div className="border-t border-white/5 pt-8 relative z-10">
                        <p className="text-center text-[11px] font-bold text-white/30 uppercase tracking-[0.3em] mb-8">
                            Are you ready to begin your repository assessment?
                        </p>
                        <div className="flex gap-4">
                            {onBackToOverview && (
                                <button
                                    onClick={onBackToOverview}
                                    className="flex-1 py-4 rounded-2xl border border-white/10 text-[11px] font-black text-white/30 uppercase tracking-widest hover:text-white hover:border-white/30 transition-all"
                                >
                                    Not Now
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    const topic =
                                        selectedTopic === "__custom__" ? "" : selectedTopic;
                                    if (!topic) return;
                                    // Show mode selection FIRST
                                    setShowModeSelect(true);
                                }}
                                disabled={
                                    ass.isLoading ||
                                    !selectedTopic ||
                                    selectedTopic === "__custom__"
                                }
                                className="flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl bg-saffron text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-saffron/30 hover:shadow-saffron/50 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
                            >
                                {ass.isLoading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Generating AI Questions...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={16} />
                                        I&apos;m Ready — Begin
                                        <ChevronRight size={16} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    // ── MODE SELECTION (before generating questions) ─────
    if (showModeSelect && ass.screen === "setup" && assessmentMode === null) {
        return (
            <AnimatePresence mode="wait">
                <ModeSelectionScreen
                    onSelect={(mode) => {
                        const topic = selectedTopic === "__custom__" ? "" : selectedTopic;
                        setAssessmentMode(mode);
                        setShowModeSelect(false);
                        ass.startAssessment(topic || "General Programming", numQuestions, mode);
                    }}
                />
            </AnimatePresence>
        );
    }

    // ── SCREEN 2 — ACTIVE QUIZ ─────────────────────────────────────────────
    if (ass.screen === "active" && ass.questions.length > 0 && assessmentMode !== null) {
        const q = ass.questions[ass.currentQuestionIndex];
        const isLast = ass.currentQuestionIndex >= ass.questions.length - 1;
        const progress = Math.round(
            (ass.currentQuestionIndex / ass.questions.length) * 100
        );
        const hasFeedback = !!ass.currentFeedback;
        const isVoice = assessmentMode === "voice";

        return (
            <motion.div
                key="screen-active"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                className="max-w-3xl mx-auto"
            >
                <div className="lovable-card p-10 md:p-14 bg-black/40 border-white/5 rounded-[48px] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 pr-16 opacity-[0.025] pointer-events-none">
                        <Brain size={200} />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
                                Assessment In Progress
                            </p>
                            <p className="text-sm font-black text-white mt-1 uppercase tracking-widest">
                                Question {ass.currentQuestionIndex + 1} of {ass.questions.length}
                                {q.topic && <span className="text-saffron"> · {q.topic}</span>}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Mode indicator */}
                            <span
                                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${isVoice
                                    ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                                    : "bg-blue-500/10 border-blue-500/30 text-blue-400"
                                    }`}
                            >
                                {isVoice ? "🎤 Voice" : "💬 Text"}
                            </span>
                            {q.difficulty && (
                                <span
                                    className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${q.difficulty === "easy"
                                        ? "bg-green-400/10 border-green-400/30 text-green-400"
                                        : q.difficulty === "hard"
                                            ? "bg-red-400/10 border-red-400/30 text-red-400"
                                            : "bg-saffron/10 border-saffron/30 text-saffron"
                                        }`}
                                >
                                    {q.difficulty}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-white/10 rounded-full mb-10 relative z-10 overflow-hidden">
                        <motion.div
                            className="h-full bg-saffron rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={q.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="relative z-10"
                        >
                            {/* Question text */}
                            <div className="mb-8 p-7 bg-white/[0.03] border-l-4 border-saffron rounded-r-3xl">
                                <p className="text-xl font-extrabold text-white italic leading-relaxed tracking-tight">
                                    &quot;{q.question}&quot;
                                </p>
                            </div>

                            {/* Voice mode — audio player + voice button */}
                            {isVoice && !hasFeedback && (
                                <div className="space-y-4 mb-8">
                                    <QuestionAudioPlayer
                                        assessmentId={ass.assessmentId!}
                                        questionId={q.id}
                                        questionText={q.question}
                                        autoPlayDelay={5000}
                                        cancelRef={cancelAutoPlayRef}
                                    />
                                    <VoiceAnswerButton
                                        assessmentId={ass.assessmentId!}
                                        questionId={q.id}
                                        onCancelAutoPlay={() =>
                                            cancelAutoPlayRef.current?.()
                                        }
                                        onAnswerComplete={(transcript) => {
                                            ass.submitAnswer(q.id, transcript);
                                        }}
                                    />
                                </div>
                            )}

                            {/* Text mode — options */}
                            {!isVoice && (
                                <div className="space-y-3 mb-8">
                                    {(q.options || []).map((opt: string, i: number) => {
                                        const letter = optionLetter(opt);
                                        const isSelected = selectedOption === opt;
                                        const feedbackCorrect =
                                            ass.currentFeedback?.is_correct;
                                        const correctLetter = ass.currentFeedback
                                            ? q.correct_answer || ""
                                            : null;
                                        const isCorrectOpt =
                                            correctLetter && letter === correctLetter;

                                        let optStyle =
                                            "bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.07] hover:border-white/30 hover:text-white cursor-pointer";

                                        if (!hasFeedback && isSelected) {
                                            optStyle =
                                                "bg-saffron/20 border-saffron text-white cursor-pointer";
                                        } else if (hasFeedback) {
                                            if (isCorrectOpt) {
                                                optStyle =
                                                    "bg-green-400/20 border-green-400 text-green-300 cursor-default";
                                            } else if (isSelected && !feedbackCorrect) {
                                                optStyle =
                                                    "bg-red-400/20 border-red-400 text-red-300 cursor-default";
                                            } else {
                                                optStyle =
                                                    "bg-white/[0.02] border-white/5 text-white/30 cursor-default";
                                            }
                                        }

                                        return (
                                            <button
                                                key={i}
                                                disabled={hasFeedback || ass.isSubmittingAnswer}
                                                onClick={() => setSelectedOption(opt)}
                                                className={`w-full text-left px-6 py-4 rounded-2xl border transition-all duration-200 text-sm font-bold flex items-center gap-4 ${optStyle}`}
                                            >
                                                <span className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[11px] font-black shrink-0">
                                                    {letter}
                                                </span>
                                                <span>{opt.slice(2).trim()}</span>
                                                {hasFeedback && isCorrectOpt && (
                                                    <CheckCircle2
                                                        size={16}
                                                        className="ml-auto text-green-400 shrink-0"
                                                    />
                                                )}
                                                {hasFeedback &&
                                                    isSelected &&
                                                    !feedbackCorrect && (
                                                        <XCircle
                                                            size={16}
                                                            className="ml-auto text-red-400 shrink-0"
                                                        />
                                                    )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Feedback panel */}
                            <AnimatePresence>
                                {hasFeedback && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 8 }}
                                        className={`mb-6 p-5 rounded-2xl border ${ass.currentFeedback!.is_correct
                                            ? "bg-green-400/10 border-green-400/30"
                                            : ass.currentFeedback!.score === 5
                                                ? "bg-yellow-400/10 border-yellow-400/30"
                                                : "bg-red-400/10 border-red-400/30"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            {ass.currentFeedback!.is_correct ? (
                                                <CheckCircle2
                                                    size={16}
                                                    className="text-green-400 shrink-0"
                                                />
                                            ) : (
                                                <XCircle
                                                    size={16}
                                                    className={
                                                        ass.currentFeedback!.score === 5
                                                            ? "text-yellow-400 shrink-0"
                                                            : "text-red-400 shrink-0"
                                                    }
                                                />
                                            )}
                                            <span
                                                className={`text-xs font-black uppercase tracking-widest ${ass.currentFeedback!.is_correct
                                                    ? "text-green-400"
                                                    : ass.currentFeedback!.score === 5
                                                        ? "text-yellow-400"
                                                        : "text-red-400"
                                                    }`}
                                            >
                                                {ass.currentFeedback!.is_correct
                                                    ? "Correct!"
                                                    : ass.currentFeedback!.score === 5
                                                        ? "Partially Correct"
                                                        : "Incorrect"}
                                                {" · "}
                                                {ass.currentFeedback!.score ?? 0} pts
                                            </span>
                                        </div>
                                        <p className="text-sm text-white/70 leading-relaxed">
                                            {ass.currentFeedback!.detailed_feedback ||
                                                ass.currentFeedback!.feedback}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {ass.error && !hasFeedback && (
                                <div className="mb-6 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl">
                                    <AlertTriangle
                                        size={16}
                                        className="text-red-400 shrink-0"
                                    />
                                    <p className="text-sm text-red-300">{ass.error}</p>
                                </div>
                            )}

                            {/* Action buttons (text mode only / or after voice feedback) */}
                            <div className="flex items-center justify-between gap-4">
                                {!isVoice && (
                                    <button
                                        onClick={() => ass.skipQuestion()}
                                        className="px-6 py-3 rounded-2xl border border-white/10 text-[10px] font-black text-white/30 uppercase tracking-widest hover:text-white hover:border-white/30 transition-all"
                                    >
                                        Skip
                                    </button>
                                )}

                                {/* Text mode submit / next */}
                                {!isVoice && !hasFeedback && (
                                    <button
                                        disabled={!selectedOption || ass.isSubmittingAnswer}
                                        onClick={() => {
                                            if (selectedOption) {
                                                ass.submitAnswer(q.id, selectedOption);
                                            }
                                        }}
                                        className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-saffron text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-saffron/30 hover:shadow-saffron/50 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
                                    >
                                        {ass.isSubmittingAnswer ? (
                                            <>
                                                <Loader2 size={15} className="animate-spin" />
                                                AI Evaluating...
                                            </>
                                        ) : (
                                            <>
                                                Submit Answer
                                                <ArrowRight size={15} />
                                            </>
                                        )}
                                    </button>
                                )}

                                {/* After feedback: next / finish */}
                                {hasFeedback && (
                                    <button
                                        onClick={() => {
                                            setSelectedOption(null);
                                            if (isLast) {
                                                if (ass.assessmentId)
                                                    handleCleanupAndFetch(ass.assessmentId);
                                            }
                                            // auto-advance handled by useAssessment timer
                                        }}
                                        className="ml-auto flex items-center gap-3 px-8 py-4 rounded-2xl bg-saffron text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-saffron/30 transition-all"
                                    >
                                        {isLast ? (
                                            <>
                                                <Trophy size={15} />
                                                Finish Assessment
                                            </>
                                        ) : (
                                            <>
                                                Next Question
                                                <ChevronRight size={15} />
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.div>
        );
    }

    // ── SCREEN 3 — LOADING RESULTS ─────────────────────────────────────────
    if (ass.screen === "results" && ass.isLoading) {
        return (
            <motion.div
                key="screen-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-[500px] w-full flex flex-col items-center justify-center"
            >
                <div className="w-20 h-20 border-4 border-t-saffron border-r-transparent border-b-green-400 border-l-transparent rounded-full animate-spin mb-8 shadow-[0_0_40px_rgba(255,153,51,0.2)]" />
                <p className="text-sm font-black text-white/40 tracking-[0.4em] uppercase animate-pulse">
                    Analyzing Your Performance...
                </p>
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-4">
                    Calculating scores and skill gaps
                </p>
            </motion.div>
        );
    }

    // ── SCREEN 4 — RESULTS ─────────────────────────────────────────────────
    if (ass.screen === "results" && !ass.isLoading) {
        const r = ass.results;
        const pct = r?.percentage ?? 0;
        const passed = r?.passed ?? false;

        const allGaps: string[] = [];
        const allStrengths: string[] = [];
        const allConcepts: string[] = [];
        r?.answers?.forEach((a: any) => {
            const ev = a.evaluation;
            if (ev?.skill_gaps) allGaps.push(...ev.skill_gaps);
            if (ev?.strengths) allStrengths.push(...ev.strengths);
            if (ev?.concepts_to_study) allConcepts.push(...ev.concepts_to_study);
        });
        const uniqueGaps = [...new Set(allGaps)].slice(0, 6);
        const uniqueStrengths = [...new Set(allStrengths)].slice(0, 6);
        const uniqueConcepts = [...new Set(allConcepts)].slice(0, 6);

        return (
            <motion.div
                key="screen-results"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                className="max-w-3xl mx-auto space-y-6"
            >
                {/* Score card */}
                <div
                    className={`lovable-card p-10 md:p-14 rounded-[40px] border text-center relative overflow-hidden ${scoreBg(pct)}`}
                >
                    <div className="absolute top-0 right-0 p-12 pr-16 opacity-[0.05] pointer-events-none">
                        <Trophy size={200} />
                    </div>

                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-6">
                        Assessment Complete
                    </p>

                    <div className={`text-8xl font-black leading-none mb-4 ${scoreColor(pct)}`}>
                        {Math.round(pct)}%
                    </div>

                    <div
                        className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border mb-8 ${passed
                            ? "bg-green-400/10 border-green-400/30 text-green-400"
                            : "bg-yellow-400/10 border-yellow-400/30 text-yellow-400"
                            }`}
                    >
                        {passed ? (
                            <CheckCircle2 size={12} />
                        ) : (
                            <AlertTriangle size={12} />
                        )}
                        {passed ? "Passed" : "Needs Improvement"}
                    </div>

                    <div className="flex justify-center gap-8 text-center mb-8">
                        <div>
                            <p className="text-2xl font-black text-white">
                                {r?.total_score ?? 0}
                            </p>
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1">
                                Total Points
                            </p>
                        </div>
                        <div className="w-px bg-white/10" />
                        <div>
                            <p className="text-2xl font-black text-white">
                                {r?.max_score ?? 0}
                            </p>
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1">
                                Max Points
                            </p>
                        </div>
                        <div className="w-px bg-white/10" />
                        <div>
                            <p className="text-2xl font-black text-white">
                                {r?.questions?.length ?? ass.questions.length}
                            </p>
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1">
                                Questions
                            </p>
                        </div>
                    </div>

                    <p className="text-xs font-bold text-white/30 uppercase tracking-widest">
                        Topic:{" "}
                        <span className="text-white">{r?.topic || ass.topic}</span>
                    </p>
                </div>

                {/* Question review */}
                {r?.answers && r.answers.length > 0 && (
                    <div className="lovable-card p-8 md:p-10 rounded-[32px] bg-black/30 border-white/5">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-1.5 h-8 bg-saffron rounded-full" />
                            <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">
                                Question Review
                            </h3>
                        </div>
                        <div className="space-y-4">
                            {r.answers.map((a: any, i: number) => {
                                const ev = a.evaluation;
                                const correct = ev?.is_correct ?? false;
                                const partial = ev?.score === 5;
                                const qText =
                                    r.questions?.[i]?.question || `Question ${i + 1}`;
                                return (
                                    <div
                                        key={a.question_id}
                                        className={`p-5 rounded-2xl border ${correct
                                            ? "bg-green-400/5 border-green-400/20"
                                            : partial
                                                ? "bg-yellow-400/5 border-yellow-400/20"
                                                : "bg-red-400/5 border-red-400/20"
                                            }`}
                                    >
                                        <div className="flex items-start gap-3 mb-3">
                                            {correct ? (
                                                <CheckCircle2
                                                    size={15}
                                                    className="text-green-400 shrink-0 mt-0.5"
                                                />
                                            ) : partial ? (
                                                <AlertTriangle
                                                    size={15}
                                                    className="text-yellow-400 shrink-0 mt-0.5"
                                                />
                                            ) : (
                                                <XCircle
                                                    size={15}
                                                    className="text-red-400 shrink-0 mt-0.5"
                                                />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-black text-white/60 uppercase tracking-widest mb-1">
                                                    Q{i + 1} ·{" "}
                                                    {correct
                                                        ? "Correct"
                                                        : partial
                                                            ? "Partial"
                                                            : "Incorrect"}{" "}
                                                    · {ev?.score ?? 0} pts
                                                </p>
                                                <p className="text-sm text-white font-medium leading-snug">
                                                    {qText}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="ml-6 space-y-1">
                                            <p className="text-[10px] text-white/40">
                                                <span className="font-black text-white/30">
                                                    Your answer:{" "}
                                                </span>
                                                {a.answer}
                                            </p>
                                            {!correct && ev?.correct_answer && (
                                                <p className="text-[10px] text-green-400/80">
                                                    <span className="font-black">Correct: </span>
                                                    {ev.correct_answer}
                                                </p>
                                            )}
                                            {ev?.feedback && (
                                                <p className="text-[10px] text-white/30 italic mt-2 leading-relaxed">
                                                    {ev.feedback}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Skill analysis */}
                {(uniqueStrengths.length > 0 ||
                    uniqueGaps.length > 0 ||
                    uniqueConcepts.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {uniqueStrengths.length > 0 && (
                                <div className="lovable-card p-6 rounded-[24px] bg-green-400/5 border-green-400/10">
                                    <div className="flex items-center gap-2 mb-4">
                                        <CheckCircle2 size={14} className="text-green-400" />
                                        <h4 className="text-[10px] font-black text-green-400 uppercase tracking-widest">
                                            Strengths
                                        </h4>
                                    </div>
                                    <ul className="space-y-2">
                                        {uniqueStrengths.map((s, i) => (
                                            <li
                                                key={i}
                                                className="text-[11px] font-bold text-white/60 flex items-center gap-2"
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-400/60 shrink-0" />
                                                {s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {uniqueGaps.length > 0 && (
                                <div className="lovable-card p-6 rounded-[24px] bg-yellow-400/5 border-yellow-400/10">
                                    <div className="flex items-center gap-2 mb-4">
                                        <AlertTriangle size={14} className="text-yellow-400" />
                                        <h4 className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">
                                            Skill Gaps
                                        </h4>
                                    </div>
                                    <ul className="space-y-2">
                                        {uniqueGaps.map((g, i) => (
                                            <li
                                                key={i}
                                                className="text-[11px] font-bold text-white/60 flex items-center gap-2"
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400/60 shrink-0" />
                                                {g}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {uniqueConcepts.length > 0 && (
                                <div className="lovable-card p-6 rounded-[24px] bg-saffron/5 border-saffron/10">
                                    <div className="flex items-center gap-2 mb-4">
                                        <TrendingUp size={14} className="text-saffron" />
                                        <h4 className="text-[10px] font-black text-saffron uppercase tracking-widest">
                                            Study These
                                        </h4>
                                    </div>
                                    <ul className="space-y-2">
                                        {uniqueConcepts.map((c, i) => (
                                            <li
                                                key={i}
                                                className="text-[11px] font-bold text-white/60 flex items-center gap-2"
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-saffron/60 shrink-0" />
                                                {c}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                {ass.error && (
                    <div className="flex items-center gap-3 p-5 bg-red-500/10 border border-red-500/30 rounded-2xl">
                        <AlertTriangle size={16} className="text-red-400 shrink-0" />
                        <p className="text-sm text-red-300">{ass.error}</p>
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-4 pt-2">
                    <button
                        onClick={() => {
                            ass.resetWithTopic(r?.topic || ass.topic || selectedTopic);
                            setSelectedOption(null);
                            setAssessmentMode(null);
                            setShowModeSelect(false);
                        }}
                        className="flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border border-white/10 text-[11px] font-black text-white/40 uppercase tracking-widest hover:text-white hover:border-white/30 transition-all"
                    >
                        <RotateCcw size={14} />
                        Try Again
                    </button>
                    <button
                        onClick={() => {
                            ass.resetAssessment();
                            setSelectedOption(null);
                            setAssessmentMode(null);
                            setShowModeSelect(false);
                            onBackToOverview?.();
                        }}
                        className="flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl bg-saffron text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-saffron/20 hover:shadow-saffron/40 hover:-translate-y-0.5 transition-all"
                    >
                        <LayoutDashboard size={14} />
                        Back to Overview
                    </button>
                </div>
            </motion.div>
        );
    }

    return null;
}
