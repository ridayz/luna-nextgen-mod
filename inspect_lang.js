const crypto = require('crypto');
const fs = require('fs');
const KEY = Buffer.alloc(32);
const dec = b => { const d=crypto.createDecipheriv('aes-256-ecb',KEY,null); d.setAutoPadding(false); return Buffer.concat([d.update(b),d.final()]); };
function exam(path){
  const b = fs.readFileSync(path);
  const o = { path, len: b.length, h: b.subarray(0,12).toString('hex') };
  const body = b.subarray(13, b.length-1);
  if (body.length % 16 === 0){
    try { const p = dec(body); let pr=0; for(let i=0;i<p.length;i++){const c=p[i]; if((c>=32&&c<127)||c===9||c===10||c===13)pr++;} o.pct=(pr/p.length*100).toFixed(1); o.prev=p.subarray(0,150).toString('latin1'); } catch(e){ o.err=e.message; }
  } else { o.not16 = body.length % 16; }
  return o;
}
[
 'H:/Luna NextGen/Lang/id/System/Resource/NpcList.bin',
 'H:/Luna NextGen/Lang/id/System/Resource/SkillList.bin',
 'H:/Luna NextGen/Lang/id/Data/Interface/Windows/SystemMsg.bin',
 'H:/Luna NextGen/Lang/id/Data/Interface/Windows/ToolTipMsg.bin'
].forEach(f => console.log(JSON.stringify(exam(f))));
