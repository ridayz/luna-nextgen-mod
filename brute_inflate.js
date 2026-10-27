const crypto = require('crypto');
const fs = require('fs');
const zlib = require('zlib');
const data = fs.readFileSync('H:/Luna NextGen/Data/System/ItemList.bin');

const off = 13;
const payloadLen = 16 * Math.floor((data.length - off - 1) / 16);
const payload = data.subarray(off, off + payloadLen);

const keyStrings = [
  'E76B2413958B00E193A1',
  'A15H3825287T19G082K8',
  'EA59017F5D523850EFDDB4C49C7',
  '3FF032E82E955C41565AC84314882E1E6823',
  'w8pln4lU5Z2yPYwLTq1BcICOQ0zPkxRP16AuZuJ53lcRfr7ISecijCvirSShXPj3sFqjArCH',
];
function hexParse(s) {
  const out = [];
  for (let i = 0; i + 1 < s.length; i += 2) {
    const v = parseInt(s.substr(i, 2), 16);
    if (isNaN(v)) break;
    out.push(v);
  }
  return Buffer.from(out);
}
function dwordSwap(k) { // read key as little-endian dwords (byte revert within each 4)
  const o = Buffer.from(k);
  for (let i = 0; i + 3 < k.length; i += 4) {
    const a=o[i],b=o[i+1],c=o[i+2],d=o[i+3]; o[i]=d;o[i+1]=c;o[i+2]=b;o[i+3]=a;
  }
  return o;
}
const keys = [];
for (const ks of keyStrings) {
  const raw = hexParse(ks);
  for (const size of [16, 24, 32]) {
    if (raw.length > size) continue;
    keys.push(['aes'+(size*8)+' '+ks.slice(0,8), Buffer.concat([raw, Buffer.alloc(size)])]);
    keys.push(['aes'+(size*8)+' dw '+ks.slice(0,8), Buffer.concat([dwordSwap(raw), Buffer.alloc(size)])]);
  }
  // ascii bytes
  const ascii = Buffer.from(ks, 'latin1');
  keys.push(['aes256 ascii '+ks.slice(0,8), Buffer.concat([ascii, Buffer.alloc(32)]).subarray(0,32)]);
}

let tried = 0;
for (const [name, key] of keys) {
  const size = key.length;
  try {
    const d = crypto.createDecipheriv('aes-' + size * 8 + '-ecb', key.subarray(0,size), null);
    d.setAutoPadding(false);
    let pt = Buffer.concat([d.update(payload), d.final()]);
    tried++;
    // try inflate at various sub-offsets (compression may start after a prefix)
    for (let z = 0; z < pt.length - 2; z++) {
      const b0 = pt[z], b1 = pt[z+1];
      if ((b0 & 0x0f) === 8 && ((b0>>4)===1||(b0>>4)===2||(b0>>4)===3) && z < 64) {
        try {
          const out = zlib.inflateSync(pt.subarray(z));
          const s = out.toString('latin1');
          const hasItems = /ItemList|Item|weapon|sword|dagger|ARMOR|STR|INT/i.test(s);
          if (s.length > 500 && hasItems) {
            console.log('*** INFLATE HIT', name, 'zlib@', z, 'len', out.length);
            fs.writeFileSync('H:/Luna NextGen/Data/System/ItemList_dec.bin', pt);
            fs.writeFileSync('H:/Luna NextGen/Data/System/ItemList_decrypted.txt', s);
            process.exit(0);
          }
        } catch (e) {}
      }
    }
    // also check direct readability
    const txt = pt.toString('latin1');
    if (/ItemList|Item|sword|dagger/.test(txt.substring(0, 5000))) {
      console.log('*** PVAL HIT', name); fs.writeFileSync('H:/Luna NextGen/Data/System/ItemList_dec.bin', pt); process.exit(0);
    }
  } catch (e) {}
}
console.log('done tried', tried, 'no inflation hit (or compressed differently)');
// fallback: report printable% of first candidate so we see something
if (keys.length) {
  try { const d=crypto.createDecipheriv('aes-256-ecb', keys[0][1], null); d.setAutoPadding(false);
    const pt=Buffer.concat([d.update(payload), d.final()]);
    console.log('first key head:', JSON.stringify(pt.subarray(0,64).toString('latin1'))); } catch(e){}
}
