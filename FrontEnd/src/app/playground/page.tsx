"use client";

import { useState, useRef, useEffect } from "react";
import PageContainer from "@/components/layout/PageContainer";
import CodeEditor from "@/components/playground/CodeEditor";
import RunButton from "@/components/playground/RunButton";
import OutputConsole from "@/components/playground/OutputConsole";
import HintPanel from "@/components/playground/HintPanel";
import { motion, AnimatePresence } from "framer-motion";
import {
    RefreshCcw, Zap, Copy, Check, ChevronDown, Maximize2,
    Minimize2, History, X, ChevronRight
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import usePlayground, { LANGUAGE_LABELS, LANGUAGE_OPTIONS, TEMPLATES, type Language } from "@/hooks/usePlayground";

export default function PlaygroundPage() {
    const { t } = useLanguage();
    const {
        code, setCode,
        language, setLanguage,
        output, error, isRunning, executionTime, sessionHistory,
        runCode, clearOutput, loadTemplate, restoreSession, copyCode,
    } = usePlayground();

    const [copied, setCopied] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const templateRef = useRef<HTMLDivElement>(null);
    const langRef = useRef<HTMLDivElement>(null);

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (templateRef.current && !templateRef.current.contains(e.target as Node)) {
                setShowTemplates(false);
            }
            if (langRef.current && !langRef.current.contains(e.target as Node)) {
                setShowLangDropdown(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Fullscreen: Escape key exits
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isFullscreen]);

    const handleCopy = async () => {
        const ok = await copyCode();
        if (ok) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleReset = () => {
        setCode("");
        clearOutput();
    };

    const editorArea = (
        <div className={`${isFullscreen ? "fixed inset-0 z-[200] bg-black flex flex-col p-8 gap-6" : ""}`}>
            {isFullscreen && (
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">
                        FULLSCREEN — ESC to exit
                    </span>
                    <button
                        onClick={() => setIsFullscreen(false)}
                        className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/40 hover:text-white transition-all"
                    >
                        <Minimize2 size={18} />
                    </button>
                </div>
            )}
            <CodeEditor value={code} onChange={setCode} onRun={runCode} />
            {isFullscreen && (
                <OutputConsole
                    output={output}
                    error={error}
                    loading={isRunning}
                    executionTime={executionTime}
                    onClear={clearOutput}
                />
            )}
        </div>
    );

    return (
        <PageContainer>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 relative z-10 px-4">
                <div>
                    <div className="mb-4 px-4 py-1.5 rounded-full bg-saffron/10 border border-saffron/20 inline-flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-saffron animate-pulse" />
                        <span className="text-[10px] font-bold text-saffron uppercase tracking-[0.2em]">{t("execution_sandbox")} v2.0</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter uppercase italic leading-none">
                        <span className="lovable-text-gradient">{t("playground_lab").split(' ')[0]}</span>{" "}
                        <span className="text-white">/ {t("playground_lab").split(' ')[1]}</span>
                    </h1>
                    {/* Keyboard shortcut hint */}
                    <p className="text-[9px] font-black text-white/15 uppercase tracking-[0.4em] mt-3 italic">
                        ⌨ Ctrl+Enter to run &nbsp;·&nbsp; Tab inserts 4 spaces
                    </p>
                </div>

                {/* Top Control Bar */}
                <div className="flex items-center gap-3 flex-wrap">

                    {/* Language Selector */}
                    <div ref={langRef} className="relative">
                        <button
                            onClick={() => setShowLangDropdown(p => !p)}
                            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] text-white/60 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                        >
                            {LANGUAGE_LABELS[language]}
                            <ChevronDown size={12} className={`transition-transform ${showLangDropdown ? "rotate-180" : ""}`} />
                        </button>
                        <AnimatePresence>
                            {showLangDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="absolute top-full mt-2 right-0 w-44 bg-black/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 backdrop-blur-xl"
                                >
                                    {LANGUAGE_OPTIONS.map(lang => (
                                        <button
                                            key={lang}
                                            onClick={() => { setLanguage(lang); setShowLangDropdown(false); clearOutput(); }}
                                            className={`w-full flex items-center justify-between px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white/5 ${language === lang ? "text-saffron" : "text-white/40"}`}
                                        >
                                            {LANGUAGE_LABELS[lang]}
                                            {language === lang && <ChevronRight size={10} className="text-saffron" />}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Templates Dropdown */}
                    <div ref={templateRef} className="relative">
                        <button
                            onClick={() => setShowTemplates(p => !p)}
                            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] text-white/60 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                        >
                            Templates
                            <ChevronDown size={12} className={`transition-transform ${showTemplates ? "rotate-180" : ""}`} />
                        </button>
                        <AnimatePresence>
                            {showTemplates && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="absolute top-full mt-2 right-0 w-56 bg-black/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 backdrop-blur-xl"
                                >
                                    {Object.entries(TEMPLATES).map(([key, tpl]) => (
                                        <button
                                            key={key}
                                            onClick={() => { loadTemplate(key); setShowTemplates(false); }}
                                            className="w-full flex items-center gap-3 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 transition-all text-left"
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-saffron shrink-0" />
                                            {tpl.label}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Copy Button */}
                    <button
                        onClick={handleCopy}
                        className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] text-white/40 hover:text-white transition-all flex items-center gap-2 group"
                        title="Copy code"
                    >
                        <AnimatePresence mode="wait">
                            {copied ? (
                                <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                    <Check size={16} className="text-green-bharat" />
                                </motion.span>
                            ) : (
                                <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                    <Copy size={16} />
                                </motion.span>
                            )}
                        </AnimatePresence>
                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
                            {copied ? "Copied!" : "Copy"}
                        </span>
                    </button>

                    {/* Fullscreen Button */}
                    <button
                        onClick={() => setIsFullscreen(p => !p)}
                        className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] text-white/40 hover:text-white transition-all"
                        title="Fullscreen (Esc to exit)"
                    >
                        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>

                    {/* Reset Button */}
                    <button
                        onClick={handleReset}
                        className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] text-white/40 hover:text-white transition-all flex items-center gap-2 group"
                    >
                        <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">{t("clear_buffer")}</span>
                    </button>

                    {/* Run Button */}
                    <RunButton onRun={runCode} loading={isRunning} />
                </div>
            </div>

            {/* Main Interface Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-32 px-4">
                {/* Editor + Output Column */}
                <div className="lg:col-span-8 flex flex-col gap-8">

                    {/* Editor */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative"
                    >
                        {/* Editor chrome bar */}
                        <div className="absolute top-4 left-6 z-20 flex items-center gap-3">
                            <div className="flex gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-red-500/40" />
                                <div className="w-2 h-2 rounded-full bg-yellow-500/40" />
                                <div className="w-2 h-2 rounded-full bg-green-500/40" />
                            </div>
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-4">
                                neural_main.{ language === "python" ? "py" : language === "typescript" ? "ts" : "js" }
                            </span>
                        </div>
                        {!isFullscreen && (
                            <CodeEditor value={code} onChange={setCode} onRun={runCode} />
                        )}
                    </motion.div>

                    {/* Output Console */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        {!isFullscreen && (
                            <OutputConsole
                                output={output}
                                error={error}
                                loading={isRunning}
                                executionTime={executionTime}
                                onClear={clearOutput}
                            />
                        )}
                    </motion.div>

                    {/* Fullscreen portal */}
                    {isFullscreen && editorArea}
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 flex flex-col gap-8">
                    <HintPanel />

                    {/* Session History */}
                    <div className="lovable-card p-8 bg-gradient-to-br from-white/[0.03] to-transparent border-white/5">
                        <button
                            onClick={() => setShowHistory(p => !p)}
                            className="w-full flex items-center justify-between mb-0"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-saffron/10 border border-saffron/20 flex items-center justify-center">
                                    <History size={18} className="text-saffron" />
                                </div>
                                <div>
                                    <h3 className="text-xs font-black text-white uppercase tracking-widest text-left">Run History</h3>
                                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mt-0.5">Last {sessionHistory.length} executions</p>
                                </div>
                            </div>
                            <ChevronDown size={14} className={`text-white/20 transition-transform ${showHistory ? "rotate-180" : ""}`} />
                        </button>

                        <AnimatePresence>
                            {showHistory && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden mt-6"
                                >
                                    {sessionHistory.length === 0 ? (
                                        <p className="text-[9px] text-white/20 uppercase tracking-widest font-black italic text-center py-4">
                                            No executions yet
                                        </p>
                                    ) : (
                                        <div className="space-y-3">
                                            {sessionHistory.map(entry => (
                                                <button
                                                    key={entry.id}
                                                    onClick={() => restoreSession(entry)}
                                                    className="w-full text-left p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-saffron/30 hover:bg-white/[0.04] transition-all group"
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[8px] font-black text-saffron uppercase tracking-widest">{LANGUAGE_LABELS[entry.language]}</span>
                                                        <span className="text-[8px] text-white/20 font-mono">{entry.timestamp}</span>
                                                    </div>
                                                    <p className="text-[10px] font-mono text-white/40 truncate group-hover:text-white/70 transition-colors">
                                                        {entry.firstLine}
                                                    </p>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Runtime Info card */}
                    <div className="lovable-card p-10 bg-gradient-to-br from-white/[0.03] to-transparent border-white/5">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-saffron/10 border border-saffron/20 flex items-center justify-center">
                                <Zap className="text-saffron" size={24} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">{t("logic_efficiency")}</h3>
                                <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mt-1">Runtime Intel</p>
                            </div>
                        </div>

                        <div className="space-y-3 text-[10px] font-black uppercase tracking-widest">
                            <div className="flex justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                <span className="text-white/30">Language</span>
                                <span className="text-saffron">{LANGUAGE_LABELS[language]}</span>
                            </div>
                            <div className="flex justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                <span className="text-white/30">Runtime</span>
                                <span className="text-green-bharat">
                                    {language === "python" ? "Server Sandbox" : "Browser Engine"}
                                </span>
                            </div>
                            <div className="flex justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                <span className="text-white/30">Last Run</span>
                                <span className="text-white">{executionTime !== null ? `${executionTime.toFixed(2)}ms` : "—"}</span>
                            </div>
                            <div className="flex justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                <span className="text-white/30">Lines</span>
                                <span className="text-white">{code.split("\n").length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}