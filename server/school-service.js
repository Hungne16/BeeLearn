import {attendanceService} from './attendance-service.js';
import {dashboardAgenda} from './agenda-service.js';
import {randomBytes} from 'node:crypto';
import {ensure,id,text,hash} from './classroom-domain.js';
const rows=s=>s.docs.map(d=>({id:d.id,...d.data()}));
export async function notify(db,uid,key,title,body,href){
 const ref=db.doc(`schoolNotifications/${id(uid)}/items/${hash(key)}`);
 await db.runTransaction(async tx=>{if(!(await tx.get(ref)).exists)tx.create(ref,{title,body,href,createdAt:Date.now(),readAt:null})});
}
export async function classNotice(db,cid,key,title,body,href){
 const c=await db.doc(`classrooms/${cid}`).get();if(!c.exists)return;
 const members=rows(await db.collection(`classrooms/${cid}/members`).get()).filter(m=>m.status==='active');
 await Promise.all(members.map(m=>notify(db,m.uid,key,title,body,href)));
}
export async function publishedReviews(db,uid){return rows(await db.collection('moduleReviews').where('studentId','==',uid).get()).filter(r=>r.published).sort((a,b)=>b.publishedAt-a.publishedAt).map(({history,...r})=>r)}
export async function assignmentNotice(db,cid,aid){
 const a=(await db.doc(`classrooms/${cid}/assignments/${aid}`).get()).data();if(!a)return;
 const members=rows(await db.collection(`classrooms/${cid}/members`).get()).filter(m=>m.status==='active'&&(!a.targets||a.targets.includes(m.uid)));
 await Promise.all(members.map(m=>notify(db,m.uid,`assignment:${cid}:${aid}`,'Bài tập mới',a.title,`#classrooms/${cid}/assignments/${aid}`)));
}
export async function auditClass(db,cid){
 const c=(await db.doc(`classrooms/${cid}`).get()).data();if(!c||c.archived)return;
 const now=Date.now(),members=rows(await db.collection(`classrooms/${cid}/members`).get()).filter(m=>m.status==='active');
 const assignments=rows(await db.collection(`classrooms/${cid}/assignments`).get());
 for(const a of assignments){if(a.deadline>now||a.deadlineAuditedAt)continue;
  const results=rows(await db.collection(`classrooms/${cid}/assignments/${a.id}/results`).get());
  const missing=members.filter(m=>(!a.targets||a.targets.includes(m.uid))&&!results.some(r=>r.id===m.uid&&r.completedAt));
  for(const m of missing){const key=`deadline:${cid}:${a.id}:${m.uid}`;
   await notify(db,c.ownerId,key,'Bài chưa hoàn thành',`${m.name} · ${a.title} · ${c.name}`,`#classrooms/${cid}/stats`);
   await notify(db,m.uid,key,'Bài đã hết hạn',`${a.title} · Chưa hoàn thành`, `#classrooms/${cid}/assignments/${a.id}`);
  }
  await db.doc(`classrooms/${cid}/assignments/${a.id}`).update({deadlineAuditedAt:now});
 }
 const resources=rows(await db.collection(`classrooms/${cid}/resources`).get()).filter(r=>!r.deleted&&r.published&&r.quiz);
 for(const r of resources){const attempts=rows(await db.collection(`classrooms/${cid}/resources/${r.id}/quizAttempts`).where('notificationPending','==',true).get());
  for(const a of attempts){if(a.version!==(r.version??1)||!members.some(m=>m.uid===a.uid)||!a.expiresAt||a.expiresAt>now||a.finishedAt)continue;
   const ref=db.doc(`classrooms/${cid}/resources/${r.id}/quizAttempts/${a.id}`);
   const expired=await db.runTransaction(async tx=>{const live=(await tx.get(ref)).data(),pRef=db.doc(`classrooms/${cid}/resources/${r.id}/progress/${a.uid}`),progress=(await tx.get(pRef)).data();if(!live||live.finishedAt)return false;tx.update(ref,{status:'incomplete',expiredAt:live.expiresAt});if(!progress||progress.lastQuizAt<=a.startedAt||!progress.lastQuizAt)tx.set(pRef,{...(progress?.version===a.version?progress:{}),version:a.version,incomplete:true,updatedAt:now});return true});if(!expired)continue;
   const name=members.find(m=>m.uid===a.uid)?.name??'Học sinh',key=`expired:${a.id}`;
   await notify(db,c.ownerId,key,'Hết giờ · Chưa hoàn thành',`${name} · ${r.title}`,`#classrooms/${cid}/resources/${r.id}`);
   await notify(db,a.uid,key,'Bài kiểm tra đã hết giờ',`${r.title} · Chưa hoàn thành`, `#classrooms/${cid}/resources/${r.id}`);await ref.update({notificationPending:false});
  }
 }
 const sessions=rows(await db.collection('teachingSessions').where('classId','==',cid).get());
 for(const s of sessions.filter(s=>!s.deleted&&s.status!=='cancelled'&&s.remindedForStart!==s.start&&s.start>now&&s.start<=now+86400000)){
  const key=`lesson-reminder:${s.id}:${s.start}`,body=`${c.name} · ${s.title} · ${new Date(s.start).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}`;
  await classNotice(db,cid,key,'Lịch học sắp tới',body,`#classrooms/${cid}/schedule/${s.id}`);
  await notify(db,c.ownerId,key,'Lịch dạy sắp tới',body,`#classrooms/${cid}/schedule/${s.id}`);await db.doc(`teachingSessions/${s.id}`).update({remindedForStart:s.start});
 }
}
export function schoolService(db){
 async function teacher(user,cid){const c=(await db.doc(`classrooms/${id(cid)}`).get()).data();ensure(c&&c.ownerId===user.uid,'Chỉ giáo viên của lớp được thao tác.');return c}
 async function ownClasses(user){const own=rows(await db.collection('classrooms').where('ownerId','==',user.uid).get());const enrolled=rows(await db.collection('classEnrollments').where('uid','==',user.uid).get()).filter(e=>e.status==='active');return [...new Set([...own.map(c=>c.id),...enrolled.map(e=>e.classId)])]}
 return async(user,action,input={})=>{
  const now=Date.now();
  if(action.startsWith('schoolAttendance'))return attendanceService(db)(user,action,input);
  if(action==='schoolAgenda')return dashboardAgenda(db,user);
  if(action==='schoolNotifications'){
   const classes=await ownClasses(user);await Promise.all(classes.map(cid=>auditClass(db,cid)));
   return rows(await db.collection(`schoolNotifications/${user.uid}/items`).orderBy('createdAt','desc').limit(100).get());
  }
  if(action==='schoolRead'){const refs=input.all? (await db.collection(`schoolNotifications/${user.uid}/items`).where('readAt','==',null).limit(500).get()).docs.map(d=>d.ref):[db.doc(`schoolNotifications/${user.uid}/items/${id(input.id)}`)];for(const ref of refs)if((await ref.get()).exists)await ref.update({readAt:now});return {ok:true}}
  if(action==='schoolBroadcast'){const cid=id(input.classId),c=await teacher(user,cid);ensure(!c.archived,'Lớp đã lưu trữ.',409);const title=text(input.title,150),body=text(input.body,2000);ensure(title&&body,'Nhập tiêu đề và nội dung.',400);await classNotice(db,cid,`broadcast:${cid}:${id(input.requestId)}`,title,body,`#classrooms/${cid}/assignments`);return {ok:true}}
  if(action==='schoolReviews'){
   const cid=id(input.classId),c=await teacher(user,cid);const members=rows(await db.collection(`classrooms/${cid}/members`).get()).filter(m=>m.status==='active');const modules=rows(await db.collection(`classrooms/${cid}/modules`).get()).sort((a,b)=>b.createdAt-a.createdAt);const reviews=rows(await db.collection('moduleReviews').where('classId','==',cid).get());const links=rows(await db.collection('guardianLinks').where('classId','==',cid).get());return {className:c.name,archived:c.archived,members,modules,reviews,links};
  }
  if(action==='schoolModuleSave'){
   const cid=id(input.classId),c=await teacher(user,cid);ensure(!c.archived,'Lớp đã lưu trữ.',409);const title=text(input.title,150);ensure(title,'Nhập tên học phần.',400);const mid=id(input.moduleId??input.requestId),ref=db.doc(`classrooms/${cid}/modules/${mid}`);
   await db.runTransaction(async tx=>{const old=(await tx.get(ref)).data();ensure(!old||old.ownerId===user.uid);tx.set(ref,{title,ownerId:user.uid,createdAt:old?.createdAt??now,endedAt:old?.endedAt??now})});return {id:mid};
  }
  if(action==='schoolReviewSave'){
   const cid=id(input.classId),c=await teacher(user,cid),sid=id(input.studentId),mid=id(input.moduleId);ensure(!c.archived,'Lớp đã lưu trữ.',409);
   const learning=Number(input.learning),attitude=Number(input.attitude),comment=text(input.comment,3000);ensure([learning,attitude].every(v=>Number.isInteger(v)&&v>=1&&v<=5)&&comment,'Chọn 1–5 sao cho mỗi mục và nhập nhận xét.',400);ensure(typeof input.published==='boolean','Trạng thái không hợp lệ.',400);
   const ref=db.doc(`moduleReviews/${hash(cid+':'+mid+':'+sid)}`);
   const result=await db.runTransaction(async tx=>{const [m,member,old]=await Promise.all([tx.get(db.doc(`classrooms/${cid}/modules/${mid}`)),tx.get(db.doc(`classrooms/${cid}/members/${sid}`)),tx.get(ref)]);ensure(m.exists&&member.data()?.status==='active','Không tìm thấy học phần hoặc học sinh.',404);const previous=old.data();const revision=(previous?.revision??0)+1;const value={classId:cid,className:c.name,moduleId:mid,moduleTitle:m.data().title,teacherId:user.uid,teacherName:c.teacherName,studentId:sid,studentName:member.data().name,learning,attitude,stars:(learning+attitude)/2,comment,published:input.published,publishedAt:input.published?now:null,updatedAt:now,revision,history:[...(previous?.history??[]).slice(-19),...(previous?[{learning:previous.learning,attitude:previous.attitude,comment:previous.comment,published:previous.published,updatedAt:previous.updatedAt,revision:previous.revision}]:[])]};tx.set(ref,value);return {id:ref.id,...value}});
   if(result.published){const key=`review:${ref.id}:${result.revision}`,title='Nhận xét cuối học phần',href='#profile';await notify(db,sid,key,title,`${c.name} · ${result.moduleTitle}`,href);const links=rows(await db.collection('guardianLinks').where('studentId','==',sid).get()).filter(l=>l.status==='active'&&l.classId===cid);await Promise.all(links.map(l=>notify(db,l.parentId,key,title,`${result.studentName} · ${result.moduleTitle}`,href)))}return result;
  }
  if(action==='schoolMyReviews')return publishedReviews(db,user.uid);
  if(action==='schoolGuardianInvite'){
   const cid=id(input.classId);await teacher(user,cid);const sid=id(input.studentId);ensure((await db.doc(`classrooms/${cid}/members/${sid}`).get()).data()?.status==='active','Học sinh chưa tham gia lớp.',400);const code=randomBytes(12).toString('hex').toUpperCase();await db.doc(`guardianInvites/${hash(code)}`).set({classId:cid,studentId:sid,expiresAt:now+7*86400000,used:false});return {code,expiresAt:now+7*86400000};
  }
  if(action==='schoolGuardianClaim'){
   const code=text(input.code,100).toUpperCase(),ref=db.doc(`guardianInvites/${hash(code)}`);
   return db.runTransaction(async tx=>{const invite=(await tx.get(ref)).data();ensure(invite&&!invite.used&&invite.expiresAt>now,'Mã không đúng, đã dùng hoặc hết hạn.',400);ensure(invite.studentId!==user.uid,'Hãy dùng tài khoản riêng của phụ huynh.',400);const c=(await tx.get(db.doc(`classrooms/${invite.classId}`))).data(),member=(await tx.get(db.doc(`classrooms/${invite.classId}/members/${invite.studentId}`))).data();ensure(c&&!c.archived&&member?.status==='active','Lớp hoặc học sinh không còn hoạt động.',409);const key=hash(invite.classId+':'+invite.studentId+':'+user.uid);tx.set(db.doc(`guardianLinks/${key}`),{classId:invite.classId,className:c.name,studentId:invite.studentId,studentName:member.name,parentId:user.uid,parentName:text(user.name??user.email??'Phụ huynh',150),status:'pending',createdAt:now});tx.update(ref,{used:true});return {ok:true}});
  }
  if(action==='schoolGuardianStatus'){
   const ref=db.doc(`guardianLinks/${id(input.linkId)}`),l=(await ref.get()).data();ensure(l,'Không tìm thấy liên kết.',404);await teacher(user,l.classId);ensure(['active','revoked'].includes(input.status),'Trạng thái không hợp lệ.',400);await ref.update({status:input.status,updatedAt:now});return {ok:true};
  }
  if(action==='schoolFamily'){
   const links=rows(await db.collection('guardianLinks').where('parentId','==',user.uid).get());return Promise.all(links.map(async l=>({...l,reviews:l.status==='active'?(await publishedReviews(db,l.studentId)).filter(r=>r.classId===l.classId):[]})));
  }
  ensure(false,'Thao tác không hợp lệ.',400);
 };
}
