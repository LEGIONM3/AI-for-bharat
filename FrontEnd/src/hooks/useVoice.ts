import { useState, useCallback, useRef, useEffect } from "react";
import { voiceService } from "../services/voiceService";

export type VoiceState = "idle" | "loading" | "playing" | "error";

export const sharedAudioPlayer = { current: null as HTMLAudioElement | null };

export function useVoice() {
    const [state, setState] = useState<VoiceState>("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const lastUrlRef = useRef<string | null>(null);

    const stop = useCallback(() => {
        if (sharedAudioPlayer.current) {
            sharedAudioPlayer.current.pause();
            sharedAudioPlayer.current.currentTime = 0;
            sharedAudioPlayer.current.onended = null;
            sharedAudioPlayer.current.onpause = null;
            sharedAudioPlayer.current.onerror = null;
            sharedAudioPlayer.current = null;
        }
        setState("idle");
    }, []);

    const playBytes = useCallback((url: string) => {
        if (sharedAudioPlayer.current) {
            sharedAudioPlayer.current.pause();
        }
        
        lastUrlRef.current = url;
        const newAudio = new Audio(url);
        sharedAudioPlayer.current = newAudio;
        
        setState("playing");

        newAudio.onended = () => {
            setState("idle");
            if (sharedAudioPlayer.current === newAudio) {
                sharedAudioPlayer.current = null;
            }
        };

        newAudio.onpause = () => {
            setState("idle");
        };

        newAudio.onerror = () => {
            setState("error");
            setErrorMsg("Failed to play audio.");
        };

        newAudio.play().catch(e => {
            console.error("Audio playback failed", e);
            setState("error");
            setErrorMsg("Playback blocked");
        });
    }, []);

    const playText = useCallback(async (text: string) => {
        setState("loading");
        setErrorMsg("");
        
        if (sharedAudioPlayer.current) {
            sharedAudioPlayer.current.pause();
        }

        try {
            const audioUrl = await voiceService.speak(text);
            playBytes(audioUrl);
        } catch (e) {
            setState("error");
            setErrorMsg("Error generating voice");
            console.error(e);
        }
    }, [playBytes]);

    const restart = useCallback(() => {
        if (lastUrlRef.current && state !== "loading") {
            playBytes(lastUrlRef.current);
        }
    }, [playBytes, state]);

    useEffect(() => {
        return () => {
             // Stop conditionally if this hook is the one currently playing audio
             if (sharedAudioPlayer.current && sharedAudioPlayer.current.src === lastUrlRef.current) {
                   stop();
             }
        };
    }, [stop]);

    return { state, errorMsg, playBytes, playText, stop, restart };
}
