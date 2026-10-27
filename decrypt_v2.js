const crypto = require('crypto');
const fs = require('fs');
const zlib = require('zlib');
const data = fs.readFileSync('H:/Luna NextGen/Data/System/ItemList.bin');
const key = Buffer.from('A15H3825287T19G082K8', 'latin1').subarray(0, 16);
const key2 = Buffer.from('E76B2413958B00E193A1', 'latin1').subarray(0, 16);

// header: d0=737b86df d1=19170 (hex? 0x19170=102512) d2=2594142
console.log('d0', data.readUInt32LE(0).toString(16),
            'd1', data.readUInt32LE(4), 'd1hex', data.readUInt32LE(4).toString(16),
            'd2', data.readUInt32LE(8).toString(16));

function decAll(buf, k) {
  const d = crypto.createDecipheriv('aes-128-ecb', k, null);
  d.setAutoPadding(false);
  const n = buf.length - (buf.length % 16);
  return Buffer.concat([d.update(buf.subarray(0, n)), d.final()]);
}

for (const [name, k] of [['A15H', key], ['E76B', key2]]) {
  for (let off = 0; off <= 16; off++) {
    const pt = decAll(data.subarray(off), k);
    // look for zlib magic 78 9c / 78 da anywhere in first 64 bytes
    const idx = pt.subarray(0, 64).indexOf(Buffer.from([0x78, 0x9c]));
    const printable = pt.filter(b => (b >= 0x20 && b < 0x7f) || b === 10 || b === 13 || b === 9).length;
    if (idx >= 0 || printable > pt.length * 0.5) {
      console.log('HIT', name, 'off', off, 'zlib@', idx, 'printable%', (printable / pt.length * 100).toFixed(1));
      fs.writeFileSync('H:/Luna NextGen/Data/System/ItemList_pt.bin', pt);
      if (idx >= 0) {
        try {
          const out = zlib.inflateSync(pt.subarray(idx));
          fs.writeFileSync('H:/Luna NextGen/Data/System/ItemList_dec.txt', out);
          console.log('*** INFLATED', out.length, JSON.stringify(out.toString('latin1').slice(0, 200)));
        } catch (e) { console.log('inflate err', e.message); }
      }
      process.exit(0);
    }
  }
}
console.log('no hit');
