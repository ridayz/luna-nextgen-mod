// Turn "Dagger" (11000188) into "Advanced Knife" behavior/stats, keeping its item ID
// so the item already in the inventory keeps its identity. Line byte-length preserved
// by adjusting trailing empty tab fields, so file size (and header) stays valid.
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

const SRC_ID = '11000188';   // Dagger currently held
const TPL_ID = '11007367';   // Advanced Knife (level 100)

let changed = 0, report = '';
const out = lines.map(rec => {
  if (!rec.startsWith(SRC_ID + '\t')) return rec;
  const a = rec.split('\t');
  const tpl = lines.find(l => l.startsWith(TPL_ID + '\t')).split('\t');
  const origLen = rec.length;
  // copy everything from the template except identity columns 0 and 2
  for (let i = 0; i < 71; i++) {
    if (i === 0 || i === 2) continue;
    a[i] = tpl[i];
  }
  const line = a.join('\t');
  changed++;
  report = line;
  return line;
});
console.log('rows patched:', changed);

let np = out.join('\r\n'); if (hadTrailing) np += '\r\n';
let newPlain = Buffer.from(np, 'latin1');
// pad to 16-byte multiple (parser ignores trailing bytes after last CRLF)
while (newPlain.length % 16 !== 0) newPlain = Buffer.concat([newPlain, Buffer.from([0x09])]);
console.log('plain len:', newPlain.length, 'orig:', text.length, '(mod16', newPlain.length % 16 + ')');

const newCipher = enc(newPlain);
const newD2 = newPlain.length - 2;
const d1 = orig.readUInt32LE(4);
const newD0 = (d1 + newD2 + 0x7353A69F) >>> 0;
const header = Buffer.from(orig.subarray(0, 12));
header.writeUInt32LE(newD0 >>> 0, 0);
header.writeUInt32LE(newD2 >>> 0, 8);
console.log('header d0=0x'+newD0.toString(16), 'd2='+newD2);
const out2 = Buffer.concat([header, Buffer.from([crcOf(newPlain)]), newCipher, Buffer.from([crcOf(newPlain)])]);
console.log('new file size:', out2.length, '(orig', orig.length + ')');
fs.writeFileSync(SRC, out2);

const back = dec(out2.subarray(13, out2.length-1)).toString('latin1');
const row = back.split('\r\n').find(l => l.startsWith(SRC_ID + '\t'));
const c = row.split('\t');
console.log('VERIFY:', c[0], '|', c[1], '| lvl=' + c[14], '| col11=' + c[11], '| col22=' + c[22], '| col31=' + c[31]);
console.log('WROTE', SRC);
