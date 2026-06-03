import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { CANONICAL_GEM_TEAM_SLUGS, GENERATED_GEM_TEAM_AGENT_COUNT, GENERATED_GEM_TEAM_AGENT_SLUGS, validateManifest, type SyncedAgentsManifest } from "../src/index.js"

const syncedAt = "2026-06-03T00:00:00.000Z"
const hash = "a".repeat(64)

function makeManifest(overrides: Partial<SyncedAgentsManifest> = {}): SyncedAgentsManifest {
  return {
    schemaVersion: 1,
    source: {
      owner: "mubaidr",
      repo: "gem-team",
      path: ".apm/agents",
      branch: "main",
      commit: "unknown-public-github-unavailable",
    },
    syncBatchId: "gem-team-sync-2026-06-03T00-00-00-000Z",
    syncedAt,
    expectedSlugs: CANONICAL_GEM_TEAM_SLUGS,
    agents: CANONICAL_GEM_TEAM_SLUGS.map((slug) => ({
      slug,
      localSlug: slug,
      name: slug,
      sourceUrl: `https://github.com/mubaidr/gem-team/blob/main/.apm/agents/${slug}.agent.md`,
      rawUrl: `https://raw.githubusercontent.com/mubaidr/gem-team/main/.apm/agents/${slug}.agent.md`,
      upstreamCommit: "unknown-public-github-unavailable",
      sourceBodySha256: hash,
      bodyPath: `agents/generated/${slug}.agent.md`,
      bodyBytes: 10,
      syncBatchId: "gem-team-sync-2026-06-03T00-00-00-000Z",
      syncedAt,
      prompt: "body",
      metadata: slug === "gem-orchestrator" ? { routingTargets: ["gem-planner"] } : {},
    })),
    ...overrides,
  }
}

describe("sync manifest validation", () => {
  it("exports generated constants matching the canonical slugs", () => {
    assert.equal(GENERATED_GEM_TEAM_AGENT_COUNT, 16)
    assert.deepEqual(GENERATED_GEM_TEAM_AGENT_SLUGS, CANONICAL_GEM_TEAM_SLUGS)
  })

  it("accepts exactly the canonical slug set with required metadata", () => {
    assert.deepEqual(validateManifest(makeManifest()), { valid: true, errors: [] })
  })

  it("reports missing, extra, and duplicate slugs", () => {
    const manifest = makeManifest({
      agents: [
        ...makeManifest().agents.filter((agent) => agent.slug !== "gem-reviewer"),
        { ...makeManifest().agents[0]!, slug: "extra-agent", localSlug: "extra-agent", bodyPath: "agents/generated/extra-agent.agent.md" },
        makeManifest().agents[1]!,
      ],
    })

    const result = validateManifest(manifest)
    assert.equal(result.valid, false)
    if (!result.valid) {
      assert.ok(result.errors.some((error) => error.includes("missing slugs: gem-reviewer")))
      assert.ok(result.errors.some((error) => error.includes("extra slugs: extra-agent")))
      assert.ok(result.errors.some((error) => error.includes("duplicate slugs: gem-code-simplifier")))
    }
  })

  it("rejects orchestrator self-routing metadata", () => {
    const manifest = makeManifest({
      agents: makeManifest().agents.map((agent) => agent.slug === "gem-orchestrator"
        ? { ...agent, metadata: { routingTargets: ["gem-orchestrator"] } }
        : agent),
    })

    const result = validateManifest(manifest)
    assert.equal(result.valid, false)
    if (!result.valid) assert.ok(result.errors.includes("gem-orchestrator metadata.routingTargets must not include gem-orchestrator"))
  })

  it("rejects forbidden config dimensions in manifest metadata", () => {
    const manifest = makeManifest({
      agents: makeManifest().agents.map((agent, index) => index === 0
        ? { ...agent, metadata: { role_models: {} } }
        : agent),
    })

    const result = validateManifest(manifest)
    assert.equal(result.valid, false)
    if (!result.valid) assert.ok(result.errors.includes("manifest contains forbidden model/config dimension"))
  })
})
