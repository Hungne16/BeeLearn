import {ensure,id,text,hash} from './classroom-domain.js';
const rows=s=>s.docs.map(d=>({id:d.id,...d.data()}));
const day=n=>new Date(n+7*3600000).toISOString().slice(0,10);
export function attendanceTotals(sessions,records,uid){
 const valid=new Set(sessions.filter(s=>!s.deleted&&s.status!=='cancelled').map(s=>s.id)),days=new Map();let present=0,excused=0,unexcused=0;
 for(const r of records.filter(r=>r.uid===uid&&valid.has(r.sessionId))){if(r.status==='present')present++;if(!['excused','unexcused'].includes(r.status))continue;if(r.status==='excused')excused++;else unexcused++;const d=day(sessions.find(s=>s.id===r.sessionId).start);if(days.get(d)!=='unexcused')days.set(d,r.status)}
 const excusedDays=[...days.values()].filter(s=>s==='excused').length,unexcusedDays=days.size-excusedDays;
 return {present,excused,unexcused,excusedDays,unexcusedDays,absentDays:days.size};
}
export function attendanceService(db){
 async function access(user,cid){const c=(await db.doc(`classrooms/${id(cid)}`).get()).data();ensure(c&&c.ownerId===user.uid,'Chỉ giáo viên của lớp được xem sổ điểm danh.');return c}
 return async(user,action,input={})=>{
  const cid=id(input.classId),c=await access(user,cid);
  if(action==='schoolAttendanceGet'){
   let defaultMonth=day(Date.now()).slice(0,7);if(!input.month&&input.sessionId){const target=(await db.doc(`teachingSessions/${id(input.sessionId)}`).get()).data();ensure(target&&target.classId===cid,'Không tìm thấy buổi học.',404);defaultMonth=day(target.start).slice(0,7)}const month=text(input.month??defaultMonth,7);ensure(/^\d{4}-(0[1-9]|1[0-2])$/.test(month),'Tháng không hợp lệ.',400);
   const sessions=rows(await db.collection('teachingSessions').where('classId','==',cid).get()).filter(s=>!s.deleted&&s.status!=='cancelled').sort((a,b)=>a.start-b.start);
   const records=rows(await db.collection(`classrooms/${cid}/attendance`).get());
   const members=rows(await db.collection(`classrooms/${cid}/members`).get()).filter(m=>m.status==='active'||m.status==='removed'&&records.some(r=>r.uid===m.uid));
   return {className:c.name,archived:c.archived,month,sessions:sessions.filter(s=>day(s.start).startsWith(month)).map(s=>({id:s.id,title:s.title,start:s.start,end:s.end,makeupOf:s.makeupOf??null})),members:members.map(m=>({uid:m.uid,name:m.name,status:m.status,joinedAt:m.joinedAt,totals:attendanceTotals(sessions,records,m.uid),monthTotals:attendanceTotals(sessions.filter(s=>day(s.start).startsWith(month)),records,m.uid)})),records:records.filter(r=>sessions.some(s=>s.id===r.sessionId&&day(s.start).startsWith(month))).map(({uid,sessionId,status,note,revision,updatedAt})=>({uid,sessionId,status,note,revision,updatedAt}))};
  }
  ensure(action==='schoolAttendanceSave','Thao tác điểm danh không hợp lệ.',400);const sid=id(input.sessionId);ensure(Array.isArray(input.records)&&input.records.length>0&&input.records.length<=200,'Mỗi lần lưu từ 1 đến 200 học sinh.',400);
  const seen=new Set(),records=input.records.map(r=>{const uid=id(r.uid);ensure(!seen.has(uid),'Học sinh bị trùng.',400);seen.add(uid);ensure(['present','excused','unexcused','unmarked'].includes(r.status),'Trạng thái điểm danh không hợp lệ.',400);ensure(Number.isInteger(r.revision)&&r.revision>=0,'Phiên bản điểm danh không hợp lệ.',400);return {uid,status:r.status,note:text(r.note??'',500),revision:r.revision}});
  return db.runTransaction(async tx=>{
   const cls=await tx.get(db.doc(`classrooms/${cid}`)),session=await tx.get(db.doc(`teachingSessions/${sid}`));const s=session.data();ensure(cls.data()?.ownerId===user.uid&&!cls.data()?.archived,'Lớp đã lưu trữ hoặc bạn không có quyền sửa.',409);ensure(s&&s.classId===cid&&!s.deleted&&s.status!=='cancelled','Không thể điểm danh buổi đã hủy hoặc bị gỡ.',409);ensure(s.start<=Date.now(),'Chưa đến giờ học, chưa thể điểm danh.',409);
   const snapshots=await Promise.all(records.map(async r=>({r,member:await tx.get(db.doc(`classrooms/${cid}/members/${r.uid}`)),ref:db.doc(`teachingSessions/${sid}/attendance/${r.uid}`),old:await tx.get(db.doc(`teachingSessions/${sid}/attendance/${r.uid}`))})));
   for(const {r,member,old}of snapshots){const m=member.data(),previous=old.data();ensure(m&&m.joinedAt<=s.end&&(m.status==='active'||m.status==='removed'&&old.exists),'Học sinh chưa tham gia lớp tại buổi này.',400);if(previous?.status===r.status&&previous?.note===r.note)continue;ensure((previous?.revision??0)===r.revision,'Điểm danh đã được cập nhật ở nơi khác. Tải lại sổ trước khi sửa.',409)}
   const now=Date.now();for(const {r,ref,old}of snapshots){const previous=old.data();if(previous?.status===r.status&&previous?.note===r.note)continue;const value={uid:r.uid,sessionId:sid,status:r.status,note:r.note,revision:(previous?.revision??0)+1,updatedAt:now,updatedBy:user.uid,history:[...(previous?.history??[]).slice(-9),...(previous?[{status:previous.status,note:previous.note,updatedAt:previous.updatedAt,updatedBy:previous.updatedBy}]:[])]};tx.set(ref,value);tx.set(db.doc(`classrooms/${cid}/attendance/${hash(sid+':'+r.uid)}`),value)}return {ok:true};
  });
 };
}
