import apiClient from "./apiClient";

export const learningService = {
    getRoadmap: async (topic: string, level: string, goal: string) => {
        const { data } = await apiClient.post("/learning/roadmap", {
            goal: goal || topic,
            stack: [topic],
            timeline: "2 weeks",
            current_level: level
        });

        // Map backend's roadmap phase concepts to the local step format
        const steps: any[] = [];
        if (data && data.phases) {
            data.phases.forEach((phase: any) => {
                if (phase.concepts) {
                    phase.concepts.forEach((concept: any) => {
                        steps.push({
                            id: concept.id,
                            step: concept.name,
                            done: concept.completed || false
                        });
                    });
                }
            });
        }
        return steps;
    },

    getCurrentLesson: async (lessonId?: string) => {
        // Backend module generation takes `topic`. If lessonId provided we use it.
        const { data } = await apiClient.post("/learning/module", { topic: lessonId || "general" });
        const sectionsText = data.sections?.map((s: any) => s.content).join("\n\n") || "";
        const codeText = data.code_examples?.map((c: any) => c.code).join("\n\n") || "";

        return {
            title: data.title || lessonId,
            content: sectionsText + "\n\n" + codeText,
            audio_url: "", // Can be filled by voiceService later
            quiz_question: data.quiz_questions?.[0]?.question || "No quiz available.",
            viva_question: data.viva_questions?.[0]?.question || "Explain what you learned.",
            practice_code: data.sandbox_starter_code || data.code_examples?.[0]?.code || "// Write code here"
        };
    },

    updateProgress: async (roadmapId: string, phaseIndex: number, completed: boolean = true) => {
        const { data } = await apiClient.post(`/learning/roadmap/${roadmapId}/progress`, {
            phase_index: phaseIndex,
            completed: completed
        });
        return data;
    }
};
