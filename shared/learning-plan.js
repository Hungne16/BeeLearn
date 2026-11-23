export function schedule(old,good,now=Date.now()){
 const r=old??{streak:0,failures:0,reviews:0,interval:0,due:0,last:0,remembered:false};
 const streak=good?r.streak+1:0,interval=good?(streak===1?1:streak===2?3:Math.min(90,Math.max(7,r.interval*2))):0;
 return {streak,interval,failures:r.failures+(good?0:1),reviews:r.reviews+1,last:now,due:now+(good?interval*86400000:600000),remembered:good};
}
export function chooseLearningPlan(decks,records,lessons,now=Date.now()){
 const seen=new Set(),cards=[];for(const deck of decks)for(const card of deck.cards)if(!seen.has(card.id)&&card.word&&card.meaning){seen.add(card.id);cards.push({...card,deckId:deck.id,deckName:deck.name})}
 const due=cards.filter(c=>records[c.id]?.reviews>0&&records[c.id].due<=now).sort((a,b)=>(records[b.id].failures-records[a.id].failures)||(records[a.id].due-records[b.id].due));
 const fresh=cards.filter(c=>!records[c.id]?.reviews),selected=due.slice(0,5);selected.push(...fresh.slice(0,8-selected.length));if(selected.length<8)selected.push(...due.slice(5,5+8-selected.length));
 const candidates=lessons.filter(l=>!l.assignmentPath&&l.exerciseCounts?.quiz>0),levels=['A1','A2','B1','B2','C1'];
 const review=candidates.filter(l=>l.progressStatus==='Cần ôn tập').sort((a,b)=>(a.progress?.lastAt??0)-(b.progress?.lastAt??0));
 const ongoing=candidates.filter(l=>l.progress&&!l.progress.completedAt).sort((a,b)=>(b.progress.lastAt??0)-(a.progress.lastAt??0));
 const next=candidates.filter(l=>!l.progress?.completedAt).sort((a,b)=>levels.indexOf(a.level)-levels.indexOf(b.level));
 const grammar=review[0]??ongoing[0]??next[0]??candidates.slice().sort((a,b)=>(a.progress?.lastAt??0)-(b.progress?.lastAt??0))[0]??null;
 return {cards:selected,reviewCount:selected.filter(c=>records[c.id]?.reviews>0).length,newCount:selected.filter(c=>!records[c.id]?.reviews).length,grammar:grammar?{id:grammar.id,title:grammar.title,level:grammar.level,questionCount:grammar.exerciseCounts.quiz}:null};
}
