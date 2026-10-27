// Set level requirement (col14) of all dagger/knife items to 100 as a client-side visibility test.
const crypto = require('crypto');
const fs = require('fs');

const SRC = 'H:/Luna NextGen/Data/System/ItemList.bin';
const BAK = 'H:/Luna NextGen/Data/System/ItemList.bin.bak';
const KEY = Buffer.alloc(32);
const NEW_LEVEL = process.argv[2] || '100';

function aesDec(buf){ const d=crypto.createDecipheriv('aes-256-ecb',KEY,null); d.setAutoPadding(false); return Buffer.concat([d.update(buf),d.final()]); }
function aesEnc(buf){ const c=crypto.createCipheriv('aes-256-ecb',KEY,null); c.setAutoPadding(false); return Buffer.concat([c.update(buf),c.final()]); }

const orig = fs.readFileSync(SRC);
if (!fs.existsSync(BAK)) fs.writeFileSync(BAK, orig);
const initCrc = orig.readUInt32LE(4) & 0xff;
function crcOf(p){ let s=initCrc; for(let i=0;i<p.length;i++) s=(s+p[i])&0xff; return s; }

const plain = aesDec(orig.subarray(13, orig.length-1));
const text = plain.toString('latin1');
const hadTrailing = text.endsWith('\r\n');
let lines = text.split('\r\n');
if (hadTrailing && lines[lines.length-1]==='') lines.pop();

const DAGGER_RE = /Dagger|Knife|Kukri|Dirk|Gauche|Poniard/i;
let n=0;
const before=[];
const out2 = lines.map(rec=>{
  const p = rec.split('\t');
  if (p.length>30 && DAGGER_RE.test(p[1]||'')) {
    before.push(p[0]+' "'+p[1]+'" col14 '+p[14]+'->'+NEW_LEVEL);
    p[14] = NEW_LEVEL;
    n++;
  }
  return p.join('\t');
});
console.log('dagger/knife rows changed:', n);
console.log(before.slice(0,6).join('\n'));

let np = out2.join('\r\n'); if (hadTrailing) np += '\r\n';
const newPlain = Buffer.from(np,'latin1');
if (newPlain.length !== plain.length) throw new Error('LEN MISMATCH '+plain.length+' '+newPlain.length);

const newCrc = crcOf(newPlain);
const newCipher = aesEnc(newPlain);
const out = Buffer.concat([orig.subarray(0,12), Buffer.from([newCrc]), newCipher, Buffer.from([newCrc])]);
if (out.length !== orig.length) throw new Error('SIZE MISMATCH');
fs.writeFileSync(SRC, out);

const back = aesDec(out.subarray(13, out.length-1));
const row = back.toString('latin1').split('\r\n').find(l=>/^\d+\tDagger\t/.test(l));
console.log('\nVERIFY Dagger row:', row ? row.split('\t').slice(0,16).join('\t') : 'not found');
console.log('crc:', newCrc.toString(16), 'WROTE', SRC);
