// Change visual model of Zweihander (11000095) to Blade of the Sun (11000182's visual 202).
// Only col5 (visual model) changes; all stats stay. File size + encrypt + CRC preserved.
const crypto=require('crypto'),fs=require('fs');
const K=Buffer.alloc(32);
const dec=b=>{const d=crypto.createDecipheriv('aes-256-ecb',K,null);d.setAutoPadding(false);return Buffer.concat([d.update(b),d.final()]);};
const enc=b=>{const c=crypto.createCipheriv('aes-256-ecb',K,null);c.setAutoPadding(false);return Buffer.concat([c.update(b),c.final()]);};
const SRC='H:/Luna NextGen/System/Resource/ItemList.bin';
const BAK=SRC+'.bak';
const orig=fs.readFileSync(SRC);
if(!fs.existsSync(BAK)) fs.writeFileSync(BAK,orig);
const initCrc=orig.readUInt32LE(4)&0xff;
const crcOf=p=>{let s=initCrc;for(let i=0;i<p.length;i++)s=(s+p[i])&0xff;return s;};
const plain=dec(orig.subarray(13,orig.length-1)).toString('latin1');
const lines=plain.split('\r\n');
const idx=lines.findIndex(l=>l.split('\t')[0]==='11000095');
if(idx<0)throw new Error('Zweihander not found');
const c=lines[idx].split('\t');
console.log('BEFORE: id='+c[0]+' name='+c[1]+' col5(visual)='+c[5]);
const TARGET=lines.find(l=>l.split('\t')[0]==='11007482');
if(!TARGET)throw new Error('Blade of the Sun (11007482) not found');
const tv=TARGET.split('\t');
console.log('TARGET visual col5='+tv[5]+' name='+tv[1]);
if(c[5]===tv[5]){console.log('already same');}
else{
  const old=String(c[5]);const neu=String(tv[5]);
  const delta=neu.length-old.length;
  c[5]=neu;
  lines[idx]=c.join('\t');
  let np=lines.join('\r\n');
  if(delta!==0){
    // compensate on last line
    const last=lines.length-1;
    if(delta>0)lines[last]+='\t'.repeat(delta);
    else{let need=-delta;while(need>0&&lines[last].length>0){lines[last]=lines[last].slice(0,-1);need--;}}
    np=lines.join('\r\n');
  }
  const newPlain=Buffer.from(np,'latin1');
  if(newPlain.length!==plain.length)throw new Error('LEN '+newPlain.length+' vs '+plain.length);
  if(newPlain.length%16!==0)throw new Error('mult16 '+newPlain.length%16);
  const crc=crcOf(newPlain);
  const out=Buffer.concat([orig.subarray(0,12),Buffer.from([crc]),enc(newPlain),Buffer.from([crc])]);
  if(out.length!==orig.length)throw new Error('SIZE '+out.length);
  fs.writeFileSync(SRC,out);
  // verify
  const back=dec(out.subarray(13,out.length-1)).toString('latin1').split('\r\n');
  const r=back.find(l=>l.split('\t')[0]==='11000095').split('\t');
  console.log('AFTER: id='+r[0]+' name='+r[1]+' col5(visual)='+r[5]);
  console.log('crc=0x'+crc.toString(16),'size='+out.length,'WROTE');
}
