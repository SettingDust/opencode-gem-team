import assert from "node:assert/strict"
import { mkdtemp, readFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { describe, it } from "node:test"

import { CANONICAL_GEM_TEAM_SLUGS } from "../src/index.js"

type SyncAgentsModule = {
  runSyncAgents: (options: {
    root: string
    upstreamRef: string
    now: Date
    fetch: typeof fetch
  }) => Promise<{ changed: boolean; manifest: unknown }>
}

const { runSyncAgents } = await import(
  pathToFileURL(path.join(process.cwd(), "scripts", "sync-agents.mjs")).href
) as SyncAgentsModule

describe("sync-agents", () => {
  it("does not rewrite generated files when upstream stable content is unchanged", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "sync-agents-noop-"))
    const bodies = makeBodies()
    const first = await runSyncAgents({
      root,
      upstreamRef: "v-test",
      now: new Date("2026-06-17T00:00:00.000Z"),
      fetch: makeFetch("0123456789abcdef0123456789abcdef01234567", bodies),
    })

    const manifestPath = path.join(root, "agents", "generated", "manifest.json")
    const firstManifestText = await readFile(manifestPath, "utf8")
    const firstCriticBody = await readFile(path.join(root, "agents", "generated", "gem-critic.agent.md"), "utf8")

    const second = await runSyncAgents({
      root,
      upstreamRef: "v-test",
      now: new Date("2026-06-18T00:00:00.000Z"),
      fetch: makeFetch("0123456789abcdef0123456789abcdef01234567", bodies),
    })

    assert.equal(first.changed, true)
    assert.equal(second.changed, false)
    assert.equal(await readFile(manifestPath, "utf8"), firstManifestText)
    assert.equal(await readFile(path.join(root, "agents", "generated", "gem-critic.agent.md"), "utf8"), firstCriticBody)

    const manifest = JSON.parse(firstManifestText)
    assert.equal(manifest.syncedAt, "2026-06-17T00:00:00.000Z")
    assert.equal(manifest.agents.find((agent: { slug: string }) => agent.slug === "gem-critic").syncedAt, "2026-06-17T00:00:00.000Z")
  })

  it("rewrites generated files and refreshes volatile manifest fields when an upstream body changes", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "sync-agents-change-"))
    const originalBodies = makeBodies()
    await runSyncAgents({
      root,
      upstreamRef: "v-test",
      now: new Date("2026-06-17T00:00:00.000Z"),
      fetch: makeFetch("0123456789abcdef0123456789abcdef01234567", originalBodies),
    })
    const originalManifest = JSON.parse(await readFile(path.join(root, "agents", "generated", "manifest.json"), "utf8"))
    const originalCritic = originalManifest.agents.find((agent: { slug: string }) => agent.slug === "gem-critic")

    const changedBodies = makeBodies({ "gem-critic": makeAgentBody("gem-critic", "Critic v2 changed body") })
    const result = await runSyncAgents({
      root,
      upstreamRef: "v-test",
      now: new Date("2026-06-18T00:00:00.000Z"),
      fetch: makeFetch("0123456789abcdef0123456789abcdef01234567", changedBodies),
    })

    const manifest = JSON.parse(await readFile(path.join(root, "agents", "generated", "manifest.json"), "utf8"))
    const critic = manifest.agents.find((agent: { slug: string }) => agent.slug === "gem-critic")
    const changedBody = changedBodies.get("gem-critic")!

    assert.equal(result.changed, true)
    assert.equal(await readFile(path.join(root, "agents", "generated", "gem-critic.agent.md"), "utf8"), changedBody)
    assert.notEqual(critic.sourceBodySha256, originalCritic.sourceBodySha256)
    assert.equal(critic.bodyBytes, Buffer.byteLength(changedBody, "utf8"))
    assert.equal(manifest.syncedAt, "2026-06-18T00:00:00.000Z")
    assert.equal(manifest.syncBatchId, "gem-team-sync-2026-06-18T00-00-00-000Z")
    assert.equal(critic.syncedAt, "2026-06-18T00:00:00.000Z")
    assert.equal(critic.syncBatchId, "gem-team-sync-2026-06-18T00-00-00-000Z")
  })
})

function makeBodies(overrides: Record<string, string> = {}) {
  return new Map(CANONICAL_GEM_TEAM_SLUGS.map((slug) => [
    slug,
    overrides[slug] ?? makeAgentBody(slug, `${slug} stable body`),
  ]))
}

function makeAgentBody(slug: string, body: string) {
  const routingTargets = slug === "gem-orchestrator" ? "\n<available_agents>\n- `gem-planner`\n- `gem-orchestrator`\n</available_agents>\n" : ""
  return `---\nname: ${slug}\n---\n# ${slug}\n\n${body}\n${routingTargets}`
}

function makeFetch(commit: string, bodies: Map<string, string>): typeof fetch {
  return (async (url: string | URL) => {
    const href = String(url)
    if (href.startsWith("https://api.github.com/")) return response({ sha: commit })

    const slug = path.basename(new URL(href).pathname, ".agent.md")
    const body = bodies.get(slug)
    if (!body) return { ok: false, status: 404, statusText: "Not Found" }
    return response(body)
  }) as typeof fetch
}

function response(body: string | object) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
    text: async () => typeof body === "string" ? body : JSON.stringify(body),
  }
}
