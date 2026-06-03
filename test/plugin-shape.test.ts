import assert from "node:assert/strict"
import { describe, it } from "node:test"

import plugin, { PLUGIN_ID } from "../src/index.js"

describe("OpenCode Gem Team plugin scaffold", () => {
  it("exports the expected plugin id", () => {
    assert.equal(plugin.id, PLUGIN_ID)
    assert.equal(plugin.id, "opencode-gem-team")
  })

  it("exports a callable server hook factory", async () => {
    assert.equal(typeof plugin.server, "function")

    const hooks = await plugin.server({} as never)

    assert.equal(typeof hooks, "object")
    assert.equal(typeof hooks.config, "function")
  })
})
