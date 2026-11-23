import {ensure,id,text,hash} from './classroom-domain.js';
export function validateQuiz(raw){
 if(raw==null)return null;
 ensure(raw&&Array.isArray(raw.questions)&&raw.questions.length>=3&&raw.questions.length<=5,'Bài kiểm tra cần 3–5 câu hỏi.',400);
 const passScore=Number(raw.passScore);ensure(Number.isInteger(passScore)&&passScore>=1&&passScore<=100,'Điểm đạt từ 1 đến 100.',400);
 const seen=new Set();const questions=raw.questions.map((q,i)=>{const key=id(q.id??'q'+(i+1));ensure(!seen.has(key),'Mã câu hỏi bị trùng.',400);seen.add(key);const prompt=text(q.prompt,1000);ensure(prompt&&Array.isArray(q.options)&&q.options.length===4,'Mỗi câu cần đề và 4 đáp án.',400);const options=q.options.map(o=>text(o,500));ensure(options.every(Boolean)&&new Set(options.map(o=>o.toLowerCase())).size===4,'Điền 4 đáp án khác nhau.',400);ensure(Number.isInteger(q.correct)&&q.correct>=0&&q.correct<4,'Chọn đáp án đúng.',400);return {id:key,prompt,options,correct:q.correct,explanation:text(q.explanation??'',1500)}});
 return {passScore,questions};
}
export const quizSummary=q=>q?{passScore:q.passScore,questionCount:q.questions.length}:null;
export function publicResource(r,teacher){const {quiz,...rest}=r;return {...rest,quiz:teacher?quiz:quizSummary(quiz)}}
export const progressFor=(r,p)=>p&&(p.version??1)===(r.version??1)?p:{};
export const lessonDone=(r,p)=>r.quiz?!!p.passed:!!p.done;
export function quizService(db,access){
 const view=(key,a)=>({id:key,resourceId:a.resourceId,version:a.version,title:a.title,passScore:a.quiz.passScore,questions:a.quiz.questions.map(({correct,explanation,...q})=>q),finished:!!a.finishedAt,...(a.finishedAt?{score:a.score,passed:a.passed,answers:a.answers,feedback:a.quiz.questions.map((q,i)=>({id:q.id,correct:q.correct,selected:a.answers[i],explanation:q.explanation,good:a.answers[i]===q.correct}))}:{})});
 return async(user,action,input)=>{
  const cid=id(input.classId),rid=id(input.resourceId),c=await access(user,cid);ensure(c.ownerId!==user.uid,'Giáo viên soạn câu hỏi trong phần Sửa bài giảng.',403);ensure(!c.archived,'Lớp đã lưu trữ.',409);
  const ref=db.doc(`classrooms/${cid}/resources/${rid}`),r=await ref.get();ensure(r.exists&&!r.data().deleted&&r.data().published&&r.data().quiz,'Bài kiểm tra chưa được xuất bản.',404);const lesson=r.data(),version=lesson.version??1;
  if(action==='teachingQuizStart'){
   const key=hash(user.uid+':'+cid+':'+rid+':'+version+':'+id(input.requestId)),attempt=ref.collection('quizAttempts').doc(key);
   return db.runTransaction(async tx=>{const [old,current,member,cls]=await Promise.all([tx.get(attempt),tx.get(ref),tx.get(db.doc(`classrooms/${cid}/members/${user.uid}`)),tx.get(db.doc(`classrooms/${cid}`))]);const live=current.data();ensure(member.data()?.status==='active'&&!cls.data()?.archived,'Bạn không còn quyền học trong lớp.',403);ensure(live?.published&&!live.deleted&&(live.version??1)===version,'Bài giảng đã đổi. Mở lại bài kiểm tra nhé.',409);if(old.exists)return view(key,old.data());const a={uid:user.uid,classId:cid,resourceId:rid,version,title:live.title,quiz:live.quiz,startedAt:Date.now(),finishedAt:null};tx.create(attempt,a);return view(key,a)});
  }
  ensure(action==='teachingQuizSubmit','Thao tác kiểm tra không hợp lệ.',400);const key=id(input.attemptId),attempt=ref.collection('quizAttempts').doc(key),progress=ref.collection('progress').doc(user.uid);
  return db.runTransaction(async tx=>{
   const [snap,current,oldProgress,member,cls]=await Promise.all([tx.get(attempt),tx.get(ref),tx.get(progress),tx.get(db.doc(`classrooms/${cid}/members/${user.uid}`)),tx.get(db.doc(`classrooms/${cid}`))]);const a=snap.data(),latest=current.data();
   ensure(a&&a.uid===user.uid,'Lượt kiểm tra không thuộc tài khoản này.',403);ensure(member.data()?.status==='active'&&!cls.data()?.archived,'Bạn không còn quyền nộp bài cho lớp.',403);ensure(latest?.published&&!latest.deleted&&(latest.version??1)===a.version,'Bài giảng đã đổi. Mở lại bài kiểm tra mới nhé.',409);if(a.finishedAt)return view(key,a);
   ensure(Array.isArray(input.answers)&&input.answers.length===a.quiz.questions.length&&input.answers.every(v=>Number.isInteger(v)&&v>=0&&v<4),'Trả lời đầy đủ các câu hỏi.',400);
   const correct=a.quiz.questions.filter((q,i)=>q.correct===input.answers[i]).length,score=Math.round(correct/a.quiz.questions.length*100),passed=score>=a.quiz.passScore,now=Date.now();const finished={...a,answers:input.answers,score,passed,finishedAt:now};const p=progressFor(latest,oldProgress.data());
   tx.set(attempt,finished);tx.set(progress,{...p,version:a.version,done:!!p.done,passed:!!p.passed||passed,bestScore:Math.max(p.bestScore??0,score),lastScore:score,quizAttempts:(p.quizAttempts??0)+1,lastQuizAt:now,updatedAt:now});return view(key,finished);
  });
 };
}
