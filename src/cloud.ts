import {initializeApp} from 'firebase/app';
import {getAuth,GoogleAuthProvider,onAuthStateChanged,signInWithPopup,signOut,connectAuthEmulator,type User} from 'firebase/auth';
import {getFirestore,doc,getDoc,onSnapshot,connectFirestoreEmulator} from 'firebase/firestore';
import {firebaseConfig} from './firebase-config.js';
import type {State} from './model.js';
import {clone,emptyState,createPatch,hasChanges,mergeImported,type SyncPatch} from './sync-model.js';
import {readCloud,writePatch} from './firebase-store.js';
export interface CloudStatus{user:User|null;label:string;ready:boolean}
interface Cache{state:State;queue:SyncPatch[];initialized:boolean}
export function createCloud(getState:()=>State,replace:(s:State)=>void,changed:(s:CloudStatus)=>void,notify:(s:string)=>void,valid:(s:unknown)=>s is State){
 const emulator=['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).has('emulator');
 const app=initializeApp(emulator?{...firebaseConfig,projectId:'demo-beelearn'}:firebaseConfig);const auth=getAuth(app),db=getFirestore(app);
 if(emulator){connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});connectFirestoreEmulator(db,'127.0.0.1',8089)}
 const clientId=crypto.randomUUID();let user:User|null=null,cache:Cache|null=null,baseline=clone(getState()),epoch=0,busy=false,timer=0,unsub=()=>{},ready=false,needsPull=false;
 const key=(id:string)=>`beelearn-cloud:${id}`;
 const status=(label:string)=>changed({user,label,ready});
 const persist=()=>{if(user&&cache)localStorage.setItem(key(user.uid),JSON.stringify(cache))};
 const guest=()=>{try{const s=JSON.parse(localStorage.getItem('nho-tu-v1')??'null');return valid(s)?s:emptyState()}catch{return emptyState()}};
 const error=(e:unknown)=>{const code=String((e as {code?:string})?.code??'');return code.includes('permission-denied')?'Chưa có quyền Firestore':code.includes('unauthorized-domain')?`Cần cho phép tên miền ${location.hostname} trong Firebase Auth`:code.includes('popup-blocked')?'Hãy cho phép cửa sổ đăng nhập':code.includes('network')?'Mất mạng · đã giữ trên máy':'Chưa đồng bộ · thử lại'};
 async function flush(){
  if(!user||!cache||busy)return;const id=user.uid,token=epoch;busy=true;status('Đang đồng bộ…');
  try{
   if(!cache.initialized){const [remote,meta]=await Promise.all([readCloud(db,id),getDoc(doc(db,'users',id,'metadata','sync'))]);if(token!==epoch)return;
    if(meta.exists()||remote.decks.length||Object.keys(remote.records).length){cache.state=remote;cache.queue=[];baseline=clone(remote);replace(clone(remote))}
    else {const p=createPatch(emptyState(),cache.state,crypto.randomUUID());if(hasChanges(p))cache.queue.push(p)}
    cache.initialized=true;persist();
   }
   while(cache.queue.length){const patch=cache.queue[0];await writePatch(db,id,patch,clientId);if(token!==epoch)return;cache.queue.shift();persist()}
   ready=true;status('Đã đồng bộ');
  }catch(e){if(token===epoch){if(cache?.initialized)ready=true;status(error(e));clearTimeout(timer);timer=window.setTimeout(()=>void flush(),15000)}}finally{busy=false;if(token!==epoch)void flush();else if(needsPull){needsPull=false;void pull()}}
 }
 async function pull(){const token=epoch;if(!user||!cache)return;if(busy||cache.queue.length){needsPull=true;return}try{const s=await readCloud(db,user.uid);if(token!==epoch||busy||cache?.queue.length)return;cache!.state=s;baseline=clone(s);persist();replace(clone(s));status('Đã đồng bộ')}catch(e){status(error(e))}}
 onAuthStateChanged(auth,next=>{
  epoch++;unsub();clearTimeout(timer);user=next;ready=false;
  if(!next){cache=null;baseline=guest();replace(clone(baseline));ready=true;status('Lưu trên máy');return}
  try{const raw=JSON.parse(localStorage.getItem(key(next.uid))??'null');cache=raw&&valid(raw.state)&&Array.isArray(raw.queue)?raw:null}catch{cache=null}
  cache??={state:guest(),queue:[],initialized:false};ready=cache.initialized;baseline=clone(cache.state);replace(clone(baseline));status('Đang kết nối…');
  void flush().then(()=>{if(user?.uid!==next.uid)return;void pull();unsub=onSnapshot(doc(db,'users',next.uid,'metadata','sync'),snap=>{if(snap.data()?.clientId!==clientId)void pull()},e=>status(error(e)))})
 });
 window.addEventListener('online',()=>void flush());window.addEventListener('offline',()=>status('Mất mạng · đã giữ trên máy'));
 return {
  save(s:State){try{if(!user){localStorage.setItem('nho-tu-v1',JSON.stringify(s));baseline=clone(s);return}if(!cache)return;const p=createPatch(baseline,s,crypto.randomUUID());baseline=clone(s);cache.state=clone(s);if(hasChanges(p))cache.queue.push(p);persist();status('Đang chờ đồng bộ');clearTimeout(timer);timer=window.setTimeout(()=>void flush(),600)}catch{notify('Không lưu được trên máy. Hãy xuất bản sao lưu JSON.')}},
  async login(){try{const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});await signInWithPopup(auth,provider)}catch(e){if(!String((e as {code?:string}).code).includes('popup-closed'))notify(error(e))}},
  async logout(){try{await signOut(auth)}catch(e){notify(error(e))}},
  retry(){void flush()},
  importGuest(){if(!user||!cache||!ready)return;const s=mergeImported(getState(),guest());replace(s);this.save(s);notify('Đã gộp dữ liệu máy này vào tài khoản.')},
 };
}
