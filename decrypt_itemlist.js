const crypto = require('crypto');
const fs = require('fs');

const data = fs.readFileSync('H:/Luna NextGen/Data/System/ItemList.bin');
const header = data.subarray(0, 12);
const d0 = data.readUInt32LE(0), d1 = data.readUInt32LE(4), d2 = data.readUInt32LE(8);
console.log('header:', d0.toString(16), d1, d2, 'filesize', data.length);

const keys = ['A15H3825287T19G082K8', 'E76B2413958B00E193A1'];
for (const ks of keys) {
  for (const k of [Buffer.from(ks, 'latin1').subarray(0, 16),
                   Buffer.from(ks + '\0\0\0\0', 'latin1').subarray(0, 16),
                   Buffer.from(ks.padEnd(24, '\0'), 'latin1').subarray(0, 24)]) {
    const bits = k.length * 8;
    try {
      const d = crypto.createDecipheriv('aes-' + bits + '-ecb', k, null);
      d.setAutoPadding(false);
      const payload = data.subarray(13, 13 + d2);
      const pt = Buffer.concat([d.update(payload), d.final()]);
      const s = pt.toString('latin1');
      const hits = (s.match(/[A-Za-z]{6,}/g) || []).length;
      console.log(bits + 'bit key=' + ks + ' printable-words:', hits,
        'first200:', JSON.stringify(s.slice(0, 200)));
      if (hits > 50) {
        fs.writeFileSync('H:/Luna NextGen/Data/System/ItemList_decrypted.bin', pt);
        fs.writeFileSync('H:/Luna NextGen/Data/System/ItemList_decrypted.txt', s);
        console.log('*** FULL DECRYPT SAVED, key len', k.length);
      }
    } catch (e) { console.log(bits, ks, 'err', e.message); }
  }
}
