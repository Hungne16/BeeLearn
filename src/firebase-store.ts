import {collection,doc,getDocs,runTransaction,serverTimestamp,type Firestore} from 'firebase/firestore';
import type {State} from './model.js';
import {emptyState,mergeDeck,mergeRecord,mergePerformance,type SyncPatch} from './sync-model.js';
export async function readCloud(db:Firestore,uid:string):Promise<State>{
 const s=emptyState();const groups=['decks','records','activity','performance','history'];
 const snapshots=await Promise.all(groups.map(g=>getDocs(collection(db,'users',uid,g))));
 snapshots.forEach((snap,i)=>snap.forEach(d=>{const v=d.data();switch(groups[i]){case 'decks':s.decks.push(v.value);break;case 'records':s.records[d.id]=v.value;break;case 'activity':s.activity[d.id]=v.count;break;case 'performance':s.gamePerformance![d.id]=v.value;break;case 'history':s.gameHistory!.push(v.value)}}));
 s.gameHistory!.sort((a,b)=>a.date-b.date);s.gameHistory=s.gameHistory!.slice(-40);return s;
}
export async function writePatch(db:Firestore,uid:string,p:SyncPatch,clientId:string){
 const entries=[...p.decks.map(c=>({group:'decks',id:c.id,c})),...p.records.map(c=>({group:'records',id:c.id,c})),...p.performance.map(c=>({group:'performance',id:c.id,c})),...p.history.map(c=>({group:'history',id:c.id,c})),...Object.entries(p.activity).map(([id,delta])=>({group:'activity',id,delta}))];
 for(let offset=0;offset<entries.length;offset+=100){
  const batch=entries.slice(offset,offset+100);const ledger=doc(db,'users',uid,'operations',`${p.id}-${offset}`);
  await runTransaction(db,async tx=>{
   if((await tx.get(ledger)).exists())return;
   const refs=batch.map(x=>doc(db,'users',uid,x.group,x.id));const values=await Promise.all(refs.map(r=>tx.get(r)));
   batch.forEach((entry,i)=>{
    const old=values[i].data();let value:unknown;
    if('delta' in entry){tx.set(refs[i],{count:(old?.count??0)+entry.delta,updatedAt:serverTimestamp()});return}
    const c=entry.c;
    if(entry.group==='decks')value=mergeDeck(c as SyncPatch['decks'][number],old?.value??null);
    else if(entry.group==='records')value=mergeRecord(c as SyncPatch['records'][number],old?.value??null);
    else if(entry.group==='performance')value=mergePerformance(c as SyncPatch['performance'][number],old?.value??null);
    else value=c.after;
    if(value===null)tx.delete(refs[i]);else tx.set(refs[i],{value,updatedAt:serverTimestamp()});
   });
   tx.set(ledger,{createdAt:serverTimestamp()});tx.set(doc(db,'users',uid,'metadata','sync'),{version:1,clientId,updatedAt:serverTimestamp()});
  });
 }
}
