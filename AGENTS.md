# Repository Guidelines

> Note: If a `.codex/AGENTS.md` file exists in this project, Codex must use it in addition to this root `AGENTS.md`. This file defines project-wide coding standards, architecture, and naming conventions. `.codex/AGENTS.md` defines Codex workflow behavior (TDD rules, task scoping, and automation flow). Both files apply, with this root file taking precedence for coding standards.
> Always reread this file before writing code or tests.

## Project Structure & Module Organization
- `src/` contains the shipping CLI/library code.
- `src/cli/` holds command orchestration and argument parsing for `create`, `init`, and `upgrade`. Keep stdout/stderr formatting and exit-code behavior here.
- `src/client/` contains reusable APIEase client logic and request contract validation.
- `src/config/` contains configuration readers for `~/.apiease` and related environment resolution.
- `src/project/` owns `.apiease/project.json` reads/writes plus upgrade planning and application behavior.
- `src/template/` resolves the template source, template version, template manifest, and customer-owned versus template-managed paths.
- `src/integration/` is for end-to-end workflow helpers that coordinate multiple services, such as the public CRUD exercise.
- `src/index.js` is the package entrypoint. Keep the public export surface minimal and intentional.
- `bin/` contains the public command entrypoints. Keep `bin/apiease-cli` as a thin shell wrapper and `bin/apiease-cli.js` as thin wiring only.
- `scripts/` contains repo utility scripts and manual verification helpers. Do not move reusable business logic here; keep that in `src/`.
- `data/` contains sample/manual input data used for local exercises.
- `reserve/` contains reserved package placeholders and related manifest artifacts. Keep it isolated from the main CLI implementation.
- `test/` mirrors `src/` and also covers package-level, bin-level, and script-level behavior.
- `test/src/` should mirror `src/` for unit coverage. Use `test/bin/`, `test/scripts/`, and similar top-level folders for entrypoint-specific tests.
- Always include hidden files when searching (for example `rg --files -uu`).

## Mandatory Development Protocol (Hard Rule)
- For any behavior change (new feature, bugfix, regression fix, CLI contract change, or upgrade-flow change), the following is mandatory:
  1. Run the full test suite before any file edits.
  2. If tests fail, remediate those failures before any behavior-specific implementation.
  3. Add or update tests for the new behavior and include at least one positive and one negative case.
  4. Run the targeted test(s) and confirm they fail (`red`).
  5. Implement only the minimal source changes required.
  6. Re-run the same targeted test(s) until they pass (`green`).
  7. Repeat 3→6 for each additional behavior change if needed.
  8. Run the full test suite again after the behavior updates pass at least one full red→green cycle.
- You must not implement source changes without a currently failing targeted test proving the behavior gap.
- You must not skip full suite runs; one before changes and one at the end of the change set.
- If any step cannot be completed (missing command, flaky suite, blocked environment), ask for user direction before making behavior changes.

## Build, Test, and Development Commands
- `npm install`: install package dependencies for local development.
- `npm run test`: run the full suite with Node's built-in test runner (`node --test`).
- `.codex/run_test_suite.sh`: run the repository's required full-suite wrapper from any working directory.
- `npm link`: expose the local `apiease` command globally for manual CLI testing.
- `./bin/apiease-cli ...`: run the local CLI without linking.
- `node scripts/runPublicCrudExercise.js`: run the manual public CRUD exercise using environment variables or `~/.apiease` configuration.

## Coding Style & Naming Conventions
- Use ES modules, two-space indentation, and the formatting patterns already established in neighboring files.
- Prefer plain JavaScript (`*.js`) and Node 20 standard-library APIs. Do not introduce TypeScript unless the task explicitly requires it.
- Reusable implementation code should usually be a class in `src/`. Keep entrypoints and small helper scripts thin and function-based when that fits the existing pattern.
- Do not store multiple primary classes in one file. Each class should live in its own file with a matching test file in the mirrored `test/` path.
- Keep `bin/` and `scripts/` thin. Argument parsing, API calls, template logic, configuration parsing, and upgrade behavior belong in `src/`.
- Public CLI output, error text, and exit codes are part of the contract. When changing them, update or add tests that assert the exact behavior.
- Variable and function names should be descriptive and use camelCase. Avoid single-letter names except in very small conventional scopes.
- Class names should use PascalCase.
- Do not shorten constructor argument names; retain the expected incoming class or object name.
- Follow established patterns used by neighboring files for exports, constructors, dependency wiring, and method shape.
- Do not add defensive safeguards around required constructor-injected dependencies. Fail fast when required collaborators are missing.
- Avoid temporary compatibility layers during refactors. Implement the desired end state directly and fix wiring at the source.
- Do not use static methods for internal helper logic. Keep helper methods as normal instance methods unless a true class-level API is required.
- Use consistent names for the same concepts across CLI commands, project metadata, manifest entries, and tests.
- Place class definitions near the top of the file; keep helper functions below and add unit tests for them.
- Almost every code file should be a class where appropriate. Even utility functions should be grouped into classes.
- Prefer lodash utility functions over custom parsing/normalization helpers when lodash already provides the behavior needed.

## Testing Guidelines
- This repository uses Node's built-in test runner and assertions: `node:test` and `node:assert/strict`, not Jest.
- Mirror source paths under `test/src/` for unit tests. Keep entrypoint and package-manifest tests in focused top-level test folders such as `test/bin/` and `test/scripts/`.
- Follow the prevailing test style in the touched area. Most source tests use `describe`/`it`; simpler package-level checks may use a single `test(...)` when that is already the local pattern.
- Unit tests should mock only constructor-level collaborators of the class under test.
- Prefer hermetic tests: use temporary directories, fake fetch implementations, and injected collaborators instead of real network calls or user-home mutations.
- For CLI tests, capture stdout/stderr with writable doubles and assert both output text and exit codes.
- Any new production file or new public method should include corresponding test coverage in the same change set.
- During red/green work, run the targeted tests for the files you changed. Full suite runs are still required before and after the task.
- Tests should be in the format:
```javascript
describe('MyClass', () => {
  describe('myFunction', () => {
    it('should do something expected', () => {
      // Arrange

      // Act

      // Assert
    });
  });
});
```

## Related Repositories
- `../apiease-template` is the canonical starter project used by `apiease init` and `apiease upgrade`. Use it as the primary reference for template-copy and template-upgrade behavior.

## Documentation Guidelines
- `README.md` is the primary user-facing documentation for this repository. Update it when command behavior, flags, environment requirements, template behavior, or upgrade semantics change.
- Keep CLI examples aligned with the actual public command name `apiease` and the current local-development workflow.
- `docs/knowledgebase/apiEaseDocsConsolidated.md` is a generated import from the separate `../apiease-docs` project. Agents must never directly edit or patch any `apiEaseDocsConsolidated.md` file. Refresh requests must use the supported build and pull scripts.
- The normal APIEase documentation flow is:
  1. Make source documentation changes in `../apiease-docs`.
  2. Run `npm run knowledge:build` and `npm run knowledge:check` from `../apiease-docs/docs`.
  3. Run `npm run knowledge:pull-local` from each available consumer repository root: `../apiease`, `../apiease-template`, and this repository.
  4. Verify each import with `npm run knowledge:pull-local -- --check`.
- Scripted generation and imports are the preferred follow-up to public documentation changes and do not require a separate user request. If a repository is unavailable or a command fails, report the remaining refresh step; never compensate by directly editing a consolidated file.

## Commit & Pull Request Guidelines
- Write imperative commit subjects under about 72 characters (for example `Add upgrade conflict reporting`).
- Every implementation handoff must include a proposed commit message ending with a period, even if the user did not ask for one. Put it in the final completion summary as a dedicated line starting with "Commit message:".
- PRs should include a concise summary, the test commands you ran, and any notable contract changes such as new flags, output changes, metadata changes, or template upgrade behavior.
- Call out changes that affect the generated project template or `.apiease/project.json` semantics.

## Security & Configuration Tips
- Never commit real API keys or populated home-directory env files.
- Reuse `ApiEaseHomeConfigurationResolver` for `~/.apiease` parsing instead of introducing ad hoc environment-file readers.
- Treat `.apiease/project.json` as durable project metadata. Preserve backward-compatible behavior unless the task explicitly changes that contract.
- For local development, the template source resolves to `../apiease-template`; production-oriented changes must preserve the public template repository metadata used by the CLI.

## APIEase - Parent project reference
- `docs/knowledgebase/apiEaseDocsConsolidated.md` is the primary local reference for overall APIEase product and platform knowledge in this repository.
- `docs/knowledgebase/apiEaseDocsConsolidated.md` is generated outside this repository by consolidating documentation in `../apiease-docs`; consult it as reference material and refresh it only through the scripted documentation workflow above.
- AI agents should consult `docs/knowledgebase/apiEaseDocsConsolidated.md` first when they need broad APIEase context, feature background, terminology, or high-level product behavior.
- The APIEase main app project is located at ../apiease.
- - `../apiease` can be used as a product/API reference when verifying request payload expectations or broader APIEase concepts, but do not import its app-specific structure rules into this CLI repository.
- Use that project for reference on how APIEase works.
- Use ../apiease/app/routes/api/api.v1.resources.*.jsx as a reference for how to implement new API endpoints.

## Feature Documentation
- The APIEase Documentation is in a separate project at ../apiease-docs.
- The ../apiease-docs project uses Docusaurus.
- Use `docs/knowledgebase/apiEaseDocsConsolidated.md` in this repository for consolidated AI-agent context about APIEase before consulting the external docs project for page-level documentation edits.
- When asked to document a new feature find the appropriate location in ../apiease-docs and create a new markdown file using existing markdown files for reference.
- Update the sidebar.js file in ../apiease-docs to include the new documentation page in the appropriate location.
- When asked to update existing documentation find the appropriate markdown file in ../apiease-docs and make the necessary changes.
