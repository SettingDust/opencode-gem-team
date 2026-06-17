import { createHash } from "node:crypto"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"

const OWNER = "mubaidr"
const REPO = "gem-team"
const DEFAULT_UPSTREAM_REF = "main"
const UPSTREAM_PATH = ".apm/agents"
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

export async function runSyncAgents(options = {}) {
  const root = options.root ?? process.cwd()
  const outputDir = path.join(root, "agents", "generated")
  const manifestPath = path.join(outputDir, "manifest.json")
  const timestamp = (options.now ?? new Date()).toISOString()
  const syncBatchId = `gem-team-sync-${timestamp.replace(/[:.]/g, "-")}`
  const upstreamRef = options.upstreamRef ?? readUpstreamRef()
  const fetchFn = options.fetch ?? fetch
  const upstreamCommit = await resolveUpstreamCommit(upstreamRef, fetchFn)
  const agents = []
  const bodies = new Map()

  for (const slug of EXPECTED_SLUGS) {
    const rawUrl = rawUrlFor(slug, upstreamRef)
    const sourceUrl = sourceUrlFor(slug, upstreamRef)
    const body = await fetchText(rawUrl, slug, fetchFn)
    const hash = sha256(body)
    const bodyPath = `agents/generated/${slug}.agent.md`
    bodies.set(bodyPath, body)

    const entry = {
      slug,
      localSlug: slug,
      name: readFrontmatterName(body) ?? slug,
      sourceUrl,
      rawUrl,
      upstreamRef,
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
      ref: upstreamRef,
      commit: upstreamCommit,
    },
    syncBatchId,
    syncedAt: timestamp,
    expectedSlugs: EXPECTED_SLUGS,
    agents,
  }

  const existingManifest = await readJsonIfExists(manifestPath)
  if (existingManifest && await isGeneratedOutputCurrent(root, existingManifest, manifest, bodies)) {
    console.log(`sync:agents no changes ${agents.length} agents -> agents/generated`)
    console.log(`sync:agents upstream ref ${upstreamRef}`)
    console.log(`sync:agents upstream commit ${upstreamCommit}`)
    return { changed: false, manifest: existingManifest }
  }

  await rm(outputDir, { recursive: true, force: true })
  await mkdir(outputDir, { recursive: true })
  for (const [bodyPath, body] of bodies) await writeFile(path.join(root, bodyPath), body, "utf8")
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8")

  console.log(`sync:agents completed ${agents.length} agents -> agents/generated`)
  console.log(`sync:agents upstream ref ${upstreamRef}`)
  console.log(`sync:agents upstream commit ${upstreamCommit}`)
  return { changed: true, manifest }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runSyncAgents()
}

function readUpstreamRef() {
  const cliRefIndex = process.argv.indexOf("--upstream-ref")
  const cliRef = cliRefIndex >= 0 ? process.argv[cliRefIndex + 1] : undefined
  const ref = cliRef ?? process.env.GEM_TEAM_UPSTREAM_REF ?? DEFAULT_UPSTREAM_REF
  if (typeof ref !== "string" || ref.trim().length === 0 || ref === "--upstream-ref") throw new Error("--upstream-ref requires a non-empty ref")
  return ref.trim()
}

async function resolveUpstreamCommit(ref, fetchFn = fetch) {
  const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/commits/${encodeURIComponent(ref)}`
  try {
    const response = await fetchFn(apiUrl, {
      method: "GET",
      headers: { "User-Agent": "opencode-gem-team-readonly-sync" },
    })
    if (!response.ok) throw new Error(`failed to resolve upstream ref ${ref}: ${response.status} ${response.statusText}`)
    const data = await response.json()
    if (typeof data.sha === "string" && data.sha.length > 0) return data.sha
    throw new Error(`failed to resolve upstream ref ${ref}: missing commit sha`)
  } catch (error) {
    throw new Error(`failed to resolve upstream ref ${ref}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function fetchText(url, slug, fetchFn = fetch) {
  const response = await fetchFn(url, {
    method: "GET",
    headers: { "User-Agent": "opencode-gem-team-readonly-sync" },
  })
  if (!response.ok) throw new Error(`failed to fetch ${slug}: ${response.status} ${response.statusText}`)
  const text = await response.text()
  if (text.trim().length === 0) throw new Error(`failed to fetch ${slug}: empty body`)
  return text
}

function rawUrlFor(slug, ref) {
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${encodeURIComponent(ref)}/${UPSTREAM_PATH}/${slug}.agent.md`
}

function sourceUrlFor(slug, ref) {
  return `https://github.com/${OWNER}/${REPO}/blob/${encodeURIComponent(ref)}/${UPSTREAM_PATH}/${slug}.agent.md`
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

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"))
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return undefined
    return undefined
  }
}

async function isGeneratedOutputCurrent(root, existingManifest, nextManifest, bodies) {
  if (JSON.stringify(stableManifest(existingManifest)) !== JSON.stringify(stableManifest(nextManifest))) return false
  for (const [bodyPath, body] of bodies) {
    try {
      if (await readFile(path.join(root, bodyPath), "utf8") !== body) return false
    } catch {
      return false
    }
  }
  return true
}

function stableManifest(manifest) {
  return {
    schemaVersion: manifest.schemaVersion,
    source: manifest.source,
    expectedSlugs: manifest.expectedSlugs,
    agents: manifest.agents?.map((agent) => {
      const { syncBatchId, syncedAt, ...stableAgent } = agent
      return stableAgent
    }),
  }
}
