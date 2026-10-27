const crypto = require('crypto');
const fs = require('fs');
const zlib = require('zlib');
const data = fs.readFileSync('H:/Luna NextGen/Data/System/ItemList.bin');

const keyStr = process.argv[2] || 'A15H3825287T19G082K8';
const keyBits = process.argv[3] ? parseInt(process.argv[2]) : 128;

function hexParseKey(s) {
  const out = [];
  for (let i = 0; i + 1 < s.length; i += 2) {
    const v = parseInt(s.substr(i, 2), 16);
    if (isNaN(v)) break;
    out.push(v);
  }
  return Buffer.from(out);
}

const keyRaw = hexParseKey(keyStr);
// FUN_00426c70 reads key as little-endian dwords: CONCAT31(CONCAT21(*puVar10, *(ptr-1)), *(puVar10-1))
// with puVar10 starting at param_2+2, i.e. dword[j] = k[4j+1]<<24 | k[4j]<<8... let's just also try plain
const keys = [
  Buffer.concat([keyRaw, Buffer.alloc(32 - keyRaw.length)]),   // zero-pad to 32 (AES-256)
];

// try all AES key sizes 16/24/32 by padding
for (const size of [16, 24, 32]) {
  const key = Buffer.concat([keyRaw, Buffer.alloc(size)]);
  for (const off of [13]) {
    const payloadLen = 16 * Math.floor((data.length - off - 1) / 16);
    const payload = data.subarray(off, off + payloadLen);
    try {
      const d = crypto.createDecipheriv('aes-' + size * 8 + '-ecb', key.subarray(0, size), null);
      d.setAutoPadding(false);
      const pt = Buffer.concat([d.update(payload), d.final()]);
      const isPrint = b => (b >= 0x20 && b < 0x7f) || b === 9 || b === 10 || b === 13;
      const printable = pt.filter(isPrint).length / pt.length;
      // zlib check
      let zlibIdx = pt.subarray(0, 64).indexOf(Buffer.from([0x78, 0x9c]));
      if (zlibIdx < 0) zlibIdx = pt.subarray(0, 64).indexOf(Buffer.from([0x78, 0xda]));
      console.log('aes' + (size*8), 'print%', (printable*100).toFixed(1), 'zlib@', zlibIdx,
        'head:', JSON.stringify(pt.subarray(0, 80).toString('latin1')));
      if (printable > 0.5) {
        fs.writeFileSync('H:/Luna NextGen/Data/System/ItemList_dec.bin', pt);
        console.log('*** SAVED plaintext');
      }
      if (zlibIdx >= 0) {
        try {
          const out = zlib.inflateSync(pt.subarray(zlibIdx));
          fs.writeFileSync('H:/Luna NextGen/Data/System/ItemList_dec.bin', out);
          console.log('*** INFLATED', out.length);
        } catch (e) { console.log('inflate fail', e.message); }
      }
    } catch (e) { console.log(size, e.message); }
  }
}
