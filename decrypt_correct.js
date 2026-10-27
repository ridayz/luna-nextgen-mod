const crypto = require('crypto');
const fs = require('fs');
const data = fs.readFileSync('H:/Luna NextGen/Data/System/ItemList.bin');

// AES-256 (rounds=14, key len 32). Key parsed via sscanf("%02X") then zero-padded to 32.
function hexParseKey(s) {
  const out = [];
  for (let i = 0; i + 1 < s.length; i += 2) {
    const v = parseInt(s.substr(i, 2), 16);
    if (isNaN(v)) break;
    out.push(v);
  }
  return Buffer.concat([Buffer.from(out), Buffer.alloc(32 - out.length)]);
}

const keyStrings = [
  'E76B2413958B00E193A1',
  'A15H3825287T19G082K8'
];
const keys = keyStrings.map(ks => ({ ks, key: hexParseKey(ks) }));

// payload: from byte 13 to byte 13+2594144 (the trailing CRC byte at filelen-1 is not payload)
const payloadStart = 13;
const payloadLen = 16 * Math.floor((data.length - payloadStart - 1) / 16);
const payload = data.subarray(payloadStart, payloadStart + payloadLen);
console.log('payload len', payloadLen, 'len%16', payloadLen % 16, 'crc head', data[12].toString(16), 'crc tail', data[data.length-1].toString(16));

for (const { ks, key } of keys) {
  try {
    const d = crypto.createDecipheriv('aes-256-ecb', key, null);
    d.setAutoPadding(false);
    const pt = Buffer.concat([d.update(payload), d.final()]);
    const isPrint = b => (b >= 0x20 && b < 0x7f) || b === 9 || b === 10 || b === 13;
    const printable = pt.filter(isPrint).length / pt.length;
    let run = 0; while (run < pt.length && isPrint(pt[run])) run++;
    console.log('key', ks, '->', key.toString('hex'));
    console.log('   print%', (printable * 100).toFixed(1), 'run', run);
    console.log('   head:', JSON.stringify(pt.subarray(0, 160).toString('latin1')));
    if (run > 50) {
      fs.writeFileSync('H:/Luna NextGen/Data/System/ItemList_decrypted.bin', pt);
      fs.writeFileSync('H:/Luna NextGen/Data/System/ItemList_decrypted.txt', pt.toString('latin1'));
      console.log('*** SAVED decrypted');
    }
  } catch (e) { console.log(ks, 'err', e.message); }
}
