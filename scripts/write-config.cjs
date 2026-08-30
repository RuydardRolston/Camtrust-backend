const fs = require('fs');
const content = `import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      vitest: path.resolve(__dirname, 'node_modules/vitest'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
`;
fs.writeFileSync('vitest.config.js', content);
console.log('written');
