import {profileService} from '../server/profile-service.js';
import {adminServices} from '../server/firebase-admin.js';
import {classroomService} from '../server/classroom-service.js';
import {HttpError} from '../server/classroom-domain.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Chỉ hỗ trợ POST.'})}
 try{
  if(Number(req.headers['content-length']??0)>1000000)throw new HttpError(413,'Dữ liệu gửi lên quá lớn.');
  const bearer=req.headers.authorization??'';if(!bearer.startsWith('Bearer '))throw new HttpError(401,'Hãy đăng nhập Google để dùng lớp học.');
  const {auth,db}=adminServices();let user;try{user=await auth.verifyIdToken(bearer.slice(7))}catch{throw new HttpError(401,'Phiên đăng nhập hết hạn. Hãy đăng nhập lại.')}
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;if(!body||typeof body.action!=='string')throw new HttpError(400,'Yêu cầu không hợp lệ.');
  const result=await (['profileGet','profileUpdate','profileIdentity'].includes(body.action)?profileService(db,auth):classroomService(db))(user,body.action,body.input);return res.status(200).json({data:result});
 }catch(e){const status=e instanceof HttpError?e.status:e instanceof SyntaxError?400:500;if(status===500)console.error('classroom-api',e.code??e.name);return res.status(status).json({error:status===500?'Máy chủ chưa xử lý được. Vui lòng thử lại.':e.message})}
}
