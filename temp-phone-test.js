const normalizePhone = phone => {
  let digits = phone.replace(/[^\\d]/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('01') && digits.length === 11) return '880' + digits.slice(1);
  return digits;
};
console.log('FILE START');
console.log(__filename);
console.log('FILE END');
['0198775157', '+880198775157', '880198775157', '001988775157', '01712345678', '12345'].forEach(ph => console.log(ph + ' => ' + normalizePhone(ph)));
