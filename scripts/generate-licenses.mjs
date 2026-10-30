import fs from 'node:fs';
import path from 'node:path';

// Run after dependency changes to refresh the bundled, offline license inventory.
const root = process.cwd();
const project = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const entries = new Map();
function locate(name, from) {
  let dir = from;
  while (true) {
    const candidate = path.join(dir, 'node_modules', name, 'package.json');
    if (fs.existsSync(candidate)) return fs.realpathSync(candidate);
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
function visit(name, from, direct = false) {
  const file = locate(name, from);
  if (!file) return;
  const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
  const key = `${pkg.name}@${pkg.version}`;
  if (entries.has(key)) {
    if (direct) entries.get(key).direct = true;
    return;
  }
  const dir = path.dirname(file);
  function findNotices(folder, prefix = '') {
    return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
      if (entry.isDirectory() && !['node_modules', '.git'].includes(entry.name)) return findNotices(path.join(folder, entry.name), `${prefix}${entry.name}/`);
      return entry.isFile() && /^(licen[cs]e|copying|copyright|notice)([._-].*)?$/i.test(entry.name) ? [`${prefix}${entry.name}`] : [];
    });
  }
  const noticeFiles = findNotices(dir);
  const notices = noticeFiles.map(f => ({ file: f, text: fs.readFileSync(path.join(dir, f), 'utf8') }));
  const license = typeof pkg.license === 'string' ? pkg.license : pkg.license?.type ?? 'Not specified';
  entries.set(key, { name: pkg.name, version: pkg.version, license, direct, notices });
  for (const dependency of Object.keys({ ...pkg.dependencies, ...pkg.optionalDependencies })) visit(dependency, dir);
}
for (const name of Object.keys(project.dependencies)) visit(name, root, true);
const packages = [...entries.values()].sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
fs.mkdirSync(path.join(root, 'src/lib'), { recursive: true });
fs.mkdirSync(path.join(root, 'public'), { recursive: true });
fs.writeFileSync(path.join(root, 'src/lib/open-source-licenses.json'), JSON.stringify(packages));
fs.writeFileSync(path.join(root, 'public/open-source-notices.txt'), 'fairvitalgo — Third-party software notices\nGenerated from installed production dependencies. Original notices are reproduced verbatim.\n\n' + packages.map(p => `${p.name} ${p.version}\nLicense: ${p.license}\n${p.notices.length ? p.notices.map(n => `\n--- ${n.file} ---\n${n.text}`).join('\n') : 'No standalone license notice was found in the installed package; consult the upstream package.'}\n`).join('\n========================================\n\n'));
console.log(`Generated ${packages.length} package entries; ${packages.filter(p => !p.notices.length).length} without standalone notice files.`);