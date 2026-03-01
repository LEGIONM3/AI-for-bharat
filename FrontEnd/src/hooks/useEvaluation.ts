"use client";

import { useState } from "react";
import { evaluationService } from "@/services/evaluationService";

export default function useEvaluation() {
    const [question, setQuestion] = useState<any>(null);
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const fetchQuestion = async (repoId?: string, topic?: string) => {
        setLoading(true);
        const data = await evaluationService.getQuestion(repoId, topic);
        setQuestion(data);
        setLoading(false);
    };

    const evaluateAnswer = async (answer: string) => {
        setLoading(true);
        const evaluationResults = await evaluationService.evaluateAnswer(answer);
        setResult(evaluationResults);
        setLoading(false);
    };

    return {
        question,
        result,
        loading,
        fetchQuestion,
        evaluateAnswer
    };
}