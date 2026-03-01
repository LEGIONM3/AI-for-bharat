import { apiClient } from "@/services/apiClient";

export const assessmentVoiceService = {
    /**
     * Call Polly to generate TTS audio for a question.
     * Returns the S3 presigned URL.
     */
    getQuestionAudio: async (
        assessmentId: string,
        questionId: string,
        questionText: string
    ): Promise<string> => {
        const { data } = await apiClient.post(
            "/assessment/voice/question-audio",
            {
                assessment_id: assessmentId,
                question_id: questionId,
                question_text: questionText,
            }
        );
        return data.audio_url as string;
    },

    /**
     * Upload recorded audio blob and return the transcript from Transcribe.
     */
    transcribeAnswer: async (
        audioBlob: Blob,
        assessmentId: string,
        questionId: string
    ): Promise<string> => {
        const formData = new FormData();
        formData.append("audio", audioBlob, `answer_${questionId}.webm`);
        formData.append("assessment_id", assessmentId);
        formData.append("question_id", questionId);

        const { data } = await apiClient.post(
            "/assessment/voice/transcribe-answer",
            formData,
            {
                headers: { "Content-Type": "multipart/form-data" },
                timeout: 60_000, // Transcribe can take up to 30 s + network
            }
        );
        return data.transcript as string;
    },

    /**
     * Delete all Polly question audio + recorded answers from S3.
     * Call after the assessment completes.
     */
    cleanupAudio: async (assessmentId: string): Promise<void> => {
        try {
            await apiClient.post("/assessment/voice/cleanup", {
                assessment_id: assessmentId,
            });
        } catch {
            // Non-fatal — log but don't crash the results screen
            console.warn("Audio cleanup failed — S3 files may linger until TTL.");
        }
    },
};
