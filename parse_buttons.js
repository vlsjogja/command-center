const fs = require('fs');
const path = require('path');

const dir = 'src/app/dashboard';
const files = fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isDirectory());

for (const f of files) {
  const file = path.join(dir, f, 'page.tsx');
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const headerMatch = content.match(/<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">([\s\S]*?)<div className="flex( flex-col sm:flex-row)? gap-3/);
    if (headerMatch) {
       console.log(`\n--- ${f} ---`);
       const buttonsMatch = headerMatch[1].match(/<Button[^>]*>/g);
       if (buttonsMatch) {
         buttonsMatch.forEach(b => console.log(b));
       }
    }
  }
}
