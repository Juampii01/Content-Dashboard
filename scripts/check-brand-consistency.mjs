#!/usr/bin/env node
/**
 * check-brand-consistency.mjs
 *
 * Greps `components/**` and `app/**` (excluding `app/globals.css`) for
 * hardcoded brand color literals. Brand colors must always come from the
 * CSS variables defined in `app/globals.css` (see docs/BRAND.md).
 *
 * Exit 0 = clean. Exit 1 = violations found (printed as file:line).
 *
 * Usage:  node scripts/check-brand-consistency.mjs
 *         npm run check:brand
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.cwd()
const SEARCH_DIRS = ['components', 'app']
const EXCLUDE_FILES = new Set([join('app', 'globals.css')])
const EXCLUDE_DIR_NAMES = new Set(['node_modules', '.next', 'dist', 'build'])
// Match the literals only (case-insensitive). We intentionally do NOT
// match `var(--accent)` etc. — those are the correct usage.
// Negative lookahead on [0-9A-F] skips alpha-suffixed variants like
// #8E1F2F44 — CSS vars can't carry alpha channels, so those are allowed.
const COLOR_PATTERN = /#(?:8E1F2F|F5EDE3)(?![0-9A-F])/gi
// Only scan source/style files where these literals would matter.
const SCAN_EXTS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.css', '.scss', '.sass', '.less',
  '.html', '.svg', '.json', '.md', '.mdx',
])

function* walk(dir) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (EXCLUDE_DIR_NAMES.has(entry.name)) continue
      yield* walk(full)
    } else if (entry.isFile()) {
      yield full
    }
  }
}

function hasScannableExt(path) {
  const i = path.lastIndexOf('.')
  if (i < 0) return false
  return SCAN_EXTS.has(path.slice(i).toLowerCase())
}

const violations = []

for (const baseDir of SEARCH_DIRS) {
  const absBase = join(ROOT, baseDir)
  try {
    statSync(absBase)
  } catch {
    continue
  }
  for (const filePath of walk(absBase)) {
    const rel = relative(ROOT, filePath).split(sep).join('/')
    const relForExclude = relative(ROOT, filePath)
    if (EXCLUDE_FILES.has(relForExclude)) continue
    if (!hasScannableExt(filePath)) continue

    let content
    try {
      content = readFileSync(filePath, 'utf8')
    } catch {
      continue
    }
    if (!COLOR_PATTERN.test(content)) {
      COLOR_PATTERN.lastIndex = 0
      continue
    }
    COLOR_PATTERN.lastIndex = 0

    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const matches = line.match(COLOR_PATTERN)
      if (matches) {
        for (const m of matches) {
          violations.push({
            file: rel,
            line: i + 1,
            match: m,
            snippet: line.trim().slice(0, 200),
          })
        }
      }
    }
  }
}

if (violations.length === 0) {
  console.log('✅ brand colors consistent')
  process.exit(0)
}

console.error(`❌ Found ${violations.length} hardcoded brand color literal(s).`)
console.error('   Use var(--accent) or var(--accent-foreground) instead.')
console.error('   See docs/BRAND.md for details.\n')
for (const v of violations) {
  console.error(`${v.file}:${v.line}  ${v.match}  →  ${v.snippet}`)
}
process.exit(1)
