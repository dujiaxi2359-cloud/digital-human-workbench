import { access, readdir, readFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const requiredFiles = [
  'LICENSE',
  'NOTICE.md',
  'LICENSE_SCOPE.md',
  'SECURITY.md',
  'rachel-skill/LICENSE',
  '.env.example',
]
const forbiddenPaths = [
  '.env',
  'agent-runtime/config.json',
  'agent-runtime/job-state.json',
  'agent-runtime/inbox.json',
  'public/demo-avatar.png',
]
const secretPattern = /(ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|gho_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9]{20,}|-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----)/
const skippedDirectories = new Set(['.git', '.npm-cache', 'node_modules', 'dist', '__pycache__'])

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function walk(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(path))
    else files.push(path)
  }
  return files
}

const failures = []
for (const file of requiredFiles) {
  if (!await exists(join(root, file))) failures.push(`missing required file: ${file}`)
}
for (const file of forbiddenPaths) {
  if (await exists(join(root, file))) failures.push(`forbidden runtime file present: ${file}`)
}
for (const path of await walk(root)) {
  const relativePath = relative(root, path)
  const contents = await readFile(path).catch(() => null)
  if (contents && !contents.includes(0) && secretPattern.test(contents.toString('utf8'))) {
    failures.push(`possible secret found: ${relativePath}`)
  }
}

if (failures.length) {
  process.stderr.write(failures.join('\n') + '\n')
  process.exit(1)
}
process.stdout.write('release check passed\n')
