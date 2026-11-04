import {randomInt,createHash} from 'node:crypto';
export class HttpError extends Error {constructor(status,message){super(message);this.status=status}}
export function ensure(ok,message='Thao tác không được phép.',status=403){if(!ok)throw new HttpError(status,message)}
export const id=value=>{ensure(typeof value==='string'&&/^[-a-zA-Z0-9_]{1,128}$/.test(value)&&!['__proto__','prototype','constructor'].includes(value),'Mã không hợp lệ.',400);return value};
export const text=(value,max=200)=>{ensure(typeof value==='string'&&value.trim().length<=max,'Nội dung không hợp lệ.',400);return value.trim()};
export const hash=value=>createHash('sha256').update(value).digest('hex');
export const activities=['flashcard','memory','shooter'];
export function inviteCode(){return Array.from({length:10},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[randomInt(32)]).join('')}
const normalize=s=>s.normalize('NFC').trim().toLocaleLowerCase().replace(/\s+/g,' ');
const aliases=c=>[c.meaning,...c.meaning.split(/[,;]+/),...(c.acceptedMeanings??[])].map(normalize);
const words=c=>[c.word,...(c.synonyms??[])].map(normalize);
export const matches=(a,b)=>a.id===b.id||aliases(a).some(x=>aliases(b).includes(x))||words(a).some(x=>words(b).includes(x));
export function snapshotDeck(raw){
 ensure(raw&&typeof raw.name==='string'&&Array.isArray(raw.cards)&&raw.cards.length>0&&raw.cards.length<=500,'Chọn bộ từ có 1–500 thẻ.',400);
 const seen=new Set();const cards=raw.cards.map(c=>{id(c.id);ensure(!seen.has(c.id),'Mã từ bị trùng.',400);seen.add(c.id);const result={id:c.id};for(const field of ['word','meaning','pos','ipa','example','translation','topic','related','language'])result[field]=text(c[field]??'',field==='example'||field==='translation'?2000:500);ensure(result.word&&result.meaning,'Thẻ cần có từ và nghĩa.',400);for(const key of ['synonyms','acceptedMeanings'])if(c[key]){ensure(Array.isArray(c[key])&&c[key].length<=30,'Danh sách từ liên quan quá dài.',400);result[key]=c[key].map(x=>text(x,200))}return result});
 const deck={id:id(raw.id),name:text(raw.name,100),description:text(raw.description??'',1000),cards};ensure(Buffer.byteLength(JSON.stringify(deck))<700000,'Bộ từ quá lớn. Hãy chia thành bộ nhỏ.',400);return deck;
}
export function sampleCards(deck,activity,size){if(activity==='flashcard')return deck.cards;const seen=new Set();const cards=deck.cards.filter(c=>{const k=normalize(c.word);if(seen.has(k))return false;seen.add(k);return true});for(let i=cards.length-1;i>0;i--){const j=randomInt(i+1);[cards[i],cards[j]]=[cards[j],cards[i]]}return cards.slice(0,size)}
export const emptyResult=uid=>({uid,attempts:0,correct:0,incorrect:0,lastAt:0,completedAt:null,words:{},activities:{}});
export function resultView(assignment,result,now=Date.now()){
 const r=result??emptyResult('');const cardCount=assignment.deck.cards.length;
 const flash=Object.values(r.words??{}).filter(w=>assignment.requireRemembered?w.remembered:w.reviewed).length;
 const fractions=assignment.activities.map(a=>r.activities?.[a]?.done?1:a==='flashcard'?Math.min(1,flash/cardCount):0);
 const progress=Math.floor(fractions.reduce((n,x)=>n+x,0)/fractions.length*100);
 const accuracy=r.correct+r.incorrect?Math.round(r.correct/(r.correct+r.incorrect)*100):null;
 const status=r.completedAt?'Đã hoàn thành':assignment.deadline<now?'Quá hạn':r.attempts?'Đang thực hiện':'Chưa bắt đầu';
 return {...r,progress:r.completedAt?100:progress,accuracy,status,late:!!r.completedAt&&r.completedAt>assignment.deadline};
}
export function applyAnswer(assignment,attempt,summary,event,now){
 ensure(!attempt.finishedAt,'Lượt chơi đã kết thúc.',409);ensure(attempt.eventCount<2000,'Lượt học quá dài. Hãy bắt đầu lượt mới.',400);
 const card=attempt.deck.cards.find(c=>c.id===event.cardId);ensure(card,'Từ không thuộc lượt học này.',400);
 let good;
 if(attempt.activity==='flashcard'){ensure(typeof event.remembered==='boolean','Thiếu đánh giá thẻ.',400);good=event.remembered}
 else if(attempt.activity==='memory'){ensure(typeof event.answer==='string'&&attempt.deck.cards.some(c=>c.meaning===event.answer),'Đáp án không hợp lệ.',400);good=event.answer===card.meaning}
 else {ensure(attempt.incorrect<3,'Đã hết mạng.',409);const target=attempt.deck.cards.find(c=>c.id===event.targetId);ensure(target,'Đích không thuộc bài tập.',400);good=matches(card,target)}
 const a=structuredClone(attempt),r=structuredClone(summary);const old=a.words[card.id]??{correct:0,incorrect:0,firstCorrect:false};
 if(a.activity!=='flashcard')ensure(!old.correct,'Thẻ này đã hoàn thành trong lượt chơi.',409);
 if(!old.correct&&!old.incorrect)old.firstCorrect=good;
 a.combo=good?(a.combo??0)+1:0;if(good&&a.activity!=='flashcard')a.score=(a.score??0)+100+(a.activity==='shooter'?Math.min(a.combo-1,9)*20:0);
 old[good?'correct':'incorrect']++;a.words[card.id]=old;a[good?'correct':'incorrect']++;a.eventCount++;a.lastAt=now;
 const word=r.words[card.id]??{correct:0,incorrect:0,reviewed:false,remembered:false};word[good?'correct':'incorrect']++;word.lastAt=now;
 if(a.activity==='flashcard'){word.reviewed=true;word.remembered=good}r.words[card.id]=word;r[good?'correct':'incorrect']++;r.lastAt=now;
 if(a.activity==='flashcard'&&assignment.deck.cards.every(c=>assignment.requireRemembered?r.words[c.id]?.remembered:r.words[c.id]?.reviewed))r.activities.flashcard={...r.activities.flashcard,done:true,lastAt:now};
 complete(assignment,r,now);return {attempt:a,summary:r,good};
}
function complete(assignment,result,now){if(!result.completedAt&&assignment.activities.every(a=>result.activities[a]?.done))result.completedAt=now}
export function finishAttempt(assignment,attempt,summary,now){
 const a=structuredClone(attempt),r=structuredClone(summary);if(a.finishedAt)return {attempt:a,summary:r};
 const covered=Object.values(a.words).filter(w=>w.correct>0).length;
 a.accuracy=a.activity==='memory'?Math.round(Object.values(a.words).filter(w=>w.firstCorrect).length/a.deck.cards.length*100):a.correct+a.incorrect?Math.round(a.correct/(a.correct+a.incorrect)*100):0;
 a.won=a.activity==='flashcard'?assignment.deck.cards.every(c=>assignment.requireRemembered?r.words[c.id]?.remembered:r.words[c.id]?.reviewed):covered===a.deck.cards.length&&(a.activity!=='shooter'||a.incorrect<3);
 a.wallSeconds=Math.round((now-a.startedAt)/1000);a.passed=a.won&&(a.activity==='flashcard'||a.accuracy>=assignment.minAccuracy);a.finishedAt=now;
 const old=r.activities[a.activity]??{};r.activities[a.activity]={...old,done:!!old.done||a.passed,bestAccuracy:Math.max(old.bestAccuracy??0,a.accuracy),lastAt:now};r.lastAt=now;complete(assignment,r,now);return {attempt:a,summary:r};
}
