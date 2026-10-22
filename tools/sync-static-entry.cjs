/* Keep the first-paint entry screen inline without adding a build dependency. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8').replace(/\r\n/g, '\n');
const blocks = [
  [/<!-- STATIC SITE ENTRY HEAD:[\s\S]*?<!-- \/STATIC SITE ENTRY HEAD -->/, read('assets/site-entry-head.html').trim()],
  [/<!-- STATIC SITE ENTRY SCREEN -->[\s\S]*?<!-- \/STATIC SITE ENTRY SCREEN -->/, read('assets/site-entry-screen.html').trim()],
  [/<style id="siteSessionStyles">[\s\S]*?<\/style>/, '<style id="siteSessionStyles">' + read('assets/mobile-site-session.css') + '</style>']
];
let mismatched = false;
for (const file of ['index.html', 'product.html', 'tshirt.html', 'plushie.html']) {
  const original = read(file);
  let updated = original;
  for (const [pattern, replacement] of blocks) {
    if (!pattern.test(updated)) throw new Error('Missing entry block in ' + file);
    updated = updated.replace(pattern, () => replacement);
  }
  if (original !== updated) {
    if (process.argv.includes('--check')) { console.error('Entry block needs synchronization: ' + file); mismatched = true; }
    else fs.writeFileSync(path.join(root, file), updated);
  }
}
if (mismatched) process.exitCode = 1;
