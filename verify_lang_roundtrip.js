// Verify the Lang .bin files use the same [12B header][1B crc][cipher][1B crc]
// layout + crc formula as ItemList. Confirm crc byte matches before patching.
const crypto = require('crypto');
const fs = require('fs');
const KEY = Buffer.alloc(32);
const dec = b => { const d=crypto.createDecipheriv('aes-256-ecb',KEY,null); d.setAutoPadding(false); return Buffer.concat([d.update(b),d.final()]); };
const enc = b => { const c=crypto.createCipheriv('aes-256-ecb',KEY,null); c.setAutoPadding(false); return Buffer.concat([c.update(b),c.final()]); };

function verify(path){
  const b = fs.readFileSync(path);
  const body = b.subarray(13, b.length-1);
  const crcByteStart = b[12];       // byte before ciphertext
  const crcByteEnd = b[b.length-1]; // byte after ciphertext
  const plain = dec(body);
  // initCrc = low byte of uint32 at offset 4 (as in ItemList script)
  const initCrc = b.readUInt32LE(4) & 0xff;
  let s = initCrc;
  for (let i=0;i<plain.length;i++) s = (s + plain[i]) & 0xff;
  const calc = s;
  return {
    path,
    len: b.length,
    crcByteStart, crcByteEnd,
    initCrc,
    calc,
    crcStartMatch: crcByteStart === calc,
    crcEndMatch: crcByteEnd === calc
  };
}
[
 'H:/Luna NextGen/Lang/id/System/Resource/NpcList.bin',
 'H:/Luna NextGen/Lang/id/Data/Interface/Windows/SystemMsg.bin',
 'H:/Luna NextGen/Lang/id/Data/Interface/Windows/ToolTipMsg.bin',
 'H:/Luna NextGen/Lang/id/System/Resource/SkillList.bin'
].forEach(f => console.log(JSON.stringify(verify(f))));
