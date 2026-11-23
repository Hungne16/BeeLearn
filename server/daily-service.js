import {ensure,id,hash} from './classroom-domain.js';
import {grammarService} from './grammar-service.js';
import {schedule,chooseLearningPlan} from '../shared/learning-plan.js';
const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function dailyService(db){
 const grammar=grammarService(db),session=(uid,key)=>db.doc(`learningSessions/${uid}/sessions/${id(key)}`);
 const view=(key,s)=>({id:key,cards:s.cards,index:s.index,rated:s.rated,grammar:s.grammar,grammarAttemptId:s.grammarAttemptId??null,grammarResult:s.grammarResult??null,startedAt:s.startedAt,completedAt:s.completedAt??null});
 return async(user,action,input={})=>{
  const uid=user.uid,now=Date.now();
  if(action==='dailyStart'){
   const pointer=db.doc(`learningSessions/${uid}/days/${day()}`),current=db.doc(`learningSessions/${uid}/metadata/current`),[oldPointer,activePointer]=await Promise.all([pointer.get(),current.get()]);if(activePointer.exists&&!input.newRound){const active=await session(uid,activePointer.data().sessionId).get();if(active.exists&&!active.data().completedAt)return view(active.id,active.data())}
   if(oldPointer.exists&&!input.newRound){const previous=await session(uid,oldPointer.data().sessionId).get();if(previous.exists)return view(previous.id,previous.data())}
   const key=hash(uid+':'+day()+':'+id(input.requestId)),ref=session(uid,key),existing=await ref.get();if(existing.exists)return view(key,existing.data());
   const [decks,records,library]=await Promise.all([db.collection(`users/${uid}/decks`).get(),db.collection(`users/${uid}/records`).get(),grammar(user,'grammarLibrary')]);
   const plan=chooseLearningPlan(decks.docs.map(d=>d.data().value),Object.fromEntries(records.docs.map(r=>[r.id,r.data().value])),library.lessons,now);ensure(plan.cards.length||plan.grammar,'Chưa có nội dung phù hợp. Hãy thêm bộ từ hoặc mở Ngữ pháp.',409);
   return db.runTransaction(async tx=>{const old=await tx.get(ref),p=await tx.get(pointer),currentPointer=await tx.get(current);if(currentPointer.exists&&!input.newRound){const active=await tx.get(session(uid,currentPointer.data().sessionId));if(active.exists&&!active.data().completedAt)return view(active.id,active.data())}if(old.exists)return view(key,old.data());if(p.exists&&!input.newRound){const previous=await tx.get(session(uid,p.data().sessionId));if(previous.exists)return view(previous.id,previous.data())}
    const value={uid,cards:plan.cards,index:0,rated:{},grammar:plan.grammar,grammarAttemptId:null,startedAt:now,completedAt:null};tx.create(ref,value);tx.set(pointer,{sessionId:key});tx.set(current,{sessionId:key});return view(key,value);
   });
  }
  const key=id(input.sessionId),ref=session(uid,key),snap=await ref.get();ensure(snap.exists,'Không tìm thấy buổi học của tài khoản này.',404);const s=snap.data();
  if(action==='dailyGet')return view(key,s);
  if(action==='dailyRate'){
   ensure(typeof input.good==='boolean','Hãy tự đánh giá sau khi lật thẻ.',400);const cardId=id(input.cardId);
   return db.runTransaction(async tx=>{const old=await tx.get(ref),a=old.data();if(a.rated[cardId])return view(key,a);ensure(!a.completedAt&&a.cards[a.index]?.id===cardId,'Thẻ không còn hiện hành.',409);
    const record=db.doc(`users/${uid}/records/${cardId}`),activity=db.doc(`users/${uid}/activity/${day()}`),[r,d]=await Promise.all([tx.get(record),tx.get(activity)]);a.rated[cardId]={good:input.good,at:now};a.index++;tx.set(ref,a);tx.set(record,{value:schedule(r.data()?.value,input.good,now),updatedAt:now});tx.set(activity,{count:(d.data()?.count??0)+1,updatedAt:now});tx.set(db.doc(`users/${uid}/metadata/sync`),{version:1,clientId:'daily-server',updatedAt:now});return view(key,a);
   });
  }
  if(action==='dailyGrammar'){
   ensure(s.index===s.cards.length&&s.grammar,'Hãy hoàn thành phần từ vựng trước.',409);if(s.grammarAttemptId)return grammar(user,'grammarResume',{attemptId:s.grammarAttemptId});
   const attempt=await grammar(user,'grammarStart',{lessonId:s.grammar.id,mode:'quiz',requestId:key+'-grammar'});await ref.update({grammarAttemptId:attempt.id});return attempt;
  }
  if(action==='dailyFinish'){
   return db.runTransaction(async tx=>{const row=await tx.get(ref),a=row.data();if(a.completedAt)return view(key,a);ensure(a.index===a.cards.length,'Bạn chưa đánh giá hết từ vựng.',409);
    if(a.grammar){ensure(a.grammarAttemptId,'Bạn chưa luyện ngữ pháp.',409);const attempt=await tx.get(db.doc(`grammarAttempts/${id(a.grammarAttemptId)}`));ensure(attempt.data()?.uid===uid&&attempt.data()?.finishedAt,'Hoàn thành phần luyện ngữ pháp trước nhé.',409);a.grammarResult={correct:attempt.data().correct,incorrect:attempt.data().incorrect}}
    a.completedAt=now;tx.set(ref,a);return {...view(key,a),grammarResult:a.grammarResult??null};
   });
  }
  ensure(false,'Không tìm thấy thao tác buổi học.',400);
 };
}
