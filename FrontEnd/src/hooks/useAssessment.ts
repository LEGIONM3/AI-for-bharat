"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { evaluationService } from "@/services/evaluationService";
import type {
    AssessmentState,
    AssessmentQuestion,
} from "@/types/evaluation";

const INITIAL_STATE: AssessmentState = {
    screen: "setup",
    assessmentId: null,
    topic: "",
    numQuestions: 5,
    questions: [],
    currentQuestionIndex: 0,
    localAnswers: {},
    results: null,
    isLoading: false,
    error: null,
    currentFeedback: null,
    isSubmittingAnswer: false,
};

export default function useAssessment() {
    const [state, setState] = useState<AssessmentState>(INITIAL_STATE);

    // Ref always mirrors fresh state — lets useCallback read current values
    // without adding `state` to dependency arrays (which causes stale closures)
    const stateRef = useRef<AssessmentState>(state);
    useEffect(() => { stateRef.current = state; }, [state]);

    // isMounted guard — prevents setState after unmount
    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // Safe, typed setState helper
    const merge = useCallback((patch: Partial<AssessmentState>) => {
        if (!isMountedRef.current) return;
        setState(prev => ({ ...prev, ...patch }));
    }, []);

    // Single-field setter
    const setField = useCallback(<K extends keyof AssessmentState>(key: K, value: AssessmentState[K]) => {
        if (!isMountedRef.current) return;
        setState(prev => ({ ...prev, [key]: value }));
    }, []);

    // ─── SCREEN 1 → START ────────────────────────────────────────────
    const startAssessment = useCallback(async (topic: string, numQuestions: number, mode: string = "text") => {
        if (!topic.trim()) {
            setField("error", "Please enter a topic to assess.");
            return;
        }
        merge({ isLoading: true, error: null, screen: "setup" });
        try {
            const data = await evaluationService.startAssessment(topic.trim(), numQuestions, mode);

            if (!data.questions || data.questions.length === 0) {
                merge({ isLoading: false, error: "No questions generated for this topic. Try a different topic." });
                return;
            }

            merge({
                isLoading: false,
                error: null,
                screen: "active",
                assessmentId: data.assessment_id,
                topic: data.topic || topic,
                questions: data.questions,
                currentQuestionIndex: 0,
                localAnswers: {},
                currentFeedback: null,
                results: null,
            });
        } catch (err: any) {
            merge({
                isLoading: false,
                error: evaluationService.mapError(err) || "Failed to generate questions. Please try again.",
            });
        }
    }, [merge, setField]);

    // ─── SCREEN 3 → FETCH RESULTS (declared before submitAnswer uses it) ──
    const fetchResults = useCallback(async (assessmentId: string) => {
        merge({ isLoading: true, error: null });
        try {
            const results = await evaluationService.getResults(assessmentId);
            if (isMountedRef.current) {
                setState(prev => ({ ...prev, isLoading: false, results, screen: "results" }));
            }
        } catch {
            merge({ isLoading: false, error: "Failed to load results. Showing local summary." });
        }
    }, [merge]);

    // ─── SCREEN 2 → SUBMIT ANSWER ─────────────────────────────────────
    const submitAnswer = useCallback(async (questionId: string, answer: string) => {
        // Read fresh state via ref — avoids stale closure without adding state to deps
        const { assessmentId, localAnswers, currentQuestionIndex, questions } = stateRef.current;
        if (!assessmentId) return;

        const updatedAnswers = { ...localAnswers, [questionId]: answer };
        merge({ isSubmittingAnswer: true, error: null, localAnswers: updatedAnswers });

        try {
            const feedback = await evaluationService.submitAnswer(assessmentId, questionId, answer);
            const isLast = currentQuestionIndex >= questions.length - 1;

            merge({ isSubmittingAnswer: false, currentFeedback: feedback });

            // Auto-advance after 2.2s feedback display
            const timer = setTimeout(() => {
                if (!isMountedRef.current) return;
                if (isLast) {
                    setState(prev => ({ ...prev, screen: "results", currentFeedback: null }));
                    fetchResults(assessmentId);
                } else {
                    setState(prev => ({
                        ...prev,
                        currentQuestionIndex: prev.currentQuestionIndex + 1,
                        currentFeedback: null,
                    }));
                }
            }, 2200);

            // Note: timer is intentionally not cleared on unmount here because
            // the isMountedRef guard inside the timeout handles the unmount case
            void timer;

        } catch {
            merge({ isSubmittingAnswer: false, error: "Failed to submit answer. Your answer is saved locally." });
        }
    }, [merge, fetchResults]); // stateRef is a ref — stable, no dep needed

    // ─── Skip question (no answer) ────────────────────────────────────
    const skipQuestion = useCallback(() => {
        const { currentQuestionIndex, questions, assessmentId } = stateRef.current;
        const isLast = currentQuestionIndex >= questions.length - 1;
        if (isLast) {
            setState(prev => ({ ...prev, screen: "results", currentFeedback: null }));
            if (assessmentId) fetchResults(assessmentId);
        } else {
            setState(prev => ({
                ...prev,
                currentQuestionIndex: prev.currentQuestionIndex + 1,
                currentFeedback: null,
            }));
        }
    }, [fetchResults]);

    // ─── RESET ────────────────────────────────────────────────────────
    const resetAssessment = useCallback(() => {
        if (isMountedRef.current) setState(INITIAL_STATE);
    }, []);

    const resetWithTopic = useCallback((topic: string) => {
        if (isMountedRef.current) setState({ ...INITIAL_STATE, topic });
    }, []);

    // ─── SETTERS ──────────────────────────────────────────────────────
    const setTopic = useCallback((t: string) => setField("topic", t), [setField]);
    const setNumQuestions = useCallback((n: number) => setField("numQuestions", n), [setField]);
    const clearError = useCallback(() => setField("error", null), [setField]);

    return {
        ...state,
        startAssessment,
        submitAnswer,
        skipQuestion,
        fetchResults,
        resetAssessment,
        resetWithTopic,
        setTopic,
        setNumQuestions,
        clearError,
    };
}
