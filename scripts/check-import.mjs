try {
  await import('../tests/adminController.test.js');
  console.log('import ok');
} catch (e) {
  console.log('IMPORT ERR', e.message, e.stack?.split('\n').slice(0, 5).join('\n'));
}
