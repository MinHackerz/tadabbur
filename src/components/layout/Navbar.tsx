"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import TadabburLogo from "./TadabburLogo";

export type ActiveRoute = "home"|"reader"|"search"|"library"|"goals"|"tadabbur"|"settings";

const NAV_BASE: {href:string;key:ActiveRoute;label:string;dynamicReader?:boolean}[] = [
  {href:"/",key:"home",label:"Home"},
  {href:"/read/1",key:"reader",label:"Reader",dynamicReader:true},
  {href:"/search",key:"search",label:"Search"},
  {href:"/library",key:"library",label:"Library"},
  {href:"/goals",key:"goals",label:"Goals"},
  {href:"/tadabbur",key:"tadabbur",label:"Tadabbur"},
];

const MOBILE_TAB: {href:string;key:ActiveRoute;label:string;icon:React.ReactNode}[] = [
  {href:"/",key:"home",label:"Home",icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={20} height={20}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg>},
  {href:"/read/1",key:"reader",label:"Read",icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={20} height={20}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"/></svg>},
  {href:"/tadabbur",key:"tadabbur",label:"Tadabbur",icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={20} height={20}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"/></svg>},
  {href:"/library",key:"library",label:"Library",icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={20} height={20}><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"/></svg>},
  {href:"/goals",key:"goals",label:"Goals",icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={20} height={20}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"/></svg>},
];

export default function Navbar({active,loggedIn,userEmail,readerChapterId}:{active:ActiveRoute;loggedIn:boolean;userEmail?:string|null;readerChapterId?:string}) {
  const readerHref = readerChapterId ? `/read/${readerChapterId}` : "/read/1";
  const [open,setOpen]=useState(false);
  const [scrolled,setScrolled]=useState(false);
  const displayName = userEmail ? userEmail.split("@")[0] : null;
  const initial = displayName?.charAt(0).toUpperCase();

  useEffect(()=>{
    const h = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll",h,{passive:true});
    return ()=>window.removeEventListener("scroll",h);
  },[]);

  return (
    <>
      {/* ── Top bar ── */}
      <header className={`fixed top-0 inset-x-0 h-14 z-50 transition-all duration-200 ${scrolled ? "bg-surface/80 backdrop-blur-xl shadow-[0_1px_0_var(--color-border)]" : "bg-transparent"}`}>
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto h-full px-5 sm:px-8 lg:px-10">
          <Link href="/" className="shrink-0">
            <TadabburLogo />
          </Link>

          {/* Desktop links */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_BASE.map(n=>{
              const href = n.dynamicReader ? readerHref : n.href;
              return (
              <Link key={n.key} href={href}
                className={`px-3 py-1.5 rounded-lg text-[13px] transition-colors ${
                  active===n.key
                    ? "font-semibold text-accent bg-accent-subtle"
                    : "text-ink-secondary hover:text-ink hover:bg-surface-hover"
                }`}>
                {n.label}
              </Link>
            );})}
            <Link href="/settings"
              className={`px-3 py-1.5 rounded-lg text-[13px] transition-colors ${
                active==="settings"
                  ? "font-semibold text-accent bg-accent-subtle"
                  : "text-ink-secondary hover:text-ink hover:bg-surface-hover"
              }`}>
              Settings
            </Link>
            <span className="w-px h-5 bg-border mx-2"/>
            {loggedIn ? (
              <div className="flex items-center gap-2">
                {initial && (
                  <span className="w-7 h-7 rounded-full bg-accent text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    {initial}
                  </span>
                )}
                {displayName && (
                  <span className="text-[13px] text-ink-secondary max-w-[8rem] truncate">{displayName}</span>
                )}
                <a href="/api/auth/logout"
                  className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-ink-secondary hover:text-danger hover:bg-danger-subtle transition-colors">
                  Sign out
                </a>
              </div>
            ) : (
              <a href="/api/auth/start"
                className="px-3.5 py-1.5 rounded-lg text-[13px] font-semibold text-white bg-accent hover:bg-accent-hover transition-colors">
                Sign in
              </a>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button onClick={()=>setOpen(!open)} className="md:hidden p-2 -mr-2 rounded-lg hover:bg-surface-hover transition-colors" aria-label="Menu">
            <div className="w-[18px] flex flex-col gap-[4px]">
              <span className={`h-[1.5px] bg-ink rounded-full transition-all duration-200 ${open?"rotate-45 translate-y-[5.5px]":"w-full"}`}/>
              <span className={`h-[1.5px] bg-ink rounded-full transition-all duration-200 ${open?"opacity-0":"w-3"}`}/>
              <span className={`h-[1.5px] bg-ink rounded-full transition-all duration-200 ${open?"-rotate-45 -translate-y-[5.5px]":"w-full"}`}/>
            </div>
          </button>
        </div>
      </header>

      {/* ── Mobile dropdown ── */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/5" onClick={()=>setOpen(false)}/>
          <div className="fixed top-14 inset-x-0 z-40 md:hidden bg-surface border-b border-border shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-3" style={{animation:"fade-in .15s ease"}}>
            {[...NAV_BASE,{href:"/settings",key:"settings" as ActiveRoute,label:"Settings"}].map(n=>{
              const href = n.dynamicReader ? readerHref : n.href;
              return (
              <Link key={n.key} href={href} onClick={()=>setOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-[14px] transition-colors ${
                  active===n.key ? "font-semibold text-accent bg-accent-subtle" : "text-ink-secondary hover:bg-surface-hover"
                }`}>
                {n.label}
              </Link>
            );})}
            <div className="border-t border-border mt-2 pt-2">
              {loggedIn && displayName && (
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="w-7 h-7 rounded-full bg-accent text-white text-[11px] font-bold flex items-center justify-center shrink-0">{initial}</span>
                  <span className="text-[13px] text-ink-secondary truncate">{displayName}</span>
                </div>
              )}
              <a href={loggedIn?"/api/auth/logout":"/api/auth/start"}
                className="block px-3 py-2.5 rounded-lg text-[14px] font-medium text-accent hover:bg-accent-subtle transition-colors">
                {loggedIn?"Sign out":"Sign in with Quran.com"}
              </a>
            </div>
          </div>
        </>
      )}

      {/* ── Mobile bottom tabs ── */}
      <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-surface/95 backdrop-blur-xl border-t border-border" style={{paddingBottom:"env(safe-area-inset-bottom, 0px)"}}>
        <div className="flex items-stretch h-14">
          {MOBILE_TAB.map(t=>{
            const href = t.key === "reader" ? readerHref : t.href;
            return (
            <Link key={t.key} href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors ${
                active===t.key ? "text-accent font-semibold" : "text-ink-tertiary"
              }`}>
              <span className={active===t.key ? "text-accent" : "text-ink-tertiary"}>{t.icon}</span>
              {t.label}
            </Link>
          );})}
        </div>
      </nav>
    </>
  );
}
