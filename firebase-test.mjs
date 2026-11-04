import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc} from 'firebase/firestore';
import {createPatch,emptyState,clone,mergeDeck} from './dist/sync-model.js';
import {readCloud,writePatch} from './dist/firebase-store.js';
const env=await initializeTestEnvironment({projectId:'demo-beelearn',firestore:{host:'127.0.0.1',port:8089,rules:await readFile('firestore.rules','utf8')}});
try{
 await env.clearFirestore();
 const db=env.authenticatedContext('alice').firestore(),other=env.authenticatedContext('bob').firestore(),guest=env.unauthenticatedContext().firestore();
 const base=emptyState();base.decks=[{id:'deck1',name:'Day 1',description:'',cards:[{id:'c1',word:'hello',meaning:'xin chào',pos:'',ipa:'',example:'',translation:'',topic:'',related:'',language:'en-US'}]}];
 await writePatch(db,'alice',createPatch(emptyState(),base,'initial'),'device1');
 await assertSucceeds(getDoc(doc(db,'users','alice','decks','deck1')));
 await assertFails(getDoc(doc(other,'users','alice','decks','deck1')));
 await assertFails(getDoc(doc(guest,'users','alice','decks','deck1')));
 await assertFails(setDoc(doc(other,'users','alice','decks','deck1'),{value:{}}));
 await assertFails(setDoc(doc(db,'users','alice','activity','bad'),{count:-1}));
 const a=clone(base),b=clone(base);a.decks[0].cards[0].meaning='chào bạn';b.decks[0].cards[0].example='Hello there';a.activity.today=1;b.activity.today=2;
 const pa=createPatch(base,a,'a'),pb=createPatch(base,b,'b');
 await Promise.all([writePatch(db,'alice',pa,'device1'),writePatch(db,'alice',pb,'device2')]);
 await writePatch(db,'alice',pa,'device1');
 const result=await readCloud(db,'alice');assert.equal(result.decks[0].cards[0].meaning,'chào bạn');assert.equal(result.decks[0].cards[0].example,'Hello there');assert.equal(result.activity.today,3);
 const deleted=clone(base);deleted.decks[0].cards=[];const deletion=createPatch(base,deleted,'delete');await writePatch(db,'alice',deletion,'device1');await writePatch(db,'alice',createPatch(base,a,'late'),'device2');assert.equal((await readCloud(db,'alice')).decks[0].cards.length,0);
 assert.equal(mergeDeck(createPatch(base,a,'x').decks[0],null),null);
 console.log('PASS: owner-only rules, malformed writes denied, concurrent card fields preserved, activity increments, retry idempotency, deletion wins.');
}finally{await env.cleanup()}
