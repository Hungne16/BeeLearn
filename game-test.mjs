import assert from 'node:assert/strict';
import {matches,meaningAliases,choicesFor,targetSet,playable,segmentRect,accuracy,levels,targetLayout} from './dist/game-core.js';
const word=(id,word,meaning,extra={})=>({id,word,meaning,pos:'n',ipa:'',example:'',translation:'',topic:'',related:'',language:'en-US',...extra});
const a=word('a','query','truy vấn'),b=word('b','request','yêu cầu'),c=word('c','lookup','tìm kiếm',{acceptedMeanings:['truy vấn']}),d=word('d','look up','tra cứu',{synonyms:['lookup']});
assert(matches(a,c));assert(matches(c,d));assert(!matches(a,b));
assert.deepEqual(meaningAliases(word('x','x','dự phòng, dư thừa')),['dự phòng, dư thừa','dự phòng','dư thừa']);
for(let i=0;i<100;i++){const choices=choicesFor(a,[a,b,c],4);assert.equal(choices.length,2);assert.equal(choices.filter(x=>x==='truy vấn').length,1);const targets=targetSet(a,[a,b,c,d],6);assert(targets.some(x=>x.id===a.id));assert.equal(targets.filter(x=>matches(a,x)).length,1)}
assert.equal(choicesFor(a,[a],4).length,1);assert.equal(targetSet(a,[a],6).length,1);assert.equal(playable([a,{...a,id:'other'},word('z','blank','')]).length,1);
const rect={x:40,y:40,w:20,h:20};assert.equal(segmentRect(50,100,50,0,rect),.4);assert.equal(segmentRect(0,50,100,50,rect),.4);assert.equal(segmentRect(0,0,30,30,rect),null);assert.equal(segmentRect(50,50,60,60,rect),0);assert.equal(segmentRect(0,0,100,100,rect),.4);assert.equal(segmentRect(0,10,100,10,rect),null);
// A large delta must still collide with the nearest target, without tunneling.
const hits=[{x:0,y:20,w:100,h:10},{x:0,y:60,w:100,h:10}].map(r=>segmentRect(50,100,50,0,r)).filter(x=>x!==null);assert.equal(Math.min(...hits),.3);
assert.equal(accuracy(6,8),75);assert.equal(accuracy(0,0),0);assert.equal(levels.hard.size,20);
console.log('PASS: valid aliases, unambiguous choices, guaranteed ammo target, tiny/duplicate decks, swept collisions and first-attempt accuracy.');

for(const width of [264,304,342,600,1100])for(let count=1;count<=Math.min(6,width<560?4:6);count++){const height=width<560?330:510;const rects=targetLayout(count,width,height);assert.equal(rects.length,count);assert(rects.every(r=>r.w>=60));for(let i=0;i<count;i++)for(let j=0;j<count;j++)if(i!==j)assert.equal(segmentRect(width/2,height-46,rects[i].x+rects[i].w/2,rects[i].y+rects[i].h/2,rects[j],12),null)}console.log('PASS: readable targets with unobstructed shots at phone and desktop sizes.');
