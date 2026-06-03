import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"

const ROOT = process.cwd()
const MANIFEST_PATH = path.join(ROOT, "agents", "generated", "manifest.json")
const EXPECTED_SLUGS = [
  "gem-browser-tester",
  "gem-code-simplifier",
  "gem-critic",
  "gem-debugger",
  "gem-designer-mobile",
  "gem-designer",
  "gem-devops",
  "gem-documentation-writer",
  "gem-implementer-mobile",
  "gem-implementer",
  "gem-mobile-tester",
  "gem-orchestrator",
  "gem-planner",
  "gem-researcher",
  "gem-reviewer",
  "gem-skill-creator",
]

const FORBIDDEN_CONFIG_PATTERN = /\b(?:role_models|agent_complexity_models|provider_router|auto[_-]?model|fallback_chain|slash[_-]?commands?|telemetry|per[_-]?agent[_-]?models?)\b/i
const FORBIDDEN_MODEL_PATTERN = /\bmodel\b\s*[:=]\s*["'`](?!@)[a-z][a-z0-9-]*\/[a-z0-9][a-z0-9._-]*["'`]/i
const SECRET_PATTERN = /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|private[_-]?key|client[_-]?secret)\s*[:=]\s*['"`][^'"`]+['"`]/i
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/

const failures = []
const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"))

validateManifestShape(manifest, failures)
await validateBodies(manifest, failures)

if (failures.length > 0) {
  console.error("validate:sync failed")
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`validate:sync passed (${manifest.agents.length} agents)`)

function validateManifestShape(manifest, errors) {
  const expectedSet = new Set(EXPECTED_SLUGS)
  const actual = Array.isArray(manifest.agents) ? manifest.agents.map((agent) => agent.slug) : []
  const actualSet = new Set(actual)
  const missing = EXPECTED_SLUGS.filter((slug) => !actualSet.has(slug))
  const extra = actual.filter((slug) => !expectedSet.has(slug))
  const duplicates = actual.filter((slug, index) => actual.indexOf(slug) !== index)

  if (manifest.schemaVersion !== 1) errors.push("manifest.schemaVersion must be 1")
  if (manifest.source?.owner !== "mubaidr" || manifest.source?.repo !== "gem-team") errors.push("manifest.source must point to mubaidr/gem-team")
  if (manifest.source?.path !== ".apm/agents") errors.push("manifest.source.path must be .apm/agents")
  if (!manifest.source?.commit) errors.push("manifest.source.commit is required")
  if (!isIsoDateTime(manifest.syncedAt)) errors.push("manifest.syncedAt must be ISO")
  if (!manifest.syncBatchId) errors.push("manifest.syncBatchId is required")
  if (!Array.isArray(manifest.expectedSlugs) || manifest.expectedSlugs.length !== EXPECTED_SLUGS.length || EXPECTED_SLUGS.some((slug, index) => manifest.expectedSlugs[index] !== slug)) {
    errors.push("manifest.expectedSlugs must equal canonical slugs")
  }
  if (missing.length > 0) errors.push(`missing slugs: ${missing.join(", ")}`)
  if (extra.length > 0) errors.push(`extra slugs: ${extra.join(", ")}`)
  if (duplicates.length > 0) errors.push(`duplicate slugs: ${[...new Set(duplicates)].join(", ")}`)

  for (const entry of manifest.agents ?? []) validateEntry(entry, errors)

  const orchestrator = manifest.agents?.find((agent) => agent.slug === "gem-orchestrator")
  if (orchestrator?.metadata?.routingTargets?.includes("gem-orchestrator")) errors.push("gem-orchestrator metadata.routingTargets must not include itself")

  const serialized = JSON.stringify(manifest)
  if (FORBIDDEN_CONFIG_PATTERN.test(serialized)) errors.push("manifest contains forbidden model/config dimension")
  if (FORBIDDEN_MODEL_PATTERN.test(serialized)) errors.push("manifest contains forbidden provider model ID")
  if (SECRET_PATTERN.test(serialized)) errors.push("manifest contains secret-like assignment")
}

function validateEntry(entry, errors) {
  if (entry.localSlug !== entry.slug) errors.push(`${entry.slug}: localSlug must match slug`)
  if (!entry.sourceUrl?.startsWith("https://github.com/mubaidr/gem-team/")) errors.push(`${entry.slug}: sourceUrl must point to upstream`)
  if (!entry.rawUrl?.startsWith("https://raw.githubusercontent.com/mubaidr/gem-team/")) errors.push(`${entry.slug}: rawUrl must point to raw upstream`)
  if (!entry.upstreamCommit) errors.push(`${entry.slug}: upstreamCommit is required`)
  if (!SHA256_HEX_PATTERN.test(entry.sourceBodySha256 ?? "")) errors.push(`${entry.slug}: sourceBodySha256 must be sha256 hex`)
  if (!entry.bodyPath?.endsWith(`${entry.slug}.agent.md`)) errors.push(`${entry.slug}: bodyPath must reference local body`)
  if (!Number.isInteger(entry.bodyBytes) || entry.bodyBytes <= 0) errors.push(`${entry.slug}: bodyBytes must be positive`)
  if (!entry.syncBatchId) errors.push(`${entry.slug}: syncBatchId is required`)
  if (!isIsoDateTime(entry.syncedAt)) errors.push(`${entry.slug}: syncedAt must be ISO`)
}

async function validateBodies(manifest, errors) {
  for (const entry of manifest.agents ?? []) {
    const fullPath = path.join(ROOT, entry.bodyPath ?? "")
    let body = ""
    try {
      body = await readFile(fullPath, "utf8")
    } catch {
      errors.push(`${entry.slug}: body file missing`)
      continue
    }
    if (body.trim().length === 0) errors.push(`${entry.slug}: body is empty`)
    if (createHash("sha256").update(body, "utf8").digest("hex") !== entry.sourceBodySha256) errors.push(`${entry.slug}: body hash mismatch`)
    if (FORBIDDEN_MODEL_PATTERN.test(body)) errors.push(`${entry.slug}: body contains forbidden provider model ID`)
    if (SECRET_PATTERN.test(body)) errors.push(`${entry.slug}: body contains secret-like assignment`)
  }
}

function isIsoDateTime(value) {
  return typeof value === "string" && value.includes("T") && !Number.isNaN(Date.parse(value))
}
