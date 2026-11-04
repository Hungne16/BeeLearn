import assert from 'node:assert/strict';
import {validateSignup} from './dist/auth-validation.js';
assert(validateSignup('   ','Password123','Password123'));
assert(validateSignup('Hùng','12345678','12345678'));
assert(validateSignup('Hùng','PasswordOnly','PasswordOnly'));
assert(validateSignup('Hùng','Abc123','Abc123'));
assert(validateSignup('Hùng','Password123','Different123'));
assert.equal(validateSignup('Hùng','Password123','Password123'),'');
console.log('PASS: signup rejects blank names, weak/short passwords and mismatched confirmation.');
