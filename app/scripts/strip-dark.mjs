import fs from 'fs'
import path from 'path'

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p)
    else if (/\.(jsx|js|tsx|ts)$/.test(ent.name)) {
      const t = fs.readFileSync(p, 'utf8')
      const n = t.replace(/\s+dark:[^\s"']+/g, '')
      if (n !== t) {
        fs.writeFileSync(p, n)
        console.log('cleaned', p)
      }
    }
  }
}

walk(new URL('../src', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'))
