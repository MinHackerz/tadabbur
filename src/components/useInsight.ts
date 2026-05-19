"use client";
import { startTransition, useCallback, useEffect, useMemo, useState, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { buildReaderUrl, type ReaderSession } from "@/components/reader/readerSession";
import { useReaderSession } from "@/components/reader/useReaderSession";
import type { BootstrapPayload, BookmarkItem, CollectionItem, NoteItem, ReaderPayload } from "@/lib/types";

type ToastT = { id: number; msg: string; ok: boolean };
interface SearchP { error:string|null; navigationItems:{label?:string;readerUrl:string|null;subtitle?:string|null}[]; query:string; verseItems:{readerUrl:string|null;subtitle?:string|null;text?:string;verseKey?:string|null}[] }
interface MutR<T=unknown> { data?:T; deletedId?:string; gatingMessage?:string|null; item?:T; message?:string; ok?:boolean; signedOut?:boolean }

const fetchJ = async<T,>(u:string):Promise<T>=>{const r=await fetch(u,{credentials:"include"});const p=await r.json().catch(()=>({})) as T;if(!r.ok)throw p;return p;};
const mutReq = async<T,>(u:string,m:"DELETE"|"POST"|"PUT",b?:Record<string,unknown>):Promise<MutR<T>>=>{const r=await fetch(u,{body:b?JSON.stringify(b):undefined,credentials:"include",headers:{"content-type":"application/json"},method:m});const p=await r.json().catch(()=>({})) as MutR<T>;if(!r.ok)throw p;return p;};
const tid=()=>Date.now()+Math.floor(Math.random()*1000);
const tryJ=(v:string)=>{try{const p=JSON.parse(v);return p&&typeof p==="object"&&!Array.isArray(p)?p as Record<string,unknown>:null}catch{return null}};
const errMsg=(e:unknown,f:string)=>{if(e instanceof Error)return e.message;if(e&&typeof e==="object"&&"message"in e){const m=(e as{message?:unknown}).message;if(typeof m==="string"&&m)return m}return f};

export function useInsight(chapterId:string,route:string) {
  const router = useRouter();
  const {data,error:bErr,isLoading,mutate}=useSWR<BootstrapPayload>("/api/bootstrap",fetchJ,{revalidateOnFocus:false});
  const [toasts,setToasts]=useState<ToastT[]>([]);
  const [searchIn,setSearchIn]=useState("");
  const [debQ,setDebQ]=useState("");
  const [readerCh,setReaderCh]=useState(chapterId);
  const [noteVK,setNoteVK]=useState("1:1");
  const [noteBody,setNoteBody]=useState("");
  const [bmCh,setBmCh]=useState("1");
  const [bmV,setBmV]=useState("1");
  const [collName,setCollName]=useState("");
  const [goalTxt,setGoalTxt]=useState(JSON.stringify({category:"QURAN",period:"daily",targetAmount:2,type:"PAGES"},null,2));
  const [prefTxt,setPrefTxt]=useState(JSON.stringify({fontSize:3,mushafLines:15,reciter:7},null,2));
  const defSearch=useDeferredValue(searchIn);

  const session = useReaderSession();
  const { trId, auId, surahId, setTrId, setAuId, setSurahId, setReadingMode, setFontSize, toggleDarkMode, readingMode, fontSize, darkMode, hydrated: sessionHydrated, patch: patchSession } = session;

  useEffect(()=>{const t=setTimeout(()=>setDebQ(defSearch.trim()),300);return()=>clearTimeout(t)},[defSearch]);
  useEffect(()=>setReaderCh(chapterId),[chapterId]);
  useEffect(()=>{
    if(route!=="reader"||!sessionHydrated)return;
    const id=parseInt(chapterId,10);
    const partial: Partial<ReaderSession>={};
    if(id>=1&&id<=114&&id!==surahId)partial.surahId=id;
    if(typeof window!=="undefined"){
      const params=new URLSearchParams(window.location.search);
      const tr=params.get("tr");
      const au=params.get("au");
      if(tr&&tr!==trId)partial.trId=tr;
      if(au&&au!==auId)partial.auId=au;
    }
    if(Object.keys(partial).length>0)patchSession(partial);
  },[chapterId,route,sessionHydrated,surahId,trId,auId,patchSession]);
  useEffect(()=>{if(data?.flashNotice?.message)push(data.flashNotice.message,data.flashNotice.type==="success")},[data?.flashNotice?.message,data?.flashNotice?.type]);
  useEffect(()=>{if(data?.authError)push(data.authError,false)},[data?.authError]);

  const readerPath=useMemo(()=>`/api/reader/${encodeURIComponent(readerCh||chapterId||"1")}?tr=${encodeURIComponent(trId)}&au=${encodeURIComponent(auId)}`,[chapterId,readerCh,trId,auId]);
  const {data:sData,isLoading:sLoading,mutate:sMut}=useSWR<SearchP>(debQ?`/api/search?query=${encodeURIComponent(debQ)}&tr=${encodeURIComponent(trId)}`:null,fetchJ,{keepPreviousData:true,revalidateOnFocus:false});
  const shouldFetchReader=route==="home"||route==="reader";
  const {data:rData,error:rErr,isLoading:rLoading}=useSWR<ReaderPayload>(shouldFetchReader?readerPath:null,fetchJ,{revalidateOnFocus:false});

  function push(m:string,ok:boolean){const i=tid();setToasts(p=>[...p,{id:i,msg:m,ok}]);setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==i)),4000)}
  function repl<T>(k:"bookmarks"|"collections"|"notes",fn:(i:T[])=>T[]){if(!data)return;startTransition(()=>{mutate({...data,[k]:{...data[k],items:fn(data[k].items as T[])}},false)})}

  async function createNote(){if(!data?.isLoggedIn){push("Sign in first.",false);return}const vk=noteVK.trim(),b=noteBody.trim();if(!vk||!b){push("Verse key and body required.",false);return}const tmp:NoteItem={body:b,id:`t-${tid()}`,ranges:[`${vk}-${vk}`]};const prev=data.notes.items;repl<NoteItem>("notes",i=>[tmp,...i]);try{const r=await mutReq<NoteItem>("/api/notes","POST",{body:b,verseKey:vk});repl<NoteItem>("notes",i=>i.map(x=>x.id===tmp.id?r.item??x:x));setNoteBody("");push(r.message??"Note created.",true)}catch(e){repl<NoteItem>("notes",()=>prev);push((e as MutR).message??"Failed.",false);await mutate()}}
  async function deleteNote(id:string|null){if(!id)return;const prev=data?.notes.items??[];repl<NoteItem>("notes",i=>i.filter(x=>x.id!==id));try{const r=await mutReq(`/api/notes/${id}`,"DELETE");push(r.message??"Deleted.",true)}catch(e){repl<NoteItem>("notes",()=>prev);push((e as MutR).message??"Failed.",false);await mutate()}}
  async function createBm(){const cn=parseInt(bmCh),vn=parseInt(bmV);if(!cn||!vn){push("Invalid numbers.",false);return}const tmp:BookmarkItem={id:`t-${tid()}`,readerUrl:`/read/${cn}`,type:"ayah",verseKey:`${cn}:${vn}`};const prev=data?.bookmarks.items??[];repl<BookmarkItem>("bookmarks",i=>[tmp,...i]);try{const r=await mutReq<BookmarkItem>("/api/bookmarks","POST",{chapterNumber:cn,verseNumber:vn});repl<BookmarkItem>("bookmarks",i=>i.map(x=>x.id===tmp.id?r.item??x:x));push(r.message??"Bookmarked.",true)}catch(e){repl<BookmarkItem>("bookmarks",()=>prev);push((e as MutR).message??"Failed.",false);await mutate()}}
  async function deleteBm(id:string|null){if(!id)return;const prev=data?.bookmarks.items??[];repl<BookmarkItem>("bookmarks",i=>i.filter(x=>x.id!==id));try{await mutReq(`/api/bookmarks/${id}`,"DELETE");push("Deleted.",true)}catch(e){repl<BookmarkItem>("bookmarks",()=>prev);push((e as MutR).message??"Failed.",false);await mutate()}}
  async function createColl(){const n=collName.trim();if(!n){push("Name required.",false);return}const tmp:CollectionItem={id:`t-${tid()}`,name:n,updatedAt:new Date().toISOString()};const prev=data?.collections.items??[];repl<CollectionItem>("collections",i=>[tmp,...i]);try{const r=await mutReq<CollectionItem>("/api/collections","POST",{name:n});repl<CollectionItem>("collections",i=>i.map(x=>x.id===tmp.id?r.item??x:x));setCollName("");push(r.message??"Created.",true)}catch(e){repl<CollectionItem>("collections",()=>prev);push((e as MutR).message??"Failed.",false);await mutate()}}
  async function deleteColl(id:string|null){if(!id)return;const prev=data?.collections.items??[];repl<CollectionItem>("collections",i=>i.filter(x=>x.id!==id));try{await mutReq(`/api/collections/${id}`,"DELETE");push("Deleted.",true)}catch(e){repl<CollectionItem>("collections",()=>prev);push((e as MutR).message??"Failed.",false);await mutate()}}
  async function refreshSession(){try{const r=await mutReq("/api/session/refresh","POST");push(r.message??"Refreshed.",true);await mutate()}catch(e){push((e as MutR).message??"Failed.",false);await mutate()}}
  async function submitGoalPayload(payload:Record<string,unknown>){try{const r=await mutReq("/api/goals","POST",{payload});setGoalTxt(JSON.stringify(payload,null,2));push(r.message??"Saved.",true);await mutate()}catch(e){push((e as MutR).message??"Failed.",false)}}
  async function submitGoal(){const p=tryJ(goalTxt);if(!p){push("Invalid JSON.",false);return}await submitGoalPayload(p)}
  async function submitPref(){const p=tryJ(prefTxt);if(!p){push("Invalid JSON.",false);return}try{const r=await mutReq("/api/preferences","POST",{payload:p});push(r.message??"Saved.",true);await mutate()}catch(e){push((e as MutR).message??"Failed.",false)}}
  function clearSearch(){setSearchIn("");setDebQ("");sMut({error:null,navigationItems:[],query:"",verseItems:[]},false)}

  const navigateSurah = useCallback((id:number)=>{
    const next={...session,surahId:id};
    patchSession({surahId:id});
    router.push(buildReaderUrl(next));
  },[router,session,patchSession]);

  function jumpReader(){
    const n=parseInt(readerCh.trim(),10);
    if(n>=1&&n<=114)navigateSurah(n);
  }

  const openReader = useCallback((surah?:number,hash?:string)=>{
    const next={...session,surahId:surah??session.surahId};
    patchSession({surahId:next.surahId});
    router.push(buildReaderUrl(next,hash));
  },[router,session,patchSession]);

  async function bookmarkVerse(chapter:number,verse:number){
    if(!data?.isLoggedIn){push("Sign in to bookmark verses.",false);return}
    const tmp:BookmarkItem={id:`t-${tid()}`,readerUrl:`/read/${chapter}#verse-${verse}`,type:"ayah",verseKey:`${chapter}:${verse}`};
    const prev=data.bookmarks.items;
    repl<BookmarkItem>("bookmarks",i=>[tmp,...i]);
    try{
      const r=await mutReq<BookmarkItem>("/api/bookmarks","POST",{chapterNumber:chapter,verseNumber:verse});
      repl<BookmarkItem>("bookmarks",i=>i.map(x=>x.id===tmp.id?r.item??x:x));
      push(r.message??"Bookmarked.",true);
    }catch(e){
      repl<BookmarkItem>("bookmarks",()=>prev);
      push((e as MutR).message??"Failed.",false);
      await mutate();
    }
  }

  async function unbookmarkVerse(verseKey:string){
    if(!data?.isLoggedIn){push("Sign in first.",false);return}
    const bookmark=data.bookmarks.items.find(b=>b.verseKey===verseKey);
    if(!bookmark?.id)return;
    const prev=data.bookmarks.items;
    repl<BookmarkItem>("bookmarks",i=>i.filter(x=>x.id!==bookmark.id));
    try{
      await mutReq(`/api/bookmarks/${bookmark.id}`,"DELETE");
      push("Bookmark removed.",true);
    }catch(e){
      repl<BookmarkItem>("bookmarks",()=>prev);
      push((e as MutR).message??"Failed.",false);
      await mutate();
    }
  }

  async function updateNote(noteId:string,body:string){
    if(!data?.isLoggedIn){push("Sign in first.",false);return}
    const prev=data.notes.items;
    repl<NoteItem>("notes",i=>i.map(x=>x.id===noteId?{...x,body}:x));
    try{
      const r=await mutReq<NoteItem>(`/api/notes/${noteId}`,"PUT",{body});
      repl<NoteItem>("notes",i=>i.map(x=>x.id===noteId?r.item??x:x));
      push(r.message??"Note updated.",true);
    }catch(e){
      repl<NoteItem>("notes",()=>prev);
      push((e as MutR).message??"Failed.",false);
      await mutate();
    }
  }

  async function noteVerse(verseKey:string,body:string){
    if(!data?.isLoggedIn){push("Sign in to save notes.",false);return}
    setNoteVK(verseKey);
    const tmp:NoteItem={body,id:`t-${tid()}`,ranges:[`${verseKey}-${verseKey}`]};
    const prev=data.notes.items;
    repl<NoteItem>("notes",i=>[tmp,...i]);
    try{
      const r=await mutReq<NoteItem>("/api/notes","POST",{body,verseKey});
      repl<NoteItem>("notes",i=>i.map(x=>x.id===tmp.id?r.item??x:x));
      push(r.message??"Note saved.",true);
    }catch(e){
      repl<NoteItem>("notes",()=>prev);
      push((e as MutR).message??"Failed.",false);
      await mutate();
    }
  }

  function copyVerse(text:string){
    navigator.clipboard.writeText(text).then(()=>push("Copied to clipboard.",true)).catch(()=>push("Could not copy.",false));
  }

  const bookmarkedKeys = useMemo(()=>{
    const s=new Set<string>();
    for(const b of data?.bookmarks.items??[])s.add(b.verseKey);
    return s;
  },[data?.bookmarks.items]);

  return {data,bErr,isLoading,toasts,searchIn,setSearchIn,sData,sLoading,rData,rErr,rLoading,readerCh,setReaderCh,noteVK,setNoteVK,noteBody,setNoteBody,bmCh,setBmCh,bmV,setBmV,collName,setCollName,goalTxt,setGoalTxt,prefTxt,setPrefTxt,trId,setTrId,auId,setAuId,surahId,setSurahId,readingMode,setReadingMode,fontSize,setFontSize,darkMode,toggleDarkMode,sessionHydrated,openReader,buildReaderUrl,createNote,deleteNote,updateNote,createBm,deleteBm,createColl,deleteColl,refreshSession,submitGoal,submitGoalPayload,submitPref,clearSearch,jumpReader,navigateSurah,bookmarkVerse,unbookmarkVerse,noteVerse,copyVerse,bookmarkedKeys,mutate,push,errMsg};
}
