const DAY=86400000;
export async function dashboardAgenda(db,user,now=Date.now()){
 const role=(await db.doc(`classroomProfiles/${user.uid}`).get()).data()?.role;
 const shifted=new Date(now+7*3600000),dayStart=Date.UTC(shifted.getUTCFullYear(),shifted.getUTCMonth(),shifted.getUTCDate())-7*3600000;
 let classes=[];
 if(role==='teacher')classes=(await db.collection('classrooms').where('ownerId','==',user.uid).get()).docs;
 else if(role==='student'){
  const enrollments=(await db.collection('classEnrollments').where('uid','==',user.uid).get()).docs.filter(d=>d.data().status==='active');
  const candidates=await Promise.all(enrollments.map(async e=>{const cid=e.data().classId;if((await db.doc(`classrooms/${cid}/members/${user.uid}`).get()).data()?.status!=='active')return null;return db.doc(`classrooms/${cid}`).get()}));classes=candidates.filter(Boolean);
 }
 const sessions=(await Promise.all(classes.filter(c=>c.exists&&!c.data().archived).map(async c=>{
  const v=c.data(),list=(await db.collection('teachingSessions').where('classId','==',c.id).get()).docs.map(s=>({id:s.id,...s.data()})).filter(s=>!s.deleted&&s.start<now+7*DAY&&s.end>(role==='teacher'?dayStart:now)&&(role==='teacher'||s.status!=='completed'));
  const members=role==='teacher'?(await db.collection(`classrooms/${c.id}/members`).get()).docs.map(d=>d.data()).filter(m=>m.status==='active'):[];
  return Promise.all(list.map(async s=>{
   const eligible=members.filter(m=>m.joinedAt<=s.end),marks=role==='teacher'?(await db.collection(`teachingSessions/${s.id}/attendance`).get()).docs.filter(d=>eligible.some(m=>m.uid===d.id)&&d.data().status!=='unmarked').length:undefined;
   return {id:s.id,classId:c.id,className:v.name,subject:v.subject??'',teacherName:v.teacherName,title:s.title,start:s.start,end:s.end,location:s.location??'',status:s.status,makeupOf:s.makeupOf??null,originalStart:s.originalStart??null,...(role==='teacher'?{attendanceMarked:marks,attendanceTotal:eligible.length}:{})};
  }));
 }))).flat().sort((a,b)=>a.start-b.start);
 return {sessions,now,dayStart};
}
