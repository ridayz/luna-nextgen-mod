const fs = require('fs');
const lines = fs.readFileSync('H:/Luna NextGen/Data/System/ItemList_dec.bin', 'latin1').split(/\r?\n/);
// pivot on the dagger item id 11000188 and a sword item id 11000001
const dag = lines.find(l => l.startsWith('11000188\t'));
const sw  = lines.find(l => l.startsWith('11000001\t'));
function cols(s){ return s.split('\t'); }
const dc = cols(dag), sc = cols(sw);
console.log('dagger cols=' + dc.length + ' sword cols=' + sc.length);
console.log('dag:', dag);
console.log('sw :', sw);
console.log('\n--- differing columns ---');
const n = Math.max(dc.length, sc.length);
for (let i = 0; i < n; i++) {
  if (dc[i] !== sc[i]) {
    console.log('col ' + i + ': dag=' + JSON.stringify(dc[i]) + '  sw=' + JSON.stringify(sc[i]));
  }
}
