const fs = require('fs');
const marker = "vi.mock('sequelize', () => ({ Op: {} }));\n\nimport { describe";
for (const f of ['tests/adminController.test.js', 'tests/aiController.test.js']) {
  let s = fs.readFileSync(f, 'utf8');
  if (!s.includes(marker)) {
    s = s.replace('import { describe', marker);
    fs.writeFileSync(f, s);
  }
}
console.log('OK');
