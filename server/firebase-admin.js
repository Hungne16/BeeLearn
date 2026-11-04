import {initializeApp,getApps,cert} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {HttpError} from './classroom-domain.js';
export function adminServices(){
 let app=getApps().find(a=>a.name==='classrooms');
 if(!app){
  const emulator=process.env.FIRESTORE_EMULATOR_HOST&&process.env.FIREBASE_AUTH_EMULATOR_HOST&&!process.env.VERCEL;
  if(emulator)app=initializeApp({projectId:'demo-beelearn'},'classrooms');
  else {const email=process.env.FIREBASE_ADMIN_CLIENT_EMAIL,key=process.env.FIREBASE_ADMIN_PRIVATE_KEY;if(!email||!key)throw new HttpError(503,'Lớp học chưa được kích hoạt trên máy chủ. Chủ website cần hoàn tất thiết lập.');app=initializeApp({credential:cert({projectId:'beelearn-1079b',clientEmail:email,privateKey:key.replace(/\\n/g,'\n')})},'classrooms')}
 }
 return {auth:getAuth(app),db:getFirestore(app)};
}
