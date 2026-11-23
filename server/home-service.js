import {classroomService} from './classroom-service.js';
export function homeService(db){const classes=classroomService(db);return async(user)=>{
 const home=await classes(user,'home'),role=home.profile?.role??null,assignments=[],students=new Set();
 await Promise.all(home.classes.filter(c=>!c.archived&&(!c.membership||c.membership==='active')).map(async c=>{
  const detail=await classes(user,'detail',{classId:c.id});detail.members.filter(m=>m.status==='active').forEach(m=>students.add(m.uid));
  for(const a of detail.assignments){const recipients=detail.members.filter(m=>m.status==='active'&&(!a.targets||a.targets.includes(m.uid))),results=a.results??[];
   assignments.push({id:a.id,classId:c.id,className:c.name,title:a.title,deadline:a.deadline,startAt:a.startAt??0,activities:a.activities,completed:!!a.result?.completedAt,progress:a.result?.progress??0,status:a.result?.status??'',studentCount:recipients.length,completedCount:recipients.filter(m=>results.find(r=>r.uid===m.uid)?.completedAt).length});
  }
 }));
 let daily=null;let pointer=await db.doc(`learningSessions/${user.uid}/metadata/current`).get();if(!pointer.exists){const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());pointer=await db.doc(`learningSessions/${user.uid}/days/${today}`).get()}if(pointer.exists){const current=await db.doc(`learningSessions/${user.uid}/sessions/${pointer.data().sessionId}`).get();const s=current.data();if(s){const day=n=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(n));if(!s.completedAt||day(s.completedAt)===day(Date.now()))daily={completed:!!s.completedAt,done:s.index,total:s.cards.length}}}return {daily,role,classes:home.classes,studentCount:role==='teacher'?students.size:undefined,assignments:assignments.sort((a,b)=>Number(a.completed)-Number(b.completed)||a.deadline-b.deadline)};
};}
