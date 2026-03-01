"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Target, Clock, Zap, ChevronRight, Sparkles,
  Filter, Layout, RefreshCcw, Loader2, AlertCircle,
  CheckCircle2, Calendar, Archive
} from "lucide-react";
import Button from "@/components/ui/Button";
import apiClient from "@/services/apiClient";

interface LearningSetupProps {
  onSuccess?: (planData: any) => void;
}

export default function LearningSetup({ onSuccess }: LearningSetupProps) {
  const [topic, setTopic] = useState("");
  const [customPreference, setCustomPreference] = useState("");
  const [duration, setDuration] = useState("1 MONTH");
  const [customDuration, setCustomDuration] = useState("");
  const [level, setLevel] = useState("BEGINNER");

  const [status, setStatus] = useState<"idle" | "loading" | "preview">("idle");
  const [showWarning, setShowWarning] = useState(false);
  const [generatedPlanId, setGeneratedPlanId] = useState<string | null>(null);
  const [generatedRoadmap, setGeneratedRoadmap] = useState<any>(null);

  const subjects = ["C++", "C", "C#", "SQL", "REACT", "PYTHON"];

  const handleCreatePlan = async () => {
    if (!topic) {
      alert("Please pick a concept node first.");
      return;
    }

    setStatus("loading");

    // Check if duration is potentially too short for the level
    if (duration === "1 MONTH" && level === "ADVANCE") {
      setShowWarning(true);
    }

    try {
      const { data } = await apiClient.post("/learning/roadmap", {
        goal: `${level.toLowerCase()} mastery in ${topic}`,
        stack: [topic],
        timeline: duration === "CUSTOM" ? customDuration : duration,
        current_level: level.toLowerCase()
      });
      if (data && data.id) {
        setGeneratedPlanId(data.id);
      }
      setGeneratedRoadmap(data);
      setStatus("preview");
    } catch (e) {
      console.error("Failed to generate plan", e);
      setStatus("idle");
      alert("Failed to generate learning plan.");
    }
  };

  const confirmFinalPlan = () => {
    if (generatedPlanId) {
      onSuccess?.({
        topic,
        level,
        duration: duration === "CUSTOM" ? customDuration : duration,
        roadmapId: generatedPlanId,
        id: generatedPlanId
      });
    } else {
      onSuccess?.({
        topic,
        level,
        duration: duration === "CUSTOM" ? customDuration : duration,
        roadmapId: null,
        id: null
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 relative min-h-[80vh]">

      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.div
            key="setup-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            {/* TACTICAL HEADER */}
            <div className="mb-12 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-saffron/10 border border-saffron/20 mb-6">
                <Sparkles size={14} className="text-saffron animate-pulse" />
                <span className="text-[10px] font-black text-saffron uppercase tracking-[0.3em]">Knowledge Acquisition Protocol</span>
              </div>
              <h1 className="text-6xl md:text-8xl font-black text-white italic tracking-tighter uppercase leading-none mb-4">
                Learning <span className="text-white/20">HQ</span>
              </h1>
              <p className="text-white/40 text-xs font-bold uppercase tracking-[0.4em] ml-1">
                Dashboard Node / New to this Learning Pipeline
              </p>
            </div>

            <div className="lovable-card p-10 md:p-16 bg-black/40 border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 pr-16 opacity-[0.02] pointer-events-none">
                <BookOpen size={200} />
              </div>

              <div className="space-y-16 relative z-10">
                {/* Pickup Concept */}
                <section className="space-y-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-saffron/10 border border-saffron/20 flex items-center justify-center">
                      <Target size={20} className="text-saffron" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-widest">Pick Concept / Subject</h3>
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mt-1">Primary Neural Focus</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {subjects.map((sub) => (
                      <button
                        key={sub}
                        onClick={() => setTopic(sub)}
                        className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 border ${topic === sub
                          ? "bg-saffron text-white border-saffron shadow-lg shadow-saffron/20"
                          : "bg-white/5 border-white/5 text-white/30 hover:bg-white/10 hover:text-white"
                          }`}
                      >
                        {sub}
                      </button>
                    ))}
                    <button className="px-8 py-3 rounded-2xl bg-white/5 border border-white/5 text-white/20 text-xs font-black uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all italic">
                      + MORE
                    </button>
                  </div>
                </section>

                {/* Section 2: Custom Preference */}
                <section className="space-y-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-green-bharat/10 border border-green-bharat/20 flex items-center justify-center">
                      <Filter size={20} className="text-green-bharat" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-widest">Custom Preference</h3>
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mt-1">Specific Architectural Requirements</p>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Type specific sub-topics or project types..."
                    value={customPreference}
                    onChange={(e) => setCustomPreference(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-3xl px-8 py-5 text-sm font-bold text-white focus:outline-none focus:border-saffron/50 transition-all placeholder:text-white/10"
                  />
                </section>

                {/* Duration */}
                <section className="space-y-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <Clock size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-widest">Duration</h3>
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mt-1">Temporal Commitment Range</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {["1 MONTH", "2 MONTH", "3 MONTH"].map((tm) => (
                      <button
                        key={tm}
                        onClick={() => { setDuration(tm); setCustomDuration(""); }}
                        className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${duration === tm
                          ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20"
                          : "bg-white/5 border-white/5 text-white/30 hover:bg-white/10 hover:text-white"
                          }`}
                      >
                        {tm}
                      </button>
                    ))}
                    <input
                      type="text"
                      placeholder="CUSTOM DURATION"
                      value={customDuration}
                      onChange={(e) => { setCustomDuration(e.target.value); setDuration("CUSTOM"); }}
                      className={`px-6 py-4 rounded-2xl bg-white/[0.03] border text-[10px] font-black uppercase tracking-[0.2em] transition-all text-center focus:outline-none placeholder:text-white/10 ${duration === "CUSTOM" ? "border-blue-400 text-white" : "border-white/5 text-white/30"
                        }`}
                    />
                  </div>
                </section>

                {/* Level */}
                <section className="space-y-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                      <Zap size={20} className="text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-widest">Level</h3>
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mt-1">Neural Baseline Calibration</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    {["BEGINNER", "INTERMEDIATE", "ADVANCE"].map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setLevel(lvl)}
                        className={`flex-1 px-4 py-5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] transition-all border italic ${level === lvl
                          ? "bg-white text-black border-white shadow-xl"
                          : "bg-white/5 border-white/5 text-white/30 hover:bg-white/10"
                          }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </section>

                <div className="pt-10 border-t border-white/5 flex flex-col items-center">
                  <Button
                    variant="saffron"
                    size="lg"
                    className="w-full md:w-auto px-20 py-8 text-lg italic tracking-tighter"
                    onClick={handleCreatePlan}
                  >
                    CREATE PLAN!
                    <ChevronRight size={24} />
                  </Button>
                  <p className="mt-8 text-[9px] font-black text-white/10 uppercase tracking-[0.5em] italic">
                    Constructing localized knowledge roadmap...
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {status === "loading" && (
          <motion.div
            key="loading-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl"
          >
            <div className="text-center p-12 max-w-lg">
              <div className="relative mb-12 flex justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-32 h-32 rounded-full border-2 border-saffron/20 border-t-saffron shadow-[0_0_40px_rgba(255,153,51,0.2)]"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <BrainPulse />
                </div>
              </div>
              <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">Neural Synthesis...</h2>
              <p className="text-[10px] font-black text-saffron uppercase tracking-[0.4em] mb-6">Creating your customized learning plan</p>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3, ease: "easeInOut" }}
                  className="h-full bg-saffron shadow-[0_0_20px_rgba(255,153,51,0.5)]"
                />
              </div>
            </div>
          </motion.div>
        )}

        {status === "preview" && (
          <motion.div
            key="results-preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lovable-card p-12 md:p-20 bg-black/60 border-saffron/20 shadow-[0_0_100px_rgba(255,153,51,0.1)] relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8">
              <Sparkles className="text-saffron/20" size={100} />
            </div>

            <div className="flex flex-col items-center text-center mb-16 relative z-10">
              <div className="w-20 h-20 rounded-3xl bg-green-bharat/10 border border-green-bharat/20 flex items-center justify-center mb-8 shadow-2xl">
                <CheckCircle2 className="text-green-bharat" size={40} />
              </div>
              <h2 className="text-5xl md:text-6xl font-black text-white italic tracking-tighter uppercase leading-tight mb-4">
                Strategic Plan <span className="text-saffron">Locked</span>
              </h2>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.4em]">Personalized Neural Roadmap for {topic}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 relative z-10">
              <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-saffron/30 transition-all group">
                <div className="flex items-center gap-4 mb-6">
                  <Clock className="text-saffron" size={20} />
                  <span className="text-xs font-black text-white/60 uppercase tracking-widest">Neural Duration</span>
                </div>
                <div className="text-4xl font-black text-white uppercase italic">{duration === "CUSTOM" ? customDuration : duration}</div>
                {showWarning && (
                  <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-saffron/10 border border-saffron/20 animate-pulse">
                    <AlertCircle className="text-saffron shrink-0" size={16} />
                    <p className="text-[10px] font-bold text-saffron uppercase leading-relaxed tracking-wider text-left">
                      SYST_WARN: Recommended duration for {level} mastery in {topic} is 3+ MONTHS. Initializing condensed sync protocol.
                    </p>
                  </div>
                )}
              </div>

              <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-green-bharat/30 transition-all group">
                <div className="flex items-center gap-4 mb-6">
                  <Calendar className="text-green-bharat" size={20} />
                  <span className="text-xs font-black text-white/60 uppercase tracking-widest">Mastery Timeline</span>
                </div>
                <div className="text-4xl font-black text-white uppercase italic">PHASE ALPHA</div>
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mt-4 italic leading-relaxed text-left">
                  Targeting global-scale contribution readiness by end of temporal window.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center relative z-10">
              <Button
                variant="saffron"
                size="lg"
                className="w-full md:w-auto px-20 py-8"
                onClick={confirmFinalPlan}
              >
                ACTIVATE ROADMAP
                <ChevronRight size={24} />
              </Button>
              <button
                onClick={() => setStatus("idle")}
                className="mt-8 text-[11px] font-black text-white/20 uppercase tracking-[0.4em] hover:text-white transition-colors flex items-center gap-3"
              >
                <RefreshCcw size={14} />
                RE-CALIBRATE SETTINGS
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BrainPulse() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <motion.path
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
        stroke="#FF9933" strokeWidth="2"
      />
      <motion.path
        initial={{ scale: 0.8 }}
        animate={{ scale: [0.8, 1.1, 0.8] }}
        transition={{ duration: 1, repeat: Infinity }}
        d="M12 7V12L15 15"
        stroke="#FF9933" strokeWidth="2" strokeLinecap="round"
      />
    </svg>
  );
}