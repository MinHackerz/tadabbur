"use client";
import PageShell from "@/components/layout/PageShell";
import ReaderView from "@/components/reader/ReaderView";
import { btnPrimary as B1, card as C } from "@/components/ui/primitives";
import { useInsight } from "@/components/useInsight";
import HomeView from "@/components/HomeView";
import GoalsView from "@/components/pages/GoalsView";
import LibraryView from "@/components/pages/LibraryView";
import SearchView from "@/components/pages/SearchView";
import SettingsView from "@/components/pages/SettingsView";
import TadabburPage from "@/components/tadabbur/TadabburPage";
import { summarizeGoalPlan } from "@/lib/goalPlan";

const FEATURE_ROUTES = new Set(["search", "library", "goals", "settings", "tadabbur"]);

export default function InsightShell({route,chapterId="1"}:{route:string;chapterId?:string}){
  const h=useInsight(chapterId,route);
  const d=h.data;
  const li=d?.isLoggedIn??false;
  
  const isReader = route === "reader";
  const isFeature = FEATURE_ROUTES.has(route);

  if(h.bErr&&!d) return (
    <PageShell active={route as any} loggedIn={false} title="Error">
      <div className={C}>
        <p className="text-danger text-[14px] font-medium">{h.errMsg(h.bErr,"Failed to load.")}</p>
        <button className={B1+" mt-4"} onClick={()=>h.mutate()}>Retry connection</button>
      </div>
    </PageShell>
  );

  if(h.isLoading||!d) return (
    <PageShell active={route as any} loggedIn={false}>
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin"/>
        <p className="text-ink-tertiary text-[13px] font-medium">Loading workspace…</p>
      </div>
    </PageShell>
  );

  return (
    <PageShell active={route as any} loggedIn={li} userEmail={(d.userInfo?.data as {name?: string; email?: string} | null)?.name ?? (d.userInfo?.data as {email?: string} | null)?.email ?? null} variant={isReader?"reader":route==="home"?"home":isFeature?"feature":"default"} readerChapterId={chapterId}>
      {/* Auth error / flash notice banner */}
      {d.authError && (
        <div className="mx-auto max-w-3xl px-4 pt-16 pb-0">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-danger-subtle border border-danger/20 text-[13px] text-danger">
            <svg className="shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <p>{d.authError}</p>
          </div>
        </div>
      )}
      {d.flashNotice && (
        <div className="mx-auto max-w-3xl px-4 pt-16 pb-0">
          <div className={`flex items-start gap-3 p-4 rounded-xl text-[13px] border ${d.flashNotice.type === "error" ? "bg-danger-subtle border-danger/20 text-danger" : "bg-accent-subtle border-accent/20 text-accent"}`}>
            <p>{d.flashNotice.message}</p>
          </div>
        </div>
      )}
      {/* HOME */}
      {route==="home"&&(
        <HomeView
          chapters={d.contentPreview.items}
          chaptersError={d.contentPreview.error}
          isLoggedIn={li}
          bookmarkCount={d.bookmarks.items.filter((b: { source?: string }) => (b.source ?? "random") === "random").length}
          notesCount={d.notes.items.filter((n: { source?: string }) => (n.source ?? "random") === "random").length}
          hasGoal={Boolean(d.goals.data)}
          goalLabel={
            d.goals.data
              ? `${String((d.goals.data as Record<string, unknown>).period ?? "daily")} · ${String((d.goals.data as Record<string, unknown>).type ?? "reading")}`
              : undefined
          }
          goalPlanSummary={summarizeGoalPlan(
            d.goals.data as Record<string, unknown> | null,
          )}
          sessionHydrated={h.sessionHydrated}
          surahId={h.surahId}
          setSurahId={h.setSurahId}
          trId={h.trId}
          setTrId={h.setTrId}
          auId={h.auId}
          setAuId={h.setAuId}
          readingMode={h.readingMode}
          setReadingMode={h.setReadingMode}
          fontSize={h.fontSize}
          setFontSize={h.setFontSize}
          darkMode={h.darkMode}
          toggleDarkMode={h.toggleDarkMode}
          onOpenReader={h.openReader}
        />
      )}

      {/* READER */}
      {route==="reader"&&(
        <ReaderView
          chapterId={chapterId}
          rData={h.rData}
          rLoading={h.rLoading}
          rErr={h.rErr}
          trId={h.trId}
          auId={h.auId}
          setTrId={h.setTrId}
          setAuId={h.setAuId}
          readerCh={h.readerCh}
          setReaderCh={h.setReaderCh}
          chapters={d.contentPreview.items}
          bookmarkedKeys={h.bookmarkedKeys}
          bookmarks={d.bookmarks.items}
          notes={d.notes.items}
          isLoggedIn={li}
          onNavigateSurah={h.navigateSurah}
          onJumpSurah={h.jumpReader}
          onBookmarkVerse={h.bookmarkVerse}
          onUnbookmarkVerse={h.unbookmarkVerse}
          onNoteVerse={h.noteVerse}
          onUpdateNote={h.updateNote}
          onDeleteNote={h.deleteNote}
          onCopyVerse={h.copyVerse}
          readingMode={h.readingMode}
          setReadingMode={h.setReadingMode}
          fontSize={h.fontSize}
          setFontSize={h.setFontSize}
          darkMode={h.darkMode}
          toggleDarkMode={h.toggleDarkMode}
          showTransliteration={h.showTransliteration}
          toggleTransliteration={h.toggleTransliteration}
        />
      )}


      {route === "search" && (
        <SearchView
          searchIn={h.searchIn}
          setSearchIn={h.setSearchIn}
          clearSearch={h.clearSearch}
          sLoading={h.sLoading}
          sData={h.sData}
        />
      )}

      {route === "library" && (
        <LibraryView
          isLoggedIn={li}
          data={d}
          noteVK={h.noteVK}
          setNoteVK={h.setNoteVK}
          noteBody={h.noteBody}
          setNoteBody={h.setNoteBody}
          bmCh={h.bmCh}
          setBmCh={h.setBmCh}
          bmV={h.bmV}
          setBmV={h.setBmV}
          collName={h.collName}
          setCollName={h.setCollName}
          createNote={h.createNote}
          deleteNote={h.deleteNote}
          createBm={h.createBm}
          deleteBm={h.deleteBm}
          createColl={h.createColl}
          deleteColl={h.deleteColl}
          openReader={h.openReader}
        />
      )}

      {route === "goals" && (
        <GoalsView
          isLoggedIn={li}
          data={d}
          submitGoalPayload={h.submitGoalPayload}
        />
      )}

      {route === "tadabbur" && (
        <TadabburPage isLoggedIn={li} />
      )}

      {route === "settings" && (
        <SettingsView
          isLoggedIn={li}
          data={d}
          trId={h.trId}
          setTrId={h.setTrId}
          auId={h.auId}
          setAuId={h.setAuId}
          readingMode={h.readingMode}
          setReadingMode={h.setReadingMode}
          fontSize={h.fontSize}
          setFontSize={h.setFontSize}
          darkMode={h.darkMode}
          toggleDarkMode={h.toggleDarkMode}
          openReader={h.openReader}
        />
      )}


      {/* Toasts */}
      <div className="fixed bottom-20 md:bottom-6 right-6 flex flex-col gap-3 z-[200] pointer-events-none w-[min(340px,calc(100vw-3rem))]">
        {h.toasts.map(t=>(
          <div key={t.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3.5 rounded-xl text-[14px] font-medium shadow-[0_8px_30px_rgba(0,0,0,0.12)] ${t.ok?"bg-ink text-white":"bg-danger text-white"}`} style={{animation:"toast-in .3s cubic-bezier(0.16, 1, 0.3, 1)"}}>
            {t.ok ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>}
            {t.msg}
          </div>
        ))}
      </div>
    </PageShell>
  );
}
