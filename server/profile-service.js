import {randomUUID} from 'node:crypto';
import {ensure,id,text} from './classroom-domain.js';
import {classroomService} from './classroom-service.js';
export const vietnamDay=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export function profileStreak(days,now=new Date()){const today=vietnamDay(now),serial=s=>Date.parse(s+'T12:00:00Z')/86400000;const todayNumber=serial(today),set=new Set(Object.keys(days).filter(k=>days[k]>0&&/^\d{4}-\d{2}-\d{2}$/.test(k)&&Number.isFinite(serial(k))&&serial(k)<=todayNumber).map(serial));let n=set.has(todayNumber)?todayNumber:todayNumber-1,count=0;while(set.has(n)){count++;n--}return count}
export function validateAvatar(value){
 if(value===null||value==='')return null;ensure(typeof value==='string'&&value.length<=140000,'Ảnh đại diện quá lớn.',400);
 const m=/^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);ensure(m,'Ảnh phải được chuyển sang JPEG trước khi lưu.',400);const b=Buffer.from(m[1],'base64');ensure(b.length>=20&&b.length<=100000&&b[0]===255&&b[1]===216&&b[b.length-2]===255&&b[b.length-1]===217,'Ảnh JPEG không hợp lệ.',400);
 let dimensions=false,i=2;while(i<b.length-2){ensure(b[i]===255,'Ảnh JPEG bị lỗi.',400);while(b[i]===255)i++;const marker=b[i++];if(marker===218||marker===217)break;ensure(i+2<=b.length,'Ảnh JPEG bị lỗi.',400);const length=b.readUInt16BE(i);ensure(length>=2&&i+length<=b.length,'Ảnh JPEG bị lỗi.',400);if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){ensure(length>=8,'Ảnh JPEG bị lỗi.',400);const h=b.readUInt16BE(i+3),w=b.readUInt16BE(i+5);ensure(w>0&&h>0&&w<=256&&h<=256,'Ảnh phải được thu nhỏ tối đa 256 × 256.',400);dimensions=true}i+=length}
 ensure(dimensions,'Không đọc được kích thước ảnh.',400);return value;
}
export function profileService(db,auth){
 const own=uid=>db.doc(`personalProfiles/${uid}`);
 async function initialize(user){const ref=own(user.uid),existing=await ref.get();if(existing.exists)return existing.data();const account=await auth.getUser(user.uid),username='bee_'+randomUUID().replace(/-/g,'').slice(0,20);return db.runTransaction(async tx=>{const old=await tx.get(ref);if(old.exists)return old.data();const reserved=await tx.get(db.doc(`profileUsernames/${username}`));ensure(!reserved.exists,'Hãy thử mở hồ sơ lại.',409);const value={uid:user.uid,displayName:text(account.displayName||user.name||'Người học',100),username,bio:'',avatar:null,createdAt:Date.parse(account.metadata.creationTime)};tx.create(ref,value);tx.create(db.doc(`profileUsernames/${username}`),{uid:user.uid});return value})}
 return async(user,action,input={})=>{
  const uid=user.uid,p=await initialize(user);
  if(action==='profileIdentity')return {displayName:p.displayName,avatar:p.avatar};
  if(action==='profileUpdate'){
   const displayName=text(input.displayName,100),username=text(input.username,24).toLowerCase(),bio=text(input.bio??'',160),avatar=validateAvatar(input.avatar);ensure(displayName,'Hãy nhập tên hiển thị.',400);ensure(/^[a-z0-9_]{3,24}$/.test(username),'Tên người dùng gồm 3–24 chữ thường, số hoặc dấu gạch dưới.',400);
   const updated=await db.runTransaction(async tx=>{const old=await tx.get(own(uid)),oldData=old.data(),reservation=db.doc(`profileUsernames/${username}`),taken=await tx.get(reservation),roleRef=db.doc(`classroomProfiles/${uid}`),role=await tx.get(roleRef);ensure(!taken.exists||taken.data().uid===uid,'Tên người dùng đã được sử dụng.',409);const next={...oldData,displayName,username,bio,avatar};if(oldData.username!==username){tx.delete(db.doc(`profileUsernames/${oldData.username}`));tx.set(reservation,{uid})}tx.set(own(uid),next);if(role.exists)tx.update(roleRef,{name:displayName});return next});
   await auth.updateUser(uid,{displayName});return updated;
  }
  if(action==='profileGet'){
   const [home,records,performance,activity,attempts]=await Promise.all([classroomService(db)(user,'home'),db.collection(`users/${uid}/records`).get(),db.collection(`users/${uid}/performance`).get(),db.collection(`users/${uid}/activity`).get(),db.collection('classAttempts').where('uid','==',uid).get()]);
   const words=new Set(),days={};records.forEach(d=>{if(d.data().value?.reviews>0)words.add(d.id)});performance.forEach(d=>{const r=d.data().value;if(r?.correct+r?.incorrect>0)words.add(d.id)});activity.forEach(d=>{if(d.data().count>0)days[d.id]=1});const assignments=new Map();
   attempts.forEach(d=>{const a=d.data();for(const [key,w]of Object.entries(a.words??{}))if(w.correct+w.incorrect>0)words.add(key);if(a.finishedAt&&a.passed)days[vietnamDay(new Date(a.finishedAt))]=1;assignments.set(a.classId+'/'+a.assignmentId,{classId:a.classId,assignmentId:a.assignmentId})});
   let completed=0;await Promise.all([...assignments.values()].map(async a=>{const r=await db.doc(`classrooms/${a.classId}/assignments/${a.assignmentId}/results/${uid}`).get();if(r.data()?.completedAt)completed++}));
   return {...p,role:home.profile?.role??null,classes:home.classes.filter(c=>!c.membership||c.membership==='active'),stats:{streak:profileStreak(days),practiced:words.size,completed},timezone:'Asia/Ho_Chi_Minh'};
  }
  ensure(false,'Không tìm thấy thao tác hồ sơ.',400);
 };
}
