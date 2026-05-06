#!/usr/bin/env node
/**
 * check-claude-md.mjs
 *
 * Anti-drift guardrail for CLAUDE.md. Verifies that claims in the file
 * still match the code. Runs in CI — exit 1 on any divergence.
 *
 * Checks:
 *   1. DB provider coherence (.env.example vs schema.prisma)
 *   2. Routes listed in docs/ROUTES.md exist in app/
 *   3. Scripts named in CLAUDE.md "## Comandos" exist in package.json
 *   4. Paths listed in CLAUDE.md "## Paths clave" exist on disk
 *   5. Prisma models named in CLAUDE.md match schema.prisma
 *   6. Path alias "@/*" in tsconfig.json still maps to "./*"
 *
 * Usage:  node scripts/check-claude-md.mjs
 */

import { readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = process.cwd()
const results = []

function pass(label) {
  results.push({ ok: true, label })
}
function fail(label, details) {
  results.push({ ok: false, label, details })
}

function readFileSafe(path) {
  try { return readFileSync(resolve(ROOT, path), 'utf8') }
  catch { return null }
}

// ───────────────────────────────────────────────────────────────────
// 1. DB provider coherence
// ───────────────────────────────────────────────────────────────────
function check_dbProvider() {
  const schema = readFileSafe('prisma/schema.prisma')
  const env = readFileSafe('.env.example')
  if (!schema || !env) {
    fail('1. DB provider coherence', 'prisma/schema.prisma or .env.example missing')
    return
  }

  // Match provider INSIDE the `datasource` block, not the `generator` block
  const datasourceMatch = schema.match(/datasource\s+\w+\s*\{[^}]*\}/)
  if (!datasourceMatch) {
    fail('1. DB provider coherence', 'no datasource block in schema.prisma')
    return
  }
  const providerMatch = datasourceMatch[0].match(/provider\s*=\s*"([^"]+)"/)
  const provider = providerMatch ? providerMatch[1] : null
  if (!provider) {
    fail('1. DB provider coherence', 'Could not parse provider in datasource block')
    return
  }

  const dbUrlLine = env.split('\n').find((l) => l.trim().startsWith('DATABASE_URL='))
  if (!dbUrlLine) {
    fail('1. DB provider coherence', '.env.example has no DATABASE_URL line')
    return
  }

  if (provider === 'postgresql' && /file:/.test(dbUrlLine)) {
    fail('1. DB provider coherence',
      `schema is postgresql but .env.example DATABASE_URL uses SQLite syntax: ${dbUrlLine.trim()}`)
    return
  }
  if (provider === 'sqlite' && !/file:/.test(dbUrlLine)) {
    fail('1. DB provider coherence',
      `schema is sqlite but .env.example DATABASE_URL does not use file: syntax`)
    return
  }
  pass(`1. DB provider coherence (schema=${provider})`)
}

// ───────────────────────────────────────────────────────────────────
// 2. Routes in ROUTES.md exist in app/
// ───────────────────────────────────────────────────────────────────
function check_routesExist() {
  const md = readFileSafe('docs/ROUTES.md')
  if (!md) { fail('2. ROUTES.md exists', 'docs/ROUTES.md not found'); return }

  // Parse markdown table rows whose first cell is a route in backticks
  const routeRe = /^\|\s*`(\/[^`]*)`/gm
  const declared = [...md.matchAll(routeRe)].map((m) => m[1])
  if (declared.length === 0) {
    fail('2. Routes in ROUTES.md exist', 'no routes found in table')
    return
  }

  const missing = []
  for (const route of declared) {
    // Convert route to expected file path: /foo/[bar] → app/foo/[bar]/page.tsx
    const segments = route === '/' ? [] : route.slice(1).split('/')
    const pagePath = join('app', ...segments, 'page.tsx')
    if (!existsSync(resolve(ROOT, pagePath))) {
      missing.push(`${route} → ${pagePath}`)
    }
  }
  if (missing.length > 0) {
    fail('2. Routes in ROUTES.md exist', `missing pages:\n    - ${missing.join('\n    - ')}`)
  } else {
    pass(`2. Routes in ROUTES.md exist (${declared.length} checked)`)
  }
}

// ───────────────────────────────────────────────────────────────────
// 3. npm scripts referenced in CLAUDE.md exist in package.json
// ───────────────────────────────────────────────────────────────────
function check_scriptsExist() {
  const md = readFileSafe('CLAUDE.md')
  const pkg = readFileSafe('package.json')
  if (!md || !pkg) {
    fail('3. Scripts exist', 'CLAUDE.md or package.json not found')
    return
  }

  const scripts = JSON.parse(pkg).scripts || {}
  // Find "npm run X" references. Allow X to contain : and -.
  const refs = [...md.matchAll(/npm run ([a-z][a-z0-9:-]*)/gi)].map((m) => m[1])
  const uniqueRefs = [...new Set(refs)]
  const missing = uniqueRefs.filter((name) => !(name in scripts))
  if (missing.length > 0) {
    fail('3. Scripts exist', `CLAUDE.md references missing npm scripts: ${missing.join(', ')}`)
  } else {
    pass(`3. Scripts exist (${uniqueRefs.length} unique references checked)`)
  }
}

// ───────────────────────────────────────────────────────────────────
// 4. Paths in CLAUDE.md "## Paths clave" code block exist
// ───────────────────────────────────────────────────────────────────
function check_pathsExist() {
  const md = readFileSafe('CLAUDE.md')
  if (!md) { fail('4. Paths exist', 'CLAUDE.md not found'); return }

  // Extract the first ``` code block AFTER "## Paths clave"
  const anchor = md.indexOf('## Paths clave')
  if (anchor < 0) { pass('4. Paths exist (no ## Paths clave section — skipping)'); return }
  const after = md.slice(anchor)
  const codeMatch = after.match(/```[^\n]*\n([\s\S]+?)\n```/)
  if (!codeMatch) { pass('4. Paths exist (no code block under Paths clave — skipping)'); return }

  const lines = codeMatch[1].split('\n')
  const missing = []
  for (const rawLine of lines) {
    // Strip comments (after #), trim whitespace. Take token that looks like a path.
    const line = rawLine.split('#')[0].trim()
    if (!line) continue
    // Candidate path tokens: first whitespace-separated chunk that contains / or ends with /
    const firstToken = line.split(/\s+/)[0]
    if (!firstToken) continue
    // Skip tokens that contain brace expansion, wildcards, ellipsis, or `·` separators
    if (/[{}·*<>]/.test(firstToken)) continue
    // Normalize: strip trailing slash
    const candidate = firstToken.replace(/\/$/, '')
    if (!candidate) continue
    // Only check tokens that can be resolved from repo root. Nested entries
    // in the tree (e.g. "utils/ratelimit.ts" under lib/) need their parent
    // prefix, which is fragile to reconstruct from indentation. We skip them
    // and only validate:
    //   - tokens starting with a known top-level dir
    //   - tokens at repo root ending in a source file extension
    const TOP_LEVEL_DIRS = ['app/', 'lib/', 'components/', 'hooks/', 'scripts/', 'prisma/', 'docs/', '__tests__/', 'e2e/', 'public/']
    const startsAtRoot = TOP_LEVEL_DIRS.some((d) => candidate.startsWith(d))
    const isRootFile = !candidate.includes('/') && /\.(ts|tsx|mjs|cjs|js|jsx|json|md|prisma)$/.test(candidate)
    if (!startsAtRoot && !isRootFile) continue
    if (!existsSync(resolve(ROOT, candidate))) {
      missing.push(candidate)
    }
  }
  if (missing.length > 0) {
    fail('4. Paths exist', `paths in CLAUDE.md not found on disk:\n    - ${missing.join('\n    - ')}`)
  } else {
    pass('4. Paths exist (all literal paths in Paths clave block verified)')
  }
}

// ───────────────────────────────────────────────────────────────────
// 5. Prisma models listed in CLAUDE.md vs schema.prisma (warning only)
// ───────────────────────────────────────────────────────────────────
function check_prismaModels() {
  const md = readFileSafe('CLAUDE.md')
  const schema = readFileSafe('prisma/schema.prisma')
  if (!md || !schema) return // skip silently if either is missing

  const anchor = md.indexOf('## Modelos Prisma')
  if (anchor < 0) return // section optional

  // Pull model names from the section until the next ## header
  const sectionEnd = md.indexOf('\n## ', anchor + 1)
  const section = md.slice(anchor, sectionEnd < 0 ? undefined : sectionEnd)
  const documented = new Set([...section.matchAll(/`([A-Z][A-Za-z0-9_]+)`/g)].map((m) => m[1]))

  const actual = new Set([...schema.matchAll(/^model\s+([A-Za-z0-9_]+)/gm)].map((m) => m[1]))

  const missingInDoc = [...actual].filter((m) => !documented.has(m))
  const extraInDoc = [...documented].filter((m) => !actual.has(m))

  if (missingInDoc.length > 0 || extraInDoc.length > 0) {
    // Non-fatal: warning only. Models change often; require sync on rename/delete only.
    const parts = []
    if (missingInDoc.length > 0) parts.push(`in schema but not in CLAUDE.md: ${missingInDoc.join(', ')}`)
    if (extraInDoc.length > 0) parts.push(`in CLAUDE.md but not in schema: ${extraInDoc.join(', ')}`)
    results.push({ ok: true, warn: true, label: '5. Prisma models sync', details: parts.join(' | ') })
  } else {
    pass(`5. Prisma models sync (${actual.size} models match)`)
  }
}

// ───────────────────────────────────────────────────────────────────
// 6. tsconfig path alias still @/* → ./*
// ───────────────────────────────────────────────────────────────────
function check_tsconfigAlias() {
  const raw = readFileSafe('tsconfig.json')
  if (!raw) { fail('6. tsconfig alias', 'tsconfig.json not found'); return }

  // Loose parse: tsconfig allows comments, so don't require strict JSON
  const pathsMatch = raw.match(/"paths"\s*:\s*\{([^}]+)\}/)
  if (!pathsMatch) {
    fail('6. tsconfig alias', 'no paths section in tsconfig.json')
    return
  }
  if (!/"@\/\*"\s*:\s*\[\s*"\.\/\*"\s*\]/.test(pathsMatch[1])) {
    fail('6. tsconfig alias',
      `expected "@/*": ["./*"] in paths but found:\n${pathsMatch[1].trim()}`)
    return
  }
  pass('6. tsconfig alias (@/* → ./*)')
}

// ───────────────────────────────────────────────────────────────────
// Run all checks
// ───────────────────────────────────────────────────────────────────
check_dbProvider()
check_routesExist()
check_scriptsExist()
check_pathsExist()
check_prismaModels()
check_tsconfigAlias()

let failures = 0
for (const r of results) {
  if (r.ok && r.warn) {
    console.log(`⚠ ${r.label} — ${r.details}`)
  } else if (r.ok) {
    console.log(`✓ ${r.label}`)
  } else {
    failures++
    console.error(`✗ ${r.label}`)
    if (r.details) console.error(`    ${r.details}`)
  }
}

if (failures > 0) {
  console.error(`\n${failures} failure(s) — CLAUDE.md has drifted from the code. Fix the divergence or update CLAUDE.md.`)
  process.exit(1)
}
console.log('\n0 failures — CLAUDE.md is coherent with the code.')
process.exit(0)
