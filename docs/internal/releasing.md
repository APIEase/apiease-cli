# Maintainer Release Checklist

Use this checklist only after the release task has finalized package exports, published files, semantic version, and installed-artifact smoke coverage. Run every command from the repository root unless a step says otherwise.

## 1. Confirm Scope and Version

1. Confirm `git status --short` contains only the intended release changes.
2. Confirm `package.json` has the approved semantic version and that `./bin/apiease-cli --version` reports it.
3. Review the release diff for accidental credentials, raw protected values, generated home configuration, or private repository references.
4. Confirm public help and `README.md` describe only supported public options.

## 2. Verify Vendored Project Contracts

The shipping runtime contract bundle is `contracts/apex-projects/v1/`. Before release:

1. Confirm `provenance.json` names the authoritative APIEase repository, source commit, source directory, and SHA-256 hash of the schema and every fixture.
2. Compare the vendored files with that exact APIEase commit. Do not copy a newer schema or individual fixture without updating the whole compatible bundle and provenance together.
3. Run the full suite. The contract tests compile the schema, execute the fixtures, reject contract drift, and verify every provenance hash.

```bash
./.codex/run_test_suite.sh
```

Do not release when the authoritative contract changed without a deliberate vendor update, when any recorded hash differs, or when any contract test fails.

## 3. Inspect the Package

Preview npm's file selection before creating a tarball:

```bash
npm pack --dry-run
```

Confirm the preview contains the public executable, shipping source, `README.md`, `package.json`, and the complete `contracts/apex-projects/v1/` schema, fixtures, and provenance file. Confirm it excludes tests, local configuration, `.git`, `.codex`, development-only files, and credentials.

Create and inspect the exact candidate tarball:

```bash
package_file=$(npm pack --silent)
tar -tf "$package_file" | sort
```

Do not publish a tarball whose contents differ from the reviewed dry-run output or omit any runtime contract asset.

## 4. Verify the Installed Artifact

Install the tarball into a clean temporary prefix rather than testing through the source checkout or `npm link`:

```bash
smoke_directory=$(mktemp -d)
npm install --prefix "$smoke_directory" "./$package_file"
"$smoke_directory/node_modules/.bin/apiease" --version
"$smoke_directory/node_modules/.bin/apiease" --help
```

The clean-prefix commands above are the required manual installed-artifact smoke check. The full suite must also include the repository's installed-package smoke coverage. Together they must prove the packaged executable starts under Node 20, exposes the intended public command tree, loads all shipping runtime modules and vendored contracts, and keeps JSON/noninteractive behavior independent of the source checkout.

Do not use live `init --from-existing-resources`, `pull`, `validate`, or `apply` as an unaudited smoke test: they require real shop authority and can read or mutate scoped project state. If an authenticated release candidate is tested, use an approved test shop and record the exact non-production verification separately.

## 5. Publish Conditionally

Publication is permitted only when all of the following are true:

- the full suite passes;
- package dry-run and tarball inspection pass;
- installed-artifact smoke verification passes;
- the version is not already published;
- the maintainer has the required npm account, organization, two-factor authentication, and publication authority;
- the reviewed tarball is the artifact being published.

Check npm identity and the target version before publishing:

```bash
npm whoami
npm view apiease@<version> version
```

A not-found result for the exact new version is expected. Any authentication, ownership, two-factor, provenance, registry, or network failure is an external blocker: leave the tested tarball release-ready, do not weaken npm security, and report the exact blocker.

When every gate passes, publish the reviewed tarball:

```bash
npm publish "./$package_file" --access public
```

After publication, verify the registry version and install it into another clean temporary prefix before creating the release tag or announcement. Never republish a changed artifact under the same version.
