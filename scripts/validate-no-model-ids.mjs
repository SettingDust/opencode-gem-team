import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()
const includedRoots = ["src", "test", "scripts", "examples", "README.md", "package.json", "tsconfig.json", "docs/plan"]
const excludedDirs = new Set(["node_modules", "dist", "coverage", ".git"])
const suspiciousPatterns = [
  { name: "secret-like api key assignment", pattern: /api[_-]?key\s*[:=]/i },
  { name: "secret-like token assignment", pattern: /token\s*[:=]/i },
  { name: "secret-like secret assignment", pattern: /secret\s*[:=]/i },
  { name: "authorization credential literal", pattern: new RegExp("bea" + "rer\\s+[a-z0-9._-]+", "i") },
  { name: "model field assigned provider-style string", pattern: /\bmodel\b\s*[:=]\s*["'`](?!@)(?:[a-z][a-z0-9-]*)\/(?:[a-z0-9][a-z0-9._-]*)["'`]/i },
  { name: "complexity model assigned provider-style string", pattern: /\b(?:simple|medium|complex)\b\s*[:=]\s*["'`](?!@)(?:[a-z][a-z0-9-]*)\/(?:[a-z0-9][a-z0-9._-]*)["'`]/i },
]

async function exists(filePath) {
  try {
    await readFile(filePath)
    return true
  } catch {
    return false
  }
}

async function collectFiles(target) {
  const fullPath = path.join(root, target)
  if (await exists(fullPath)) return [fullPath]

  const entries = await readdir(fullPath, { withFileTypes: true }).catch(() => [])
  const files = []

  for (const entry of entries) {
    if (entry.isDirectory() && excludedDirs.has(entry.name)) continue

    const relative = path.join(target, entry.name)
    if (entry.isDirectory()) files.push(...await collectFiles(relative))
    if (entry.isFile()) files.push(path.join(root, relative))
  }

  return files
}

const files = (await Promise.all(includedRoots.map(collectFiles))).flat()
const failures = []

for (const file of files) {
  const text = await readFile(file, "utf8")
  for (const { name, pattern } of suspiciousPatterns) {
    if (pattern.test(text)) failures.push(`${path.relative(root, file)} matches ${name}`)
  }
}

if (failures.length > 0) {
  console.error("validate:no-model-ids failed")
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`validate:no-model-ids passed (${files.length} files scanned)`)
