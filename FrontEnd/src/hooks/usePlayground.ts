"use client";

import { useState, useCallback, useEffect } from "react";
import apiClient from "@/services/apiClient";

// ─── Working execution environments ───────────────────────────────────────────
// Python  → server-side sandboxed exec (backend)
// JS / TS → client-side eval (browser)
// Others  → will be added when a self-hosted runtime is available

export type Language = "python" | "javascript" | "typescript";

export const LANGUAGE_LABELS: Record<Language, string> = {
    python: "Python",
    javascript: "JavaScript",
    typescript: "TypeScript",
};

export const LANGUAGE_OPTIONS: Language[] = ["python", "javascript", "typescript"];

export const TEMPLATES: Record<string, { label: string; language: Language; code: string }> = {
    hello_world: {
        label: "Hello World (Python)",
        language: "python",
        code: `# Python Hello World\nprint("Hello, World!")\nprint("Neural Operator Online.")`,
    },
    fibonacci: {
        label: "Fibonacci (Python)",
        language: "python",
        code: `def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)\n\nfor i in range(10):\n    print(f"F({i}) = {fibonacci(i)}")`,
    },
    list_ops: {
        label: "List Comprehension (Python)",
        language: "python",
        code: `numbers = [1, 2, 3, 4, 5]\nsquared = [x**2 for x in numbers]\nprint(f"Original: {numbers}")\nprint(f"Squared:  {squared}")\nprint(f"Sum:      {sum(numbers)}")`,
    },
    js_closure: {
        label: "Closure (JavaScript)",
        language: "javascript",
        code: `// JavaScript Closure demo\nfunction counter() {\n    let count = 0;\n    return {\n        inc: () => ++count,\n        get: () => count\n    };\n}\nconst c = counter();\nc.inc(); c.inc();\nconsole.log("Count:", c.get());`,
    },
    js_promise: {
        label: "Async / Await (JavaScript)",
        language: "javascript",
        code: `async function delay(ms) {\n    return new Promise(resolve => setTimeout(resolve, ms));\n}\n\nasync function main() {\n    console.log("Start");\n    await delay(100);\n    console.log("Resolved after 100ms");\n}\n\nmain();`,
    },
    ts_types: {
        label: "Generics (TypeScript → JS)",
        language: "typescript",
        code: `// TypeScript is transpiled to JS for browser execution\n// Type annotations are stripped at runtime\n\nfunction identity<T>(arg: T): T {\n    return arg;\n}\n\nconsole.log(identity<string>("Neural Operator"));\nconsole.log(identity<number>(42));`,
    },
};

const DEFAULT_CODE = `# Welcome to Thenali AI Playground
# Ctrl+Enter to run | Python 3.x

def greet(name: str) -> str:
    return f"Hello, {name}!"

print(greet("Neural Operator"))
`;

export interface SessionEntry {
    id: string;
    language: Language;
    firstLine: string;
    timestamp: string;
    code: string;
}

export default function usePlayground() {
    const [code, setCode] = useState<string>(DEFAULT_CODE);
    const [language, setLanguage] = useState<Language>("python");
    const [output, setOutput] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [executionTime, setExecutionTime] = useState<number | null>(null);
    const [sessionHistory, setSessionHistory] = useState<SessionEntry[]>([]);

    // ─── Keyboard shortcut: Ctrl+Enter / Cmd+Enter ─────────────────
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                runCode();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code, language]);

    // ─── Client-side JS/TS execution ───────────────────────────────
    const runClientSide = useCallback((src: string): { output: string | null; error: string | null; ms: number } => {
        const logs: string[] = [];
        const origLog = console.log;
        const origWarn = console.warn;
        const origError = console.error;

        console.log = (...args: any[]) =>
            logs.push(args.map(a => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a))).join(" "));
        console.warn = (...args: any[]) =>
            logs.push("[WARN] " + args.map(a => String(a)).join(" "));
        console.error = (...args: any[]) =>
            logs.push("[ERROR] " + args.map(a => String(a)).join(" "));

        const start = performance.now();
        let evalError: string | null = null;

        try {
            // For TypeScript: strip simple type annotations so eval doesn't break
            const runnable = src
                .replace(/:\s*\w+(\[\])?\s*(?=[,)=])/g, "")          // remove param type hints
                .replace(/<\w+>/g, "")                                  // remove generic markers
                .replace(/^export\s+/gm, "");                          // remove export keyword

            // eslint-disable-next-line no-eval
            eval(runnable);
        } catch (e: any) {
            evalError = e.message || "Runtime error";
        } finally {
            console.log = origLog;
            console.warn = origWarn;
            console.error = origError;
        }

        const ms = Math.round(performance.now() - start);

        if (evalError) return { output: logs.length > 0 ? logs.join("\n") : null, error: evalError, ms };
        return {
            output: logs.length > 0 ? logs.join("\n") : "(no output — use console.log() to print)",
            error: null,
            ms,
        };
    }, []);

    // ─── Run code ──────────────────────────────────────────────────
    const runCode = useCallback(async () => {
        const trimmed = code.trim();
        if (!trimmed) {
            setError("Please write some code first.");
            setOutput(null);
            return;
        }

        setIsRunning(true);
        setOutput(null);
        setError(null);
        setExecutionTime(null);

        const start = Date.now();

        try {
            if (language === "javascript" || language === "typescript") {
                // ── Browser execution ──
                const result = runClientSide(trimmed);
                setExecutionTime(result.ms);
                if (result.error) {
                    setError(`Runtime Error:\n${result.error}`);
                    if (result.output) setOutput(result.output);
                } else {
                    setOutput(result.output);
                }
            } else {
                // ── Python: server-side sandbox ──
                const { data } = await apiClient.post("/playground/run", {
                    code: trimmed,
                    language: "python",
                });

                setExecutionTime(data.execution_time_ms ?? Math.round(Date.now() - start));

                if (data.error) {
                    setError(`Runtime Error:\n${data.error}`);
                    setOutput(null);
                } else if (!data.output || data.output.trim() === "") {
                    setOutput("Code executed successfully (no output)");
                } else {
                    setOutput(data.output);
                }
            }

            // Session history
            const entry: SessionEntry = {
                id: Date.now().toString(),
                language,
                firstLine: trimmed.split("\n").find(l => l.trim()) || trimmed.slice(0, 40),
                timestamp: new Date().toLocaleTimeString(),
                code: trimmed,
            };
            setSessionHistory(prev => [entry, ...prev].slice(0, 10));

        } catch (err: any) {
            const status = err.response?.status;
            if (status === 401) setError("Please login to run code.");
            else if (status === 408) setError("Execution timed out.");
            else if (!err.response) setError("Execution failed. Is the backend running?");
            else setError(err.response?.data?.detail || "Execution failed. Please try again.");
        } finally {
            setIsRunning(false);
        }
    }, [code, language, runClientSide]);

    // ─── Clear output ───────────────────────────────────────────────
    const clearOutput = useCallback(() => {
        setOutput(null);
        setError(null);
        setExecutionTime(null);
    }, []);

    // ─── Load template ──────────────────────────────────────────────
    const loadTemplate = useCallback((templateKey: string) => {
        const tpl = TEMPLATES[templateKey];
        if (!tpl) return;
        setCode(tpl.code);
        setLanguage(tpl.language);
        clearOutput();
    }, [clearOutput]);

    // ─── Restore from session history ───────────────────────────────
    const restoreSession = useCallback((entry: SessionEntry) => {
        setCode(entry.code);
        setLanguage(entry.language);
        clearOutput();
    }, [clearOutput]);

    // ─── Copy code to clipboard ─────────────────────────────────────
    const copyCode = useCallback(async (): Promise<boolean> => {
        try {
            await navigator.clipboard.writeText(code);
            return true;
        } catch {
            return false;
        }
    }, [code]);

    return {
        code, setCode,
        language, setLanguage,
        output, error,
        isRunning,
        executionTime,
        sessionHistory,
        runCode,
        clearOutput,
        loadTemplate,
        restoreSession,
        copyCode,
    };
}
