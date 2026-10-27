// Replace Knife (11000187) record with Advanced Knife (11007367) content,
// keep Knife's ID (11000187). Compensate size change on the last blank line
// so total plaintext length stays identical to original (no NUL padding, no
// header change, file remains valid for the game).
const crypto = require('crypto');
const fs = require('fs');

const SRC = 'H:/Luna NextGen/Data/System/ItemList.bin';
const BAK = 'H:/Luna NextGen/Data/System/ItemList.bin.bak';
const KEY = Buffer.alloc(32);
const dec = b => { const d=crypto.createDecipheriv('aes-256-ecb',KEY,null); d.setAutoPadding(false); return Buffer.concat([d.update(b),d.final()]); };
const enc = b => { const c=crypto.createCipheriv('aes-256-ecb',KEY,null); c.setAutoPadding(false); return Buffer.concat([c.update(b),c.final()]); };

const orig = fs.readFileSync(SRC);
if (!fs.existsSync(BAK)) fs.writeFileSync(BAK, orig);
const initCrc = orig.readUInt32LE(4) & 0xff;
const crcOf = p => { let s=initCrc; for(let i=0;i<p.length;i++) s=(s+p[i])&0xff; return s; };

const text = dec(orig.subarray(13, orig.length-1)).toString('latin1');
const hadTrailing = text.endsWith('\r\n');
let lines = text.split('\r\n');
if (hadTrailing && lines[lines.length-1]==='') lines.pop();

const SRC_ID = '11000187';
const TPL_ID = '11007367';
const tpl = lines.find(l => l.startsWith(TPL_ID + '\t')).split('\t');

let idx = -1;
for (let i = 0; i < lines.length; i++) if (lines[i].startsWith(SRC_ID + '\t')) { idx = i; break; }
if (idx < 0) throw new Error('Knife line not found');

const newKnife = tpl.slice();
newKnife[0] = SRC_ID; newKnife[2] = SRC_ID;
const newKnifeLine = newKnife.join('\t');
console.log('new knife line len:', newKnifeLine.length, 'old:', lines[idx].length);

const delta = newKnifeLine.length - lines[idx].length;
lines[idx] = newKnifeLine;

// absorb delta on the last line so the total plaintext length stays unchanged
const lastIdx = lines.length - 1;
if (delta > 0) {
  let need = delta;
  while (need > 0 && lines[lastIdx].length > 0) { need -= 1; lines[lastIdx] = lines[lastIdx].slice(0,-1); }
  // append remaining as tabs (creates a short blank tail if needed)
  lines[lastIdx] += '\t'.repeat(need);
} else if (delta < 0) {
  lines[lastIdx] += '\t'.repeat(-delta);
}

let np = lines.join('\r\n'); if (hadTrailing) np += '\r\n';
const newPlain = Buffer.from(np, 'latin1');
console.log('plain len:', newPlain.length, 'orig text len:', text.length, '(mod16', newPlain.length % 16 + ')');
if (newPlain.length !== text.length) throw new Error('TOTAL LEN MISMATCH '+newPlain.length+' vs '+text.length);

const newCipher = enc(newPlain);
const out = Buffer.concat([orig.subarray(0,12), Buffer.from([crcOf(newPlain)]), newCipher, Buffer.from([crcOf(newPlain)])]);
if (out.length !== orig.length) throw new Error('SIZE MISMATCH '+out.length+' vs '+orig.length);
fs.writeFileSync(SRC, out);

const back = dec(out.subarray(13,out.length-1)).toString('latin1').split('\r\n');
const row = back.find(l => l.startsWith(SRC_ID + '\t')).split('\t');
console.log('\nVERIFY Knife now = col0='+row[0]+' name="'+row[1]+'" lvl='+row[14]+' c22='+row[22]+' c31/32='+row[31]+'/'+row[32]+' type='+row[30]);
console.log('crc=0x'+crcOf(newPlain).toString(16)+' size='+out.length);
console.log('WROTE', SRC);
