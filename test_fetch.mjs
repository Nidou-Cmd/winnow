const res = await fetch('https://winnow-b1xlvjynk-nidou-cmds-projects.vercel.app');
const html = await res.text();
console.log('Status:', res.status);
console.log('Length:', html.length);
console.log('Has Mode Zero-Cle:', html.includes('Mode Zéro-Clé'));
console.log('Has Mode Clair:', html.includes('Mode Clair'));
console.log('Has hero-trust-cards:', html.includes('hero-trust-cards'));
