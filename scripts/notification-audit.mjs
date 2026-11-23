// Run by the repository scheduler; credentials come only from encrypted secrets.
import {adminServices} from '../server/firebase-admin.js';
import {auditClass} from '../server/school-service.js';
const {db}=adminServices();
let cursor=null,count=0;
do{
 let query=db.collection('classrooms').orderBy('__name__').limit(50);if(cursor)query=query.startAfter(cursor);
 const batch=await query.get();if(batch.empty)break;
 for(const c of batch.docs){if(!c.data().archived){await auditClass(db,c.id);count++}}
 cursor=batch.docs.at(-1);if(batch.size<50)break;
}while(true);
console.log(`Notification audit completed for ${count} active classrooms.`);
