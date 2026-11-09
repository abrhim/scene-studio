// Checks labels.js against research.md: every QUOTES entry must appear verbatim in research.md section 14, and every
// label line marked 'quote' must be one of them. Run from the scene folder: node tools/check-labels.mjs
import fs from 'node:fs';
import vm from 'node:vm';
const research = fs.readFileSync('research.md', 'utf8');
const sec = research.split('## 14. Quotations')[1].split('## 15.')[0];
const win = {};
vm.runInNewContext(fs.readFileSync('labels.js', 'utf8'), { window: win });
let bad = 0;
for (const [id, text] of Object.entries(win.QUOTES)) {
  const row = sec.split('\n').find((l) => l.startsWith('| ' + id + ' |'));
  if (!row || !row.includes(text)) { console.log('NOT VERBATIM', id, text.slice(0, 60)); bad++; }
}
const quotes = new Set(Object.values(win.QUOTES));
const check = (where, o) => {
  if (!o || !o.line) return;
  if (!['quote', 'paraphrase', 'reconstructed'].includes(o.layer)) { console.log('NO LAYER', where); bad++; }
  if (o.layer === 'quote' && !quotes.has(o.line)) { console.log('QUOTE NOT IN QUOTES', where); bad++; }
  if (!o.source) { console.log('NO SOURCE', where); bad++; }
};
let n = 0;
for (const [k, L] of Object.entries(win.LABELS)) {
  n++;
  if (!L.kind || !L.name) { console.log('NO KIND/NAME', k); bad++; }
  check(k, L); check(k + '.line2', L.line2);
  for (const b of L.byCh || []) { check(k + '.byCh', b); check(k + '.byCh.line2', b.line2); }
}
const S = win.STORY;
S.chapters.forEach((c) => { if (!c.text || !c.ref || !c.clock) { console.log('CHAPTER', c.id); bad++; } });
S.closing.lines.forEach((l, i) => check('closing' + i, l));
S.epilogue.forEach((e, i) => check('epilogue' + i, e));
console.log(Object.keys(win.QUOTES).length + ' quotes, ' + n + ' labels, ' + S.chapters.length + ' chapters, ' + S.epilogue.length + ' epilogue entries; ' + (bad ? bad + ' problems' : 'all exact'));
process.exit(bad ? 1 : 0);
