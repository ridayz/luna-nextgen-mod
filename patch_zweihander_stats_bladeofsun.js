// Patch STATS (tooltip) of Zweihander (11000095) to Blade of the Sun (11007482).
// Columns changed: c22 (atk), c23, c31, c32. Visual (c5) already patched = 202.
// Length-preserving: compensate delta on last line. CRC recomputed.
const crypto=require('crypto'),fs=require('fs');
const K=Buffer.alloc(32);
const dec=b=>{const d=crypto.createDecipheriv('aes-256-ecb',K,null);d.setAutoPadding(false);return Buffer.concat([d.update(b),d.final()]);};
const enc=b=>{const c=crypto.createCipheriv('aes-256-ecb',K,null);c.setAutoPadding(false);return Buffer.concat([c.update(b),c.final()]);};
const SRC='H:/Luna NextGen/System/Resource/ItemList.bin';
const orig=fs.readFileSync(SRC);
const initCrc=orig.readUInt32LE(4)&0xff;
const crcOf=p=>{let s=initCrc;for(let i=0;i<p.length;i++)s=(s+p[i])&0xff;return s;};
const plain=dec(orig.subarray(13,orig.length-1)).toString('latin1');
const lines=plain.split('\r\n');
const idx=lines.findIndex(l=>l.split('\t')[0]==='11000095');
if(idx<0)throw new Error('Zweihander not found');
const TARGET=lines.find(l=>l.split('\t')[0]==='11007482');
if(!TARGET)throw new Error('Blade of the Sun not found');
const tv=TARGET.split('\t');
const c=lines[idx].split('\t');
console.log('BEFORE: atk(c22)='+c[22]+' c23='+c[23]+' c31='+c[31]+' c32='+c[32]);
const cols=[22,23,31,32];
let delta=0;
for(const i of cols){
  const old=String(c[i]);const neu=String(tv[i]);
  delta+=neu.length-old.length;
  c[i]=neu;
}
lines[idx]=c.join('\t');
let np=lines.join('\r\n');
if(delta!==0){
  const last=lines.length-1;
  if(delta>0){let need=delta;while(need>0&&lines[last].length>0){lines[last]=lines[last].slice(0,-1);need--;}}
  else lines[last]+='\t'.repeat(-delta);
  np=lines.join('\r\n');
}
const fp=Buffer.from(np,'latin1');
if(fp.length!==plain.length)throw new Error('LEN '+fp.length+' vs '+plain.length);
if(fp.length%16!==0)throw new Error('mult16 '+fp.length%16);
const crc=crcOf(fp);
const out=Buffer.concat([orig.subarray(0,12),Buffer.from([crc]),enc(fp),Buffer.from([crc])]);
if(out.length!==orig.length)throw new Error('SIZE '+out.length);
fs.writeFileSync(SRC,out);
const back=dec(out.subarray(13,out.length-1)).toString('latin1').split('\r\n');
const r=back.find(l=>l.split('\t')[0]==='11000095').split('\t');
console.log('AFTER: atk(c22)='+r[22]+' c23='+r[23]+' c31='+r[31]+' c32='+r[32]);
console.log('len',fp.length,'crc=0x'+crc.toString(16),'size='+out.length,'WROTE');
