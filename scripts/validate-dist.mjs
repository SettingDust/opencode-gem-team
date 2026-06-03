import { readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { pathToFileURL } from "node:url"

const root = process.cwd()

const forbiddenDistRules = [
  { reason: "telemetry capability string", pattern: /\btelemetry\b/i },
  { reason: "slash-command capability string", pattern: /\bslash[-_ ]?commands?\b/i },
  { reason: "provider-router capability string", pattern: /\bprovider[-_ ]?(?:auto[-_ ]?)?router\b|\bproviderRouter\b|\bprovider-side router\b/i },
  { reason: "virtual-model capability string", pattern: /\bvirtual[-_ ]?models?\b|\bvirtualModels\b/i },
  { reason: "fallback-chain capability string", pattern: /\bfallback[-_ ]?chains?\b|\bfallbackChain\b/i },
  { reason: "standalone auto model capability string", pattern: /\bstandalone[-_ ]?auto[-_ ]?models?\b|\bauto[-_ ]?models?\b/i },
  { reason: "role_models config dimension", pattern: /\brole_models\b/i },
  { reason: "agent_complexity_models config dimension", pattern: /\bagent_complexity_models\b/i },
  { reason: "per-agent model override dimension", pattern: /\bper[-_ ]?agent[-_ ]?(?:model[-_ ]?)?overrides?\b|\bper[-_ ]?agent[-_ ]?models?\b/i },
  { reason: "global OpenCode config write", pattern: /(?:writeFile|appendFile|mkdir|rm|cp|rename)\s*\([^\n]*(?:\.opencode|opencode\.json)|(?:\.opencode|opencode\.json)[^\n]*(?:writeFile|appendFile|mkdir|rm|cp|rename)/i },
  { reason: "secret-like api key assignment", pattern: /api[_-]?key\s*[:=]/i },
  { reason: "secret-like token assignment", pattern: /\btoken\s*[:=]/i },
  { reason: "secret-like secret assignment", pattern: /\bsecret\s*[:=]/i },
  { reason: "provider-style model assignment", pattern: /\bmodel\b\s*[:=]\s*["'`](?!@)(?:[a-z][a-z0-9-]*)\/(?:[a-z0-9][a-z0-9._-]*)["'`]/i },
]

const defensiveValidationFiles = new Set([
  path.normalize("dist/src/routing/resolve-model.js"),
  path.normalize("dist/src/routing/resolve-model.d.ts"),
  path.normalize("dist/src/sync/validation.js"),
  path.normalize("dist/src/sync/validation.d.ts"),
])

const defensiveValidationReasons = new Set([
  "telemetry capability string",
  "slash-command capability string",
  "provider-router capability string",
  "virtual-model capability string",
  "fallback-chain capability string",
  "standalone auto model capability string",
  "role_models config dimension",
  "agent_complexity_models config dimension",
  "per-agent model override dimension",
])

async function exists(filePath) {
  try {
    await stat(filePath)
    return true
  } catch {
    return false
  }
}

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await collectFiles(fullPath))
    if (entry.isFile()) files.push(fullPath)
  }
  return files
}

export async function validateDist(projectRoot = process.cwd()) {
  const failures = []
  const packageJsonPath = path.join(projectRoot, "package.json")
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"))
  const serverExport = packageJson.exports?.["./server"]?.default
  const rootExport = packageJson.exports?.["."]?.default
  const rootTypes = packageJson.exports?.["."]?.types

  for (const [label, value] of [["exports[.].default", rootExport], ["exports[./server].default", serverExport], ["exports[.].types", rootTypes]]) {
    if (typeof value !== "string" || !value.startsWith("./dist/src/")) failures.push(`${label} must point at ./dist/src/*`)
  }

  const requiredFiles = [
    packageJson.main,
    rootExport,
    serverExport,
    rootTypes,
  ].filter((value, index, values) => typeof value === "string" && values.indexOf(value) === index)

  for (const file of requiredFiles) {
    const fullPath = path.join(projectRoot, file)
    if (!(await exists(fullPath))) failures.push(`missing ${file}; run npm run build`)
  }

  if (await exists(path.join(projectRoot, "dist", "src", "index.js"))) {
    const mod = await import(`${pathToFileURL(path.join(projectRoot, "dist", "src", "index.js")).href}?validateDist=${Date.now()}`)
    if (typeof mod.default !== "object" || mod.default === null) failures.push("dist default export must be a PluginModule object")
    if (typeof mod.default?.id !== "string" || !mod.default.id) failures.push("dist default export must include plugin id")
    if (typeof mod.default?.server !== "function") failures.push("dist default export must include server function")
  }

  const distFiles = await collectFiles(path.join(projectRoot, "dist", "src"))
  failures.push(...await scanForbiddenDistStrings(projectRoot, distFiles))

  return { failures, filesChecked: distFiles.length }
}

export async function scanForbiddenDistStrings(projectRoot, distFiles) {
  const failures = []
  for (const file of distFiles) {
    const text = await readFile(file, "utf8")
    const relativeFile = path.relative(projectRoot, file)
    const lines = text.split(/\r?\n/)
    for (const [index, line] of lines.entries()) {
      for (const rule of forbiddenDistRules) {
        if (!rule.pattern.test(line)) continue
        if (isAllowedDefensiveValidationString(relativeFile, line, rule.reason)) continue
        failures.push(`${relativeFile}:${index + 1} contains ${rule.reason}`)
      }
    }
  }
  return failures
}

function isAllowedDefensiveValidationString(relativeFile, line, reason) {
  const normalized = path.normalize(relativeFile)
  if (!defensiveValidationFiles.has(normalized)) return false
  if (!defensiveValidationReasons.has(reason)) return false
  return /FORBIDDEN|unsupported_config_key|forbidden model\/config dimension|role_models|agent_complexity_models|provider_router|providerRouter|virtualModels|fallback_chain|fallbackChain|slash|telemetry|per[_-]?agent|auto[_-]?model/i.test(line)
    || /"(?:role_models|agent_complexity_models|per_agent|perAgent|provider_router|providerRouter|fallback_chain|fallbackChain|virtual_models|virtualModels)"/.test(line)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const result = await validateDist(root)
  if (result.failures.length > 0) {
    console.error("validate:dist failed")
    for (const failure of result.failures) console.error(`- ${failure}`)
    process.exit(1)
  }

  console.log(`validate:dist passed (${result.filesChecked} dist/src files checked)`)
}
