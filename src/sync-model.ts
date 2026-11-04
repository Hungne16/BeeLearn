import type {Deck,State,LearningRecord,GamePerformance} from './model.js';
export type HistoryEntry=NonNullable<State['gameHistory']>[number];
export interface Change<T>{id:string;before:T|null;after:T|null}
export interface SyncPatch{id:string;decks:Change<Deck>[];records:Change<LearningRecord>[];activity:Record<string,number>;performance:Change<GamePerformance>[];history:Change<HistoryEntry>[]}
export const emptyState=():State=>({version:1,decks:[],records:{},activity:{},gamePerformance:{},gameHistory:[]});
export const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const indexed=<T extends {id:string}>(list:T[])=>Object.fromEntries(list.map(x=>[x.id,x]));
export function historyId(entry:HistoryEntry){const s=JSON.stringify(entry);let a=2166136261,b=5381;for(let i=0;i<s.length;i++){a=Math.imul(a^s.charCodeAt(i),16777619);b=Math.imul(b,33)^s.charCodeAt(i)}return `${entry.date}-${(a>>>0).toString(16)}-${(b>>>0).toString(16)}`}
function changes<T>(before:Record<string,T>,after:Record<string,T>):Change<T>[]{return [...new Set([...Object.keys(before),...Object.keys(after)])].filter(id=>!equal(before[id],after[id])).map(id=>({id,before:before[id]??null,after:after[id]??null}))}
export function createPatch(before:State,after:State,id:string):SyncPatch{
 const activity:Record<string,number>={};for(const [day,count] of Object.entries(after.activity)){const delta=count-(before.activity[day]??0);if(delta>0)activity[day]=delta}
 return {id,decks:changes(indexed(before.decks),indexed(after.decks)),records:changes(before.records,after.records),activity,performance:changes(before.gamePerformance??{},after.gamePerformance??{}),history:changes(Object.fromEntries((before.gameHistory??[]).map(x=>[historyId(x),x])),Object.fromEntries((after.gameHistory??[]).map(x=>[historyId(x),x]))).filter(x=>x.after!==null)};
}
export const hasChanges=(p:SyncPatch)=>p.decks.length+p.records.length+p.performance.length+p.history.length+Object.keys(p.activity).length>0;
export function mergeDeck(change:Change<Deck>,remote:Deck|null):Deck|null{
 if(!change.after)return null;if(!change.before)return clone(remote?mergeImported({...emptyState(),decks:[remote]},{...emptyState(),decks:[change.after]}).decks[0]:change.after);
 if(!remote)return null;const result=clone(remote);const {before,after}=change;
 if(before.name!==after.name)result.name=after.name;if(before.description!==after.description)result.description=after.description;
 const cards=indexed(result.cards);for(const c of changes(indexed(before.cards),indexed(after.cards))){if(!c.after)delete cards[c.id];else if(!c.before)cards[c.id]=c.after;else if(cards[c.id]){const merged={...cards[c.id]};for(const key of Object.keys(c.after) as (keyof typeof merged)[])if(!equal(c.before[key],c.after[key]))(merged as unknown as Record<string,unknown>)[key]=c.after[key];cards[c.id]=merged}}
 result.cards=[...after.cards.map(c=>cards[c.id]).filter(Boolean),...result.cards.filter(c=>cards[c.id]&&!after.cards.some(x=>x.id===c.id)).map(c=>cards[c.id])];return result;
}
export function mergeRecord(c:Change<LearningRecord>,remote:LearningRecord|null):LearningRecord|null{
 if(!c.after)return null;if(!remote)return clone(c.after);const latest=c.after.last>=remote.last?c.after:remote;
 return {...latest,reviews:remote.reviews+Math.max(0,c.after.reviews-(c.before?.reviews??0)),failures:remote.failures+Math.max(0,c.after.failures-(c.before?.failures??0))};
}
export function mergePerformance(c:Change<GamePerformance>,remote:GamePerformance|null):GamePerformance|null{
 if(!c.after)return null;const result=remote??{correct:0,incorrect:0,memory:0,shooter:0,last:0};return {correct:result.correct+Math.max(0,c.after.correct-(c.before?.correct??0)),incorrect:result.incorrect+Math.max(0,c.after.incorrect-(c.before?.incorrect??0)),memory:result.memory+Math.max(0,c.after.memory-(c.before?.memory??0)),shooter:result.shooter+Math.max(0,c.after.shooter-(c.before?.shooter??0)),last:Math.max(result.last,c.after.last)};
}
export function mergeImported(remote:State,local:State):State{
 const result=clone(remote);for(const incoming of local.decks){let existing=result.decks.find(d=>d.id===incoming.id);if(!existing)existing=result.decks.find(d=>d.name===incoming.name&&d.cards.some(c=>incoming.cards.some(x=>x.id===c.id)));if(!existing){result.decks.push(clone(incoming));continue}const seen=new Set(existing.cards.map(c=>c.id));for(const c of incoming.cards)if(!seen.has(c.id)){existing.cards.push(clone(c));seen.add(c.id)}}
 for(const [id,r] of Object.entries(local.records)){const old=result.records[id];if(!old||r.last>old.last)result.records[id]=clone(r);else result.records[id]={...old,reviews:Math.max(old.reviews,r.reviews),failures:Math.max(old.failures,r.failures)}}
 for(const [day,count] of Object.entries(local.activity))result.activity[day]=Math.max(result.activity[day]??0,count);
 result.gamePerformance??={};for(const [id,r] of Object.entries(local.gamePerformance??{})){const old=result.gamePerformance[id];result.gamePerformance[id]=old?{correct:Math.max(old.correct,r.correct),incorrect:Math.max(old.incorrect,r.incorrect),memory:Math.max(old.memory,r.memory),shooter:Math.max(old.shooter,r.shooter),last:Math.max(old.last,r.last)}:r}
 const history=new Map([...(remote.gameHistory??[]),...(local.gameHistory??[])].map(h=>[historyId(h),h]));result.gameHistory=[...history.values()].sort((a,b)=>a.date-b.date).slice(-40);return result;
}
