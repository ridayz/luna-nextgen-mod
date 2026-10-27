// Change Bone Armor (12000063) visual model (col5) from 641 to Panda Costume (1072).
// Only col5 (visual model) is changed; all stats preserved. Keep file size.
const crypto=require('crypto'),fs=require('fs');
const KEY=Buffer.alloc(32);
const dec=b=>{const d=crypto.createDecipheriv('aes-256-ecb',KEY,null);d.setAutoPadding(false);return Buffer.concat([d.update(b),d.final()]);};
const enc=b=>{const c=crypto.createCipheriv('aes-256-ecb',KEY,null);c.setAutoPadding(false);return Buffer.concat([c.update(b),c.final()]);};
const SRC='H:/Luna NextGen/System/Resource/ItemList.bin';
const BAK=SRC+'.bak';
const orig=fs.readFileSync(SRC);
if(!fs.existsSync(BAK))fs.writeFileSync(BAK,orig);
const initCrc=orig.readUInt32LE(4)&0xff;
const crcOf=p=>{let s=initCrc;for(let i=0;i<p.length;i++)s=(s+p[i])&0xff;return s;};
const plain=dec(orig.subarray(13,orig.length-1)).toString('latin1');
const lines=plain.split('\r\n');
const idx=lines.findIndex(l=>l.split('\t')[0]==='12000063');
if(idx<0)throw new Error('Bone Armor not found');
const c=lines[idx].split('\t');
console.log('BEFORE col5=',c[5],' name=',c[1]);
c[5]='1072'; // Panda Costume visual model
console.log('AFTER col5=',c[5]);
lines[idx]=c.join('\t');
let np=lines.join('\r\n');
const newPlain=Buffer.from(np,'latin1');
const diff=plain.length-newPlain.length;
const last=lines.length-1;
if(diff>0)lines[last]+='\t'.repeat(diff);
else if(diff<0){let need=-diff;while(need>0&&lines[last].length>0){lines[last]=lines[last].slice(0,-1);need--;}}
np=lines.join('\r\n');
const fp=Buffer.from(np,'latin1');
if(fp.length!==plain.length)throw new Error('LEN '+fp.length+' vs '+plain.length);
if(fp.length%16!==0)throw new Error('not mult16 '+fp.length%16);
const crc=crcOf(fp);
const out=Buffer.concat([orig.subarray(0,12),Buffer.from([crc]),enc(fp),Buffer.from([crc])]);
if(out.length!==orig.length)throw new Error('SIZE '+out.length+' vs '+orig.length);
fs.writeFileSync(SRC,out);
const back=dec(out.subarray(13,out.length-1)).toString('latin1').split('\r\n');
const r=back.find(l=>l.split('\t')[0]==='12000063').split('\t');
console.log('VERIFY BoneArmor col5=',r[5],'name:',r[1]);
console.log('len',fp.length,'mod16',fp.length%16,'crc=0x'+crc.toString(16),'size='+out.length,'WROTE');
