const crypto=require('crypto'),fs=require('fs');
const K=Buffer.alloc(32);
const dec=b=>{const deciv=crypto.createDecipheriv('aes-256-ecb',K,null);deciv.setAutoPadding(false);return Buffer.concat([deciv.update(b),deciv.final()]);};
const b=fs.readFileSync('H:/Luna NextGen/System/Resource/MonsterList.bin');
const p=Buffer.concat([d.update(b.subarray(13,b.length-1)),d.final()]).toString('latin1');
const lines=p.split('\r\n');
const PREV=/Gem|Scroll|Powder|Crystal|Rare|Ancient|Unique|Orb|Key|Fragment|Legend/i;
const EXTRA=/Premium|Super|Boss|Event|Set|Special|Super.?Rare/i;
let not10=[],extraCandidates=0;
const counts={};
for(const l of lines){
  const c=l.split('\t');
  if(!/^\d+$/.test(c[0]||''))continue;
  for(let i=67;i+3<c.length;i+=4){
    const n=c[i]||'';
    if(!n||n==='0')continue;
    const r=c[i+3];
    // count names containing EXTRA keywords regardless of prior coverage
    if(EXTRA.test(n)){
      extraCandidates++;
      counts[n]=(counts[n]||0)+1;
    }
    // high-tier but NOT covered (rate not 10) by previous regex
    if((PREV.test(n)||EXTRA.test(n))&&r!=='10'){
      not10.push(n+' (rate '+r+')');
    }
  }
}
console.log('groups with EXTRA-keyword names (Premium/Super/Boss/Event/Set/Special):',extraCandidates);
console.log('distinct extra names:',Object.keys(counts).length);
Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,30).forEach(([n,c])=>console.log(c+'x\t'+n));
console.log('--- high-tier groups NOT rate=10 (need extending):',not10.length);
not10.slice(0,30).forEach(x=>console.log('  '+x));
