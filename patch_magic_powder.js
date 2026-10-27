// Make Magic Powder (30000097) behave like Pukerian's Scroll (enchant material):
// copy the behavioral-signature columns from Pukerian's Scroll, keep ID/name.
const crypto = require('crypto');
const fs = require('fs');

const SRC = 'H:/Luna NextGen/Data/System/ItemList.bin';
const PT  = 'H:/Luna NextGen/Data/System/ItemList_dec.bin'; // plaintext of CURRENT bin (dagger->sword applied)
const BAK = 'H:/Luna NextGen/Data/System/ItemList.bin.bak';
const KEY = Buffer.alloc(32);

function aesDec(buf){ const d=crypto.createDecipheriv('aes-256-ecb',KEY,null); d.setAutoPadding(false); return Buffer.concat([d.update(buf),d.final()]); }
function aesEnc(buf){ const c=crypto.createCipheriv('aes-256-ecb',KEY,null); c.setAutoPadding(false); return Buffer.concat([c.update(buf),c.final()]); }

const orig = fs.readFileSync(SRC);
const d1 = orig.readUInt32LE(4);
const initCrc = d1 & 0xff;
function crcOf(p){ let s=initCrc; for(let i=0;i<p.length;i++) s=(s+p[i])&0xff; return s; }

// fresh decrypt of current on-disk bin
const plain = aesDec(orig.subarray(13, orig.length-1));
const text = plain.toString('latin1');
const hadTrailing = text.endsWith('\r\n');
let lines = text.split('\r\n');
if (hadTrailing && lines[lines.length-1]==='') lines.pop();

let count=0, report=[];
const newLines = lines.map(rec=>{
  const parts = rec.split('\t');
  if (parts.length>68 && parts[0]==='30000097') {
    // copy behavioral columns from Pukerian's Scroll (30000547)
    parts[9]='1';
    parts[11]='5';
    parts[51]='36005';
    parts[53]='3';
    parts[68]='41301';
    count++;
    report = parts;
  }
  return parts.join('\t');
});
console.log('Magic Powder rows patched:', count);
console.log('patched row ->', report.slice(0,10).join('\t'),'... col9='+report[9],'col11='+report[11],'col51='+report[51],'col53='+report[53],'col68='+report[68]);

let newPlainStr = newLines.join('\r\n');
if (hadTrailing) newPlainStr += '\r\n';
const newPlain = Buffer.from(newPlainStr,'latin1');
console.log('length before/after:', plain.length, newPlain.length);
if (newPlain.length !== plain.length) throw new Error('LENGTH MISMATCH '+plain.length+' vs '+newPlain.length);

const newCrc = crcOf(newPlain);
const newCipher = aesEnc(newPlain);
const out = Buffer.concat([orig.subarray(0,12), Buffer.from([newCrc]), newCipher, Buffer.from([newCrc])]);
console.log('new crc:', newCrc.toString(16), 'size:', out.length, '(orig', orig.length+')');
if (out.length !== orig.length) throw new Error('OUT SIZE MISMATCH');

if (!fs.existsSync(BAK)) fs.writeFileSync(BAK, orig);
fs.writeFileSync(SRC, out);

// verify by decrypt
const back = aesDec(out.subarray(13, out.length-1));
const bLines = back.toString('latin1').split('\r\n');
const row = bLines.find(l=>l.startsWith('30000097\t'));
const c = row.split('\t');
console.log('\nVERIFY re-decrypt Magic Powder row: col9='+c[9]+' col11='+c[11]+' col51='+c[51]+' col53='+c[53]+' col68='+c[68]);
console.log('name still:', c[1]);
console.log('WROTE', SRC);
