import {dayKey,type State} from './model.js';
export const DAILY_GOAL=10;
const offset=(date:Date,n:number)=>{const d=new Date(date);d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return d};
const serial=(key:string)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(key))return NaN;const [y,m,d]=key.split('-').map(Number);const date=new Date(y,m-1,d,12);return dayKey(date)===key?Date.UTC(y,m-1,d)/86400000:NaN};
export function streakStats(activity:Record<string,number>,now=new Date()){
 const today=dayKey(now),yesterday=dayKey(offset(now,-1)),todayNumber=serial(today);
 const days=Object.keys(activity).filter(k=>activity[k]>0&&Number.isFinite(serial(k))&&serial(k)<=todayNumber).sort();
 let best=0,run=0,last=-Infinity;for(const day of days){const n=serial(day);run=n===last+1?run+1:1;best=Math.max(best,run);last=n}
 let current=0;let date=activity[today]>0?offset(now,0):offset(now,-1);while(activity[dayKey(date)]>0){current++;date=offset(date,-1)}
 return {current,best,days:days.length,today:activity[today]??0,secured:(activity[today]??0)>0,atRisk:current>0&&!(activity[today]>0),yesterday:(activity[yesterday]??0)>0,total:days.reduce((sum,k)=>sum+activity[k],0)};
}
export const learningStreak=(activity:Record<string,number>,now=new Date())=>streakStats(activity,now).current;
export function studyCelebration(before:Record<string,number>,after:Record<string,number>,now=new Date()){
 const a=streakStats(before,now),b=streakStats(after,now);
 if(a.today<DAILY_GOAL&&b.today>=DAILY_GOAL)return '✦ Hoàn thành mục tiêu 10 lượt hôm nay!';
 if(!a.secured&&b.secured)return `🔥 ${b.current===1?'Khởi đầu chuỗi 1 ngày':`Đã giữ chuỗi ${b.current} ngày`}!`;
 return '';
}
export function openStreak(getState:()=>State,onStudy:()=>void,selected=dayKey()){
 document.querySelector('dialog')?.remove();const dialog=document.createElement('dialog');dialog.className='streak-dialog';dialog.id='streakDialog';
 let month=new Date(selected+'T12:00:00');if(!Number.isFinite(month.getTime()))month=new Date();month.setDate(1);
 function render(){
 const state=getState(),stats=streakStats(state.activity),now=new Date(),today=dayKey(now),currentMonth=new Date(now.getFullYear(),now.getMonth(),1),start=new Date(month.getFullYear(),month.getMonth(),1,12),padding=(start.getDay()+6)%7,count=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
 const days=Array.from({length:count},(_,i)=>{const d=new Date(month.getFullYear(),month.getMonth(),i+1,12),key=dayKey(d),n=state.activity[key]??0;return `<button class="calendar-day ${n>0?'studied':''} ${n>=DAILY_GOAL?'goal-met':''} ${key===today?'today':''} ${key===selected?'selected':''}" data-date="${key}" aria-pressed="${key===selected}" aria-label="${d.toLocaleDateString('vi-VN')}: ${n} lượt học" ${key>today?'disabled':''}><span>${i+1}</span><i>${n>=DAILY_GOAL?'★':n>0?'✓':'·'}</i></button>`}).join('');
 const selectedCount=state.activity[selected]??0;
 dialog.innerHTML=`<div class="row between"><h2>🔥 Nhịp học</h2><button id="streakClose" aria-label="Đóng nhịp học">✕</button></div><div class="streak-hero ${stats.atRisk?'at-risk':''}"><b>${stats.current}</b><span>ngày liên tiếp</span><p>${stats.secured?'Hôm nay đã giữ chuỗi ✓':stats.atRisk?'Học 1 lượt hôm nay để nối chuỗi!':'Học 1 lượt để bắt đầu chuỗi mới.'}</p></div><div class="streak-metrics"><div><b>${stats.best}</b><span>Kỷ lục</span></div><div><b>${stats.days}</b><span>Ngày đã học</span></div><div><b>${stats.total}</b><span>Lượt học</span></div></div><div class="calendar-heading"><button id="monthPrev" aria-label="Tháng trước">←</button><h3>Tháng ${month.getMonth()+1}/${month.getFullYear()}</h3><button id="monthNext" aria-label="Tháng sau" ${month>=currentMonth?'disabled':''}>→</button></div><div class="study-calendar">${['T2','T3','T4','T5','T6','T7','CN'].map(d=>`<strong>${d}</strong>`).join('')}${'<span></span>'.repeat(padding)}${days}</div><p class="calendar-selection" aria-live="polite">${new Date(selected+'T12:00:00').toLocaleDateString('vi-VN')}: <b>${selectedCount} lượt</b>${selectedCount>=DAILY_GOAL?' · Đạt mục tiêu ★':''}</p><div class="streak-badges">${[3,7,14,30,100].map(n=>`<span class="${stats.best>=n?'unlocked':''}" title="Chuỗi ${n} ngày${stats.best>=n?' · Đã đạt':''}">★ ${n}</span>`).join('')}</div><p class="streak-rule">1 lượt trả lời thẻ hoặc trò chơi mỗi ngày để giữ chuỗi. Mục tiêu: 10 lượt/ngày. Tính theo ngày trên thiết bị của bạn.</p><div class="row between"><button id="monthToday">Về hôm nay</button><button id="streakStudy" class="primary">${stats.secured?'Học tiếp':'Giữ chuỗi ngay'} →</button></div>`;
 const el=(id:string)=>dialog.querySelector<HTMLElement>('#'+id)!;
 el('streakClose').onclick=()=>dialog.close();el('monthPrev').onclick=()=>{month.setMonth(month.getMonth()-1);render()};el('monthNext').onclick=()=>{month.setMonth(month.getMonth()+1);render()};el('monthToday').onclick=()=>{month=new Date(now.getFullYear(),now.getMonth(),1);selected=today;render()};el('streakStudy').onclick=()=>{dialog.close();onStudy()};dialog.querySelectorAll<HTMLElement>('[data-date]').forEach(b=>b.onclick=()=>{selected=b.dataset.date!;render()});
 }
 document.body.append(dialog);render();dialog.showModal();
}
