const fs = require('fs');
let s = fs.readFileSync('scripts/check-import.mjs', 'utf8');
s = s.replace("'./tests/", "'../tests/");
fs.writeFileSync('scripts/check-import.mjs', s);
console.log('patched');
