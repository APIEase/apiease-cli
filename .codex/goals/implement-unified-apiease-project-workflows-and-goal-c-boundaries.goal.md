# Goal B — Implement the unified `apiease` Project CLI and prepare Goal C boundaries

## Objective

Extend the existing `apiease` npm package and executable with the project workflows finalized by the APIEase Apex Projects contracts, while preserving the compatible existing CLI commands.

Implement one unified CLI for personal terminal use and future Apex Codex worker use. Do not create an Apex-specific CLI, duplicate command tree, serializer, candidate representation, retry implementation, result model, or Project API client.

This goal owns the CLI implementation. It must also record the APIEase application and contract work that Goal C must complete before approval-required worker apply and deferred secure-value workflows can operate end to end. Do not invent those missing server contracts inside the CLI.

## Required working method

Before implementation, read and follow:

- `AGENTS.md`
- `.codex/AGENTS.md`
- `../apiease/docs/apiease-cli-project-api-handoff.md`
- `../apiease/docs/apex-projects.md`
- `../apiease/backend/common/apexProjectsContract.js`
- `../apiease/contracts/apex-projects/v1/apiease-project-contract.schema.json`
- every fixture under `../apiease/contracts/apex-projects/v1/fixtures/`
- the existing CLI architecture, tests, README, package exports, and release process
- the current `../apiease-template` project where template behavior is relevant

Follow the repository's mandatory TDD workflow. Run `.codex/run_test_suite.sh` before edits and after the complete change set. For each behavior change, add positive and negative targeted coverage, prove the targeted test fails before implementation, and then make it pass.

The APIEase schema, fixtures, constants, canonical bytes, outcomes, retry rules, and authority decisions are authoritative. Do not weaken, reinterpret, silently coerce, or independently redesign them. When a requirement in this statement needs a Goal C server-contract change, keep the CLI boundary focused and fail closed until the corresponding finalized APIEase schema and fixtures exist.

## Existing behavior that must remain compatible

- Keep the existing public executable named `apiease`.
- Preserve compatible `create`, `read`, `update`, `delete`, `init`, `upgrade`, and `--version` behavior.
- Preserve the existing regular `apiease init [project-name]` copy/materialization workflow. It may continue to use `../apiease-template` during local development and the existing installed-template materialization path in published usage.
- Do not convert regular `apiease init` into a Git clone.
- Treat `apiease init --from-existing-resources` as a distinct mode of the existing initializer.
- Do not redesign `apiease upgrade` for Project API checkouts in this goal. Preserve its existing behavior for projects initialized through the existing template-manifest workflow. Assume an Apex worker will not invoke `apiease upgrade` in the initial integration.

## Required Project API commands

Implement:

- `apiease init --from-existing-resources`
- `apiease pull`
- `apiease validate`
- `apiease apply`

There is no candidate project-test endpoint and no `apiease test` command. Validation is non-executing. After committed apply, runtime behavior is verified by a person through established live APIEase execution paths.

## Authentication and configuration

Project API requests require both:

- `x-apiease-api-key`
- `x-shop-myshopify-domain`

The shop domain is a lookup selector. It grants no authority by itself. APIEase must normalize it and verify that the supplied API key belongs to that exact shop before deriving project, repository, and actor authority.

Introduce an interchangeable authentication-adapter interface used by the common Project API client and command implementations.

Implement personal authentication with the two required headers. Reuse `ApiEaseHomeConfigurationResolver` and support explicit container-safe configuration with this precedence:

1. command flags
2. process environment variables
3. the existing selected `~/.apiease` environment file

Support `APIEASE_API_KEY`, `APIEASE_BASE_URL`, and `APIEASE_SHOP_DOMAIN`. Keep diagnostics secret-safe. Do not print API keys or include them in JSON output.

Goal B does not implement worker authentication. Worker authority remains fail-closed until Goal C supplies exact conversation-bound worker authentication and approval authority. Do not invent a worker header, unrestricted shared credential, capability format, or fallback from worker to personal authentication.

## Initialization from existing resources

`apiease init --from-existing-resources` must:

1. Use the existing optional project-name convention while keeping `.` as the default destination.
2. Require a new or empty destination suitable for cloning; do not merge a clone into an arbitrary populated directory.
3. Perform a real Git clone of the fixed public `APIEase/apiease-template` repository at `main` for this mode.
4. Preserve the clone as a normal Git checkout of the public template.
5. Call `POST /api/v1/projects/bootstrap` with both personal authentication headers.
6. Poll `PROJECT_BOOTSTRAP_PENDING` using the server-provided delay and the same logical request.
7. Verify all contract versions, template identity, advertised limits, file counts, resource mappings, exact file digests, and the aggregate snapshot digest.
8. Preserve the exact canonical bytes returned by APIEase.
9. Publish the complete verified direct managed-file namespace only after all verification succeeds.
10. Remove direct managed template sample files absent from the verified complete snapshot while preserving unmanaged template files and CLI intent/history directories.
11. Resolve operational state with `git rev-parse --git-path apiease/project-state-v1.json`; never assume the Git directory is `.git`.
12. Write returned local state only after the managed overlay succeeds.
13. Report success only after the complete operation finishes.

The command must never request, expose, authenticate to, or clone APIEase's internally provisioned private customer repository.

## Pull

`apiease pull` must reuse the same bootstrap, polling, verification, digest, overlay, and state-publication services as initialization.

It must:

- operate only in a valid initialized Project API checkout;
- recompute the current direct managed namespace digest and detect edits relative to ignored local baseline state;
- fail closed without changing files when local direct managed-file edits exist;
- support an explicit `--force` option that deliberately discards those direct managed-file edits after showing or returning a bounded warning;
- never automatically merge stale local and server source;
- preserve unmanaged files, deletion intent files, and archived resource files;
- replace operational state only after the verified managed publication succeeds;
- leave old operational state unchanged and report a local-integrity failure if publication fails.

Do not implement a multi-directory crash-recovery journal. Verify the complete artifact before publication, use safe individual file replacement where practical, write operational state last, and never report partial publication as successful. A local user can recover through Git; an ephemeral worker can discard the checkout and start again.

## Local deletion and archive convention

Represent explicit deletion intent with a resource source file moved into the corresponding family delete directory:

```text
resources/functions/delete/<handle>.json
resources/requests/delete/<handle>.json
resources/variables/delete/<handle>.json
resources/widgets/delete/<handle>.json
```

After a committed or replayed deletion, move the source file into the corresponding archive directory:

```text
resources/functions/archive/<handle>.json
resources/requests/archive/<handle>.json
resources/variables/archive/<handle>.json
resources/widgets/archive/<handle>.json
```

Deletion and archive directories are source-controlled local workflow artifacts, not canonical Project API managed files. They must never be placed in `candidate.files`, included in the aggregate managed snapshot digest, overwritten by bootstrap/pull, or interpreted as live resources.

Candidate construction must translate each valid delete file into an explicit, immutable-identity and resource-version-bound `candidate.deletions` entry using ignored local state. It must fail locally when:

- the resource is not an existing bound resource;
- the direct live source file and delete intent both exist;
- the delete file's resource type or handle does not match its path;
- duplicate or conflicting delete/archive intent exists;
- required identity or expected-version authority is missing.

Merely removing a direct working-tree resource file never means delete. Missing bound files without corresponding valid delete intent are local integrity failures.

Move delete intent to archive only after `PROJECT_APPLIED`, `PROJECT_APPLY_NO_CHANGE` when applicable, or `PROJECT_APPLY_REPLAYED` proves the deletion was committed. Never archive on validation, planning, transport failure, conflict, or approval-pending outcomes.

## Candidate construction

Build each candidate from the complete direct managed namespace, not merely changed files.

Required behavior includes:

- strict canonical path and UTF-8 validation;
- deterministic ordering of files and all contract arrays;
- exact canonical byte validation;
- exact file and aggregate digest calculation using the authoritative APIEase algorithm;
- resource bindings from ignored local state for every existing resource;
- create-if-absent semantics for unbound new resources;
- preservation of immutable identity across renames;
- explicit, version-bound deletion intent from the delete directories;
- no inference of deletion from an absent direct working-tree file;
- no operational IDs, versions, protected values, or other forbidden server state in canonical source;
- no logging, echoing, caching, or persistence of protected values.

Keep candidate construction, canonical encoding, digest verification, local-state management, managed publication, deletion intent, archive transitions, secure-value requirement reporting, and authentication in focused reusable services rather than command classes.

## Deferred secure-value behavior

The CLI does not collect, accept, echo, cache, or persist raw secure values.

Existing protected fields must preserve their current protected values through the finalized authoritative contract.

The intended follow-on behavior for a newly introduced protected request parameter or sensitive variable is:

- allow the resource and protected field definition to be validated, planned, and applied without supplying an actual protected value;
- persist the new protected target in an explicitly unset or deferred state;
- never treat the placeholder token or an empty string as the protected value;
- return only safe selectors identifying each required value, including resource type, handle, and field path;
- warn terminal users that they must configure the actual values in the APIEase UI;
- include the same safe warning in machine-readable results and future Apex approval review data;
- fail runtime use of an unset required protected value safely until the user configures it in the UI;
- project only the canonical secret-free placeholder to Git after UI configuration or other live changes.

Current Goal A version 1 does not support this end to end because a new protected target requires `replace` or an authorized `reference`, while `preserve` is invalid for a new target. Goal C in `../apiease` must define an explicit strict representation for deferred/unset protected values and update schemas, validators, mutation handlers, results, fixtures, documentation, UI behavior, and runtime failure behavior.

Until the finalized Goal C contract exists, do not invent a CLI-only secure-input mode or send an incompatible request. Keep the CLI boundary ready to consume safe required-secure-value selectors, and fail closed when the authoritative server contract cannot express the intended deferred state.

## Validate

`apiease validate` must:

- perform safe local schema, path, size, UTF-8, canonical-byte, and digest checks for early feedback;
- always submit the complete candidate to `POST /api/v1/projects/validate` when local checks succeed;
- treat server validation as authoritative;
- persist nothing;
- leave operational state and deletion/archive files unchanged;
- clearly state that validation does not execute resources or verify external runtime behavior;
- preserve safe required-secure-value selectors when the finalized server contract returns them.

## Apply without approval

Public personal-terminal `apiease apply` never asks for confirmation.

It must implement the exact immediate validate-plan-display-apply pipeline:

1. Construct one candidate and retain its exact logical value.
2. Validate it and require `PROJECT_VALID`.
3. Submit the identical candidate to `POST /api/v1/projects/plan`.
4. Require `PROJECT_PLAN_READY` or `PROJECT_PLAN_NO_CHANGE`.
5. Display or return the exact operations, summary, and safe deferred-secret warnings.
6. Generate one opaque operation key for the logical immediate apply.
7. Submit the identical candidate and exact returned operations to `POST /api/v1/projects/apply` with personal authority and no approval requirement.
8. Retry ambiguous apply results only with the same operation key and byte-equivalent logical input.
9. Treat `PROJECT_APPLY_REPLAYED` as committed success.
10. Update ignored local state and archive committed deletion intent only from a committed or replayed receipt.
11. Do not wait for asynchronous Git projection.
12. Explain that affected live resources still require human runtime verification and that listed deferred secure values must be configured in the APIEase UI.

The displayed plan is informational for a personal terminal invocation. The CLI does not pause or prompt before applying.

Never resolve baseline, resource-version, already-exists, idempotency, or projection conflicts automatically. Preserve the user's intended source and deletion files, require a verified pull, require deliberate reapplication, and use a new operation key for a new logical apply. Reuse the same key only for an ambiguous retry of the identical logical apply.

## Hidden approval-required worker boundary

Reserve a non-publicly documented `--require-approval` apply option for the Apex Codex worker path.

Do not show this option in public command help, README examples, or customer documentation. Cover its parsing and fail-closed behavior in automated tests.

The intended Goal C behavior is not a CLI prompt and does not keep the CLI or worker waiting for user input:

1. The initial Apex Codex worker is always associated with an Apex UI conversation and always invokes `apiease apply --require-approval`.
2. The CLI validates and plans through the same common implementation used by personal apply.
3. The CLI forwards the finalized approval-required field to the backend apply process.
4. Worker authentication lets the backend derive the exact shop, project, actor, and Apex conversation; the CLI does not accept arbitrary conversation authority from a user-controlled flag.
5. Instead of mutating live resources, the backend durably records the exact proposal and marks the associated conversation as requiring review.
6. The backend returns an asynchronous accepted/pending outcome, expected to use HTTP `202`, without waiting for user response.
7. The CLI and ephemeral worker exit successfully after reporting that the proposal is pending approval.
8. The Apex conversation UI presents the exact operations, summary, conflicts if any, and safe deferred-secure-value warnings.
9. Approval later commits exactly the reviewed proposal through backend authority; rejection commits nothing.
10. The initial worker integration always requires approval. A later conversation-level UI policy may allow trusted conversations to omit the requirement, but that bypass is not part of the initial Goal C behavior.

An approval-pending outcome is accepted but not committed. It must never update CLI operational state or move delete intent into archive.

Goal B must not fabricate the wire field, pending outcome, proposal identifier, approval evidence, or resume protocol before Goal C finalizes them. It may provide a focused option/request-policy boundary that remains fail-closed against the current worker-unavailable contract.

## APIEase Goal C follow-on requirements

Goal C in `../apiease` must complete and version the server-side contracts required by the hidden worker path and deferred secure values. At minimum it must:

### Shop-scoped personal authentication

- Amend the authoritative Project API documentation to require both `x-apiease-api-key` and `x-shop-myshopify-domain`.
- Normalize the domain and verify that the key belongs to that exact shop before parsing or acting on project input.
- Treat the shop header only as a selector, never as authority by itself.
- Update route tests, authentication tests, schemas or transport documentation, fixtures, and the CLI handoff.

### Conversation-bound worker authentication

- Replace `PROJECT_WORKER_AUTHORITY_UNAVAILABLE` only after an exact fail-closed worker authentication design exists.
- Bind worker authority to the exact shop, project, Apex conversation, proposal, reviewed operations, baseline, and permitted action.
- Use short-lived, least-privilege, approval-bound authority; do not use a shared unrestricted credential.
- Do not fall back from worker to personal authentication.

### Asynchronous proposal and approval persistence

- Add a strict approval-required field to the apply request contract.
- Define a stable pending outcome and HTTP status, plus strict result/error envelopes and compatibility fixtures.
- Persist the exact proposal durably before returning pending.
- Associate the proposal with the authenticated Apex conversation and expose a bounded review projection to that conversation.
- Do not place a potentially 25 MB complete candidate directly into the current conversation document, whose bounded turn/checkpoint structures are not designed as a full proposal store.
- Inventory existing Mongo documents first. Extend a suitable established ownership boundary when it is genuinely appropriate; otherwise introduce the smallest focused proposal persistence required.
- Store or reference enough immutable data to prove that approval applies to the exact candidate, baseline, operations, secure-value requirements, and operation key reviewed by the user.
- Define idempotent repeated submissions, pending replay, approval, rejection, expiration or cancellation if any, stale-baseline handling, and post-approval execution.
- Ensure no live resource mutation, `liveRevision` change, resource-version change, receipt claiming committed success, cache invalidation, provider work, runtime effect, or Git projection occurs before approval.
- After approval, recheck exact authority and concurrency and atomically commit only the reviewed proposal. A stale proposal must fail closed and require a fresh proposal/review.
- Ensure the approval UI cannot edit the candidate or operations while approving them.
- Return safe deferred-secret warnings in the review projection without returning protected values.

### Deferred secure values

- Add a strict explicit mode or equivalent versioned representation for creating a protected target without a value.
- Distinguish unset/deferred from preserve, reference, replace, empty string, and missing instruction.
- Persist only the protected target's unset state, never a placeholder as a secret.
- Return deterministic bounded safe selectors for every value the user must configure later.
- Support configuring those values through the authenticated APIEase UI.
- Make runtime use fail safely and clearly while a required protected value remains unset.
- Update canonical projection, validation, planning, apply, receipts, replay, UI, runtime services, schemas, fixtures, and documentation.

### Approval UI and continuation

- Present the exact stored plan and summary in the associated Apex conversation.
- Present the deferred-secret warning in the same review.
- Record approve or reject decisions against the exact proposal identity.
- Trigger or authorize asynchronous post-approval application without requiring the original CLI process to remain alive.
- Make the resulting committed or rejected outcome observable by the conversation and by future worker orchestration.
- Initially require approval for every Codex worker proposal.
- Defer any conversation-level setting that permits approval-free worker apply until its authority, audit, and user experience are explicitly designed.

## Machine-readable behavior

No existing Apex consumer contract in `../apiease` prescribes a CLI result envelope or numeric exit-code mapping. Define and document CLI result envelope version 1 for all new Project API commands.

Use one normalized command result as the source for both human and JSON rendering. JSON mode must emit exactly one JSON document on stdout. Progress and human guidance go only to stderr in JSON mode.

The envelope must contain stable fields for:

- CLI result version;
- command;
- success or accepted state;
- authoritative APIEase outcome when present;
- normalized result when present;
- normalized error when present;
- bounded, deterministic, secret-safe diagnostics;
- safe deferred-secure-value selectors when present.

Define stable exit-code constants with this mapping:

- `0`: success, including a valid asynchronous approval-pending acceptance;
- `1`: unexpected internal failure;
- `2`: usage or configuration failure;
- `3`: authentication or authorization failure;
- `4`: validation or contract failure;
- `5`: concurrency, idempotency, already-exists, or projection conflict;
- `6`: local integrity, state, Git checkout, or managed-publication failure;
- `7`: exhausted retry or service/transport failure.

Preserve authoritative APIEase outcome and error codes. Never collapse a committed result and an approval-pending accepted result into the same outcome. Local and container execution must use identical output and exit semantics.

## Retry behavior

Make clocks, delays, request timeouts, and retry policies injectable for deterministic tests.

Implement:

- bootstrap `202` polling after the exact server-provided delay with the identical logical request;
- `429` retry no earlier than `Retry-After`;
- eligible bootstrap, validate, and plan transport failure or `503` retry with byte-identical requests and bounded backoff;
- ambiguous immediate apply retry with the same operation key and byte-equivalent logical input;
- apply replay as committed success;
- immediate stop on idempotency conflict;
- no retry for unchanged authentication, contract, validation, or concurrency failures;
- no local-state mutation after validation, planning, transport failure, conflict, or approval-pending acceptance.

Use one initial attempt plus at most three retries for eligible failures. Use generous documented and injectable request/polling deadlines so apply and bootstrap are not cut off by a short arbitrary timeout. Tests must not depend on wall-clock waiting.

## Contract compatibility and provenance

Consume the finalized APIEase schema and fixtures as executable compatibility inputs.

Tests must prove that the CLI:

- generates requests accepted by the named schemas;
- strictly validates API responses;
- rejects unsupported versions and incompatible unknown fields;
- passes all applicable success and failure fixtures;
- independently recomputes file and aggregate digests;
- rejects tampered bytes, ordering, counts, mappings, bounds, or digests;
- does not silently downgrade or coerce contracts;
- requires both personal authentication headers;
- keeps approval-required worker behavior fail-closed until the Goal C contract is present;
- never emits or persists protected values.

Vendor the finalized runtime schema and required fixtures into the published CLI package. Record their APIEase source commit and SHA-256 hashes so contract drift is visible. Do not pin the currently superseded bundle if APIEase Goal C changes it before implementation.

## Portability and packaging

The same shipping `apiease` executable and command core must work:

- on a developer machine using personal configuration;
- in a minimal Node 20 container using explicit flags or process environment;
- without an interactive terminal when JSON/noninteractive options are supplied;
- from any working directory;
- in normal Git repositories and linked worktrees;
- without assuming the Git directory is `.git`;
- without Kubernetes, Helm, a writable home directory, or runtime access to the APIEase application repository.

Update package exports, published file contents, command help, README, release documentation, and package/installed-artifact smoke tests. Keep `--require-approval` absent from public help and customer documentation.

Choose an appropriate semantic version. Run the complete test suite, `npm pack --dry-run`, and an installed-package smoke test. Publish only when all tests pass and required npm authority is available; otherwise leave a release-ready package and report the exact external blocker.

## Acceptance criteria

Goal B is complete when:

1. The four Project API workflows operate through the unified `apiease` executable against the finalized applicable APIEase contracts.
2. Existing compatible commands, including regular `init` and existing `upgrade` behavior, remain intact.
3. Init and pull accept only completely verified synchronized artifacts.
4. Pull protects local direct managed-file edits by default and overwrites them only with explicit `--force`.
5. Managed overlays are fully verified before publication, and operational state changes only after publication succeeds.
6. Candidate construction is deterministic and preserves exact concurrency authority.
7. Deletion is expressed only through valid delete-directory intent, is always explicit and version-bound, and moves to archive only after committed success.
8. Delete and archive directories remain outside canonical candidates and survive pull.
9. Protected values never enter canonical source, local state, output, logs, fixtures, delete/archive files, or diagnostics.
10. Existing protected values preserve correctly.
11. The CLI exposes safe deferred-secret warnings and never accepts raw secret entry; full creation of unset protected targets remains fail-closed until Goal C finalizes that contract.
12. Personal apply never prompts, displays or returns the exact plan, and commits immediately when valid.
13. Ambiguous immediate apply retries are idempotent.
14. Conflicts never weaken authority or trigger automatic merging.
15. Personal authentication requires and verifies both API key and shop domain.
16. The worker-authentication and hidden approval-required boundaries exist without inventing unsupported authority.
17. Approval-pending behavior never masquerades as committed success or mutates local state.
18. JSON output and exit codes are stable, deterministic, and secret-safe.
19. Local and container-style invocation use the same command implementation.
20. Finalized applicable APIEase schemas and fixtures pass as executable compatibility tests.
21. The published package contains every required runtime and contract asset.
22. Targeted red-to-green tests and the final full suite pass.
23. Documentation accurately describes public commands, configuration, conflicts, deletion/archive behavior, deferred-secret UI requirements, security boundaries, and post-apply human runtime verification.
24. The Goal C APIEase requirements in this statement are preserved as explicit blockers/follow-on work and are not silently approximated in the CLI.

Commit message: `Implement unified APIEase project workflows.`
