import {progressFor,lessonDone} from './course-quiz.js';
import {ensure} from './classroom-domain.js';
const DAY=86400000;
export async function todayService(db,user){
 const now=Date.now(),shifted=new Date(now+7*3600000),start=Date.UTC(shifted.getUTCFullYear(),shifted.getUTCMonth(),shifted.getUTCDate())-7*3600000,end=start+DAY;
 const memberships=(await db.collection('classEnrollments').where('uid','==',user.uid).get()).docs.map(d=>d.data()).filter(m=>m.status==='active');
 const classes=(await Promise.all(memberships.map(m=>db.doc(`classrooms/${m.classId}`).get()))).filter(c=>c.exists&&!c.data().archived);
 const tasks=[],agenda=[];
 await Promise.all(classes.map(async snap=>{
  const cid=snap.id,c=snap.data();if((await db.doc(`classrooms/${cid}/members/${user.uid}`).get()).data()?.status!=='active')return;const [rs,as,ss]=await Promise.all([db.collection(`classrooms/${cid}/resources`).get(),db.collection(`classrooms/${cid}/assignments`).get(),db.collection('teachingSessions').where('classId','==',cid).get()]);
  const resources=rs.docs.filter(d=>!d.data().deleted&&d.data().published),assignments=as.docs.filter(d=>!d.data().targets||d.data().targets.includes(user.uid)),sessions=ss.docs.map(d=>({id:d.id,...d.data()})).filter(s=>!s.deleted&&s.status!=='cancelled'&&s.start<start+7*DAY&&s.end>=start);
  for(const s of sessions.filter(s=>s.start<end&&s.end>start))agenda.push({id:s.id,classId:cid,className:c.name,title:s.title,start:s.start,end:s.end,status:s.status});
  await Promise.all(assignments.map(async a=>{const value=a.data(),result=(await a.ref.collection('results').doc(user.uid).get()).data();if(result?.completedAt||(value.startAt??0)>start+7*DAY)return;tasks.push({id:'assignment-'+cid+'-'+a.id,type:'assignment',classId:cid,className:c.name,contentId:a.id,title:value.title,deadline:value.deadline,startAt:value.startAt??0,available:(value.startAt??0)<=now,progress:result?.progress??0,reason:value.deadline<now?'overdue':'assignment'})}));
  await Promise.all(resources.map(async r=>{const value=r.data(),progress=progressFor(value,(await r.ref.collection('progress').doc(user.uid).get()).data());if(lessonDone(value,progress))return;const linked=sessions.filter(s=>(s.resourceIds??[]).includes(r.id));const due=linked.length?Math.min(...linked.map(s=>s.start)):null;tasks.push({id:'resource-'+cid+'-'+r.id,type:'resource',classId:cid,className:c.name,contentId:r.id,title:value.title,deadline:due,available:true,hasQuiz:!!value.quiz,viewed:!!progress.done,score:progress.bestScore??null,reason:value.quiz&&progress.quizAttempts?'retry':due?'prepare':'lesson'})}));
 }));
 tasks.sort((a,b)=>Number(b.reason==='retry')-Number(a.reason==='retry')||Number(b.reason==='overdue')-Number(a.reason==='overdue')||(a.deadline??Infinity)-(b.deadline??Infinity)||a.title.localeCompare(b.title));
 return {day:new Date(start+7*3600000).toISOString().slice(0,10),sessions:agenda.sort((a,b)=>a.start-b.start),tasks:tasks.slice(0,200),total:tasks.length};
}
