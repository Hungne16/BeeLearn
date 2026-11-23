export type SkeletonKind='home'|'profile'|'grammar'|'classroom'|'session'|'page';
const bar=(size='')=>`<span class="sk-line ${size}"></span>`;
const card=()=>`<div class="sk-card">${bar('short')}${bar('title')}${bar()}${bar('medium')}<span class="sk-button"></span></div>`;
export function skeletonHTML(kind:SkeletonKind='page',label='Đang tải nội dung…'){
 const title=`<div class="sk-heading">${kind==='profile'?'<span class="sk-avatar"></span>':''}<div>${bar('short')}${bar('title')}${bar('medium')}</div></div>`;
 const stats=`<div class="sk-stats">${Array.from({length:3},()=>`<div class="sk-card">${bar('short')}${bar('medium')}</div>`).join('')}</div>`;
 const body=kind==='home'?`<div class="sk-home-layout"><div><div class="sk-card sk-hero">${bar('short')}${bar('title')}${bar('medium')}<span class="sk-button"></span></div>${stats}<div class="sk-card sk-list">${bar('medium')}${bar()}${bar()}</div><div class="sk-grid">${card()}${card()}</div></div><aside>${card()}${card()}</aside></div>`:kind==='session'?`<div class="sk-session">${bar('medium')}<div class="sk-card sk-flash">${bar('title')}${bar('medium')}</div><span class="sk-button"></span></div>`:`${kind==='profile'?stats:''}<div class="sk-grid ${kind==='grammar'?'sk-three':''}">${Array.from({length:kind==='grammar'?6:4},card).join('')}</div>`;
 return `<section class="loading-skeleton sk-${kind}" data-skeleton="${kind}" role="status" aria-busy="true" aria-label="${label}"><span class="sr-only">${label}</span><div aria-hidden="true">${title}${body}</div></section>`;
}
// Native scroll preserves mouse, touch and keyboard behavior. Only animate page changes,
// never reanimate a form when the user types or updates an answer.
export function installPageMotion(root:HTMLElement){
 let previous='',wasLoading=false,scheduled=false;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const observer=new MutationObserver(()=>{
  if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;
   const target=root.querySelector<HTMLElement>('#view')||root.querySelector<HTMLElement>('.public-page');
   if(!target)return;const loading=!!target.querySelector('[data-skeleton]');
   const key=location.hash+'|'+(root.querySelector('#appSurface')?.className??'public');
   if(!loading&&(key!==previous||wasLoading)&&!reduce.matches){target.getAnimations().forEach(a=>a.cancel());target.animate([{opacity:.25,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'cubic-bezier(.2,.7,.2,1)'});}
   previous=key;wasLoading=loading;
  });
 });observer.observe(root,{childList:true,subtree:true});
}
