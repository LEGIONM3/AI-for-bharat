import apiClient from "./apiClient";
import type { AssessmentResults, AnswerFeedback } from "@/types/evaluation";

function mapError(err: any): string {
    const status = err.response?.status;
    if (status === 401) return "Please login to take assessments.";
    if (status === 422) return "Invalid request. Please check your input.";
    if (status === 500) return "Server error. Please try again.";
    if (!err.response) return "Cannot connect to server. Is the backend running?";
    return err.response?.data?.detail || "Request failed.";
}

export const evaluationService = {
    /** POST /assessment/start */
    startAssessment: async (topic: string, numQuestions: number, mode: string = "text") => {
        const { data } = await apiClient.post("/assessment/start", {
            topic,
            num_questions: numQuestions,
            mode,
        });
        return {
            assessment_id: data.assessment_id as string,
            topic: data.topic as string,
            questions: data.questions ?? [],
            total_questions: data.total_questions ?? numQuestions,
        };
    },

    /** POST /assessment/answer */
    submitAnswer: async (
        assessmentId: string,
        questionId: string,
        answer: string
    ): Promise<AnswerFeedback> => {
        const { data } = await apiClient.post("/assessment/answer", {
            assessment_id: assessmentId,
            question_id: questionId,
            answer,
        });
        return {
            assessment_id: data.assessment_id,
            question_id: data.question_id,
            score: data.score ?? 0,
            feedback: data.feedback ?? "",
            is_correct: data.is_correct ?? false,
            detailed_feedback: data.detailed_feedback ?? "",
            skill_gaps: data.skill_gaps ?? [],
        };
    },

    /** GET /assessment/results/{assessment_id} */
    getResults: async (assessmentId: string): Promise<AssessmentResults> => {
        const { data } = await apiClient.get(`/assessment/results/${assessmentId}`);
        return data as AssessmentResults;
    },

    /** Legacy shim for useEvaluation.ts (Code Lab tab) */
    getQuestion: async (repoId?: string, topic?: string) => {
        const payload: any = { topic: topic || "General Programming", num_questions: 1 };
        if (repoId) payload.repo_id = repoId;
        const { data } = await apiClient.post("/assessment/start", payload);
        const question = data?.questions?.[0];
        return {
            assessmentId: data?.assessment_id,
            questionId: question?.id,
            question: question?.question || "No question generated.",
        };
    },

    /** Legacy shim for useEvaluation.ts (Code Lab tab) */
    evaluateAnswer: async (answer: string, assessmentId?: string, questionId?: string) => {
        if (!assessmentId || !questionId) {
            return { score: 0, feedback: "No assessment context.", gaps: [], is_correct: false };
        }
        const { data } = await apiClient.post("/assessment/answer", {
            assessment_id: assessmentId,
            question_id: questionId,
            answer,
        });
        return {
            score: data?.score ?? 0,
            feedback: data?.feedback || "",
            gaps: data?.skill_gaps || [],
            is_correct: data?.is_correct || false,
        };
    },

    mapError,
};
