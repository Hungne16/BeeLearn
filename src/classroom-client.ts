import {getAuth} from 'firebase/auth';
import type {Deck} from './model.js';
export type Activity='flashcard'|'memory'|'shooter';
export interface ClassInfo{id:string;name:string;description:string;subject:string;ownerId:string;teacherName:string;approval:boolean;code?:string;archived:boolean;studentCount?:number;assignmentCount?:number;pendingCount?:number;membership?:string}
export interface Member{uid:string;name:string;status:string;joinedAt:number}
export interface Result{uid:string;attempts:number;correct:number;incorrect:number;lastAt:number;completedAt:number|null;progress:number;accuracy:number|null;status:string;late:boolean;words:Record<string,{correct:number;incorrect:number;reviewed:boolean;remembered:boolean;lastAt:number}>;activities:Partial<Record<Activity,{done:boolean;attempts:number;bestAccuracy:number;lastAt:number}>>}
export interface Assignment{id:string;title:string;deck:Deck;activities:Activity[];deadline:number;createdAt:number;minAccuracy:number;gameSize:number;requireRemembered:boolean;targets:string[]|null;teacherName:string;result?:Result;results?:Result[]}
export interface Attempt{id:string;uid:string;classId:string;assignmentId:string;activity:Activity;deck:Deck;startedAt:number;finishedAt:number|null;accuracy?:number;won?:boolean;passed?:boolean;correct:number;incorrect:number;words:Record<string,{correct:number;incorrect:number;firstCorrect:boolean}>;wordCount?:number}
export interface AssignmentSession{attempt:Attempt;assignment:Assignment;classroom:ClassInfo}
export interface ClassDetail{classroom:ClassInfo;members:Member[];assignments:Assignment[]}
export interface Home{profile:{role:'teacher'|'student';name:string}|null;classes:ClassInfo[]}
export async function classroomAPI<T>(action:string,input:Record<string,unknown>={}):Promise<T>{
 const user=getAuth().currentUser;if(!user)throw Error('Hãy đăng nhập Google để dùng lớp học.');let token:string;try{token=await user.getIdToken()}catch{throw Error('Phiên đăng nhập hết hạn. Hãy đăng nhập lại.')}
 const response=await fetch('/api/classroom',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action,input}),signal:AbortSignal.timeout(20000)}).catch(()=>{throw Error('Chưa kết nối được lớp học. Hãy kiểm tra mạng và thử lại.')});
 const result=await response.json().catch(()=>({error:'Chưa kết nối được API lớp học.'}));if(!response.ok)throw Object.assign(Error(result.error||'Không xử lý được yêu cầu.'),{status:response.status});return result.data;
}
interface Pending{owner:string;action:'answer'|'finish';input:Record<string,unknown>;id:string}
let busy=false,retry=0,running:Promise<void>|null=null;
const storageKey=(uid:string)=>`beelearn-class-outbox:${uid}`;
function read(uid:string):Pending[]{try{const rows=JSON.parse(localStorage.getItem(storageKey(uid))??'[]');return Array.isArray(rows)?rows:[]}catch{return []}}
export const pendingClassEvents=()=>getAuth().currentUser?read(getAuth().currentUser!.uid).length:0;
async function processClassEvents(){
 const user=getAuth().currentUser;if(!user||busy)return;busy=true;clearTimeout(retry);
 try{while(getAuth().currentUser?.uid===user.uid){const row=read(user.uid)[0];if(!row)return;try{await classroomAPI(row.action,row.input)}catch(e){const status=(e as {status?:number}).status;if(status&&status>=400&&status<500&&status!==429){const rows=read(user.uid).filter(x=>x.id!==row.id);localStorage.setItem(storageKey(user.uid),JSON.stringify(rows));window.dispatchEvent(new CustomEvent('classroom-sync-error',{detail:(e as Error).message}));continue}throw e}
   const rows=read(user.uid).filter(x=>x.id!==row.id);localStorage.setItem(storageKey(user.uid),JSON.stringify(rows));window.dispatchEvent(new Event('classroom-synced'));
  }
 }catch{retry=window.setTimeout(()=>void flushClassEvents(),10000)}finally{busy=false}
}
export function flushClassEvents():Promise<void>{if(running)return running;const owner=getAuth().currentUser?.uid;running=processClassEvents().finally(()=>{running=null;if(getAuth().currentUser&&getAuth().currentUser?.uid!==owner)void flushClassEvents()});return running}
export function queueClassEvent(action:'answer'|'finish',input:Record<string,unknown>){const owner=getAuth().currentUser?.uid;if(!owner)throw Error('Đã đăng xuất. Không gửi được kết quả.');const rows=read(owner);rows.push({owner,action,input,id:crypto.randomUUID()});localStorage.setItem(storageKey(owner),JSON.stringify(rows));void flushClassEvents()}
window.addEventListener('online',()=>void flushClassEvents());
