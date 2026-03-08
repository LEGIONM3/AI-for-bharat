"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import PageContainer from "@/components/layout/PageContainer";
import Loader from "@/components/ui/Loader";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronRight,
    ChevronLeft,
    Sparkles,
    Zap,
    Brain,
    Terminal,
    ShieldCheck,
    Mic,
    MicOff,
    ListChecks,
    Play,
    RotateCcw,
    Send,
    Check,
    X,
    Monitor,
    TrendingUp,
    Target,
    BookOpen,
    ArrowRight,
    MessageSquare,
    Loader2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useConceptLearning, STEPS, LearningStep } from "@/hooks/useConceptLearning";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useVoice } from "@/hooks/useVoice";
import apiClient from "@/services/apiClient";
import ConceptSyncSuccess from "@/components/learning/ConceptSyncSuccess";
import RoadmapMastery from "@/components/learning/RoadmapMastery";
import { voiceService } from "@/services/voiceService";
import { getNextConcept } from "@/utils/learningNavigation";

// ─── Step 1: Concept Display ─────────────────────────────────────────────────

function ConceptStep({
    conceptModule,
    chatMessages,
    isChatLoading,
    sendChatMessage,
}: {
    conceptModule: any;
    chatMessages: any[];
    isChatLoading: boolean;
    sendChatMessage: (q: string) => Promise<string>;
}) {
    const voice = useVoiceRecorder();
    const [transcript, setTranscript] = useState("");
    const [isTranscribing, setIsTranscribing] = useState(false);
    
    const summaryVoice = useVoice();
    const askAIVoice = useVoice();

    const handleMicClick = async () => {
        if (voice.isRecording) {
            try {
                const audioBlob = await voice.stopRecording();
                setIsTranscribing(true);

                const formData = new FormData();
                formData.append("audio", audioBlob, "recording.webm");
                formData.append("assessment_id", "learning_concept");
                formData.append("question_id", "learning_concept");

                const { data } = await apiClient.post(
                    "/assessment/voice/transcribe-answer",
                    formData,
                    { headers: { "Content-Type": "multipart/form-data" } }
                );
                const text = data.transcript || "";
                setTranscript(text);
                if (text.trim()) {
                    const aiResponse = await sendChatMessage(text);
                    await askAIVoice.playText(aiResponse);
                }
            } catch (e) {
                console.error("Transcription failed", e);
            } finally {
                setIsTranscribing(false);
            }
        } else {
            voice.reset();
            setTranscript("");
            askAIVoice.stop();
            summaryVoice.stop();
            voice.startRecording();
        }
    };

    return (
        <div className="space-y-8">
            {/* Concept Sections */}
            {conceptModule.sections?.map((section: any, i: number) => (
                <div key={i} className="lovable-card p-8 bg-black/40 border-white/5 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                        style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
                    <div className="relative z-10">
                        <h3 className="text-xl font-black text-saffron uppercase tracking-tighter mb-4 italic">
                            {section.title}
                        </h3>
                        <p className="text-white/70 text-sm leading-relaxed font-medium mb-6">
                            {section.content}
                        </p>
                        {section.key_points?.length > 0 && (
                            <ul className="space-y-2">
                                {section.key_points.map((pt: string, j: number) => (
                                    <li key={j} className="flex items-start gap-3 text-xs text-white/60 font-bold">
                                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-saffron flex-shrink-0" />
                                        {pt}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            ))}

            {/* Code Examples */}
            {conceptModule.code_examples?.map((ex: any, i: number) => (
                <div key={i} className="rounded-2xl bg-gray-900 border border-white/10 overflow-hidden">
                    <div className="px-6 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
                        <span className="text-orange-400 text-xs font-black uppercase tracking-widest">{ex.title}</span>
                        <span className="text-white/20 text-[9px] font-bold uppercase tracking-widest">{ex.language}</span>
                    </div>
                    <pre className="text-green-400 font-mono text-sm overflow-x-auto whitespace-pre p-6 leading-relaxed">
                        {ex.code}
                    </pre>
                    <div className="px-6 py-3 bg-white/[0.02] border-t border-white/5">
                        <p className="text-white/40 text-xs italic font-medium">{ex.explanation}</p>
                    </div>
                </div>
            ))}

            {/* Voice + Chat Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ASK AI IN VOICE */}
                <div className="lovable-card p-8 bg-black/40 border-white/5 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-3xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-5">
                        <Mic className="text-green-400" size={28} />
                    </div>
                    <h4 className="text-lg font-black italic text-white uppercase tracking-tighter mb-2">ASK AI IN VOICE</h4>
                    <p className="text-white/30 text-[10px] uppercase tracking-widest mb-6 min-h-[1.5rem] flex items-center justify-center gap-2">
                        {askAIVoice.state === "playing" ? (
                            <><span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span> AI is speaking...</>
                        ) : voice.isRecording ? `Recording ${voice.duration}s...` : isTranscribing ? "Transcribing..." : transcript || "Click to record your question"}
                    </p>
                    
                    {askAIVoice.state === "playing" ? (
                         <div className="flex gap-2">
                             <button
                                 onClick={() => askAIVoice.stop()}
                                 className="px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                             >
                                 🛑 STOP AUDIO
                             </button>
                             <button
                                 onClick={() => askAIVoice.restart()}
                                 className="px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white flex items-center gap-2"
                             >
                                 <RotateCcw size={14} /> RESTART
                             </button>
                         </div>
                    ) : (askAIVoice.state === "loading" || isTranscribing || voice.isProcessing) ? (
                         <button disabled className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border bg-white/5 border-white/10 text-white/30 cursor-not-allowed flex items-center gap-2">
                             <Loader2 size={14} className="animate-spin" /> {askAIVoice.state === "loading" ? "GENERATING VOICE..." : "PROCESSING..."}
                         </button>
                    ) : (
                         <button
                            onClick={handleMicClick}
                            className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${voice.isRecording
                                ? "bg-red-500 border-red-500 text-white animate-pulse"
                                : "bg-white/5 border-white/10 text-white/60 hover:bg-green-500 hover:text-white hover:border-green-500"
                            }`}
                        >
                            {voice.isRecording ? "🔴 STOP & SEND" : "INITIALIZE MIC"}
                        </button>
                    )}
                    {voice.error && (
                        <p className="mt-3 text-red-400 text-[9px] font-bold uppercase tracking-widest">{voice.error}</p>
                    )}
                </div>

                {/* AI Summary Button */}
                <div className="lovable-card p-8 bg-white/[0.02] border border-white/5 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <MessageSquare size={18} className="text-saffron" />
                        <h3 className="text-xs font-black text-white uppercase tracking-widest">HEAR AI EXPLANATION</h3>
                    </div>
                    <p className="text-white/30 text-xs font-medium italic flex-1 mb-6">
                        Let the AI give you a quick summary of this concept to reinforce your understanding.
                    </p>
                    
                    <div className="mt-auto">
                        {summaryVoice.state === "playing" ? (
                             <div className="flex flex-col gap-2">
                                <div className="text-[10px] text-saffron font-bold uppercase tracking-widest flex items-center justify-center gap-2 mb-2">
                                    <span className="w-2 h-2 rounded-full bg-saffron animate-ping" />
                                    Playing Summary...
                                </div>
                                <div className="flex gap-2 w-full justify-center">
                                     <button
                                         onClick={() => summaryVoice.stop()}
                                         className="flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500 hover:text-white text-center"
                                     >
                                         STOP
                                     </button>
                                     <button
                                         onClick={() => summaryVoice.restart()}
                                         className="flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border bg-saffron/10 border-saffron/30 text-saffron hover:bg-saffron hover:text-white flex items-center justify-center gap-2"
                                     >
                                         <RotateCcw size={14} /> REPLAY
                                     </button>
                                </div>
                             </div>
                        ) : summaryVoice.state === "loading" ? (
                            <button disabled className="w-full px-6 py-3 border rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all bg-white/5 border-white/10 text-white/30 cursor-not-allowed flex items-center justify-center gap-2">
                                <Loader2 size={14} className="animate-spin" /> LOADING...
                            </button>
                        ) : (
                            <button
                                onClick={async () => {
                                    const aiResponse = await sendChatMessage(`Give me a brief 2-sentence summary of ${conceptModule.topic} and why it matters.`);
                                    await summaryVoice.playText(aiResponse);
                                }}
                                disabled={isChatLoading}
                                className={`w-full px-6 py-3 border rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all bg-saffron/10 border-saffron/30 text-saffron hover:bg-saffron hover:text-white ${isChatLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                {isChatLoading ? "GENERATING..." : "GET AI SUMMARY + HEAR"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Step 2: Sandbox ──────────────────────────────────────────────────────────

function SandboxStep({
    sandboxCode,
    setSandboxCode,
    sandboxOutput,
    sandboxError,
    isRunningCode,
    runSandboxCode,
    resetSandboxCode,
    language,
}: {
    sandboxCode: string;
    setSandboxCode: (c: string) => void;
    sandboxOutput: string | null;
    sandboxError: string | null;
    isRunningCode: boolean;
    runSandboxCode: (code: string, lang?: string) => Promise<void>;
    resetSandboxCode: () => void;
    language: string;
}) {
    const lines = sandboxCode.split("\n").length;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2 px-4">
                <h3 className="text-2xl font-black italic text-white uppercase tracking-tighter">
                    Interactive <span className="text-green-400">Sandbox</span>
                </h3>
                <div className="px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-black text-blue-400 uppercase tracking-widest">
                    {language.toUpperCase()} Runtime
                </div>
            </div>

            <div className="lovable-card bg-black/40 border-white/5 relative overflow-hidden p-0">
                {/* IDE Header */}
                <div className="px-8 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-6">
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Monitor size={12} className="text-white/20" />
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">
                                sandbox_main.{
                                    language.toLowerCase() === "python" ? "py" :
                                    language.toLowerCase() === "javascript" ? "js" :
                                    language.toLowerCase() === "typescript" ? "ts" :
                                    language.toLowerCase() === "java" ? "java" :
                                    language.toLowerCase() === "cpp" || language.toLowerCase() === "c++" ? "cpp" :
                                    language.toLowerCase() === "rust" ? "rs" :
                                    language.toLowerCase() === "go" ? "go" :
                                    language.toLowerCase() === "sql" ? "sql" : "txt"
                                }
                            </span>
                        </div>
                    </div>
                    <span className="px-3 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[9px] font-black text-green-400 uppercase tracking-widest">
                        Neural Active
                    </span>
                </div>

                {/* Editor */}
                <div className="flex min-h-[280px] relative">
                    <div className="w-12 bg-black/20 border-r border-white/5 flex flex-col pt-6 pb-6 select-none font-mono text-[11px] text-white/10 leading-[1.625rem] gap-0 items-center overflow-hidden">
                        {Array.from({ length: Math.max(lines, 10) }, (_, i) => (
                            <div key={i} className="w-full text-center">{i + 1}</div>
                        ))}
                    </div>
                    <textarea
                        value={sandboxCode}
                        onChange={e => setSandboxCode(e.target.value)}
                        className="flex-1 bg-transparent p-6 font-mono text-sm leading-relaxed text-white/80 focus:outline-none resize-none placeholder:text-white/5"
                        spellCheck={false}
                        placeholder="// Start coding here..."
                    />
                </div>

                {/* Footer */}
                <div className="px-8 py-4 border-t border-white/5 bg-black/40 flex items-center justify-between">
                    <button
                        onClick={resetSandboxCode}
                        className="flex items-center gap-2 text-[10px] font-black text-white/20 hover:text-white uppercase tracking-widest transition-all group"
                    >
                        <RotateCcw size={14} className="group-hover:-rotate-90 transition-transform" />
                        RESET INITIAL LOGIC
                    </button>
                    <button
                        onClick={() => runSandboxCode(sandboxCode, language)}
                        disabled={isRunningCode}
                        className="flex items-center gap-2 px-8 py-2.5 bg-green-500/10 border border-green-500/30 rounded-2xl text-[10px] font-black text-green-400 uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isRunningCode ? <Loader2 size={14} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
                        {isRunningCode ? "RUNNING..." : "EXECUTE SCRIPT"}
                    </button>
                </div>
            </div>

            {/* Output */}
            {(sandboxOutput !== null || sandboxError !== null) && (
                <div className={`rounded-2xl border p-6 font-mono text-sm ${sandboxError ? "border-red-500/30 bg-red-500/5" : "border-green-500/30 bg-green-500/5"}`}>
                    <div className="flex items-center gap-2 mb-3">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${sandboxError ? "text-red-400" : "text-green-400"}`}>
                            {sandboxError ? "⚠ ERROR" : "✓ OUTPUT"}
                        </span>
                    </div>
                    <pre className={`whitespace-pre-wrap break-words text-xs leading-relaxed ${sandboxError ? "text-red-300" : "text-green-300"}`}>
                        {sandboxError || sandboxOutput}
                    </pre>
                </div>
            )}
        </div>
    );
}

// ─── Step 3: Quiz + Viva ──────────────────────────────────────────────────────

function QuizVivaStep({
    conceptModule,
    quizAnswers,
    quizResults,
    quizScore,
    submitQuizAnswer,
    vivaAnswer,
    setVivaAnswer,
    vivaFeedback,
    submitVivaAnswer,
    isChatLoading,
}: {
    conceptModule: any;
    quizAnswers: Record<string, string>;
    quizResults: Record<string, boolean>;
    quizScore: number;
    submitQuizAnswer: (id: string, answer: string) => void;
    vivaAnswer: string;
    setVivaAnswer: (a: string) => void;
    vivaFeedback: string;
    submitVivaAnswer: (a: string) => Promise<string>;
    isChatLoading: boolean;
}) {
    const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
    const [vivaSubmitted, setVivaSubmitted] = useState(false);
    const voice = useVoiceRecorder();
    const [isTranscribing, setIsTranscribing] = useState(false);

    const questions = conceptModule.quiz_questions || [];
    const vivaQ = conceptModule.viva_questions?.[0];
    const currentQ = questions[currentQuizIdx];

    const handleVivaVoice = async () => {
        if (voice.isRecording) {
            try {
                const blob = await voice.stopRecording();
                setIsTranscribing(true);
                const formData = new FormData();
                formData.append("audio", blob, "recording.webm");
                const { data } = await apiClient.post("/assessment/voice/transcribe-answer", formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });
                setVivaAnswer(data.transcript || "");
            } catch {
                setIsTranscribing(false);
            } finally {
                setIsTranscribing(false);
            }
        } else {
            voice.reset();
            voice.startRecording();
        }
    };

    const handleVivaSubmit = async () => {
        if (!vivaAnswer.trim()) return;
        await submitVivaAnswer(vivaAnswer);
        setVivaSubmitted(true);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* LEFT: Quick Quiz */}
            <div className="lovable-card p-8 bg-black/40 border-white/5">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Quick Intelligence Quiz</h3>
                    {questions.length > 0 && (
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                            {Math.min(currentQuizIdx + 1, questions.length)}/{questions.length}
                        </span>
                    )}
                </div>

                {/* Quiz Score Bar */}
                {Object.keys(quizAnswers).length > 0 && (
                    <div className="mb-6">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">
                            <span>Score</span>
                            <span className={quizScore >= 70 ? "text-green-400" : quizScore >= 40 ? "text-saffron" : "text-red-400"}>
                                {quizScore}%
                            </span>
                        </div>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${quizScore}%` }}
                                className={`h-full ${quizScore >= 70 ? "bg-green-500" : quizScore >= 40 ? "bg-saffron" : "bg-red-500"}`}
                            />
                        </div>
                    </div>
                )}

                {currentQ ? (
                    <div>
                        <p className="text-lg font-black italic text-white tracking-tight leading-relaxed mb-6">
                            {currentQ.question}
                        </p>
                        <div className="space-y-3 mb-6">
                            {currentQ.options?.map((option: string, i: number) => {
                                const selected = quizAnswers[currentQ.id] === option;
                                const answered = !!quizAnswers[currentQ.id];
                                const isCorrect = answered && currentQ.correct_answer && option.toUpperCase().startsWith(currentQ.correct_answer.toUpperCase());
                                const isWrong = answered && selected && !isCorrect;

                                let cls = "border-white/10 bg-white/[0.03] text-white/50 hover:border-saffron/50 hover:text-white";
                                if (answered) {
                                    if (isCorrect) cls = "border-green-500/60 bg-green-500/10 text-green-400";
                                    else if (isWrong) cls = "border-red-500/60 bg-red-500/10 text-red-400";
                                    else cls = "border-white/5 bg-white/[0.02] text-white/20";
                                } else if (selected) {
                                    cls = "border-saffron/60 bg-saffron/10 text-white";
                                }

                                return (
                                    <button
                                        key={i}
                                        onClick={() => !answered && submitQuizAnswer(currentQ.id, option)}
                                        disabled={answered}
                                        className={`w-full border p-4 rounded-2xl text-left text-xs font-bold uppercase tracking-widest transition-all flex justify-between items-center ${cls}`}
                                    >
                                        <span>{option}</span>
                                        {answered && isCorrect && <Check size={16} className="text-green-400" />}
                                        {answered && isWrong && <X size={16} className="text-red-400" />}
                                    </button>
                                );
                            })}
                        </div>

                        {quizAnswers[currentQ.id] && currentQ.explanation && (
                            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 mb-4">
                                <p className="text-[10px] text-white/50 font-medium italic leading-relaxed">{currentQ.explanation}</p>
                            </div>
                        )}

                        {/* Navigation between questions */}
                        <div className="flex gap-3">
                            {currentQuizIdx > 0 && (
                                <button
                                    onClick={() => setCurrentQuizIdx(i => i - 1)}
                                    className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest"
                                >
                                    ← Prev
                                </button>
                            )}
                            {currentQuizIdx < questions.length - 1 && (
                                <button
                                    onClick={() => setCurrentQuizIdx(i => i + 1)}
                                    className="flex-1 py-3 rounded-2xl bg-saffron text-white text-[10px] font-black uppercase tracking-widest"
                                >
                                    Next →
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <p className="text-white/30 text-xs italic">No quiz questions available.</p>
                )}
            </div>

            {/* RIGHT: Viva */}
            <div className="lovable-card p-8 bg-black/40 border-white/5">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                        <Mic size={18} />
                    </div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">AI Viva Session</h3>
                </div>

                {vivaQ && (
                    <p className="text-sm font-black text-white italic tracking-tight leading-relaxed mb-6">
                        {vivaQ.question}
                    </p>
                )}

                <div className="relative mb-4">
                    <textarea
                        value={vivaAnswer}
                        onChange={e => setVivaAnswer(e.target.value)}
                        disabled={vivaSubmitted}
                        className={`w-full bg-white/[0.03] border rounded-3xl h-36 p-5 pr-16 text-sm text-white/80 focus:outline-none transition-all placeholder:text-white/10 resize-none ${vivaSubmitted ? "border-green-500/30 bg-green-500/5" : "border-white/10 focus:border-saffron/40"}`}
                        placeholder={voice.isRecording ? "🎤 Listening... speak now" : "Type or speak your answer..."}
                    />
                    {!vivaSubmitted && (
                        <button
                            onClick={handleVivaVoice}
                            disabled={isTranscribing}
                            className={`absolute bottom-4 right-4 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${voice.isRecording ? "bg-saffron text-white animate-pulse" : "bg-white/5 border border-white/10 text-white/30 hover:bg-saffron/10 hover:text-saffron"}`}
                        >
                            {voice.isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                        </button>
                    )}
                </div>

                {vivaFeedback && (
                    <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/20 mb-4">
                        <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1">AI Feedback</p>
                        <p className="text-xs text-white/60 leading-relaxed italic">{vivaFeedback}</p>
                    </div>
                )}

                {!vivaSubmitted ? (
                    <button
                        onClick={handleVivaSubmit}
                        disabled={!vivaAnswer.trim() || isChatLoading}
                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-saffron text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-30"
                    >
                        {isChatLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        {isChatLoading ? "EVALUATING..." : "SUBMIT RESPONSE"}
                    </button>
                ) : (
                    <div className="text-center text-[10px] font-black text-green-400 uppercase tracking-widest py-3">
                        ✓ Response Recorded
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Step 4: Skill Gap ────────────────────────────────────────────────────────

function SkillGapStep({
    skillGapData,
    isCalculatingSkillGap,
    onNext,
}: {
    skillGapData: any;
    isCalculatingSkillGap: boolean;
    onNext: () => void;
}) {
    if (isCalculatingSkillGap || !skillGapData) {
        return (
            <div className="lovable-card p-16 bg-black/40 border-white/5 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 border-4 border-saffron/20 border-t-saffron rounded-full animate-spin mb-8" />
                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-2">Calculating Skill Matrix...</h3>
                <p className="text-white/30 text-[10px] uppercase tracking-widest">Analyzing quiz + viva performance</p>
            </div>
        );
    }

    const gaps = skillGapData.skill_gaps || [];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lovable-card p-10 bg-black/60 border-saffron/20 relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-8 opacity-[0.05]">
                <TrendingUp size={160} />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row gap-12">
                {/* Left: Skill bars */}
                <div className="flex-1 space-y-8">
                    <div>
                        <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-1">
                            Skill Gap <span className="text-saffron">Telemetry</span>
                        </h2>
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest italic">
                            Overall Score: {skillGapData.overall_score}% — {skillGapData.passed ? "✓ PASSED" : "✗ NEEDS WORK"}
                        </p>
                    </div>

                    <div className="space-y-6">
                        {gaps.map((gap: any, i: number) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-white/40">{gap.name}</span>
                                    <span className={gap.status === "MASTERED" ? "text-green-400" : gap.status === "CRITICAL" ? "text-red-400" : "text-saffron"}>
                                        {gap.score}% / {gap.status}
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${gap.score}%` }}
                                        transition={{ duration: 1, delay: i * 0.2 }}
                                        className={`h-full rounded-full ${gap.status === "MASTERED" ? "bg-green-500" : gap.status === "CRITICAL" ? "bg-red-500" : "bg-saffron"}`}
                                    />
                                </div>
                                {gap.recommendation && (
                                    <p className="text-[9px] text-white/30 italic pl-1">{gap.recommendation}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Directives */}
                <div className="flex-1 p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 flex flex-col">
                    <h4 className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-6 italic">Strategic Directives</h4>
                    <div className="space-y-4 flex-1">
                        {(skillGapData.strategic_directives || []).map((d: string, i: number) => (
                            <div key={i} className="flex gap-3 group">
                                <div className="mt-1 w-4 h-4 rounded-full border border-white/10 flex items-center justify-center shrink-0 group-hover:border-saffron transition-colors">
                                    <div className="w-1.5 h-1.5 rounded-full bg-saffron/30 group-hover:bg-saffron transition-colors" />
                                </div>
                                <p className="text-xs font-bold text-white/40 group-hover:text-white/80 transition-colors italic leading-relaxed">{d}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 pt-6 border-t border-white/5">
                        <button
                            onClick={onNext}
                            className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-saffron text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all"
                        >
                            INITIALIZE NEXT TOPIC <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Step 5: Integrity Test ───────────────────────────────────────────────────

function IntegrityStep({
    conceptModule,
    integrityAnswers,
    integrityFeedback,
    integrityLoading,
    submitIntegrityAnswer,
    onComplete,
}: {
    conceptModule: any;
    integrityAnswers: Record<string, string>;
    integrityFeedback: Record<string, string>;
    integrityLoading: Record<string, boolean>;
    submitIntegrityAnswer: (id: string, answer: string) => Promise<void>;
    onComplete: () => void;
}) {
    const questions = conceptModule.integrity_test_questions || [];
    const allAnswered = questions.every((q: any) => (integrityAnswers[q.id] || "").trim().length > 0);
    // Local draft state for textarea
    const [drafts, setDrafts] = useState<Record<string, string>>({});

    return (
        <div className="lovable-card p-10 bg-black/40 border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.04]">
                <BookOpen size={160} />
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-saffron/10 border border-saffron/20 flex items-center justify-center">
                        <Target size={18} className="text-saffron" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">
                            Concept <span className="text-saffron">Integrity</span> Test
                        </h2>
                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
                            Complete all 3 questions to finalize sync
                        </p>
                    </div>
                </div>

                <div className="space-y-6 mb-8">
                    {questions.map((q: any, i: number) => (
                        <div key={q.id} className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
                            <div className="flex gap-4">
                                <div className="text-saffron text-sm font-black italic shrink-0 mt-1">{i + 1}.</div>
                                <div className="flex-1">
                                    <p className="text-sm font-black text-white uppercase tracking-wider mb-4 leading-relaxed">{q.question}</p>
                                    <textarea
                                        value={drafts[q.id] ?? (integrityAnswers[q.id] || "")}
                                        onChange={e => setDrafts(prev => ({ ...prev, [q.id]: e.target.value }))}
                                        onBlur={e => {
                                            const val = e.target.value;
                                            if (val.trim()) submitIntegrityAnswer(q.id, val);
                                        }}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-white/60 focus:outline-none focus:border-saffron/30 transition-all min-h-[100px] placeholder:text-white/10 resize-none"
                                        placeholder="COMMENCE NEURAL EXPLANATION..."
                                    />
                                    {integrityLoading[q.id] && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <Loader2 size={12} className="animate-spin text-saffron" />
                                            <span className="text-[9px] text-saffron uppercase tracking-widest font-bold">Evaluating...</span>
                                        </div>
                                    )}
                                    {integrityFeedback[q.id] && !integrityLoading[q.id] && (
                                        <div className="mt-3 p-3 rounded-xl bg-green-500/5 border border-green-500/20">
                                            <p className="text-[10px] text-green-400 font-medium italic leading-relaxed">{integrityFeedback[q.id]}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={onComplete}
                    disabled={!allAnswered}
                    className="w-full flex items-center justify-center gap-3 py-6 rounded-2xl bg-saffron text-white text-sm font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-2xl shadow-saffron/20 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    SYNC FINAL RESPONSE <ChevronRight size={20} />
                </button>
            </div>
        </div>
    );
}

// ─── Main Lesson Page ─────────────────────────────────────────────────────────

function LearningLessonContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLanguage();

    const topic = searchParams.get("topic") || "react-hooks";
    const roadmapId = searchParams.get("roadmap") || "";
    const conceptId = searchParams.get("concept") || "c1";
    const phaseId = searchParams.get("phase") || "phase_1";
    const difficulty = searchParams.get("difficulty") || "beginner";

    const hook = useConceptLearning();
    const {
        conceptModule,
        isLoading,
        error,
        currentStep,
        stepIndex,
        canAdvance,
        advanceStep,
        goBack,
        sandboxCode,
        setSandboxCode,
        sandboxOutput,
        sandboxError,
        isRunningCode,
        runSandboxCode,
        resetSandboxCode,
        quizAnswers,
        quizResults,
        quizScore,
        submitQuizAnswer,
        vivaAnswer,
        setVivaAnswer,
        vivaFeedback,
        submitVivaAnswer,
        skillGapData,
        isCalculatingSkillGap,
        calculateSkillGap,
        integrityAnswers,
        integrityFeedback,
        integrityLoading,
        submitIntegrityAnswer,
        completeIntegrityTest,
        chatMessages,
        isChatLoading,
        sendChatMessage,
        progressSaved,
        loadConcept,
        isRoadmapCompleted,
        setIsRoadmapCompleted,
    } = hook;

    const [isConceptFinished, setIsConceptFinished] = useState(false);
    const [roadmapData, setRoadmapData] = useState<any>(null);

    useEffect(() => {
        if (!conceptModule && !isLoading) {
            loadConcept(topic, roadmapId, conceptId, difficulty);
        }
    }, [topic, roadmapId, conceptId, difficulty]);

    useEffect(() => {
         if (roadmapId && !roadmapData) {
              apiClient.get(`/learning/roadmap/${roadmapId}`).then(res => setRoadmapData(res.data)).catch(console.error);
         }
    }, [roadmapId, roadmapData]);

    // Auto-calculate skill gap when entering that step
    useEffect(() => {
        if (currentStep === "skill_gap" && !skillGapData && !isCalculatingSkillGap) {
            calculateSkillGap();
        }
    }, [currentStep]);

    const handleCompleteIntegrity = async () => {
        await completeIntegrityTest(roadmapId, conceptId, phaseId);
    };

    // Listen for "complete" step
    useEffect(() => {
        if (currentStep === "complete") {
            setIsConceptFinished(true);
        }
    }, [currentStep]);

    if (isLoading || !conceptModule) {
        return (
            <PageContainer>
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                    <div className="w-16 h-16 border-4 border-saffron/20 border-t-saffron rounded-full animate-spin mb-6" />
                    <p className="text-white/30 text-xs uppercase tracking-widest font-bold">Loading concept module...</p>
                </div>
            </PageContainer>
        );
    }

    if (error) {
        return (
            <PageContainer>
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <p className="text-red-400 mb-4 font-bold tracking-widest uppercase text-xs">{error}</p>
                    <button onClick={() => loadConcept(topic, roadmapId, conceptId, difficulty)}
                        className="py-3 px-6 rounded-full border border-saffron/30 text-saffron text-xs font-black uppercase hover:bg-saffron hover:text-white transition-all">
                        Retry
                    </button>
                </div>
            </PageContainer>
        );
    }

    if (isRoadmapCompleted) {
        return (
            <PageContainer>
                <div className="max-w-4xl mx-auto py-20">
                    <RoadmapMastery topic={topic} onReview={() => { setIsRoadmapCompleted(false); }} />
                </div>
            </PageContainer>
        );
    }

    if (isConceptFinished) {
        const nextInfo = getNextConcept(conceptId, roadmapData);
        return (
             <PageContainer>
                 <div className="max-w-3xl mx-auto py-20 flex flex-col items-center justify-center text-center">
                     <div className="w-24 h-24 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-8">
                          <Check size={40} className="text-green-400" />
                     </div>
                     <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-6">
                         Module <span className="text-green-400">Completed</span>
                     </h2>
                     <p className="text-white/40 mb-10 max-w-md mx-auto leading-relaxed">
                         You have successfully mastered <b>{conceptModule?.title || topic}</b>. Your progress has been automatically synced to the roadmap.
                     </p>

                     <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md items-center justify-center">
                         {nextInfo ? (
                             <button
                                 onClick={() => {
                                      setIsConceptFinished(false);
                                      hook.setActiveStep(1); 
                                      router.push(`/learning/lesson?roadmap=${roadmapId}&topic=${topic}&concept=${nextInfo.conceptId}&phase=${nextInfo.phaseId}`);
                                 }}
                                 className="flex-1 w-full py-4 bg-saffron text-white rounded-2xl font-black uppercase text-xs tracking-widest flex justify-center items-center gap-2 hover:brightness-110 shadow-lg shadow-saffron/20"
                             >
                                 Continue <ArrowRight size={16} />
                             </button>
                         ) : (
                             <button
                                 onClick={() => router.push(`/learning/recommendation/${roadmapId}`)}
                                 className="flex-1 w-full py-4 bg-green-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex justify-center items-center gap-2 hover:brightness-110 shadow-lg shadow-green-500/20"
                             >
                                 Complete Course <Check size={16} />
                             </button>
                         )}
                         <button
                             onClick={() => router.push(`/learning/roadmap/${roadmapId}`)}
                             className="flex-1 w-full py-4 border border-white/20 text-white/60 hover:text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-colors"
                         >
                             Exit to Roadmap
                         </button>
                     </div>
                 </div>
             </PageContainer>
        );
    }

    const steps = [
        { id: "concept" as LearningStep, label: "Neural Overview", icon: Brain },
        { id: "sandbox" as LearningStep, label: "Interactive Practice", icon: Terminal },
        { id: "quiz" as LearningStep, label: "Assessment Pulse", icon: Zap },
        { id: "skill_gap" as LearningStep, label: "Synthesis Report", icon: ShieldCheck },
        { id: "integrity" as LearningStep, label: "Concept Evaluation", icon: ListChecks },
    ];

    return (
        <AnimatePresence mode="wait">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12 px-4">
                    <div>
                        <h3 className="text-[10px] font-black text-saffron uppercase tracking-[0.4em] mb-2 italic flex items-center gap-2">
                            <Sparkles size={12} className="animate-pulse" /> Structured Training
                        </h3>
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
                            {conceptModule.title || topic}
                        </h1>
                        <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mt-2">
                            {difficulty.toUpperCase()} • ~{conceptModule.estimated_time_minutes || 30} min
                        </p>
                    </div>

                    {/* Step nodes */}
                    <div className="flex items-center gap-2 bg-white/[0.03] border border-white/5 p-2 rounded-[2.5rem]">
                        {steps.map((step, i) => (
                            <button
                                key={step.id}
                                onClick={() => hook.setActiveStep(i + 1)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 relative ${currentStep === step.id
                                    ? "bg-white text-black shadow-xl"
                                    : stepIndex > i
                                        ? "bg-green-500/20 text-green-400 border border-green-500/40"
                                        : "text-white/20 hover:text-white/40"
                                    }`}
                                title={step.label}
                            >
                                <step.icon size={16} />
                                {currentStep === step.id && (
                                    <motion.div layoutId="active-step-ring" className="absolute -inset-1 rounded-full border border-white/20" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-32">
                    {/* Main content */}
                    <div className="lg:col-span-8">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.35 }}
                            >
                                {currentStep === "concept" && (
                                    <ConceptStep
                                        conceptModule={conceptModule}
                                        chatMessages={chatMessages}
                                        isChatLoading={isChatLoading}
                                        sendChatMessage={sendChatMessage}
                                    />
                                )}
                                {currentStep === "sandbox" && (
                                    <SandboxStep
                                        sandboxCode={sandboxCode}
                                        setSandboxCode={setSandboxCode}
                                        sandboxOutput={sandboxOutput}
                                        sandboxError={sandboxError}
                                        isRunningCode={isRunningCode}
                                        runSandboxCode={runSandboxCode}
                                        resetSandboxCode={resetSandboxCode}
                                        language={conceptModule.sandbox_language || "javascript"}
                                    />
                                )}
                                {currentStep === "quiz" && (
                                    <QuizVivaStep
                                        conceptModule={conceptModule}
                                        quizAnswers={quizAnswers}
                                        quizResults={quizResults}
                                        quizScore={quizScore}
                                        submitQuizAnswer={submitQuizAnswer}
                                        vivaAnswer={vivaAnswer}
                                        setVivaAnswer={setVivaAnswer}
                                        vivaFeedback={vivaFeedback}
                                        submitVivaAnswer={submitVivaAnswer}
                                        isChatLoading={isChatLoading}
                                    />
                                )}
                                {currentStep === "skill_gap" && (
                                    <SkillGapStep
                                        skillGapData={skillGapData}
                                        isCalculatingSkillGap={isCalculatingSkillGap}
                                        onNext={advanceStep}
                                    />
                                )}
                                {currentStep === "integrity" && (
                                    <IntegrityStep
                                        conceptModule={conceptModule}
                                        integrityAnswers={integrityAnswers}
                                        integrityFeedback={integrityFeedback}
                                        integrityLoading={integrityLoading}
                                        submitIntegrityAnswer={submitIntegrityAnswer}
                                        onComplete={handleCompleteIntegrity}
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>

                        {/* Navigation — shown on concept, sandbox, quiz steps only */}
                        {currentStep !== "integrity" && currentStep !== "skill_gap" && currentStep !== "complete" && (
                            <div className="mt-12 pt-8 border-t border-white/5 flex justify-between items-center px-4">
                                <button
                                    onClick={goBack}
                                    disabled={stepIndex === 0}
                                    className={`flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] transition-all ${stepIndex === 0 ? "text-white/5 cursor-not-allowed" : "text-white/30 hover:text-white"}`}
                                >
                                    <ChevronLeft size={16} /> RE-SYNC PREVIOUS
                                </button>

                                <button
                                    onClick={advanceStep}
                                    className="px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.4em] transition-all flex items-center gap-4 bg-saffron text-white shadow-2xl shadow-saffron/20 hover:scale-105 active:scale-95"
                                >
                                    {currentStep === "concept" ? "INITIALIZE SANDBOX" :
                                        currentStep === "sandbox" ? "START ASSESSMENT" :
                                            "INITIALIZE NEXT SYNC"}
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right panel: Chat */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="lovable-card p-8 bg-white/[0.02] border border-white/5">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6">AI SYNC PANEL</h3>

                            <div className="space-y-4 max-h-80 overflow-y-auto custom-scrollbar mb-4">
                                {chatMessages.length === 0 ? (
                                    <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest italic text-center py-8">
                                        Ask a question to start AI sync
                                    </p>
                                ) : (
                                    chatMessages.map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                            <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed font-medium ${msg.role === "user"
                                                ? "bg-saffron/20 border border-saffron/30 text-white ml-4"
                                                : "bg-white/5 border border-white/10 text-white/70"
                                                }`}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    ))
                                )}
                                {isChatLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                                            <div className="flex gap-1">
                                                <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                                <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                                <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Quick chat input */}
                            <QuickChat onSend={sendChatMessage} disabled={isChatLoading} />
                        </div>

                        <div className="p-6 rounded-[2rem] bg-orange-500/10 border border-orange-500/20">
                            <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3">Journey Alert</h4>
                            <p className="text-xs text-white/40 leading-relaxed italic">
                                Complete all 5 steps to mark this concept as done and unlock the next one.
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

function QuickChat({ onSend, disabled }: { onSend: (q: string) => Promise<string>; disabled: boolean }) {
    const [input, setInput] = useState("");

    const handleSend = () => {
        if (!input.trim() || disabled) return;
        onSend(input.trim());
        setInput("");
    };

    return (
        <div className="flex gap-2">
            <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder="Ask about concept..."
                className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-saffron/40 transition-all placeholder:text-white/10"
            />
            <button
                onClick={handleSend}
                disabled={disabled || !input.trim()}
                className="w-10 h-10 rounded-xl bg-saffron/10 border border-saffron/30 text-saffron flex items-center justify-center hover:bg-saffron hover:text-white transition-all disabled:opacity-30"
            >
                <Send size={14} />
            </button>
        </div>
    );
}

export default function LearningLessonPage() {
    return (
        <PageContainer>
            <Suspense fallback={<Loader />}>
                <LearningLessonContent />
            </Suspense>
        </PageContainer>
    );
}