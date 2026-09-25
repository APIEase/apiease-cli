# Maintainer Release Process

This document is for maintainers publishing packages from this repository.

## Package Layout

This repository publishes one npm package from the repository root: `apiease`.

## Test Locally Without Publishing

From your local `apiease-cli` checkout, install dependencies and expose the local CLI globally:

```bash
cd /path/to/apiease-cli
npm install
npm link
apiease --version
```

You can then run `apiease` from any directory. The command uses your local checkout, so source changes take effect on the next invocation without publishing or running a build step.

To test without creating a global link, invoke the local CLI directly:

```bash
/path/to/apiease-cli/bin/apiease-cli --help
```

### Switch Back to the Published Version

Remove the global link and install the latest published package:

```bash
npm unlink -g apiease
npm install -g apiease@latest
apiease --version
```

The `apiease` command now uses the npm-published version. Your local checkout remains untouched. Run `npm link` from the CLI checkout again whenever you want to resume testing local changes.

## Release the CLI

1. Confirm you are logged in to the correct npm account:

```bash
npm whoami
```

2. If `npm whoami` fails or shows the wrong account, log in before publishing:

```bash
npm login
```

3. Update the root package version.

Use `npm version` to bump the package version automatically:

```bash
npm version patch
```

If you do not want `npm version` to create a git commit and tag as part of the version bump, use:

```bash
npm version patch --no-git-tag-version
```

`npm version` does not choose a bump type automatically. Replace `patch` with `minor`, `major`, or an exact version such as `0.1.2`. By default, `npm version` updates the package version, writes the lockfile changes, and creates a git commit plus tag. `--no-git-tag-version` keeps the file updates but skips the automatic git commit and tag creation.

4. Run the full test suite from the repository root:

```bash
./.codex/run_test_suite.sh
```

5. Test the unpublished CLI directly from this repository before publishing:

```bash
./bin/apiease-cli --help
```

If you are testing from a sibling project such as `apiease-examples`, invoke this repository's local command by path:

```bash
../apiease-cli/bin/apiease-cli --help
```

6. Optionally inspect the package contents before publishing:

```bash
npm pack --dry-run
```

7. Publish the CLI package from the repository root:

```bash
npm publish
```

8. Verify the published version:

```bash
npm view apiease version
```

9. Optionally verify the installed command:

```bash
npm install -g apiease
apiease --help
```

## Notes

- The published npm package name is `apiease`.
- The installed public command exposed by that package is `apiease`.
