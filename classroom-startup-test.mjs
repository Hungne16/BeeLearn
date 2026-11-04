import assert from 'node:assert/strict';
for(const key of ['FIREBASE_ADMIN_CLIENT_EMAIL','FIREBASE_ADMIN_PRIVATE_KEY','FIRESTORE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST'])delete process.env[key];
const {default:handler}=await import('./api/classroom.js');
let status,body;const res={setHeader(){},status(value){status=value;return this},json(value){body=value;return this}};
await handler({method:'POST',headers:{authorization:'Bearer startup-check'},body:{action:'home'}},res);
assert.equal(status,503);assert.match(body.error,/chưa được kích hoạt/);
await handler({method:'POST',headers:{},body:{action:'home'}},res);assert.equal(status,401);
console.log('PASS: API starts without credentials and returns a controlled setup error; unauthenticated requests are rejected.');
