// CLIENT-SIDE TEXT PATCH (server does not validate these names).
// Target: NpcList.bin (Indonesian). Change NPC id 1 name "Pandai^sBesi" ->
// "Lucif^sTest" (same 11-char length so total file size is unchanged), then
// re-encrypt with the same AES key + CRC layout proven on ItemList.
const crypto = require('crypto');
const fs = require('fs');
const KEY = Buffer.alloc(32);
const dec = b => { const d=crypto.createDecipheriv('aes-256-ecb',KEY,null); d.setAutoPadding(false); return Buffer.concat([d.update(b),d.final()]); };
const enc = b => { const c=crypto.createCipheriv('aes-256-ecb',KEY,null); c.setAutoPadding(false); return Buffer.concat([c.update(b),c.final()]); };

const SRC = 'H:/Luna NextGen/Lang/id/System/Resource/NpcList.bin';
const BAK = SRC + '.bak';
const orig = fsRead(SRC);
if (!fsExists(BAK)) fsWrite(BAK, orig);

const initCrc = orig.readUInt32LE(4) & 0xff;
const crcOf = p => { let s=initCrc; for(let i=0;i<p.length;i++) s=(s+p[i])&0xff; return s; };

const body = orig.subarray(13, orig.length-1);
const plain = dec(body).toString('latin1');

const oldName = 'Pandai^sBesi';
const newName = 'Lucif^sTestX'; // 12 char to match Pandai^sBesi
if (oldName.length !== newName.length) throw new Error('length mismatch');
if (!plain.includes(oldName)) throw new Error('old name not found in NpcList');

const newPlain = Buffer.from(plain.split(oldName).join(newName), 'latin1');
if (newPlain.length !== plain.length) throw new Error('TOTAL LEN MISMATCH');

const crc = crcOf(newPlain);
const out = Buffer.concat([orig.subarray(0,12), Buffer.from([crc]), enc(newPlain), Buffer.from([crc])]);
if (out.length !== orig.length) throw new Error('SIZE MISMATCH '+out.length+' vs '+orig.length);
fsWrite(SRC, out);

// verify
const back = dec(out.subarray(13,out.length-1)).toString('latin1');
const line = back.split('\r\n').find(l => l.startsWith('1\t'));
console.log('VERIFY NPC1:', line.split('\t')[1]);
console.log('crc=0x'+crc.toString(16), 'size='+out.length, 'WROTE', SRC);

function fsRead(p){ return fs.readFileSync(p); }
function fsWrite(p,b){ fs.writeFileSync(p,b); }
function fsExists(p){ return fs.existsSync(p); }
