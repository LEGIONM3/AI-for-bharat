"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
    Terminal,
    BookOpen,
    CheckCircle,
    Layout,
    User,
    Settings,
    Zap,
    Sparkles,
    GitMerge,
    X,
    Newspaper
} from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { memo, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";

interface NavLinkProps {
    href: string;
    label: string;
    icon: any;
    onNavigate?: () => void;
}

const NavLink = memo(function NavLink({ href, label, icon: Icon, onNavigate }: NavLinkProps) {
    const pathname = usePathname();
    const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href));

    const handleClick = useCallback(() => {
        const mainEl = document.getElementById("main-scroll");
        if (mainEl) mainEl.scrollTop = 0;
        onNavigate?.();
    }, [onNavigate]);

    return (
        <Link
            href={href}
            onClick={handleClick}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-4 px-6 py-3.5 rounded-2xl transition-all duration-300 group relative ${isActive
                ? "bg-white/10 text-white shadow-xl shadow-black/20"
                : "text-white/40 hover:text-white hover:bg-white/5"
                } focus:outline-none focus:ring-2 focus:ring-saffron/50 focus:ring-offset-1 focus:ring-offset-transparent`}
        >
            <Icon size={18} className={`${isActive ? "text-saffron" : "text-white/20 group-hover:text-white/60"} transition-colors`} />
            <span className={`text-sm font-semibold ${isActive ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`}>
                {label}
            </span>
            {isActive && (
                <m.div
                    layoutId="active-indicator"
                    className="absolute right-4 w-1 h-1 rounded-full bg-saffron"
                />
            )}
        </Link>
    );
});

interface SidebarProps {
    mobileOpen?: boolean;
    onClose?: () => void;
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
    const { t } = useLanguage();

    return (
        <>
            {/* Logo */}
            <Link
                href="/"
                onClick={onClose}
                className="mb-12 flex items-center gap-3 px-2 group cursor-pointer relative z-10 transition-all hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-saffron/50 rounded-xl"
            >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-saffron to-orange-400 flex items-center justify-center shadow-lg shadow-saffron/20 group-hover:scale-105 transition-transform">
                    <Zap size={22} className="text-white fill-white" />
                </div>
                <div className="flex flex-col">
                    <h1 className="text-lg font-black text-white tracking-tight leading-none logo-text">Thenali AI</h1>
                    <span className="text-[10px] font-bold text-white/30 tracking-widest mt-1 uppercase">Operational Hub</span>
                </div>
            </Link>

            {/* Nav */}
            <nav className="flex-1 flex flex-col gap-2 relative z-10 custom-scrollbar overflow-y-auto pr-2" aria-label="Main navigation">
                <NavLink href="/dashboard" label={t("dashboard")} icon={Layout} onNavigate={onClose} />
                <NavLink href="/repo-analysis" label={t("code_lab")} icon={Terminal} onNavigate={onClose} />
                <NavLink href="/learning/dashboard" label={t("learning")} icon={BookOpen} onNavigate={onClose} />
                <NavLink href="/evaluation" label={t("assessments")} icon={CheckCircle} onNavigate={onClose} />
                <NavLink href="/playground" label={t("playground")} icon={Sparkles} onNavigate={onClose} />
                <NavLink href="/contribution" label={t("contribution")} icon={GitMerge} onNavigate={onClose} />
                <NavLink href="/news" label="Upcoming" icon={Newspaper} onNavigate={onClose} />
            </nav>

            {/* Footer */}
            <div className="mt-auto flex flex-col gap-2 pt-6 border-t border-white/10 relative z-10">
                <div className="hidden lg:flex items-center gap-3 px-6 py-3 mb-2 bg-white/[0.03] rounded-2xl">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest italic">System Active</span>
                </div>
                <NavLink href="/profile" label={t("profile")} icon={User} onNavigate={onClose} />
                <NavLink href="/settings" label={t("settings_protocol")} icon={Settings} onNavigate={onClose} />
            </div>
        </>
    );
}

export default function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
    return (
        <>
            {/* Desktop sidebar — always visible on md+ */}
            <aside className="hidden md:flex w-72 bg-black/20 backdrop-blur-3xl border-r border-white/5 h-screen p-8 flex-col z-[60] relative overflow-hidden flex-shrink-0">
                <SidebarContent />
            </aside>

            {/* Mobile sidebar — slide-in drawer */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        {/* Backdrop */}
                        <m.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm md:hidden"
                            onClick={onClose}
                            aria-hidden="true"
                        />
                        {/* Drawer */}
                        <m.aside
                            key="drawer"
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed left-0 top-0 h-full w-72 bg-[#02040a] border-r border-white/10 p-8 flex flex-col z-[80] md:hidden overflow-hidden"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Navigation menu"
                        >
                            {/* Close button */}
                            <button
                                onClick={onClose}
                                aria-label="Close navigation menu"
                                className="absolute top-6 right-6 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-saffron/50"
                            >
                                <X size={20} />
                            </button>
                            <SidebarContent onClose={onClose} />
                        </m.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}