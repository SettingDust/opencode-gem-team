import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = process.cwd()

const gitDependencyPreparationTriggeringScripts = new Set([
  "build",
  "prepare",
  "prepack",
  "preinstall",
  "install",
  "postinstall",
])

export function validatePackageScripts(packageJson) {
  const failures = []
  const scripts = packageJson?.scripts
  if (typeof scripts !== "object" || scripts === null || Array.isArray(scripts)) {
    failures.push("package.json scripts must be an object")
    return failures
  }

  for (const scriptName of Object.keys(scripts).sort()) {
    if (!gitDependencyPreparationTriggeringScripts.has(scriptName)) continue
    if (scriptName === "build") {
      failures.push("package.json scripts.build triggers npm pacote git dependency preparation; rename it to compile")
      continue
    }
    failures.push(`package.json scripts.${scriptName} triggers npm pacote git dependency preparation; remove or rename it`)
  }

  if (typeof scripts.compile !== "string" || scripts.compile.trim().length === 0) {
    failures.push("package.json scripts.compile must exist as the safe TypeScript build command")
  }

  return failures
}

export async function validatePackageScriptsFile(projectRoot = process.cwd()) {
  const packageJsonPath = path.join(projectRoot, "package.json")
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"))
  return validatePackageScripts(packageJson)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const failures = await validatePackageScriptsFile(root)
  if (failures.length > 0) {
    console.error("validate:package-scripts failed")
    for (const failure of failures) console.error(`- ${failure}`)
    process.exit(1)
  }

  console.log("validate:package-scripts passed")
}
