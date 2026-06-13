import assert from "node:assert/strict"
import { mkdtemp, mkdir, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { describe, it } from "node:test"

const { scanForbiddenDistStrings } = await import(pathToFileURL(path.join(process.cwd(), "scripts", "validate-dist.mjs")).href)

describe("validate:dist forbidden feature scan", () => {
  it("reports broad forbidden capability strings with path, line, and reason", async () => {
    const fixture = await mkdtemp(path.join(os.tmpdir(), "validate-dist-forbidden-"))
    const distSrc = path.join(fixture, "dist", "src")
    await mkdir(distSrc, { recursive: true })
    const file = path.join(distSrc, "feature.js")
    await writeFile(file, [
      "export const harmless = true",
      "export const capability = 'telemetry'",
      "export const router = 'provider router'",
      `export const model = '${"vendor"}/${"model-name"}'`,
    ].join("\n"))

    const failures = await scanForbiddenDistStrings(fixture, [file])

    assert.deepEqual(failures, [
      `${path.join("dist", "src", "feature.js")}:2 contains telemetry capability string`,
      `${path.join("dist", "src", "feature.js")}:3 contains provider-router capability string`,
      `${path.join("dist", "src", "feature.js")}:4 contains provider-style model assignment`,
    ])
  })

  it("allows forbidden names only in sync validation code", async () => {
    const fixture = await mkdtemp(path.join(os.tmpdir(), "validate-dist-allowlist-"))
    const distSrc = path.join(fixture, "dist", "src", "sync")
    await mkdir(distSrc, { recursive: true })
    const file = path.join(distSrc, "validation.js")
    await writeFile(file, [
      "const FORBIDDEN_CONFIG_KEYS = [",
      "  'role_models',",
      "  'agent_complexity_models',",
      "  'providerRouter',",
      "]",
    ].join("\n"))

    const failures = await scanForbiddenDistStrings(fixture, [file])

    assert.deepEqual(failures, [])
  })

  it("does not allow forbidden names in non-validation dist modules", async () => {
    const fixture = await mkdtemp(path.join(os.tmpdir(), "validate-dist-non-validation-"))
    const distSrc = path.join(fixture, "dist", "src")
    await mkdir(distSrc, { recursive: true })
    const file = path.join(distSrc, "index.js")
    await writeFile(file, "export const role_models = {}\n")

    const failures = await scanForbiddenDistStrings(fixture, [file])

    assert.deepEqual(failures, [
      `${path.join("dist", "src", "index.js")}:1 contains role_models config dimension`,
    ])
  })
})
