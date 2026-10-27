const crypto = require('crypto');
const fs = require('fs');
const data = fs.readFileSync('H:/Luna NextGen/Data/System/ItemList.bin');
const key = Buffer.from('A15H3825287T19G082K8', 'latin1').subarray(0, 16);
const key2 = Buffer.from('E76B2413958B00E193A1', 'latin1').subarray(0, 16);

function dec16(buf, off, k) {
  const d = crypto.createDecipheriv('aes-128-ecb', k, null);
  d.setAutoPadding(false);
  return Buffer.concat([d.update(buf.subarray(off, off + 16)), d.final()]);
}

const isPrint = b => (b >= 0x20 && b < 0x7f) || b === 9 || b === 10 || b === 13;
for (let off = 0; off <= 64; off++) {
  for (const [kn, k] of [['A15H', key], ['E76B', key2]]) {
    try {
      const pt = dec16(data, off, k);
      const p = pt.filter(isPrint).length;
      if (p >= 12 || pt[0] === 0x78 || pt.readUInt32LE(0) === 0x9c78) {
        console.log('CANDIDATE off', off, kn, pt.toString('hex'), JSON.stringify(pt.toString('latin1')));
      }
    } catch (e) {}
  }
}
console.log('scan done');
