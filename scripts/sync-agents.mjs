import { createHash } from "node:crypto"
import { mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"

const ROOT = process.cwd()
const OWNER = "mubaidr"
const REPO = "gem-team"
const BRANCH = "main"
const UPSTREAM_PATH = ".apm/agents"
const OUTPUT_DIR = path.join(ROOT, "agents", "generated")
const MANIFEST_PATH = path.join(OUTPUT_DIR, "manifest.json")
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

const timestamp = new Date().toISOString()
const syncBatchId = `gem-team-sync-${timestamp.replace(/[:.]/g, "-")}`
const upstreamCommit = await resolveUpstreamCommit()

await rm(OUTPUT_DIR, { recursive: true, force: true })
await mkdir(OUTPUT_DIR, { recursive: true })

const agents = []

for (const slug of EXPECTED_SLUGS) {
  const rawUrl = rawUrlFor(slug, upstreamCommit)
  const sourceUrl = sourceUrlFor(slug, upstreamCommit)
  const body = await fetchText(rawUrl, slug)
  const hash = sha256(body)
  const bodyPath = `agents/generated/${slug}.agent.md`
  await writeFile(path.join(ROOT, bodyPath), body, "utf8")

  const entry = {
    slug,
    localSlug: slug,
    name: readFrontmatterName(body) ?? slug,
    sourceUrl,
    rawUrl,
    upstreamCommit,
    sourceBodySha256: hash,
    bodyPath,
    bodyBytes: Buffer.byteLength(body, "utf8"),
    syncBatchId,
    syncedAt: timestamp,
    metadata: {},
  }

  if (slug === "gem-orchestrator") {
    entry.metadata.routingTargets = extractAvailableAgents(body).filter((target) => target !== "gem-orchestrator")
  }

  agents.push(entry)
}

const manifest = {
  schemaVersion: 1,
  source: {
    owner: OWNER,
    repo: REPO,
    path: UPSTREAM_PATH,
    branch: BRANCH,
    commit: upstreamCommit,
  },
  syncBatchId,
  syncedAt: timestamp,
  expectedSlugs: EXPECTED_SLUGS,
  agents,
}

await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8")

console.log(`sync:agents completed ${agents.length} agents -> agents/generated`)
console.log(`sync:agents upstream commit ${upstreamCommit}`)

async function resolveUpstreamCommit() {
  const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/commits/${BRANCH}`
  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { "User-Agent": "opencode-gem-team-readonly-sync" },
    })
    if (!response.ok) return "unknown-public-github-commit-unavailable"
    const data = await response.json()
    return typeof data.sha === "string" && data.sha.length > 0 ? data.sha : "unknown-public-github-commit-unavailable"
  } catch {
    return "unknown-public-github-commit-unavailable"
  }
}

async function fetchText(url, slug) {
  const response = await fetch(url, {
    method: "GET",
    headers: { "User-Agent": "opencode-gem-team-readonly-sync" },
  })
  if (!response.ok) throw new Error(`failed to fetch ${slug}: ${response.status} ${response.statusText}`)
  const text = await response.text()
  if (text.trim().length === 0) throw new Error(`failed to fetch ${slug}: empty body`)
  return text
}

function rawUrlFor(slug, ref) {
  const safeRef = ref.startsWith("unknown-") ? BRANCH : ref
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${safeRef}/${UPSTREAM_PATH}/${slug}.agent.md`
}

function sourceUrlFor(slug, ref) {
  const safeRef = ref.startsWith("unknown-") ? BRANCH : ref
  return `https://github.com/${OWNER}/${REPO}/blob/${safeRef}/${UPSTREAM_PATH}/${slug}.agent.md`
}

function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex")
}

function readFrontmatterName(body) {
  const match = body.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return undefined
  const name = match[1]?.match(/^name:\s*([^\n]+)$/m)?.[1]?.trim()
  return name?.replace(/^['"]|['"]$/g, "")
}

function extractAvailableAgents(body) {
  const section = body.match(/<available_agents>[\s\S]*?<\/available_agents>/)?.[0] ?? ""
  return [...section.matchAll(/`(gem-[a-z0-9-]+)`/g)].map((match) => match[1])
}
