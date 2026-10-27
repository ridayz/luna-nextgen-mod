const crypto = require('crypto');
const fs = require('fs');
const data = fs.readFileSync('H:/Luna NextGen/Data/System/ItemList.bin');
const crcByte = data[12];
console.log('crc byte:', crcByte.toString(16), 'filesize:', data.length);

const keyStrings = ['E76B2413958B00E193A1', 'A15H3825287T19G082K8', 'w8pln4lU5Z2yPYwLTq1BcICOQ0zPkxRP16AuZuJ53lcRfr7ISecijCvirSShXPj3sFqjArCH'];
function hexParseUntilFail(s) {
  const out = [];
  for (let i = 0; i + 1 < s.length; i += 2) {
    const v = parseInt(s.substr(i, 2), 16);
    if (isNaN(v)) break;
    out.push(v);
  }
  return Buffer.from(out);
}
const cands = [];
for (const ks of keyStrings) {
  const ascii = Buffer.from(ks, 'latin1');
  cands.push(['ascii16 ' + ks.slice(0, 10), ascii.subarray(0, 16)]);
  if (ascii.length >= 24) cands.push(['ascii24 ' + ks.slice(0, 10), ascii.subarray(0, 24)]);
  if (ascii.length >= 32) cands.push(['ascii32 ' + ks.slice(0, 10), ascii.subarray(0, 32)]);
  cands.push(['hexUF ' + ks.slice(0, 10), hexParseUntilFail(ks)]);
  cands.push(['sha256 ' + ks.slice(0, 10), crypto.createHash('sha256').update(ks).digest()]);
  cands.push(['md5 ' + ks.slice(0, 10), crypto.createHash('md5').update(ks).digest()]);
}
cands.push(['zeros', Buffer.alloc(16)]);

const isPrint = b => (b >= 0x20 && b < 0x7f) || b === 9 || b === 10 || b === 13 || b === 0;
for (const [name, key] of cands) {
  if (key.length < 16) continue;
  const bits = key.length * 8;
  for (let off = 12; off <= 14; off++) {
    try {
      const d = crypto.createDecipheriv('aes-' + bits + '-ecb', key, null);
      d.setAutoPadding(false);
      const pt = Buffer.concat([d.update(data.subarray(off)), d.final()]);
      const printable = pt.filter(isPrint).length / pt.length;
      // find contiguous printable run at start
      let run = 0; while (run < pt.length && isPrint(pt[run])) run++;
      if (printable > 0.6 || run > 100) {
        console.log('*** HIT', name, bits, 'off', off, 'print%', (printable * 100).toFixed(1), 'run', run);
        console.log('   ', JSON.stringify(pt.subarray(0, 300).toString('latin1')));
        fs.writeFileSync('H:/Luna NextGen/Data/System/ItemList_plain.bin', pt);
      }
    } catch (e) {}
  }
}
console.log('done');
