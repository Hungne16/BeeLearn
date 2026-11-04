export function validateSignup(name:string,password:string,confirm:string){
 if(!name.trim())return 'Nhập họ và tên của bạn.';
 if(password.length<8||!/[a-zA-Z]/.test(password)||!/[0-9]/.test(password))return 'Mật khẩu cần ít nhất 8 ký tự, gồm chữ và số.';
 if(password!==confirm)return 'Mật khẩu xác nhận chưa khớp.';
 return '';
}
