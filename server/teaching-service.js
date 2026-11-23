import {ensure,id,text,hash} from './classroom-domain.js';
const DAY=86400000;
export function safeResourceURL(value){const raw=text(value,2000);let u;try{u=new URL(raw)}catch{ensure(false,'Nhập link HTTPS hợp lệ.',400)}ensure(u.protocol==='https:'&&!u.username&&!u.password&&u.hostname.includes('.')&&!/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/i.test(u.hostname),'Chỉ chấp nhận link HTTPS công khai.',400);return u.href}
export function teachingService(db){
 const row=s=>s.exists?{id:s.id,...s.data()}:null;
 async function access(user,cid,teacher=false){const c=row(await db.doc(`classrooms/${id(cid)}`).get());ensure(c,'Không tìm thấy lớp.',404);if(c.ownerId!==user.uid){ensure(!teacher,'Chỉ giáo viên của lớp được thay đổi.');const m=await db.doc(`classrooms/${cid}/members/${user.uid}`).get();ensure(m.data()?.status==='active','Bạn chưa được duyệt vào lớp.')}return c}
 const resource=(cid,rid)=>db.doc(`classrooms/${id(cid)}/resources/${id(rid)}`);
 return async(user,action,input={})=>{
  const now=Date.now();
  if(action==='teachingCalendar'){
   const from=Number(input.from),to=Number(input.to);ensure(Number.isFinite(from)&&Number.isFinite(to)&&to>from&&to-from<=93*DAY,'Khoảng lịch tối đa 93 ngày.',400);
   let classes;if(input.classId){classes=[await access(user,input.classId)]}else{ensure((await db.doc(`classroomProfiles/${user.uid}`).get()).data()?.role==='teacher','Chỉ giáo viên xem lịch giảng dạy.');classes=(await db.collection('classrooms').where('ownerId','==',user.uid).get()).docs.map(row)}
   const sessions=(await Promise.all(classes.map(async c=>(await db.collection('teachingSessions').where('classId','==',c.id).get()).docs.map(row).filter(s=>s.start<to&&s.end>from&&!s.deleted).map(s=>({...s,className:c.name,teacher:c.ownerId===user.uid&&!c.archived}))))).flat();return {teacher:classes.every(c=>c.ownerId===user.uid),classes:classes.map(c=>({id:c.id,name:c.name,archived:c.archived})),sessions:sessions.sort((a,b)=>a.start-b.start)};
  }
  if(action==='teachingSaveSession'){
   const cid=id(input.classId),c=await access(user,cid,true);ensure(!c.archived,'Lớp đã lưu trữ.',409);const key=id(input.requestId),title=text(input.title,150),start=Number(input.start),end=Number(input.end),repeat=Number(input.repeat??1);
   ensure(title&&Number.isFinite(start)&&Number.isFinite(end)&&start<end&&start>=Date.UTC(2000,0,1)&&end+11*7*DAY<=Date.UTC(2101,0,1)&&end-start<=12*3600000,'Nhập tên và khoảng giờ học hợp lệ (tối đa 12 giờ).',400);ensure(Number.isInteger(repeat)&&repeat>=1&&repeat<=12,'Lặp từ 1 đến 12 tuần.',400);ensure(!input.sessionId||repeat===1,'Chỉnh từng buổi học với số tuần bằng 1.',400);
   const location=text(input.location??'',300),note=text(input.note??'',2000);const ref=db.collection('teachingSessions');
   return db.runTransaction(async tx=>{const oldRows=await tx.get(ref.where('ownerId','==',user.uid));const activeClasses=await tx.get(db.collection('classrooms').where('ownerId','==',user.uid));const activeIds=new Set(activeClasses.docs.filter(c=>!c.data().archived).map(c=>c.id));const existing=oldRows.docs.map(row);let old=null;if(input.sessionId){old=existing.find(s=>s.id===id(input.sessionId));ensure(old&&old.classId===cid&&!old.deleted,'Không tìm thấy buổi học.',404)}
    const created=[];for(let i=0;i<repeat;i++){const rid=old?.id??hash(user.uid+':'+key+':'+i),a=start+i*7*DAY,b=end+i*7*DAY;if(!old&&existing.some(s=>s.id===rid)){created.push(existing.find(s=>s.id===rid));continue}ensure(!existing.some(s=>!s.deleted&&s.status!=='cancelled'&&activeIds.has(s.classId)&&s.id!==rid&&s.start<b&&s.end>a),'Trùng giờ với một buổi dạy khác. Chọn khoảng giờ khác nhé.',409);created.push({id:rid,classId:cid,ownerId:user.uid,title,start:a,end:b,location,note,status:old?.status??'scheduled',createdAt:old?.createdAt??now,updatedAt:now,deleted:false})}
    for(const s of created){const {id:rid,...v}=s;tx.set(ref.doc(rid),v)}return {sessions:created};
   });
  }
  if(action==='teachingSessionStatus'){
   const ref=db.doc(`teachingSessions/${id(input.sessionId)}`),old=await ref.get();ensure(old.exists,'Không tìm thấy buổi học.',404);const c=await access(user,old.data().classId,true);ensure(!c.archived,'Lớp đã lưu trữ.',409);ensure(['scheduled','completed','cancelled','deleted'].includes(input.status),'Trạng thái không hợp lệ.',400);return db.runTransaction(async tx=>{const rows=await tx.get(db.collection('teachingSessions').where('ownerId','==',user.uid)),current=rows.docs.find(s=>s.id===ref.id)?.data();const activeClasses=await tx.get(db.collection('classrooms').where('ownerId','==',user.uid));const activeIds=new Set(activeClasses.docs.filter(c=>!c.data().archived).map(c=>c.id));ensure(current&&!current.deleted,'Không tìm thấy buổi học.',404);if(input.status==='scheduled')ensure(!rows.docs.some(s=>{const a=s.data();return s.id!==ref.id&&!a.deleted&&a.status!=='cancelled'&&activeIds.has(a.classId)&&a.start<current.end&&a.end>current.start}),'Trùng giờ với một buổi dạy khác.',409);tx.update(ref,input.status==='deleted'?{deleted:true,updatedAt:now}:{status:input.status,updatedAt:now});return {ok:true}});
  }
  if(action==='teachingResources'){
   const cid=id(input.classId),c=await access(user,cid),teacher=c.ownerId===user.uid;const list=(await db.collection(`classrooms/${cid}/resources`).get()).docs.map(row).filter(r=>!r.deleted&&(teacher||r.published));
   const members=teacher?(await db.collection(`classrooms/${cid}/members`).get()).docs.map(s=>s.data()).filter(m=>m.status==='active'):[];
   const results=await Promise.all(list.map(async r=>{const ref=resource(cid,r.id).collection('progress');const snap=teacher?await ref.get():null;const own=teacher?null:await ref.doc(user.uid).get();const progress=(teacher?snap.docs.map(d=>({uid:d.id,...d.data()})):own.exists?[{uid:user.uid,...own.data()}]:[]).filter(p=>(p.version??1)===(r.version??1));return {...r,completed:progress.some(p=>p.uid===user.uid&&p.done),completedCount:teacher?members.filter(m=>progress.some(p=>p.uid===m.uid&&p.done)).length:undefined,students:teacher?members.map(m=>({uid:m.uid,name:m.name,done:!!progress.find(p=>p.uid===m.uid)?.done})):undefined}}));return {teacher,className:c.name,archived:c.archived,resources:results.sort((a,b)=>a.position-b.position||a.createdAt-b.createdAt),studentCount:teacher?members.length:undefined};
  }
  if(action==='teachingSaveResource'){
   const cid=id(input.classId),c=await access(user,cid,true);ensure(!c.archived,'Lớp đã lưu trữ.',409);const rid=id(input.resourceId??input.requestId),ref=resource(cid,rid),old=await ref.get();if(old.exists)ensure(old.data().ownerId===user.uid);const title=text(input.title,150),chapter=text(input.chapter??'Bài học',100),description=text(input.description??'',3000),kind=input.kind,url=safeResourceURL(input.url),position=Number(input.position??0);ensure(title&&chapter&&['document','video','link'].includes(kind),'Nhập tiêu đề, chương và loại tài liệu.',400);ensure(Number.isInteger(position)&&position>=0&&position<=9999,'Thứ tự từ 0 đến 9999.',400);ensure(typeof input.published==='boolean','Chọn trạng thái xuất bản.',400);await ref.set({ownerId:user.uid,title,chapter,description,kind,url,position,published:input.published,version:old.exists?(old.data().version??1)+(old.data().url!==url?1:0):1,deleted:false,createdAt:old.data()?.createdAt??now,updatedAt:now});return {id:rid};
  }
  if(action==='teachingResourceVisibility'){
   const cid=id(input.classId);const c=await access(user,cid,true);ensure(!c.archived,'Lớp đã lưu trữ.',409);const ref=resource(cid,input.resourceId);ensure((await ref.get()).exists,'Không tìm thấy tài liệu.',404);if(input.deleted===true)await ref.update({deleted:true,updatedAt:now});else{ensure(typeof input.published==='boolean','Trạng thái không hợp lệ.',400);await ref.update({published:input.published,updatedAt:now})}return {ok:true};
  }
  if(action==='teachingResourceProgress'){
   const cid=id(input.classId),c=await access(user,cid);ensure(c.ownerId!==user.uid,'Giáo viên xem tiến độ trong danh sách lớp.');const r=await resource(cid,input.resourceId).get();ensure(r.exists&&!r.data().deleted&&r.data().published,'Bài học chưa xuất bản.',404);ensure(typeof input.done==='boolean','Trạng thái không hợp lệ.',400);await r.ref.collection('progress').doc(user.uid).set({done:input.done,version:r.data().version??1,updatedAt:now});return {ok:true};
  }
  ensure(false,'Không tìm thấy thao tác giảng dạy.',400);
 };
}
