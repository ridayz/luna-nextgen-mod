const fs = require('fs');
const lines = fs.readFileSync('H:/Luna NextGen/Data/System/ItemList_dec.bin', 'latin1').split(/\r?\n/);
// gather items and find candidates for the weapon-type column.
// Hypothesis: col 30 (dag=4, sw=1) or col 68 (dag=11105, sw=11101).
// Check a bow and a staff to disambiguate: find item names containing Bow / Staff.
const bows  = lines.filter(l => /Bow/.test(l)).slice(0, 3);
const staffs = lines.filter(l => /Staff|Wand|Rod/.test(l)).slice(0, 3);
const swords = lines.filter(l => /Sword/.test(l)).slice(0, 3);
const daggers = lines.filter(l => /Dagger/.test(l)).slice(0, 3);
function show(label, arr) {
  console.log('--- ' + label + ' ---');
  for (const l of arr) {
    const c = l.split('\t');
    console.log(c[1].padEnd(28), 'col29=' + c[29], 'col30=' + c[30], 'col31=' + c[31], 'col32=' + c[32], 'col68=' + c[68]);
  }
}
show('Sword', swords); show('Dagger', daggers); show('Bow', bows); show('Staff', staffs);
