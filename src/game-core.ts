import type {Vocabulary} from './model.js';
export type Difficulty='easy'|'normal'|'hard';
export type Direction='en'|'vi';
export const levels={easy:{size:8,choices:3,targets:3,lives:5,speed:11},normal:{size:12,choices:4,targets:5,lives:3,speed:19},hard:{size:20,choices:4,targets:6,lives:3,speed:29}};
export const normalize=(s:string)=>s.normalize('NFC').trim().toLocaleLowerCase().replace(/\s+/g,' ');
export function shuffled<T>(list:readonly T[],random= Math.random):T[]{const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
export function meaningAliases(c:Vocabulary):string[]{return [...new Set([c.meaning,...c.meaning.split(/[,;]+/),...(c.acceptedMeanings??[])].map(normalize).filter(Boolean))]}
export function wordAliases(c:Vocabulary):string[]{return [c.word,...(c.synonyms??[])].map(normalize).filter(Boolean)}
export function matches(a:Vocabulary,b:Vocabulary):boolean{return a.id===b.id||meaningAliases(a).some(s=>meaningAliases(b).includes(s))||wordAliases(a).some(s=>wordAliases(b).includes(s))}
export function playable(cards:Vocabulary[]):Vocabulary[]{const seen=new Set<string>();return cards.filter(c=>{const key=normalize(c.word);if(!key||!c.meaning.trim()||seen.has(key))return false;seen.add(key);return true})}
export function choicesFor(card:Vocabulary,deck:Vocabulary[],count:number):string[]{const seen=new Set([normalize(card.meaning)]);const other=shuffled(deck).filter(c=>{const k=normalize(c.meaning);if(matches(card,c)||seen.has(k))return false;seen.add(k);return true}).slice(0,count-1).map(c=>c.meaning);return shuffled([card.meaning,...other])}
export function targetSet(ammo:Vocabulary,deck:Vocabulary[],count:number):Vocabulary[]{const selected=[ammo];for(const c of shuffled(deck)){if(selected.length>=count)break;if(selected.every(other=>!matches(c,other)))selected.push(c)}return shuffled(selected)}
export interface Rect{x:number;y:number;w:number;h:number}
export function segmentRect(x1:number,y1:number,x2:number,y2:number,r:Rect,padding=0):number|null{let lo=0,hi=1;for(const [p,d,min,max] of [[x1,x2-x1,r.x-padding,r.x+r.w+padding],[y1,y2-y1,r.y-padding,r.y+r.h+padding]]){if(Math.abs(d)<1e-9){if(p<min||p>max)return null}else{let a=(min-p)/d,b=(max-p)/d;if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);if(lo>hi)return null}}return lo}
export function accuracy(firstCorrect:number,total:number){return total?Math.round(firstCorrect/total*100):0}
// Fan-shaped lanes give every target a clear line from the cannon, even on phones.
export function targetLayout(count:number,width:number,height:number):Rect[]{
 const origin={x:width/2,y:height-46};const slots=count<=3?Array.from({length:count},(_,i)=>({x:(i+1)/(count+1),y:.22})):[{x:.16,y:.74},{x:.17,y:.44},{x:.34,y:.17},{x:.66,y:.17},{x:.83,y:.44},{x:.84,y:.74}].filter((_,i)=>count===6||count===5?count===6||i!==1:[0,2,3,5].includes(i));
 const h=width<500?50:60;let w=Math.min(205,(width-36)/3);
 for(let attempt=0;attempt<60;attempt++,w-=2){const rects=slots.slice(0,count).map(p=>({x:Math.max(13,Math.min(width-w-13,p.x*width-w/2)),y:Math.max(24,p.y*origin.y-h/2),w,h}));
  const clear=rects.every((r,i)=>rects.every((other,j)=>i===j||segmentRect(origin.x,origin.y,r.x+r.w/2,r.y+r.h/2,other,14)===null));
  if(clear)return rects;
 }
 throw Error('Không đủ chỗ cho mục tiêu.');
}
