// Patch: set weapon type (tab col 30) of all daggers/knives (type=4) to sword (type=1),
// re-encrypt with AES-256-ECB zero key, recompute CRC, write back to ItemList.bin.
const crypto = require('crypto');
const fs = require('fs');

const SRC = 'H:/Luna NextGen/Data/System/ItemList.bin';
const PT  = 'H:/Luna NextGen/Data/System/ItemList_dec.bin';
const BAK = 'H:/Luna NextGen/Data/System/ItemList.bin.bak';

const orig = fs.readFileSync(SRC);
const plain = fs.readFileSync(PT);

// --- backup original ---
if (!fs.existsSync(BAK)) fs.writeFileSync(BAK, orig);

const KEY = Buffer.alloc(32);
function aesEnc(buf) { const c = crypto.createCipheriv('aes-256-ecb', KEY, null); c.setAutoPadding(false); return Buffer.concat([c.update(buf), c.final()]); }

const d1 = orig.readUInt32LE(4);
const initCrc = d1 & 0xff;
function crcOf(p) { let s = initCrc; for (let i = 0; i < p.length; i++) s = (s + p[i]) & 0xff; return s; }

console.log('verify: computed crc of unmodified plaintext =', crcOf(plain).toString(16), '(file byte =', orig[12].toString(16) + ')');
const preEnc = aesEnc(plain);
let m = 0; for (let i = 0; i < preEnc.length; i++) if (preEnc[i] === orig[13+i]) m++;
console.log('verify: re-encrypt matches orig payload:', (m/preEnc.length*100).toFixed(2) + '%');

// --- modify lines using split on CRLF-aware boundaries, preserve exactly 12582 CRLF lines ---
const text = plain.toString('latin1');
const lines = text.split('\r\n');
// last empty element from trailing \r\n
const hadTrailing = text.endsWith('\r\n');
if (hadTrailing && lines[lines.length-1] === '') lines.pop();
console.log('line count to process:', lines.length, '(ending CRLF:', hadTrailing + ')');

let changed = 0, totalType4 = 0;
const named = [];
const newLines = lines.map(rec => {
  const parts = rec.split('\t');
  if (parts.length > 30 && parts[30] === '4') {
    totalType4++;
    named.push(parts[1] || '?');
    parts[30] = '1';
    changed++;
  }
  return parts.join('\t');
});
console.log('type=4 dagger/knife items:', totalType4, '-> changed to sword:', changed);
console.log('sample:', named.slice(0, 8).join(', '), changed > 8 ? '...' : '');

let newPlainStr = newLines.join('\r\n');
if (hadTrailing) newPlainStr += '\r\n';
const newPlain = Buffer.from(newPlainStr, 'latin1');
console.log('plain len before/after:', plain.length, newPlain.length, '(must be equal)');
if (newPlain.length !== plain.length) throw new Error('LENGTH MISMATCH ' + plain.length + ' vs ' + newPlain.length);

// --- rebuild ---
const newCrc = crcOf(newPlain);
const newCipher = aesEnc(newPlain);
const out = Buffer.concat([orig.subarray(0, 12), Buffer.from([newCrc]), newCipher, Buffer.from([newCrc])]);
console.log('new crc =', newCrc.toString(16), 'new size =', out.length, '(orig', orig.length + ')');
if (out.length !== orig.length) throw new Error('OUT SIZE MISMATCH ' + out.length + ' vs ' + orig.length);
fs.writeFileSync(SRC, out);
console.log('WROTE', SRC);

// --- verify by full decrypt back and confirming dagger type changed ---
function aesDec(buf) { const dd = crypto.createDecipheriv('aes-256-ecb', KEY, null); dd.setAutoPadding(false); return Buffer.concat([dd.update(buf), dd.final()]); }
const back = aesDec(out.subarray(13, 13 + newCipher.length));
console.log('re-decrypt head:', JSON.stringify(back.toString('latin1').slice(0, 50)));
let daggerNow = 0, daggerLine = '';
const bLines = back.toString('latin1').split('\r\n');
for (const l of bLines) {
  const p = l.split('\t');
  if (p.length > 30 && p[30]==='1' && /Dagger|Knife|Kukri/.test(p[1])) { daggerNow++; if(!daggerLine) daggerLine=l; }
}
console.log('daggers/knives now type=1 by name:', daggerNow);
console.log('sample patched record:', daggerLine);
