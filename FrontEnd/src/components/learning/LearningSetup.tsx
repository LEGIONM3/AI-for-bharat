"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Sparkles, Filter, CheckCircle2,
  RefreshCcw, Loader2, Search, ArrowRight, Layers
} from "lucide-react";
import Button from "@/components/ui/Button";
import apiClient from "@/services/apiClient";

interface LearningSetupProps {
  onSuccess?: (planData: any) => void;
}

export default function LearningSetup({ onSuccess }: LearningSetupProps) {
  const [level, setLevel] = useState("BEGINNER");
  const [status, setStatus] = useState<"idle" | "loading" | "preview">("idle");
  const [generatedPlanId, setGeneratedPlanId] = useState<string | null>(null);
  
  const [presetPlans, setPresetPlans] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  useEffect(() => {
    apiClient.get("/learning/preset-plans").then(({ data }) => {
      setPresetPlans(data.plans || []);
    }).catch(e => console.error("Failed to fetch presets", e));
  }, []);

  // Filter primarily by exactly selected Level, and then dynamically by Search Query
  const filteredPlans = presetPlans.filter(p => {
    const matchLevel = p.difficulty?.toLowerCase() === level.toLowerCase();
    const matchSearch = p.topic.toLowerCase().includes(searchQuery.toLowerCase()) || 
          (p.title && p.title.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchLevel && matchSearch;
  });

  const handleSelectPreset = (plan: any) => {
    setSelectedPlan(plan);
  };

  const handleCreatePlan = async () => {
    if (!selectedPlan) {
      alert("Please select a learning neural path first.");
      return;
    }
    setStatus("loading");
    try {
      const { data } = await apiClient.post("/learning/request-plan", { plan_id: selectedPlan.id });
      if (data && data.roadmap_id) {
        setGeneratedPlanId(data.roadmap_id);
        setStatus("preview");
      } else {
        throw new Error("Invalid preset allocation response.");
      }
    } catch (e) {
      console.error("Failed to generate plan", e);
      setStatus("idle");
      alert("Failed to initialize learning plan. Please try again.");
    }
  };

  const confirmFinalPlan = () => {
    onSuccess?.({
      topic: selectedPlan?.topic || "Custom",
      level: selectedPlan?.difficulty || level,
      duration: selectedPlan?.timeline || "4 WEEKS",
      roadmapId: generatedPlanId,
      id: generatedPlanId
    });
  };

  return (
    <div className="max-w-5xl mx-auto py-12 relative min-h-[80vh]">

      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.div
            key="setup-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            {/* TACTICAL HEADER */}
            <div className="mb-10 text-center md:text-left flex flex-col md:flex-row items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-saffron/10 border border-saffron/20 mb-4">
                  <Sparkles size={14} className="text-saffron animate-pulse" />
                  <span className="text-[10px] font-black text-saffron uppercase tracking-[0.3em]">Neural Catalog Repository</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter uppercase leading-none">
                  Global <span className="text-white/20">Index</span>
                </h1>
              </div>
            </div>

            <div className="lovable-card p-8 md:p-12 bg-black/40 border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 pr-16 opacity-[0.02] pointer-events-none">
                <BookOpen size={200} />
              </div>

              <div className="space-y-12 relative z-10 w-full">
                
                {/* 1. LEVEL SELECTION TABS */}
                <section className="space-y-6 w-full">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                      <Layers size={20} className="text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-widest">Select Directive Level</h3>
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mt-1">Difficulty Calibration Range</p>
                    </div>
                  </div>

                  <div className="flex bg-white/[0.02] border border-white/5 p-2 rounded-full w-full max-w-2xl overflow-hidden">
                    {["BEGINNER", "INTERMEDIATE", "MASTER"].map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => { setLevel(lvl); setSelectedPlan(null); }}
                        className={`flex-1 px-4 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center text-center ${
                          level === lvl
                          ? "bg-white text-black shadow-xl scale-[1.02]"
                          : "text-white/40 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </section>

                {/* 2. SEARCH & LIST */}
                <section className="space-y-6">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-saffron/10 border border-saffron/20 flex items-center justify-center">
                      <Filter size={20} className="text-saffron" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-widest">Identify Neural Node</h3>
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mt-1">Search Available Pre-Planned Routes</p>
                    </div>
                  </div>

                  <div className="relative w-full">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search for a specific technology or topic (e.g., React, AWS, Rust)..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-full py-5 pl-16 pr-6 text-sm font-bold tracking-wide text-white placeholder:text-white/20 focus:outline-none focus:border-saffron/50 transition-colors shadow-inner"
                    />
                  </div>
                  
                  {/* Grid Display of Results */}
                  <div className="mt-8 rounded-3xl bg-black/20 border border-white/5 p-4 min-h-[300px]">
                     {presetPlans.length === 0 ? (
                         <div className="flex flex-col h-[250px] items-center justify-center">
                            <Loader2 size={30} className="animate-spin text-white/20 mb-4" />
                            <p className="text-xs text-white/30 uppercase tracking-widest font-black">Syncing Local DB...</p>
                         </div>
                     ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                            {filteredPlans.length > 0 ? filteredPlans.map((plan) => (
                                <button
                                    key={plan.id}
                                    onClick={() => handleSelectPreset(plan)}
                                    className={`relative p-6 rounded-2xl text-left transition-all duration-300 border flex flex-col items-start gap-2 h-full overflow-hidden ${
                                        selectedPlan?.id === plan.id
                                        ? "bg-saffron/10 border-saffron shadow-lg shadow-saffron/10"
                                        : "bg-white/[0.04] border-white/5 hover:bg-white/10 hover:border-white/20"
                                    }`}
                                >
                                    {selectedPlan?.id === plan.id && (
                                        <div className="absolute top-4 right-4 text-saffron">
                                            <CheckCircle2 size={18} />
                                        </div>
                                    )}
                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${
                                        selectedPlan?.id === plan.id ? "bg-saffron border-saffron text-black" : "bg-black/50 border border-white/10 text-white/60"
                                    }`}>
                                        {plan.topic}
                                    </span>
                                    <h4 className={`text-xl font-black italic uppercase tracking-tighter w-[85%] mt-2 ${selectedPlan?.id === plan.id ? 'text-white' : 'text-white/80'}`}>
                                        {plan.title || "Unnamed Mastery"}
                                    </h4>
                                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest line-clamp-2 leading-relaxed">
                                        Goal: {plan.goal}
                                    </p>
                                    
                                    <div className="mt-auto pt-4 flex items-center justify-between w-full border-t border-white/10">
                                        <span className="text-[9px] text-white/30 font-black uppercase tracking-widest">DURATION</span>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${selectedPlan?.id === plan.id ? 'text-saffron' : 'text-white/60'}`}>
                                            {plan.timeline || '4 WEEKS'}
                                        </span>
                                    </div>
                                </button>
                            )) : (
                                <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-2xl">
                                    <p className="text-white/30 text-xs font-black uppercase tracking-widest">No routes match current telemetry filters.</p>
                                </div>
                            )}
                        </div>
                     )}
                  </div>
                </section>

                {/* Submit Action */}
                <div className="pt-10 border-t border-white/5 flex justify-end">
                  <Button
                    variant={selectedPlan ? "saffron" : "outline"}
                    size="lg"
                    disabled={!selectedPlan}
                    className={`md:w-auto w-full px-16 py-6 text-sm md:text-md italic tracking-[0.2em] transition-all 
                        ${!selectedPlan && 'opacity-30 cursor-not-allowed pointer-events-none'}`}
                    onClick={handleCreatePlan}
                  >
                    ACTIVATE SELECTED ROUTE
                    <ArrowRight size={20} className="ml-2" />
                  </Button>
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
              <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">Engaging Module...</h2>
              <p className="text-[10px] font-black text-saffron uppercase tracking-[0.4em] mb-6">Binding Preset to User Profile Catalog</p>
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
            className="lovable-card p-12 md:p-20 bg-black/60 border-saffron/20 shadow-[0_0_100px_rgba(255,153,51,0.1)] relative overflow-hidden text-center"
          >
            <div className="absolute top-0 right-0 p-8">
              <Sparkles className="text-saffron/20" size={100} />
            </div>

            <div className="flex flex-col items-center mb-12 relative z-10 w-full max-w-xl mx-auto">
              <div className="w-24 h-24 rounded-3xl bg-green-bharat/10 border border-green-bharat/20 flex items-center justify-center mb-8 shadow-2xl">
                <CheckCircle2 className="text-green-500" size={50} />
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter uppercase leading-tight mb-4">
                Routing <span className="text-green-400">Secured</span>
              </h2>
              <p className="text-white/60 text-sm font-medium">
                The learning timeline for <span className="text-white font-bold">{selectedPlan?.title}</span> has been completely loaded into your profile.
              </p>
            </div>

            <div className="flex flex-col items-center relative z-10">
              <Button
                variant="saffron"
                size="lg"
                className="w-full md:w-auto px-20 py-8 tracking-widest text-[10px]"
                onClick={confirmFinalPlan}
              >
                ENTER MISSION CONTROL
                <ArrowRight size={18} className="ml-2" />
              </Button>
              <button
                onClick={() => setStatus("idle")}
                className="mt-8 text-[11px] font-black text-white/20 uppercase tracking-[0.3em] hover:text-white transition-colors flex items-center gap-3"
              >
                <RefreshCcw size={14} />
                Return to Index Catalog
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