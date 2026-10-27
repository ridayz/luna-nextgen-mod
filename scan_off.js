const crypto = require('crypto'), fs = require('fs');
const data = fs.readFileSync('H:/Luna NextGen/Data/System/ItemList.bin');
const key = Buffer.from('A15H3825287T19G082K8', 'latin1').subarray(0, 16);
function decMany(buf, k) {
  const d = crypto.createDecipheriv('aes-128-ecb', k, null);
  d.setAutoPadding(false);
  const n = buf.length - (buf.length % 16);
  return Buffer.concat([d.update(buf.subarray(0, n)), d.final()]);
}
for (let off = 0; off < 64; off++) {
  const pt = decMany(data.subarray(off), key);
  const has78 = pt.subarray(0, 128).indexOf(0x78);
  let zero = 0; for (let i = 0; i < 200; i++) if (pt[i] === 0) zero++;
  const s = pt.toString('latin1').slice(0, 100).replace(/[^\x20-\x7e\n\r\t]/g, '.');
  console.log('off', off, 'zlib@', has78, 'zero200', zero, '|', JSON.stringify(s));
}
