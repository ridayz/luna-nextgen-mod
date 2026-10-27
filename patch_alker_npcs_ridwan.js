// Patch System\Resource\StaticNpc.bin (the file the game actually reads -
// confirmed via LunaClient.exe string "System/Resource/StaticNpc.bin").
// Rename EVERY NPC in Pelabuhan Alker (map col0 == 20) to "Ridwan", skipping
// portal/map markers (type col1 == 31). Keep total file size identical by
// compensating length deltas on the last line (which has NUL padding). Re-encrypt.
const crypto = require('crypto');
const fs = require('fs');
const KEY = Buffer.alloc(32);
const dec = b => { const d=crypto.createDecipheriv('aes-256-ecb',KEY,null); d.setAutoPadding(false); return Buffer.concat([d.update(b),d.final()]); };
const enc = b => { const c=crypto.createCipheriv('aes-256-ecb',KEY,null); c.setAutoPadding(false); return Buffer.concat([c.update(b),c.final()]); };

const SRC = 'H:/Luna NextGen/System/Resource/StaticNpc.bin';
const BAK = SRC + '.bak';
const orig = fs.readFileSync(SRC);
if (!fs.existsSync(BAK)) fs.writeFileSync(BAK, orig);
const initCrc = orig.readUInt32LE(4) & 0xff;
const crcOf = p => { let s=initCrc; for(let i=0;i<p.length;i++) s=(s+p[i])&0xff; return s; };

const plain = dec(orig.subarray(13, orig.length-1)).toString('latin1');
const lines = plain.split('\r\n');

let changed = 0, saved_len = 0;
for (let li=0; li<lines.length; li++){
  const c = lines[li].split('\t');
  if (c.length < 3) continue;
  if (c[0] === '20' && c[1] !== '31') {
    const old = c[2];
    saved_len += (old.length - 'Ridwan'.length);
    c[2] = 'Ridwan';
    lines[li] = c.join('\t');
    changed++;
  }
}
console.log('renamed NPCs (map20):', changed, 'net delta:', saved_len);

let np = lines.join('\r\n');
const newPlain = Buffer.from(np, 'latin1');
const diff = plain.length - newPlain.length; // + means we need to add back
const last = lines.length - 1;
if (diff > 0) lines[last] += '\t'.repeat(diff);
else if (diff < 0) { let need=-diff; while(need>0 && lines[last].length>0){ lines[last]=lines[last].slice(0,-1); need--; } }
np = lines.join('\r\n');
const newPlainF = Buffer.from(np, 'latin1');
if (newPlainF.length !== plain.length) throw new Error('LEN MISMATCH '+newPlainF.length+' vs '+plain.length);
if (newPlainF.length % 16 !== 0) throw new Error('NOT MULT16 '+newPlainF.length%16);
const crc = crcOf(newPlainF);
const out = Buffer.concat([orig.subarray(0,12), Buffer.from([crc]), enc(newPlainF), Buffer.from([crc])]);
if (out.length !== orig.length) throw new Error('SIZE '+out.length+' vs '+orig.length);
fs.writeFileSync(SRC, out);

const back = dec(out.subarray(13,out.length-1)).toString('latin1').split('\r\n');
const z = back.find(l => /^20\t1\t/.test(l));
console.log('VERIFY first Alker NPC:', z);
console.log('len', newPlainF.length, 'mod16', newPlainF.length%16, 'crc=0x'+crc.toString(16), 'size='+out.length, 'WROTE');
