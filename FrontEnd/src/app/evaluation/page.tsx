"use client";

import PageContainer from "@/components/layout/PageContainer";
import { motion, AnimatePresence } from "framer-motion";
import {
    Target, Shield, Cpu, Sparkles, ChevronRight, CheckCircle2,
    XCircle, AlertTriangle, BookOpen, ArrowRight, RotateCcw,
    Share2, Zap, Brain, TrendingUp, Award, Clock, Check, Loader2,
    SkipForward, MessageSquare, Headphones, Mic, Lock, Volume2
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useAssessment from "@/hooks/useAssessment";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { assessmentVoiceService } from "@/services/assessmentVoiceService";

const NUM_QUESTION_OPTIONS = [3, 5, 10, 15, 20];
const TOPIC_SUGGESTIONS = [
    "React Hooks", "Python Fundamentals", "System Design",
    "SQL Optimization", "FastAPI", "TypeScript",
];

/* ═══════════════ SCREEN 1 — SETUP ═══════════════ */
function SetupScreen({
    topic, setTopic, numQuestions, setNumQuestions,
    onStart, isLoading, error
}: any) {
    const { t } = useLanguage();
    return (
        <motion.div
            key="setup"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            className="max-w-2xl mx-auto"
        >
            <div className="lovable-card p-12 md:p-16 bg-black/40 border-white/5 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                    <Target size={200} />
                </div>

                <div className="flex flex-col items-center text-center relative z-10">
                    <div className="w-20 h-20 rounded-[2rem] bg-saffron/10 border border-saffron/20 flex items-center justify-center mb-10">
                        <Brain className="text-saffron" size={36} />
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter uppercase mb-4">
                        Assessment Setup
                    </h2>
                    <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.5em] mb-12 italic">
                        AI adapts difficulty to your topic
                    </p>

                    <div className="w-full space-y-8">
                        {/* Topic input */}
                        <div className="space-y-3 text-left">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-2">
                                Topic to Assess
                            </label>
                            <div className="relative group">
                                <Brain className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-saffron transition-colors" size={16} />
                                <input
                                    type="text"
                                    placeholder="e.g. React Hooks, Python, System Design"
                                    value={topic}
                                    onChange={e => setTopic(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && !isLoading && onStart()}
                                    className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-5 pl-12 pr-5 text-sm font-semibold text-white focus:outline-none focus:bg-white/[0.08] focus:border-saffron/40 transition-all placeholder:text-white/10"
                                    autoFocus
                                />
                            </div>

                            {/* Suggestion chips */}
                            <div className="flex flex-wrap gap-2 mt-2">
                                {TOPIC_SUGGESTIONS.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setTopic(tag)}
                                        className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${topic === tag
                                            ? "bg-saffron border-saffron text-white"
                                            : "bg-white/5 border-white/5 text-white/30 hover:bg-saffron/10 hover:border-saffron/30 hover:text-saffron"
                                            }`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Number of questions */}
                        <div className="space-y-3 text-left">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-2">
                                Number of Questions
                            </label>
                            <div className="flex gap-3">
                                {NUM_QUESTION_OPTIONS.map(n => (
                                    <button
                                        key={n}
                                        onClick={() => setNumQuestions(n)}
                                        className={`flex-1 py-4 rounded-2xl text-sm font-black uppercase tracking-widest border transition-all ${numQuestions === n
                                            ? "bg-saffron border-saffron text-white shadow-lg shadow-saffron/20"
                                            : "bg-white/[0.03] border-white/10 text-white/30 hover:border-saffron/30 hover:text-white"
                                            }`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Difficulty info */}
                        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-4">
                            <Sparkles size={16} className="text-saffron animate-pulse shrink-0" />
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                                AI will adapt difficulty to your topic and skill level
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl">
                                <AlertTriangle size={16} className="text-red-400 shrink-0" />
                                <p className="text-sm text-red-300">{error}</p>
                            </div>
                        )}

                        {/* Start button */}
                        <button
                            onClick={onStart}
                            disabled={isLoading}
                            className="w-full py-6 rounded-3xl bg-saffron text-white font-black text-sm uppercase tracking-[0.4em] flex items-center justify-center gap-4 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-saffron/20"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Generating questions with AI...
                                </>
                            ) : (
                                <>
                                    <Zap size={20} />
                                    Start Assessment
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

/* ═══════════════ MODE SELECTION ═══════════════ */
type AssessmentMode = "text" | "voice";

function ModeSelectionScreen({ onSelect }: { onSelect: (m: AssessmentMode) => void }) {
    return (
        <motion.div key="mode" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-2xl mx-auto">
            <div className="lovable-card p-12 md:p-16 bg-black/40 border-white/5 rounded-[48px] text-center">
                <Brain className="text-saffron mx-auto mb-8" size={36} />
                <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">How Do You Want to Answer?</h2>
                <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.3em] mb-12">Applies to all questions in this assessment</p>
                <div className="grid grid-cols-2 gap-6">
                    <button id="mode-text" onClick={() => onSelect("text")} className="group flex flex-col items-center gap-5 p-8 rounded-[28px] border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/30 transition-all">
                        <MessageSquare size={28} className="text-blue-400" />
                        <div>
                            <p className="text-white font-black text-sm uppercase tracking-widest mb-1">💬 Text Based</p>
                            <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Type your answers with keyboard</p>
                        </div>
                    </button>
                    <button id="mode-voice" onClick={() => onSelect("voice")} className="group flex flex-col items-center gap-5 p-8 rounded-[28px] border border-saffron/20 bg-saffron/5 hover:bg-saffron/10 hover:border-saffron/40 transition-all">
                        <Headphones size={28} className="text-saffron" />
                        <div>
                            <p className="text-white font-black text-sm uppercase tracking-widest mb-1">🎤 Voice Based</p>
                            <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Speak aloud — AI listens &amp; transcribes</p>
                        </div>
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

/* ═══════════════ VOICE ANSWER BUTTON ═══════════════ */
function EvalVoiceButton({ assessmentId, questionId, onAnswerComplete, onCancelAutoPlay }: {
    assessmentId: string; questionId: string;
    onAnswerComplete: (t: string) => void; onCancelAutoPlay?: () => void;
}) {
    const { state, duration, error, startRecording, stopRecording } = useVoiceRecorder();
    const [transcript, setTranscript] = useState<string | null>(null);
    const [locked, setLocked] = useState(false);
    const [procMsg, setProcMsg] = useState("");

    const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

    const handleClick = async () => {
        if (locked || state === "processing") return;
        if (state === "idle" || state === "error") {
            onCancelAutoPlay?.();
            await startRecording();
        } else if (state === "recording") {
            setLocked(true);
            try {
                const blob = await stopRecording();
                setProcMsg("Transcribing…");
                const text = await assessmentVoiceService.transcribeAnswer(blob, assessmentId, questionId);
                setTranscript(text || "[No speech detected]");
                onAnswerComplete(text || "[No speech detected]");
            } catch { const fb = "[Voice transcription failed]"; setTranscript(fb); onAnswerComplete(fb); }
            finally { setProcMsg(""); }
        }
    };

    if (locked && transcript) return (
        <div className="rounded-2xl border border-white/10 p-5 bg-white/5 space-y-2">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Lock size={10} /> Answer Locked — We Heard:</p>
            <p className="text-white text-sm italic">&ldquo;{transcript}&rdquo;</p>
        </div>
    );

    return (
        <div className="flex flex-col items-center gap-3 w-full">
            <button onClick={handleClick} disabled={locked || state === "processing"}
                className={`w-full py-5 rounded-2xl font-black tracking-wider uppercase text-sm transition-all flex items-center justify-center gap-3 ${state === "recording" ? "bg-red-500 text-white animate-pulse" : state === "processing" || procMsg ? "bg-white/10 text-white/40 cursor-wait" : locked ? "bg-white/5 text-white/20 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600 text-white"}`}>
                {state === "idle" && !locked && <><Mic size={16} /> CLICK TO ANSWER</>}
                {state === "recording" && <><span className="w-3 h-3 rounded-full bg-white" />REC {fmt(duration)} — CLICK TO STOP &amp; SUBMIT</>}
                {(state === "processing" || procMsg) && <><Loader2 size={16} className="animate-spin" />{procMsg || "PROCESSING…"}</>}
                {locked && !procMsg && <><Lock size={14} /> ANSWER SUBMITTED</>}
            </button>
            {error && <p className="text-red-400 text-xs text-center font-bold">{error}</p>}
            {state === "idle" && !locked && <p className="text-white/25 text-[10px] text-center font-bold uppercase tracking-widest">⚠ Click once to start · Click again to stop · No retakes</p>}
        </div>
    );
}

/* ═══════════════ SCREEN 2 — ACTIVE ASSESSMENT ═══════════════ */
function ActiveScreen({
    questions, currentQuestionIndex, onSubmit, onSkip,
    isSubmittingAnswer, currentFeedback, error, clearError,
    assessmentId, assessmentMode
}: any) {
    const [selectedOption, setSelectedOption] = useState<string>("");
    const [textAnswer, setTextAnswer] = useState("");

    const question = questions[currentQuestionIndex];
    const isMultiChoice = question?.options?.length > 0;
    const progress = ((currentQuestionIndex) / questions.length) * 100;
    const currentAnswer = isMultiChoice ? selectedOption : textAnswer;

    const handleSubmit = () => {
        if (!currentAnswer.trim()) return;
        onSubmit(question.id, currentAnswer);
        // Reset local state
        setSelectedOption("");
        setTextAnswer("");
    };

    if (!question) return null;

    return (
        <motion.div
            key="active"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="max-w-3xl mx-auto space-y-8"
        >
            {/* Progress bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black text-white/30 uppercase tracking-widest">
                    <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                    <span>{question.difficulty || "AI-adaptive"}</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full bg-saffron rounded-full"
                    />
                </div>
            </div>

            {/* Question area */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentQuestionIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="lovable-card p-10 bg-gradient-to-tr from-saffron/5 via-transparent to-transparent border-white/5"
                >
                    {/* Topic + difficulty badge */}
                    <div className="flex flex-wrap items-center gap-3 mb-8">
                        <div className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-saffron/30 bg-saffron/10 text-saffron">
                            {question.topic || "General"}
                        </div>
                        {question.difficulty && (
                            <div className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-white/10 bg-white/5 text-white/40">
                                {question.difficulty}
                            </div>
                        )}
                        {isMultiChoice && (
                            <div className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-blue-500/30 bg-blue-500/10 text-blue-400">
                                Multiple Choice
                            </div>
                        )}
                    </div>

                    {/* Question text */}
                    <h3 className="text-2xl md:text-3xl font-extrabold text-white italic tracking-tight leading-relaxed mb-10">
                        "{question.question}"
                    </h3>

                    {/* Answer area */}
                    {assessmentMode === "voice" && !currentFeedback ? (
                        <EvalVoiceButton
                            assessmentId={assessmentId}
                            questionId={question.id}
                            onAnswerComplete={(transcript) => {
                                onSubmit(question.id, transcript);
                                setTextAnswer("");
                                setSelectedOption("");
                            }}
                        />
                    ) : assessmentMode !== "voice" && isMultiChoice ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {question.options.map((option: string) => (
                                <button
                                    key={option}
                                    onClick={() => setSelectedOption(option)}
                                    disabled={isSubmittingAnswer || !!currentFeedback}
                                    className={`p-5 text-left rounded-2xl border font-medium text-sm transition-all duration-200 relative overflow-hidden ${selectedOption === option
                                        ? "bg-saffron text-white border-saffron shadow-xl shadow-saffron/20 scale-[1.02]"
                                        : "bg-white/[0.03] border-white/5 text-white/60 hover:bg-white/[0.07] hover:border-white/20"
                                        } disabled:cursor-not-allowed`}
                                >
                                    {option}
                                    {selectedOption === option && (
                                        <div className="absolute top-3 right-3">
                                            <Check size={12} className="text-white" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : assessmentMode !== "voice" ? (
                        <textarea
                            value={textAnswer}
                            onChange={e => setTextAnswer(e.target.value)}
                            disabled={isSubmittingAnswer || !!currentFeedback}
                            placeholder="Type your answer here... (minimum 10 characters)"
                            rows={5}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-sm text-white font-medium placeholder:text-white/10 focus:outline-none focus:border-saffron/40 focus:bg-white/[0.05] transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    ) : null}

                    {/* Error */}
                    {error && (
                        <div className="mt-4 flex items-center gap-3 p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl">
                            <AlertTriangle size={14} className="text-orange-400 shrink-0" />
                            <p className="text-sm text-orange-300">{error}</p>
                            <button onClick={clearError} className="ml-auto text-orange-400 hover:text-white transition-colors">
                                <XCircle size={14} />
                            </button>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Feedback flash */}
            <AnimatePresence>
                {currentFeedback && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className={`p-6 rounded-2xl border ${currentFeedback.is_correct
                            ? "bg-green-bharat/10 border-green-bharat/30"
                            : "bg-red-500/10 border-red-500/30"
                            }`}
                    >
                        <div className="flex items-start gap-4">
                            {currentFeedback.is_correct
                                ? <CheckCircle2 size={20} className="text-green-bharat shrink-0 mt-0.5" />
                                : <XCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
                            }
                            <div>
                                <p className={`text-sm font-black uppercase tracking-wide mb-1 ${currentFeedback.is_correct ? "text-green-bharat" : "text-red-400"}`}>
                                    {currentFeedback.is_correct ? `✓ Correct! +${currentFeedback.score} pts` : `✗ Incorrect · ${currentFeedback.score} pts`}
                                </p>
                                <p className="text-sm text-white/60 leading-relaxed">{currentFeedback.feedback}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Action buttons */}
            <div className="flex justify-between items-center gap-4">
                <button
                    onClick={onSkip}
                    disabled={isSubmittingAnswer || !!currentFeedback}
                    className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-[10px] font-black text-white/30 uppercase tracking-widest hover:text-white hover:bg-white/[0.07] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <SkipForward size={14} />
                    Skip
                </button>

                <button
                    onClick={handleSubmit}
                    disabled={!currentAnswer.trim() || isSubmittingAnswer || !!currentFeedback
                        || (!isMultiChoice && textAnswer.length < 10)}
                    className="flex-1 py-5 rounded-3xl bg-saffron text-white font-black text-sm uppercase tracking-[0.4em] flex items-center justify-center gap-3 hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-xl shadow-saffron/20"
                >
                    {isSubmittingAnswer ? (
                        <><Loader2 size={18} className="animate-spin" /> AI is evaluating...</>
                    ) : (
                        <><ChevronRight size={18} /> Submit Answer</>
                    )}
                </button>
            </div>

            {!isMultiChoice && textAnswer.length > 0 && textAnswer.length < 10 && (
                <p className="text-[9px] text-white/20 text-center font-black uppercase tracking-widest">
                    Minimum 10 characters required ({10 - textAnswer.length} more)
                </p>
            )}
        </motion.div>
    );
}

/* ═══════════════ SCREEN 3 — RESULTS ═══════════════ */
function ResultsScreen({ results, topic, onRetake, onNewTopic, questions, localAnswers }: any) {
    const router = useRouter();
    const [copied, setCopied] = useState(false);

    // If results API failed, build fallback from localAnswers
    const percentage = results?.percentage ?? 0;
    const passed = results?.passed ?? (percentage >= 60);
    const totalScore = results?.total_score ?? 0;
    const maxScore = results?.max_score ?? (questions.length * 10); // 10 pts per question
    const avgScore = results?.avg_score ?? 0;
    const displayTopic = results?.topic || topic;
    const answers = results?.answers ?? [];

    // Aggregate skill analysis across all answers
    const allGaps: string[] = [];
    const allStrengths: string[] = [];
    const allConcepts: string[] = [];
    const allImprovements: string[] = [];
    answers.forEach((a: any) => {
        const ev = a.evaluation;
        if (ev?.skill_gaps) allGaps.push(...ev.skill_gaps);
        if (ev?.strengths) allStrengths.push(...ev.strengths);
        if (ev?.concepts_to_study) allConcepts.push(...ev.concepts_to_study);
        if (ev?.improvements) allImprovements.push(...ev.improvements);
    });
    const uniqueGaps = [...new Set(allGaps)];
    const uniqueStrengths = [...new Set(allStrengths)];
    const uniqueConcepts = [...new Set(allConcepts)];
    const uniqueImprovements = [...new Set(allImprovements)];

    const handleShare = async () => {
        const text = `Thenali AI Assessment — ${displayTopic}\nScore: ${percentage.toFixed(1)}% | ${passed ? "PASSED" : "NEEDS IMPROVEMENT"}\n${totalScore}/${maxScore} points`;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div
            key="results"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-4xl mx-auto space-y-10"
        >
            {/* SECTION A — Score Summary */}
            <div className="lovable-card p-12 text-center bg-gradient-to-br from-saffron/10 via-transparent to-transparent border-white/5 relative overflow-hidden">
                <div className="absolute top-6 right-6">
                    <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${passed
                        ? "bg-green-bharat/20 border-green-bharat/30 text-green-bharat"
                        : "bg-orange-500/20 border-orange-500/30 text-orange-400"
                        }`}>
                        {passed ? "✓ PASSED" : "NEEDS IMPROVEMENT"}
                    </span>
                </div>

                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}
                    className={`w-24 h-24 rounded-3xl mx-auto flex items-center justify-center mb-8 shadow-xl ${passed ? "bg-green-bharat text-white" : "bg-orange-500 text-white"}`}>
                    <Award size={44} />
                </motion.div>

                <div className="flex items-end justify-center gap-3 mb-6">
                    <span className="text-8xl font-black text-saffron leading-none">{percentage.toFixed(0)}</span>
                    <span className="text-2xl font-black text-white/30 mb-3">%</span>
                </div>

                <div className="grid grid-cols-3 gap-6 mt-8 pt-8 border-t border-white/5">
                    <div>
                        <div className="text-2xl font-black text-white">{totalScore}<span className="text-white/20 text-sm">/{maxScore}</span></div>
                        <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mt-1">Total Points</div>
                    </div>
                    <div>
                        <div className="text-2xl font-black text-white">{avgScore.toFixed(1)}</div>
                        <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mt-1">Avg / Question</div>
                    </div>
                    <div>
                        <div className="text-2xl font-black text-white">{questions.length}</div>
                        <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mt-1">Questions</div>
                    </div>
                </div>

                <div className="mt-6 text-[10px] font-black text-white/20 uppercase tracking-widest">
                    Topic: <span className="text-saffron">{displayTopic}</span>
                </div>
            </div>

            {/* SECTION B — Question Review */}
            {answers.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-black text-white uppercase tracking-widest px-2">Question Review</h3>
                    {answers.map((a: any, i: number) => {
                        const q = questions.find((q: any) => q.id === a.question_id);
                        const ev = a.evaluation;
                        return (
                            <div key={i} className={`lovable-card p-8 border transition-all ${ev?.is_correct
                                ? "border-green-bharat/20 bg-green-bharat/5"
                                : "border-red-500/20 bg-red-500/5"
                                }`}>
                                <div className="flex items-start gap-4">
                                    <div className={`mt-1 shrink-0 ${ev?.is_correct ? "text-green-bharat" : "text-red-400"}`}>
                                        {ev?.is_correct ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-white mb-3 leading-relaxed">
                                            Q{i + 1}. {q?.question || a.question_id}
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                                            <div>
                                                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-1">Your Answer</span>
                                                <span className="text-white/60 font-mono">{a.answer || "—"}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-1">Correct Answer</span>
                                                <span className="text-green-bharat/80 font-mono">{ev?.correct_answer || q?.correct_answer || "—"}</span>
                                            </div>
                                        </div>
                                        {ev?.detailed_feedback && (
                                            <p className="text-sm text-white/40 italic leading-relaxed border-l-2 border-saffron/30 pl-4">
                                                {ev.detailed_feedback}
                                            </p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-3 mt-4">
                                            <span className="text-[9px] font-black text-saffron uppercase tracking-widest">
                                                {ev?.score ?? 0} pts
                                            </span>
                                            {ev?.understanding_level && (
                                                <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border border-blue-500/20 bg-blue-500/10 text-blue-400">
                                                    {ev.understanding_level}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* SECTION C — Skill Analysis */}
            {(uniqueStrengths.length > 0 || uniqueGaps.length > 0 || uniqueConcepts.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Strengths */}
                    {uniqueStrengths.length > 0 && (
                        <div className="lovable-card p-8 border-green-bharat/10 bg-green-bharat/5">
                            <h4 className="text-[10px] font-black text-green-bharat uppercase tracking-widest mb-6 flex items-center gap-2">
                                <CheckCircle2 size={14} /> Strengths
                            </h4>
                            <ul className="space-y-2">
                                {uniqueStrengths.map((s: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-white/50">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-bharat mt-1.5 shrink-0" />
                                        {s}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Gaps */}
                    {uniqueGaps.length > 0 && (
                        <div className="lovable-card p-8 border-orange-500/10 bg-orange-500/5">
                            <h4 className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Target size={14} /> Skill Gaps
                            </h4>
                            <ul className="space-y-2">
                                {uniqueGaps.map((g: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-white/50">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                                        {g}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Concepts to study */}
                    {uniqueConcepts.length > 0 && (
                        <div className="lovable-card p-8 border-blue-500/10 bg-blue-500/5">
                            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <BookOpen size={14} /> Study These
                            </h4>
                            <ul className="space-y-2">
                                {uniqueConcepts.map((c: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-white/50">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                        {c}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Improvements */}
            {uniqueImprovements.length > 0 && (
                <div className="lovable-card p-8 border-white/5">
                    <h4 className="text-[10px] font-black text-saffron uppercase tracking-widest mb-6 flex items-center gap-2">
                        <TrendingUp size={14} /> Improvement Suggestions
                    </h4>
                    <ul className="space-y-3">
                        {uniqueImprovements.map((imp: string, i: number) => (
                            <li key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                <div className="w-1.5 h-1.5 rounded-full bg-saffron mt-1.5 shrink-0" />
                                <p className="text-sm text-white/50 leading-relaxed">{imp}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* SECTION D — Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                <button
                    onClick={() => onRetake(topic)}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-saffron/30 hover:bg-saffron/5 transition-all group"
                >
                    <RotateCcw size={20} className="text-saffron group-hover:rotate-180 transition-transform duration-500" />
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest group-hover:text-white transition-colors">Retake</span>
                </button>

                <button
                    onClick={onNewTopic}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all group"
                >
                    <Brain size={20} className="text-white/40 group-hover:text-white transition-colors" />
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest group-hover:text-white transition-colors">New Topic</span>
                </button>

                <Link
                    href={`/learning/dashboard?topic=${encodeURIComponent(displayTopic)}&gaps=${encodeURIComponent(uniqueGaps.join(","))}`}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-green-bharat/30 hover:bg-green-bharat/5 transition-all group"
                >
                    <BookOpen size={20} className="text-green-bharat" />
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest group-hover:text-white transition-colors">Go to Learning</span>
                </Link>

                <button
                    onClick={handleShare}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group"
                >
                    {copied ? <Check size={20} className="text-green-bharat" /> : <Share2 size={20} className="text-blue-400" />}
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest group-hover:text-white transition-colors">
                        {copied ? "Copied!" : "Share"}
                    </span>
                </button>
            </div>
        </motion.div>
    );
}

/* ═══════════════ MAIN PAGE ═══════════════ */
export default function EvaluationPage() {
    const { t } = useLanguage();
    const {
        screen, topic, numQuestions, questions,
        currentQuestionIndex, localAnswers, results,
        isLoading, error,
        currentFeedback, isSubmittingAnswer,
        startAssessment, submitAnswer, skipQuestion,
        resetAssessment, resetWithTopic,
        setTopic, setNumQuestions, clearError,
        assessmentId,
    } = useAssessment();

    const [assessmentMode, setAssessmentMode] = useState<AssessmentMode | null>(null);
    const [showModeSelect, setShowModeSelect] = useState(false);

    const handleStart = useCallback(() => {
        setShowModeSelect(true);
    }, [setShowModeSelect]);

    const handleCleanupAndResults = useCallback(async (aId: string) => {
        if (assessmentMode === "voice") {
            assessmentVoiceService.cleanupAudio(aId);
        }
    }, [assessmentMode]);

    return (
        <PageContainer>
            {/* Page Header */}
            <div className="flex flex-col mb-12 px-4">
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4 mb-4">
                    <div className="px-3 py-1 bg-saffron/10 border border-saffron/20 rounded-full flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-saffron animate-pulse" />
                        <span className="text-[10px] font-black text-saffron uppercase tracking-widest">{t("mastery_engine")}</span>
                    </div>
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">
                        {screen === "setup" ? "Setup" : screen === "active" ? `Q${currentQuestionIndex + 1}/${questions.length}` : "Results"} / v4.2.0
                    </span>
                </motion.div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                    <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter uppercase italic leading-none">
                        <span className="lovable-text-gradient">{t("knowledge_evaluation").split(' ')[0]}</span>{" "}
                        <span className="text-white">/ {t("knowledge_evaluation").split(' ')[1]}.</span>
                    </h1>
                    <div className="hidden md:flex gap-6 items-center">
                        <div className="text-right">
                            <span className="block text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">{t("logic_synapse")}</span>
                            <span className="text-sm font-bold text-green-bharat uppercase tracking-tighter italic">{t("standing_by")} / 100%</span>
                        </div>
                        <div className="w-px h-12 bg-white/5" />
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20">
                            <Cpu size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Screen Router */}
            <div className="px-4">
                <AnimatePresence mode="wait">
                    {screen === "setup" && !showModeSelect && (
                        <SetupScreen
                            key="setup"
                            topic={topic}
                            setTopic={setTopic}
                            numQuestions={numQuestions}
                            setNumQuestions={setNumQuestions}
                            onStart={handleStart}
                            isLoading={isLoading}
                            error={error}
                        />
                    )}

                    {/* Mode selection — shown after Start click, before questions load */}
                    {showModeSelect && screen === "setup" && assessmentMode === null && (
                        <ModeSelectionScreen
                            key="mode"
                            onSelect={(m) => {
                                setAssessmentMode(m);
                                setShowModeSelect(false);
                                startAssessment(topic, numQuestions, m);
                            }}
                        />
                    )}

                    {screen === "active" && assessmentMode !== null && (
                        <ActiveScreen
                            key="active"
                            questions={questions}
                            currentQuestionIndex={currentQuestionIndex}
                            onSubmit={submitAnswer}
                            onSkip={skipQuestion}
                            isSubmittingAnswer={isSubmittingAnswer}
                            currentFeedback={currentFeedback}
                            error={error}
                            clearError={clearError}
                            assessmentId={assessmentId}
                            assessmentMode={assessmentMode}
                        />
                    )}

                    {screen === "results" && (
                        isLoading ? (
                            <motion.div
                                key="results-loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center h-64 gap-6"
                            >
                                <div className="w-16 h-16 border-4 border-t-saffron border-r-transparent border-b-green-bharat border-l-transparent rounded-full animate-spin" />
                                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] animate-pulse">
                                    Calculating Results...
                                </span>
                            </motion.div>
                        ) : (
                            <ResultsScreen
                                key="results"
                                results={results}
                                topic={topic}
                                questions={questions}
                                localAnswers={localAnswers}
                                onRetake={(t: string) => resetWithTopic(t)}
                                onNewTopic={resetAssessment}
                            />
                        )
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom security bar (decorative) */}
            <div className="mt-20 p-8 bg-black/40 border border-white/5 rounded-[30px] md:rounded-[40px] flex flex-col md:flex-row items-center justify-between gap-8 backdrop-blur-3xl mx-4">
                <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-white/40 uppercase tracking-widest leading-none">{t("security_layer")}</h4>
                        <p className="text-[9px] font-bold text-white/10 mt-2 uppercase">{t("encrypted_pipeline")}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-saffron uppercase tracking-widest italic animate-pulse">{t("waiting_biometric")}</span>
                    <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: "100%" }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            className="w-full h-full bg-saffron/40"
                        />
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}