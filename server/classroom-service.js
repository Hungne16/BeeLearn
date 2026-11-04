import {randomUUID} from 'node:crypto';
import {ensure,id,text,hash,inviteCode,snapshotDeck,sampleCards,activities,emptyResult,resultView,applyAnswer,finishAttempt} from './classroom-domain.js';
export function classroomService(db){
 const profile=uid=>db.doc(`classroomProfiles/${uid}`),cls=cid=>db.doc(`classrooms/${id(cid)}`),member=(cid,uid)=>cls(cid).collection('members').doc(uid),enrollment=(cid,uid)=>db.doc(`classEnrollments/${hash(cid+':'+uid)}`),assignment=(cid,aid)=>cls(cid).collection('assignments').doc(id(aid));
 const data=s=>s.exists?{id:s.id,...s.data()}:null;
 async function requireClass(user,cid,teacher=false,tx=null){const ref=cls(cid),c=data(await (tx?tx.get(ref):ref.get()));ensure(c,'Không tìm thấy lớp.',404);if(c.ownerId!==user.uid){ensure(!teacher,'Chỉ giáo viên của lớp được thao tác.');const m=await (tx?tx.get(member(cid,user.uid)):member(cid,user.uid).get());ensure(m.data()?.status==='active','Bạn chưa được duyệt vào lớp.')}return c}
 async function requireAssignment(user,cid,aid,tx=null){const c=await requireClass(user,cid,false,tx),ref=assignment(cid,aid),a=data(await(tx?tx.get(ref):ref.get()));ensure(a,'Không tìm thấy bài tập.',404);ensure(c.ownerId===user.uid||!a.targets||a.targets.includes(user.uid),'Bài tập không giao cho bạn.');return {c,a}}
 const notifyName=user=>text(user.name||'Người học',100);
 return async function execute(user,action,input={}){
  const now=Date.now(),uid=user.uid;
  if(action==='home'){
   const p=data(await profile(uid).get());if(!p)return {profile:null,classes:[]};
   let classes;if(p.role==='teacher')classes=(await db.collection('classrooms').where('ownerId','==',uid).get()).docs.map(data);
   else {const rows=(await db.collection('classEnrollments').where('uid','==',uid).get()).docs.map(x=>x.data());const docs=await Promise.all(rows.map(r=>cls(r.classId).get()));classes=docs.map((d,i)=>({...data(d),membership:rows[i].status})).filter(c=>c.id)}
   const detailed=await Promise.all(classes.map(async c=>{const [members,assignments]=await Promise.all([cls(c.id).collection('members').get(),cls(c.id).collection('assignments').get()]);const permitted=assignments.docs.map(data).filter(a=>p.role==='teacher'||c.membership==='active'&&(!a.targets||a.targets.includes(uid)));const results=p.role==='student'?await Promise.all(permitted.map(a=>assignment(c.id,a.id).collection('results').doc(uid).get())):[];return {...c,code:c.ownerId===uid?c.code:undefined,studentCount:members.docs.filter(m=>m.data().status==='active').length,assignmentCount:permitted.length,pendingCount:p.role==='student'?permitted.filter((a,i)=>!results[i].data()?.completedAt).length:0}}));
   return {profile:p,classes:detailed};
  }
  if(action==='setRole'){ensure(['teacher','student'].includes(input.role),'Vai trò không hợp lệ.',400);return db.runTransaction(async tx=>{const ref=profile(uid),old=await tx.get(ref);ensure(!old.exists||old.data().role===input.role,'Vai trò đã được chọn trước đó.',409);const p={uid,name:notifyName(user),role:input.role,createdAt:old.data()?.createdAt??now};tx.set(ref,p);return p})}
  const p=data(await profile(uid).get());ensure(p,'Hãy chọn vai trò trước.',409);
  if(action==='createClass'){
   ensure(p.role==='teacher');const name=text(input.name,100);ensure(name,'Nhập tên lớp.',400);const cid=id(input.requestId),code=inviteCode(),ref=cls(cid);
   return db.runTransaction(async tx=>{const old=await tx.get(ref);if(old.exists){ensure(old.data().ownerId===uid);return data(old)}const codeRef=db.doc(`classCodes/${code}`);ensure(!(await tx.get(codeRef)).exists,'Hãy thử tạo lớp lại.',409);const c={name,description:text(input.description??'',1000),subject:text(input.subject??'',100),approval:!!input.approval,ownerId:uid,teacherName:notifyName(user),code,archived:false,createdAt:now};tx.create(ref,c);tx.create(codeRef,{classId:cid});return {id:cid,...c}});
  }
  if(action==='joinClass'){
   ensure(p.role==='student','Chỉ tài khoản học sinh tham gia lớp.');const code=text(input.code,20).toUpperCase();ensure(/^[A-Z2-9]{10}$/.test(code),'Mã lớp gồm 10 ký tự.',400);
   return db.runTransaction(async tx=>{const codeDoc=await tx.get(db.doc(`classCodes/${code}`));ensure(codeDoc.exists,'Mã lớp không tồn tại hoặc đã đổi.',404);const cid=codeDoc.data().classId,c=data(await tx.get(cls(cid)));ensure(c&&!c.archived,'Lớp đã lưu trữ.');const m=await tx.get(member(cid,uid));if(['active','pending'].includes(m.data()?.status))return {classId:cid,status:m.data().status};const row={uid,name:notifyName(user),status:c.approval?'pending':'active',joinedAt:now};tx.set(member(cid,uid),row);tx.set(enrollment(cid,uid),{classId:cid,uid,status:row.status});return {classId:cid,status:row.status}});
  }
  if(action==='detail'){
   const c=await requireClass(user,input.classId),teacher=c.ownerId===uid,cid=c.id;const [members,assignments]=await Promise.all([cls(cid).collection('members').get(),cls(cid).collection('assignments').get()]);
   const as=assignments.docs.map(data).filter(a=>teacher||!a.targets||a.targets.includes(uid));const assignmentsWithResults=await Promise.all(as.map(async a=>{const snap=teacher?await assignment(cid,a.id).collection('results').get():null;const own=teacher?null:await assignment(cid,a.id).collection('results').doc(uid).get();return {...a,result:teacher?null:resultView(a,own?.data()),results:teacher?snap.docs.map(d=>resultView(a,d.data())):undefined}}));
   return {classroom:{...c,code:teacher?c.code:undefined},members:members.docs.map(data).filter(m=>teacher||m.status==='active').map(m=>({uid:m.uid,name:m.name,status:m.status,joinedAt:m.joinedAt})),assignments:assignmentsWithResults};
  }
  if(action==='settings'){
   const cid=id(input.classId);return db.runTransaction(async tx=>{const c=await requireClass(user,cid,true,tx);const patch={};if(input.name!==undefined){patch.name=text(input.name,100);ensure(patch.name,'Nhập tên lớp.',400)}if(input.description!==undefined)patch.description=text(input.description,1000);if(input.subject!==undefined)patch.subject=text(input.subject,100);if(input.approval!==undefined)patch.approval=!!input.approval;if(input.archived!==undefined)patch.archived=!!input.archived;
    if(input.rotateCode){const code=inviteCode(),codeRef=db.doc(`classCodes/${code}`);ensure(!(await tx.get(codeRef)).exists,'Hãy thử lại.',409);tx.delete(db.doc(`classCodes/${c.code}`));tx.create(codeRef,{classId:cid});patch.code=code}tx.update(cls(cid),patch);return {...c,...patch}});
  }
  if(action==='membership'){
   const cid=id(input.classId),studentId=id(input.studentId);ensure(['active','removed'].includes(input.status),'Trạng thái không hợp lệ.',400);
   return db.runTransaction(async tx=>{await requireClass(user,cid,true,tx);const m=await tx.get(member(cid,studentId));ensure(m.exists,'Không tìm thấy học sinh.',404);tx.update(member(cid,studentId),{status:input.status});tx.set(enrollment(cid,studentId),{classId:cid,uid:studentId,status:input.status});return {ok:true}});
  }
  if(action==='publish'){
   const cid=id(input.classId),aid=id(input.requestId),title=text(input.title,150);ensure(title,'Nhập tiêu đề bài tập.',400);ensure(Array.isArray(input.activities)&&input.activities.length&&new Set(input.activities).size===input.activities.length&&input.activities.every(a=>activities.includes(a)),'Chọn hoạt động học.',400);ensure(Number.isFinite(input.deadline)&&input.deadline>now,'Hạn nộp phải ở tương lai.',400);ensure(Number.isInteger(input.minAccuracy)&&input.minAccuracy>=0&&input.minAccuracy<=100,'Độ chính xác từ 0 đến 100.',400);ensure([8,12,20].includes(input.gameSize),'Số từ mỗi lượt không hợp lệ.',400);
   return db.runTransaction(async tx=>{const c=await requireClass(user,cid,true,tx);ensure(!c.archived,'Lớp đã lưu trữ.');const existing=await tx.get(assignment(cid,aid));if(existing.exists)return data(existing);let sourceDeck;if(input.reviewSourceAssignmentId){const source=await tx.get(assignment(cid,id(input.reviewSourceAssignmentId)));ensure(source.exists,'Không tìm thấy bài gốc.',404);sourceDeck=source.data().deck}else{const deckDoc=await tx.get(db.doc(`users/${uid}/decks/${id(input.deckId)}`));ensure(deckDoc.exists,'Bộ từ chưa đồng bộ lên Firebase. Hãy đợi đồng bộ xong.',409);sourceDeck=deckDoc.data().value}let deck=snapshotDeck(sourceDeck);
    if(input.reviewWordIds){ensure(Array.isArray(input.reviewWordIds)&&input.reviewWordIds.length,'Chọn từ cần ôn.',400);deck={...deck,cards:deck.cards.filter(c=>input.reviewWordIds.includes(c.id))};ensure(deck.cards.length,'Không có từ cần ôn trong bộ này.',400)}
    let targets=null;if(input.targets){ensure(Array.isArray(input.targets)&&input.targets.length>0&&input.targets.length<=200,'Chọn học sinh nhận bài.',400);targets=[...new Set(input.targets.map(id))];const ms=await Promise.all(targets.map(u=>tx.get(member(cid,u))));ensure(ms.every(m=>m.data()?.status==='active'),'Có học sinh chưa tham gia lớp.',400)}
    const a={title,deck,activities:input.activities,deadline:input.deadline,minAccuracy:input.minAccuracy,gameSize:input.gameSize,requireRemembered:!!input.requireRemembered,targets,teacherName:c.teacherName,createdAt:now,ownerId:uid,version:1};tx.create(assignment(cid,aid),a);return {id:aid,...a}});
  }
  if(action==='start'){
   ensure(p.role==='student','Chỉ học sinh nộp kết quả bài tập.');const cid=id(input.classId),aid=id(input.assignmentId),requestId=id(input.requestId),attemptId=hash(uid+':'+cid+':'+aid+':'+requestId),ref=db.doc(`classAttempts/${attemptId}`);
   return db.runTransaction(async tx=>{const {c,a}=await requireAssignment(user,cid,aid,tx);ensure(!c.archived,'Lớp đã lưu trữ.');ensure(a.activities.includes(input.activity),'Hoạt động không thuộc bài tập.',400);const old=await tx.get(ref);if(old.exists){ensure(old.data().uid===uid);return {attempt:data(old),assignment:a,classroom:c}}
    const resultRef=assignment(cid,aid).collection('results').doc(uid),oldResult=await tx.get(resultRef),r=oldResult.data()??emptyResult(uid);const activity=input.activity;const attempt={uid,classId:cid,assignmentId:aid,activity,deck:{...a.deck,cards:sampleCards(a.deck,activity,a.gameSize)},startedAt:now,lastAt:now,finishedAt:null,eventCount:0,correct:0,incorrect:0,score:0,combo:0,words:{}};
    r.attempts++;r.lastAt=now;r.activities[activity]={...r.activities[activity],attempts:(r.activities[activity]?.attempts??0)+1};tx.create(ref,attempt);tx.set(resultRef,r);return {attempt:{id:attemptId,...attempt},assignment:a,classroom:c}});
  }
  if(action==='answer'||action==='finish'){
   const attemptId=id(input.attemptId),ref=db.doc(`classAttempts/${attemptId}`);return db.runTransaction(async tx=>{
    const snap=await tx.get(ref),attempt=data(snap);ensure(attempt&&attempt.uid===uid,'Lượt học không thuộc tài khoản này.');const {c,a}=await requireAssignment(user,attempt.classId,attempt.assignmentId,tx);ensure(!c.archived,'Lớp đã lưu trữ.');
    const resultRef=assignment(c.id,a.id).collection('results').doc(uid),oldResult=await tx.get(resultRef),r=oldResult.data()??emptyResult(uid);let next;
    if(action==='answer'){const eventRef=ref.collection('events').doc(id(input.eventId)),oldEvent=await tx.get(eventRef);if(oldEvent.exists)return {duplicate:true,result:resultView(a,r)};next=applyAnswer(a,attempt,r,input,now);tx.create(eventRef,{cardId:input.cardId,good:next.good,createdAt:now})}
    else next=finishAttempt(a,attempt,r,now);
    const {id:ignored,...stored}=next.attempt;tx.set(ref,stored);tx.set(resultRef,next.summary);return {result:resultView(a,next.summary),attempt:{id:attemptId,...stored}};
   });
  }
  if(action==='history'){
   const {c,a}=await requireAssignment(user,input.classId,input.assignmentId),studentId=input.studentId? id(input.studentId):uid;ensure(c.ownerId===uid||studentId===uid,'Bạn chỉ được xem kết quả của mình.');const snap=await db.collection('classAttempts').where('uid','==',studentId).get();return snap.docs.map(data).filter(t=>t.classId===c.id&&t.assignmentId===a.id).sort((a,b)=>b.startedAt-a.startedAt).map(({deck,...rest})=>({...rest,wordCount:deck.cards.length})).slice(0,50);
  }
  ensure(false,'Không tìm thấy thao tác.',400);
 };
}
