const crypto = require('crypto');
const fs = require('fs');

const tables = fs.readFileSync('H:/Default Project/ghidra_proj/out_tables.txt', 'utf8');
const m = /DAT_00695af8=([0-9A-F]+)/.exec(tables);
const region = Buffer.from(m[1], 'hex');

const runs = [];
let cur = '';
for (let i = 0; i < region.length; i++) {
  const b = region[i];
  if (b >= 32 && b < 127) cur += String.fromCharCode(b);
  else { if (cur.length >= 8) runs.push(cur); cur = ''; }
}
if (cur.length >= 8) runs.push(cur);
console.log('ASCII runs in DAT_00695af8 region:');
runs.forEach(r => console.log(' ', r));

const hexRuns = runs.filter(r => /^[0-9A-Fa-f]+$/.test(r));
console.log('\nHex-looking runs:', hexRuns);

const data = fs.readFileSync('H:/Luna NextGen/Data/System/ItemList.bin');
const ct = data.subarray(13, 13 + 16);
console.log('block0 ct:', ct.toString('hex'));

const cands = [];
for (const r of hexRuns) {
  const b = Buffer.from(r, 'hex');
  if (b.length >= 16) cands.push(['hexdec ' + r.slice(0, 32), b.subarray(0, 16)]);
}
for (const r of runs) {
  cands.push(['ascii ' + r.slice(0, 20), Buffer.from(r, 'latin1').subarray(0, 16)]);
  cands.push(['sha256(' + r.slice(0, 16) + ')', crypto.createHash('sha256').update(r).digest()]);
  cands.push(['md5(' + r.slice(0, 16) + ')', crypto.createHash('md5').update(r).digest()]);
  cands.push(['sha1(' + r.slice(0, 16) + ')', crypto.createHash('sha1').update(r).digest().subarray(0, 16)]);
}
const stripped = runs.join('');
cands.push(['stripped ascii', Buffer.from(stripped, 'latin1').subarray(0, 16)]);
cands.push(['stripped sha256', crypto.createHash('sha256').update(stripped).digest()]);

let tried = 0;
for (const [name, key] of cands) {
  if (key.length < 16) continue;
  const bits = key.length * 8;
  if (![128, 192, 256].includes(bits)) continue;
  const mode = 'aes-' + bits + '-ecb';
  try {
    const d = crypto.createDecipheriv(mode, key, null);
    d.setAutoPadding(false);
    const pt = Buffer.concat([d.update(ct), d.final()]);
    tried++;
    const s = pt.toString('latin1');
    if (/[A-Za-z]{5,}/.test(s) || pt.filter(b => b === 0).length >= 6)
      console.log('*** HIT', name, mode, pt.toString('hex'), JSON.stringify(s));
  } catch (e) {}
}
console.log('done, tried', tried, 'candidates');
