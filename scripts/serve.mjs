// Local static + Vercel API adapter. The emulator switch never reaches a deployment.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
if(process.argv.includes('--emulator')){process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8089';process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099'}
const {default:handler}=await import('../api/classroom.js');
const root=resolve('dist'),port=Number(process.env.PORT||5181);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png'};
createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/api/classroom'){let body='';for await(const chunk of req){body+=chunk;if(body.length>1000000){res.writeHead(413);res.end();return}}req.body=body;res.status=n=>{res.statusCode=n;return res};res.json=x=>res.end(JSON.stringify(x));res.setHeader('Content-Type','application/json');await handler(req,res);return}const file=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return}res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(await readFile(file))}catch{res.writeHead(404);res.end('Not found')}}).listen(port,'127.0.0.1',()=>console.log(`BeeLearn: http://127.0.0.1:${port}`));
