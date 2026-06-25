import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { describe, it } from "node:test"

type PackageScriptsValidationModule = {
  validatePackageScripts: (packageJson: unknown) => string[]
}

const { validatePackageScripts } = await import(
  pathToFileURL(path.join(process.cwd(), "scripts", "validate-package-scripts.mjs")).href
) as PackageScriptsValidationModule

describe("package script git dependency preparation guard", () => {
  it("rejects scripts that trigger npm pacote git dependency preparation", () => {
    const failures = validatePackageScripts({
      scripts: {
        compile: "tsc -p tsconfig.json",
        prepare: "node scripts/prepare.mjs",
        postinstall: "node scripts/postinstall.mjs",
      },
    })

    assert.deepEqual(failures, [
      "package.json scripts.postinstall triggers npm pacote git dependency preparation; remove or rename it",
      "package.json scripts.prepare triggers npm pacote git dependency preparation; remove or rename it",
    ])
  })

  it("allows the renamed compile command, build alias, and existing validation scripts", () => {
    const failures = validatePackageScripts({
      scripts: {
        build: "tsc -p tsconfig.json",
        compile: "tsc -p tsconfig.json",
        test: "npm run compile && node --test \"dist/test/**/*.test.js\"",
        lint: "npm run typecheck && npm run validate:package-scripts",
        "validate:dist": "node scripts/validate-dist.mjs",
        "validate:package-scripts": "node scripts/validate-package-scripts.mjs",
      },
    })

    assert.deepEqual(failures, [])
  })

  it("keeps the checked-in package.json free of git-prep-triggering scripts", async () => {
    const packageJson = JSON.parse(await readFile(path.join(process.cwd(), "package.json"), "utf8"))

    assert.deepEqual(validatePackageScripts(packageJson), [])
    assert.equal(typeof packageJson.scripts.compile, "string")
    assert.doesNotMatch(packageJson.scripts.test, /npm run build\b/)
  })
})
