"use client";

import { useState, useRef, useCallback } from "react";

export type RecordingState =
    | "idle"
    | "recording"
    | "processing"
    | "done"
    | "error";

export function useVoiceRecorder() {
    const [state, setState] = useState<RecordingState>("idle");
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const startRecording = useCallback(async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Use opus/webm if supported, fall back gracefully
            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus"
                : "audio/webm";

            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (e: BlobEvent) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            recorder.start(100); // collect chunks every 100 ms
            setState("recording");
            setDuration(0);

            timerRef.current = setInterval(() => {
                setDuration((prev) => prev + 1);
            }, 1000);
        } catch (err: any) {
            const msg =
                err?.name === "NotAllowedError"
                    ? "Microphone access denied. Please allow microphone access and try again."
                    : "Could not access microphone. Please check your browser settings.";
            setError(msg);
            setState("error");
        }
    }, []);

    const stopRecording = useCallback((): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const recorder = mediaRecorderRef.current;
            if (!recorder) {
                reject(new Error("No active recording"));
                return;
            }

            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            setState("processing");

            recorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, {
                    type: "audio/webm",
                });
                // Stop all microphone tracks
                streamRef.current?.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
                setState("done");
                resolve(blob);
            };

            recorder.onerror = (e) => {
                setState("error");
                setError("Recording error occurred.");
                reject(e);
            };

            recorder.stop();
        });
    }, []);

    const reset = useCallback(() => {
        // Clean up any running recording
        if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state !== "inactive"
        ) {
            mediaRecorderRef.current.stop();
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        mediaRecorderRef.current = null;
        streamRef.current = null;
        audioChunksRef.current = [];
        timerRef.current = null;

        setState("idle");
        setDuration(0);
        setError(null);
    }, []);

    return {
        state,
        duration,
        error,
        startRecording,
        stopRecording,
        reset,
        isRecording: state === "recording",
        isProcessing: state === "processing",
        isDone: state === "done",
        isError: state === "error",
    };
}
