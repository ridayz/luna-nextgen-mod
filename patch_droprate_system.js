// Patch System\Resource\MonsterList.bin (the file the game actually reads).
// Set EVERY rare/special drop rate for ALL monsters to a small value (10)
// = high drop frequency (smaller number = more often, per observed data:
// common items carry large rates like 1.5M-35M, rare carry small ones). Keep
// file size + encrypt + CRC.
const crypto = require('crypto');
const fs = require('fs');
const KEY = Buffer.alloc(32);
const dec = b => { const d=crypto.createDecipheriv('aes-256-ecb',KEY,null); d.setAutoPadding(false); return Buffer.concat([d.update(b),d.final()]); };
const enc = b => { const c=crypto.createCipheriv('aes-256-ecb',KEY,null); c.setAutoPadding(false); return Buffer.concat([c.update(b),c.final()]); };

const SRC = 'H:/Luna NextGen/System/Resource/MonsterList.bin';
const BAK = SRC + '.bak';
const orig = fs.readFileSync(SRC);
if (!fs.existsSync(BAK)) fs.writeFileSync(BAK, orig);
const initCrc = orig.readUInt32LE(4) & 0xff;
const crcOf = p => { let s=initCrc; for(let i=0;i<p.length;i++) s=(s+p[i])&0xff; return s; };

const plain = dec(orig.subarray(13, orig.length-1)).toString('latin1');
const lines = plain.split('\r\n');

const VALUE = '1';   // percent = 1/N per in-game display (e.g. 0.1% = 1/1k) -> 1 = 100%
// user wants ALL drop rates raised (uncommon, very rare, ultra rare, everything)
// -> remove the RARE filter and set every drop group rate to 10.
let changed = 0, monsters = 0;
for (let li=0; li<lines.length; li++){
  const c = lines[li].split('\t');
  if (!/^\d+$/.test(c[0]||'')) continue;
  monsters++;
  for (let i=67; i+3<c.length; i+=4){
    const name=(c[i]||'');
    if(name && name!=='0' && /^\d+$/.test(c[i+3]||'')) { c[i+3] = VALUE; changed++; }
  }
  lines[li] = c.join('\t');
}
console.log('monsters scanned:', monsters, 'rare groups changed:', changed);

let np = lines.join('\r\n');
const newPlain = Buffer.from(np,'latin1');
const diff = plain.length - newPlain.length;
const last = lines.length-1;
if (diff>0) lines[last] += '\t'.repeat(diff);
else if (diff<0) {let need=-diff; while(need>0&&lines[last].length>0){lines[last]=lines[last].slice(0,-1);need--;}}
np = lines.join('\r\n');
const finalPlain = Buffer.from(np,'latin1');
if (finalPlain.length !== plain.length) throw new Error('LEN '+finalPlain.length+' vs '+plain.length);
if (finalPlain.length%16!==0) throw new Error('not mult16 '+finalPlain.length%16);
const crc = crcOf(finalPlain);
const out = Buffer.concat([orig.subarray(0,12), Buffer.from([crc]), enc(finalPlain), Buffer.from([crc])]);
if (out.length !== orig.length) throw new Error('SIZE '+out.length+' vs '+orig.length);
fs.writeFileSync(SRC, out);
const back = dec(out.subarray(13,out.length-1)).toString('latin1').split('\r\n');
const r = back.find(l=>l.split('\t')[0]==='1').split('\t');
console.log('VERIFY Fungus: gem rate=', r[74], 'enchantW=', r[146]);
console.log('len', finalPlain.length, 'mod16', finalPlain.length%16, 'crc=0x'+crc.toString(16), 'size='+out.length, 'WROTE');
