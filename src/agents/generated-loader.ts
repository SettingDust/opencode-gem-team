import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { CANONICAL_GEM_TEAM_SLUGS, validateManifest, type GemTeamSlug, type SyncedAgentManifestEntry, type SyncedAgentsManifest } from "../sync/validation.js"

export type GeneratedGemTeamAgent = {
  slug: GemTeamSlug
  name: string
  description: string
  mode: "primary" | "subagent"
  prompt: string
  sourceBodySha256: string
  manifestEntry: SyncedAgentManifestEntry
  routingTargets: readonly GemTeamSlug[]
}

const GENERATED_DIR = join("agents", "generated")
const MANIFEST_FILE = "manifest.json"

let cachedAgents: readonly GeneratedGemTeamAgent[] | undefined

export function getGeneratedGemTeamAgents(): readonly GeneratedGemTeamAgent[] {
  cachedAgents ??= loadGeneratedGemTeamAgents()
  return cachedAgents
}

export function getGemOrchestratorRoutingTargets(): readonly GemTeamSlug[] {
  return getGeneratedGemTeamAgents().find((agent) => agent.slug === "gem-orchestrator")?.routingTargets ?? []
}

function loadGeneratedGemTeamAgents(): readonly GeneratedGemTeamAgent[] {
  const manifestPath = resolveGeneratedPath(MANIFEST_FILE)
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as SyncedAgentsManifest
  const validation = validateManifest(manifest)
  if (!validation.valid) throw new Error(`Generated Gem Team manifest is invalid: ${validation.errors.join("; ")}`)

  return CANONICAL_GEM_TEAM_SLUGS.map((slug) => {
    const entry = manifest.agents.find((agent) => agent.slug === slug)
    if (!entry) throw new Error(`Generated Gem Team manifest is missing ${slug}`)

    const prompt = readFileSync(resolveGeneratedPath(`${slug}.agent.md`), "utf8")
    const sourceBodySha256 = createHash("sha256").update(prompt).digest("hex")
    if (sourceBodySha256 !== entry.sourceBodySha256) {
      throw new Error(`${slug}: generated prompt hash does not match manifest sourceBodySha256`)
    }

    const frontmatter = parseYamlLikeFrontmatter(prompt)
    const routingTargets = entry.metadata?.routingTargets?.filter(isGemTeamSlug) ?? []

    return {
      slug,
      name: entry.name ?? slug,
      description: frontmatter.description ?? entry.name ?? slug,
      mode: frontmatter.mode === "primary" || slug === "gem-orchestrator" ? "primary" : "subagent",
      prompt,
      sourceBodySha256,
      manifestEntry: entry,
      routingTargets,
    }
  })
}

function resolveGeneratedPath(fileName: string): string {
  const candidates = [
    resolve(process.cwd(), GENERATED_DIR, fileName),
    resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", GENERATED_DIR, fileName),
    resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", GENERATED_DIR, fileName),
  ]

  const found = candidates.find((candidate) => existsSync(candidate))
  if (!found) throw new Error(`Generated Gem Team asset not found: ${join(GENERATED_DIR, fileName)}`)
  return found
}

function parseYamlLikeFrontmatter(markdown: string): { description?: string; mode?: string } {
  if (!markdown.startsWith("---\n")) return {}
  const end = markdown.indexOf("\n---", 4)
  if (end === -1) return {}

  const result: { description?: string; mode?: string } = {}
  for (const line of markdown.slice(4, end).split("\n")) {
    const match = /^(description|mode):\s*(.*)$/.exec(line)
    if (!match) continue
    const value = match[2]!.trim().replace(/^"(.*)"$/, "$1")
    if (match[1] === "description") result.description = value
    if (match[1] === "mode") result.mode = value
  }
  return result
}

function isGemTeamSlug(value: string): value is GemTeamSlug {
  return (CANONICAL_GEM_TEAM_SLUGS as readonly string[]).includes(value)
}
