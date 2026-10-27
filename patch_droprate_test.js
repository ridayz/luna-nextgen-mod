// CLIENT-SIDE test: raise Orc (monster id 10) drop rates in MonsterList.bin.
// Keep total plaintext length identical (compensate on last line) + re-encrypt AES + CRC.
const crypto = require('crypto');
const fs = require('fs');
const KEY = Buffer.alloc(32);
const dec = b => { const d=crypto.createDecipheriv('aes-256-ecb',KEY,null); d.setAutoPadding(false); return Buffer.concat([d.update(b),d.final()]); };
const enc = b => { const c=crypto.createCipheriv('aes-256-ecb',KEY,null); c.setAutoPadding(false); return Buffer.concat([c.update(b),c.final()]); };

const SRC = 'H:/Luna NextGen/Lang/id/System/Resource/MonsterList.bin';
const BAK = SRC + '.bak';
const orig = fs.readFileSync(SRC);
if (!fs.existsSync(BAK)) fs.writeFileSync(BAK, orig);

const initCrc = orig.readUInt32LE(4) & 0xff;
const crcOf = p => { let s=initCrc; for(let i=0;i<p.length;i++) s=(s+p[i])&0xff; return s; };

let plain = dec(orig.subarray(13, orig.length-1)).toString('latin1');
const hadTrailing = plain.endsWith('\r\n');
let lines = plain.split('\r\n');
if (hadTrailing && lines[lines.length-1]==='') lines.pop();

// area Gerbang Alker = starting zone monsters id 1..12. Raise every drop "rate"
// column (values >10000, which are the 4th member of each [name][id][qty][rate]
// group) by x10 for these monsters. Keep total length equal (compensate last line).
let grew = 0;
for (const MON_ID of ['1','2','3','4','5','6','7','8','9','10','11','12']) {
  const idx = lines.findIndex(l => l.split('\t')[0] === MON_ID);
  if (idx < 0) continue;
  const cols = lines[idx].split('\t');
  for (let i=70;i<cols.length;i++) {
    const v = cols[i];
    if (/^\d+$/.test(v) && +v > 10000) {
      const nv = String(+v * 10);
      grew += nv.length - v.length;
      cols[i] = nv;
    }
  }
  lines[idx] = cols.join('\t');
}
console.log('net char growth from scaling:', grew);

let np = lines.join('\r\n'); if (hadTrailing) np += '\r\n';
const lenNow = Buffer.byteLength(np, 'latin1');
const diff = plain.length - lenNow;
const last = lines.length - 1;
if (diff > 0) lines[last] += '\t'.repeat(diff);
else if (diff < 0) { let need = -diff; while (need>0 && lines[last].length>0){ lines[last]=lines[last].slice(0,-1); need--; } }

np = lines.join('\r\n'); if (hadTrailing) np += '\r\n';
const newPlain = Buffer.from(np, 'latin1');
if (newPlain.length !== plain.length) throw new Error('TOTAL LEN MISMATCH '+newPlain.length+' vs '+plain.length);
if (newPlain.length % 16 !== 0) throw new Error('NOT MULTIPLE OF 16');
const crc = crcOf(newPlain);
const out = Buffer.concat([orig.subarray(0,12), Buffer.from([crc]), enc(newPlain), Buffer.from([crc])]);
if (out.length !== orig.length) throw new Error('SIZE MISMATCH '+out.length+' vs '+orig.length);
fs.writeFileSync(SRC, out);

const back = dec(out.subarray(13,out.length-1)).toString('latin1').split('\r\n');
const row = back.find(l => l.split('\t')[0]==='10').split('\t');
console.log('VERIFY Orc(id10) rate cols 70,74,78,82,86,90 =', row[70], row[74], row[78], row[82], row[86], row[90]);
console.log('len', newPlain.length, 'mod16', newPlain.length%16, 'crc=0x'+crc.toString(16), 'size='+out.length, 'WROTE');
