// Restore MonsterList from .bak (original), then set ALL rare/item special drop
// values equal to a common drop rate so rare items drop as often as normal items.
// Common drop rate used = 1500000 (mid-range, seen across many monsters).
// Keep file length identical + re-encrypt + CRC.
const crypto = require('crypto');
const fs = require('fs');
const KEY = Buffer.alloc(32);
const dec = b => { const d=crypto.createDecipheriv('aes-256-ecb',KEY,null); d.setAutoPadding(false); return Buffer.concat([d.update(b),d.final()]); };
const enc = b => { const c=crypto.createCipheriv('aes-256-ecb',KEY,null); c.setAutoPadding(false); return Buffer.concat([c.update(b),c.final()]); };

const SRC = 'H:/Luna NextGen/Lang/id/System/Resource/MonsterList.bin';
const BAK = SRC + '.bak';
const orig = fs.readFileSync(BAK);           // pristine baseline
const initCrc = orig.readUInt32LE(4) & 0xff;
const crcOf = p => { let s=initCrc; for(let i=0;i<p.length;i++) s=(s+p[i])&0xff; return s; };

let plain = dec(orig.subarray(13, orig.length-1)).toString('latin1');
const hadTrailing = plain.endsWith('\r\n');
let lines = plain.split('\r\n');
if (hadTrailing && lines[lines.length-1]==='') lines.pop();

const COMMON_RATE = '1500000';
const RARE_RE = /Gem|Scroll|Powder|Crystal|Rare|Ancient|Unique|Orb|Key|Fragment|Legend/i;
let changed = 0;
for (const MON_ID of ['1','2','3','4','5','6','7','8','9','10','11','12']) {
  const idx = lines.findIndex(l => l.split('\t')[0]===MON_ID);
  if (idx < 0) continue;
  const cols = lines[idx].split('\t');
  for (let i=67;i+3<cols.length;i+=4) {
    const name = cols[i]||'';
    if (RARE_RE.test(name)) { cols[i+3] = COMMON_RATE; changed++; }
  }
  lines[idx] = cols.join('\t');
}
console.log('changed rare groups:', changed);

let np = lines.join('\r\n'); if (hadTrailing) np += '\r\n';
const newPlain = Buffer.from(np, 'latin1');
if (newPlain.length !== plain.length) { // compensate only if needed
  const diff = plain.length - newPlain.length;
  const last = lines.length - 1;
  if (diff > 0) lines[last] += '\t'.repeat(diff);
  else if (diff < 0) { let need=-diff; while(need>0 && lines[last].length>0){ lines[last]=lines[last].slice(0,-1); need--; } }
  np = lines.join('\r\n'); if (hadTrailing) np += '\r\n';
}
const newPlainF = Buffer.from(np,'latin1');
if (newPlainF.length !== plain.length) throw new Error('LEN MISMATCH');
if (newPlainF.length % 16 !== 0) throw new Error('NOT MULT16 '+newPlainF.length%16);
const crc = crcOf(newPlainF);
const out = Buffer.concat([orig.subarray(0,12), Buffer.from([crc]), enc(newPlainF), Buffer.from([crc])]);
if (out.length !== orig.length) throw new Error('SIZE '+out.length+' vs '+orig.length);
fs.writeFileSync(SRC, out);

const back = dec(out.subarray(13,out.length-1)).toString('latin1').split('\r\n');
const row = back.find(l => l.split('\t')[0]==='10').split('\t');
console.log('VERIFY Orc: gem rate=', row[71+3], 'enchantW=', row[143+3]|| 'n/a');
console.log('len', newPlainF.length, 'mod16', newPlainF.length%16, 'crc=0x'+crc.toString(16), 'size='+out.length, 'WROTE from .bak');
