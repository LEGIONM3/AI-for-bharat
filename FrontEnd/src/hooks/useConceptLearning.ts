"use client";

import { useState, useCallback, useRef } from "react";
import apiClient from "@/services/apiClient";

// ─── Types ───────────────────────────────────────────────────────────────────

export type LearningStep = "concept" | "sandbox" | "quiz" | "skill_gap" | "integrity" | "complete";

export interface ConceptSection {
    title: string;
    content: string;
    key_points: string[];
}

export interface CodeExample {
    title: string;
    language: string;
    code: string;
    explanation: string;
}

export interface QuizQuestion {
    id: string;
    question: string;
    options: string[];
    correct_answer: string;
    explanation: string;
}

export interface VivaQuestion {
    id: string;
    question: string;
    ideal_answer: string;
}

export interface IntegrityQuestion {
    id: string;
    question: string;
    ideal_answer: string;
}

export interface SkillArea {
    name: string;
    description: string;
}

export interface ConceptModule {
    title: string;
    topic: string;
    difficulty: string;
    estimated_time_minutes: number;
    sections: ConceptSection[];
    code_examples: CodeExample[];
    sandbox_starter_code: string;
    sandbox_language: string;
    quiz_questions: QuizQuestion[];
    viva_questions: VivaQuestion[];
    integrity_test_questions: IntegrityQuestion[];
    skill_areas: SkillArea[];
}

export interface ChatMessage {
    role: "user" | "ai";
    content: string;
    timestamp: Date;
}

export interface SkillGapResult {
    skill_gaps: Array<{
        name: string;
        score: number;
        status: "MASTERED" | "DEVELOPING" | "CRITICAL";
        recommendation: string;
    }>;
    overall_score: number;
    strategic_directives: string[];
    passed: boolean;
}

// Step order — 0-indexed, maps to LearningStep
export const STEPS: LearningStep[] = ["concept", "sandbox", "quiz", "skill_gap", "integrity", "complete"];

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useConceptLearning() {
    // Core state
    const [currentStep, setCurrentStep] = useState<LearningStep>("concept");
    const [stepIndex, setStepIndex] = useState(0);
    const [conceptModule, setConceptModule] = useState<ConceptModule | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Quiz state
    const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
    const [quizResults, setQuizResults] = useState<Record<string, boolean>>({});
    const [quizScore, setQuizScore] = useState(0);

    // Viva state
    const [vivaAnswer, setVivaAnswer] = useState("");
    const [vivaFeedback, setVivaFeedback] = useState("");
    const [vivaScore, setVivaScore] = useState(0);

    // Skill gap state
    const [skillGapData, setSkillGapData] = useState<SkillGapResult | null>(null);
    const [isCalculatingSkillGap, setIsCalculatingSkillGap] = useState(false);

    // Integrity state
    const [integrityAnswers, setIntegrityAnswers] = useState<Record<string, string>>({});
    const [integrityFeedback, setIntegrityFeedback] = useState<Record<string, string>>({});
    const [integrityLoading, setIntegrityLoading] = useState<Record<string, boolean>>({});

    // Sandbox state
    const [sandboxCode, setSandboxCode] = useState("");
    const [sandboxOutput, setSandboxOutput] = useState<string | null>(null);
    const [sandboxError, setSandboxError] = useState<string | null>(null);
    const [isRunningCode, setIsRunningCode] = useState(false);

    // Chat state
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    // Progress state
    const [progressSaved, setProgressSaved] = useState(false);

    // Keep ref to original starter code
    const originalCodeRef = useRef<string>("");

    // ─── loadConcept ──────────────────────────────────────────────────────────

    const loadConcept = useCallback(async (
        topic: string,
        roadmapId: string,
        conceptId: string,
        difficulty: string = "beginner"
    ) => {
        setIsLoading(true);
        setError(null);
        try {
            const { data } = await apiClient.post("/learning/concept", {
                topic,
                roadmap_id: roadmapId,
                concept_id: conceptId,
                difficulty
            });
            const module = data as ConceptModule;
            setConceptModule(module);
            const starter = module.sandbox_starter_code || `// Practice ${topic} here\n`;
            setSandboxCode(starter);
            originalCodeRef.current = starter;
        } catch (e: any) {
            const msg = e?.response?.data?.detail || "Failed to load concept module";
            setError(msg);
            console.error("Failed to load concept module", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ─── Step navigation ──────────────────────────────────────────────────────

    const canAdvance = useCallback((): boolean => {
        switch (currentStep) {
            case "concept":
                return true;
            case "sandbox":
                return true;
            case "quiz": {
                if (!conceptModule) return false;
                const allAnswered = conceptModule.quiz_questions.every(q => quizAnswers[q.id]);
                return allAnswered && vivaAnswer.trim().length > 0;
            }
            case "skill_gap":
                return !!skillGapData;
            case "integrity": {
                if (!conceptModule) return false;
                return conceptModule.integrity_test_questions.every(
                    q => (integrityAnswers[q.id] || "").trim().length > 0
                );
            }
            case "complete":
                return false;
            default:
                return true;
        }
    }, [currentStep, conceptModule, quizAnswers, vivaAnswer, skillGapData, integrityAnswers]);

    const advanceStep = useCallback(() => {
        const nextIdx = stepIndex + 1;
        if (nextIdx < STEPS.length) {
            setStepIndex(nextIdx);
            setCurrentStep(STEPS[nextIdx]);
        }
    }, [stepIndex]);

    const goBack = useCallback(() => {
        const prevIdx = stepIndex - 1;
        if (prevIdx >= 0) {
            setStepIndex(prevIdx);
            setCurrentStep(STEPS[prevIdx]);
        }
    }, [stepIndex]);

    // ─── Quiz ─────────────────────────────────────────────────────────────────

    const submitQuizAnswer = useCallback((questionId: string, answer: string) => {
        if (!conceptModule) return;
        const question = conceptModule.quiz_questions.find(q => q.id === questionId);
        if (!question) return;

        const isCorrect = answer.trim().toUpperCase().startsWith(question.correct_answer.trim().toUpperCase());
        const newAnswers = { ...quizAnswers, [questionId]: answer };
        const newResults = { ...quizResults, [questionId]: isCorrect };

        setQuizAnswers(newAnswers);
        setQuizResults(newResults);

        // Recalculate quiz score
        const allQuestions = conceptModule.quiz_questions;
        const correctCount = allQuestions.filter(q => newResults[q.id] === true).length;
        const pct = Math.round((correctCount / allQuestions.length) * 100);
        setQuizScore(pct);
    }, [conceptModule, quizAnswers, quizResults]);

    // ─── Viva ─────────────────────────────────────────────────────────────────

    const submitVivaAnswer = useCallback(async (answer: string): Promise<string> => {
        if (!conceptModule) return "";
        setVivaAnswer(answer);
        setIsChatLoading(true);
        try {
            const vivaQ = conceptModule.viva_questions[0];
            const prompt = `Viva question: ${vivaQ?.question || "Explain the concept"}\n\nStudent answer: ${answer}\n\nEvaluate this answer briefly and give feedback.`;
            const { data } = await apiClient.post("/learning/concept-chat", {
                topic: conceptModule.topic,
                concept_content: conceptModule.sections.map(s => s.title + ": " + s.content).join("\n"),
                question: prompt
            });
            const feedback = data.response || "";
            setVivaFeedback(feedback);

            // Estimate score from feedback
            const lower = feedback.toLowerCase();
            if (lower.includes("excellent") || lower.includes("correct") || lower.includes("great") || lower.includes("well")) {
                setVivaScore(85);
            } else if (lower.includes("partial") || lower.includes("good") || lower.includes("some")) {
                setVivaScore(60);
            } else if (lower.includes("incorrect") || lower.includes("wrong") || lower.includes("missing")) {
                setVivaScore(30);
            } else {
                setVivaScore(65);
            }
            return feedback;
        } catch (e) {
            console.error("Viva evaluation error", e);
            setVivaFeedback("Could not evaluate your answer. Please try again.");
            return "";
        } finally {
            setIsChatLoading(false);
        }
    }, [conceptModule]);

    // ─── Sandbox ──────────────────────────────────────────────────────────────

    const runSandboxCode = useCallback(async (code: string, language?: string) => {
        setIsRunningCode(true);
        setSandboxOutput(null);
        setSandboxError(null);

        const lang = language || conceptModule?.sandbox_language || "javascript";

        if (lang === "javascript" || lang === "js") {
            // Client-side eval with captured console.log
            try {
                const logs: string[] = [];
                const origLog = console.log;
                const origError = console.error;
                const origWarn = console.warn;

                console.log = (...args: any[]) => {
                    logs.push(args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" "));
                };
                console.error = (...args: any[]) => {
                    logs.push("[ERROR] " + args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" "));
                };
                console.warn = (...args: any[]) => {
                    logs.push("[WARN] " + args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" "));
                };

                try {
                    // eslint-disable-next-line no-eval
                    eval(code);
                } catch (evalErr: any) {
                    setSandboxError(evalErr.message || "Runtime error");
                } finally {
                    console.log = origLog;
                    console.error = origError;
                    console.warn = origWarn;
                }

                if (logs.length > 0) {
                    setSandboxOutput(logs.join("\n"));
                } else if (!sandboxError) {
                    setSandboxOutput("(no output — use console.log() to see results)");
                }
            } catch (e: any) {
                setSandboxError(e.message || "Execution failed");
            }
        } else {
            // Python or other — send to backend
            try {
                const { data } = await apiClient.post("/playground/run", {
                    code,
                    language: lang
                });
                if (data.error) {
                    setSandboxError(data.error);
                } else {
                    setSandboxOutput(data.output || "(no output)");
                }
            } catch (e: any) {
                setSandboxError(e?.response?.data?.detail || "Execution failed");
            }
        }

        setIsRunningCode(false);
    }, [conceptModule, sandboxError]);

    const resetSandboxCode = useCallback(() => {
        const original = originalCodeRef.current || conceptModule?.sandbox_starter_code || "";
        setSandboxCode(original);
        setSandboxOutput(null);
        setSandboxError(null);
    }, [conceptModule]);

    // ─── Chat ─────────────────────────────────────────────────────────────────

    const sendChatMessage = useCallback(async (question: string): Promise<string> => {
        if (!conceptModule) return "";

        const userMsg: ChatMessage = { role: "user", content: question, timestamp: new Date() };
        setChatMessages(prev => [...prev, userMsg]);
        setIsChatLoading(true);

        try {
            const { data } = await apiClient.post("/learning/concept-chat", {
                topic: conceptModule.topic,
                concept_content: conceptModule.sections.map(s => s.title + ": " + s.content).join("\n").slice(0, 1000),
                question
            });
            const response = data.response || "No response received.";
            const aiMsg: ChatMessage = { role: "ai", content: response, timestamp: new Date() };
            setChatMessages(prev => [...prev, aiMsg]);
            return response;
        } catch (e) {
            const errMsg = "Failed to get AI response. Please try again.";
            const aiMsg: ChatMessage = { role: "ai", content: errMsg, timestamp: new Date() };
            setChatMessages(prev => [...prev, aiMsg]);
            return errMsg;
        } finally {
            setIsChatLoading(false);
        }
    }, [conceptModule]);

    // ─── Skill Gap ────────────────────────────────────────────────────────────

    const calculateSkillGap = useCallback(async () => {
        if (!conceptModule) return;
        setIsCalculatingSkillGap(true);
        try {
            const { data } = await apiClient.post("/learning/skill-gap", {
                topic: conceptModule.topic,
                skill_areas: conceptModule.skill_areas.map(s => s.name),
                quiz_score: quizScore,
                viva_score: vivaScore,
                quiz_answers: Object.entries(quizAnswers).map(([id, answer]) => ({ id, answer })),
                viva_answers: vivaAnswer ? [{ question: conceptModule.viva_questions[0]?.question, answer: vivaAnswer }] : []
            });
            setSkillGapData(data as SkillGapResult);
            return data;
        } catch (e) {
            console.error("Skill gap error", e);
            // Return mock data if API fails so flow isn't blocked
            const fallback: SkillGapResult = {
                skill_gaps: conceptModule.skill_areas.map(area => ({
                    name: area.name,
                    score: Math.round((quizScore + vivaScore) / 2),
                    status: quizScore >= 70 ? "MASTERED" : quizScore >= 40 ? "DEVELOPING" : "CRITICAL",
                    recommendation: quizScore >= 70 ? "Keep up the great work!" : "Review the concept and practice more."
                })),
                overall_score: Math.round((quizScore + vivaScore) / 2),
                strategic_directives: ["Review concept sections again", "Practice with the sandbox", "Complete integrity test"],
                passed: ((quizScore + vivaScore) / 2) >= 60
            };
            setSkillGapData(fallback);
            return fallback;
        } finally {
            setIsCalculatingSkillGap(false);
        }
    }, [conceptModule, quizScore, vivaScore, quizAnswers, vivaAnswer]);

    // ─── Integrity test ───────────────────────────────────────────────────────

    const submitIntegrityAnswer = useCallback(async (questionId: string, answer: string) => {
        if (!conceptModule) return;

        setIntegrityAnswers(prev => ({ ...prev, [questionId]: answer }));
        setIntegrityLoading(prev => ({ ...prev, [questionId]: true }));

        const question = conceptModule.integrity_test_questions.find(q => q.id === questionId);

        try {
            const { data } = await apiClient.post("/learning/concept-chat", {
                topic: conceptModule.topic,
                concept_content: question?.ideal_answer || "",
                question: `Briefly evaluate this answer in 1-2 sentences: "${answer}" (for: ${question?.question})`
            });
            setIntegrityFeedback(prev => ({ ...prev, [questionId]: data.response || "Answer recorded." }));
        } catch {
            setIntegrityFeedback(prev => ({ ...prev, [questionId]: "Answer recorded." }));
        } finally {
            setIntegrityLoading(prev => ({ ...prev, [questionId]: false }));
        }
    }, [conceptModule]);

    const completeIntegrityTest = useCallback(async (
        roadmapId: string,
        conceptId: string,
        phaseId: string
    ) => {
        try {
            const overallScore = skillGapData?.overall_score || Math.round((quizScore + vivaScore) / 2);
            await apiClient.post("/learning/concept-progress", {
                roadmap_id: roadmapId,
                concept_id: conceptId,
                phase_id: phaseId,
                step: "complete",
                score: overallScore,
                completed: true
            });
            setProgressSaved(true);
            setStepIndex(STEPS.length - 1);
            setCurrentStep("complete");
        } catch (e) {
            console.error("Failed to save concept progress", e);
            // Still advance to complete even on error
            setProgressSaved(false);
            setStepIndex(STEPS.length - 1);
            setCurrentStep("complete");
        }
    }, [skillGapData, quizScore, vivaScore]);

    // ─── Legacy helpers ───────────────────────────────────────────────────────

    const sendConceptChat = useCallback(async (topic: string, question: string): Promise<string> => {
        return sendChatMessage(question);
    }, [sendChatMessage]);

    const saveConceptProgress = useCallback(async (
        roadmap_id: string,
        concept_id: string,
        phase_id: string,
        step: string,
        score: number,
        completed: boolean
    ) => {
        try {
            const { data } = await apiClient.post("/learning/concept-progress", {
                roadmap_id, concept_id, phase_id, step, score, completed
            });
            return data;
        } catch (e) {
            console.error(e);
        }
    }, []);

    return {
        // State
        currentStep,
        stepIndex,
        conceptModule,
        isLoading,
        error,

        // Quiz
        quizAnswers,
        quizResults,
        quizScore,
        submitQuizAnswer,

        // Viva
        vivaAnswer,
        setVivaAnswer,
        vivaFeedback,
        vivaScore,
        submitVivaAnswer,

        // Skill gap
        skillGapData,
        isCalculatingSkillGap,
        calculateSkillGap,

        // Integrity
        integrityAnswers,
        integrityFeedback,
        integrityLoading,
        submitIntegrityAnswer,
        completeIntegrityTest,

        // Sandbox
        sandboxCode,
        setSandboxCode,
        sandboxOutput,
        sandboxError,
        isRunningCode,
        runSandboxCode,
        resetSandboxCode,

        // Chat
        chatMessages,
        isChatLoading,
        sendChatMessage,

        // Progress
        progressSaved,

        // Navigation
        canAdvance,
        advanceStep,
        goBack,

        // Actions
        loadConcept,

        // Legacy (used by existing lesson page)
        moduleData: conceptModule,
        loading: isLoading,
        activeStep: stepIndex + 1,
        setActiveStep: (s: number) => {
            const idx = s - 1;
            if (idx >= 0 && idx < STEPS.length) {
                setStepIndex(idx);
                setCurrentStep(STEPS[idx]);
            }
        },
        sendConceptChat,
        saveConceptProgress,
        skillGap: skillGapData,
        setQuizAnswers: (answers: any[]) => { /* legacy compat */ },
        setVivaAnswers: (answers: any[]) => { /* legacy compat */ },
        progressLoading: false
    };
}
