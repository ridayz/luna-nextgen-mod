// Scan every file under Lang\id that uses the shared AES key. Decrypt, classify
// content type (item/skill/npc/msg/title), and report which are ordinary
// plaintext data (moddable patch targets) vs binary junk. Output a manifest.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const KEY = Buffer.alloc(32);
const dec = b => { const d=crypto.createDecipheriv('aes-256-ecb',KEY,null); d.setAutoPadding(false); return Buffer.concat([d.update(b),d.final()]); };

const ROOT = 'H:/Luna NextGen/Lang/id';
const results = [];

function walk(dir){
  for (const e of fs.readdirSync(dir, {withFileTypes:true})){
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.bin$/i.test(e.name)) results.push(full);
  }
}
walk(ROOT);

const out = [];
for (const f of results){
  try {
    const b = fs.readFileSync(f);
    if (b.length < 15) { out.push({file: f.replace(ROOT,''), size:b.length, note:'too small'}); continue; }
    const body = b.subarray(13, b.length-1);
    if (body.length % 16 !== 0) { out.push({file:f.replace(ROOT,''), size:b.length, note:'not mult16'}); continue; }
    const p = dec(body);
    // printable ratio
    let pr=0; for(let i=0;i<p.length;i++){const c=p[i]; if((c>=32&&c<127)||c===9||c===10||c===13)pr++;}
    const pct = (pr/p.length*100).toFixed(0);
    // first non-empty line words
    const firstLine = p.toString('latin1').split('\r\n').find(l=>l.trim()!=='');
    out.push({file: f.replace(ROOT,''), size:b.length, pct:+pct, first: (firstLine||'').slice(0,80)});
  } catch(e){ out.push({file:f.replace(ROOT,''), err:e.message}); }
}
console.log(JSON.stringify(out, null, 1));
