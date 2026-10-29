# apiease

`apiease` is a Node-based CLI for bootstrapping APIEase projects and managing APIEase `request`, `widget`, `variable`, and `function` resources.

## Requirements

- Node.js 20 or newer

## Install

Install from npm:

```bash
npm install -g apiease
```

For local development from this repository:

```bash
npm install
```

To expose the command globally while working locally:

```bash
npm link
```

In both cases, the installed command is:

```bash
apiease
```

To confirm the installed CLI version:

```bash
apiease --version
```

## Commands

```bash
apiease --version
apiease init [project-name]
apiease init [project-name] --from-existing-resources [--base-url <url>] [--shop-domain <shop-domain>] [--api-key <api-key>] [--json]
apiease pull [--force] [--base-url <url>] [--shop-domain <shop-domain>] [--api-key <api-key>] [--json]
apiease design-context [--resource-path <path>...] [--base-url <url>] [--shop-domain <shop-domain>] [--api-key <api-key>]
apiease validate [--base-url <url>] [--shop-domain <shop-domain>] [--api-key <api-key>] [--json]
apiease apply [--require-approval] [--base-url <url>] [--shop-domain <shop-domain>] [--api-key <api-key>] [--json]
apiease rename <request|widget|variable|function> <old-handle> <new-handle> [--json]
apiease upgrade
apiease upgrade [--check]
apiease upgrade --dry-run
apiease create <request|widget|variable|function> --file <path> [--base-url <url>] [--shop-domain <shop-domain>] [--api-key <api-key>] [--auto-update-source-identifier] [--json]
apiease read request --request-handle <handle> [--base-url <url>] [--shop-domain <shop-domain>] [--api-key <api-key>] [--json]
apiease read widget --widget-handle <handle> [--base-url <url>] [--shop-domain <shop-domain>] [--api-key <api-key>] [--json]
apiease read variable --variable-handle <handle> [--base-url <url>] [--shop-domain <shop-domain>] [--api-key <api-key>] [--json]
apiease read function --function-handle <handle> [--base-url <url>] [--shop-domain <shop-domain>] [--api-key <api-key>] [--json]
apiease update request --request-handle <handle> --file <path> [--base-url <url>] [--shop-domain <shop-domain>] [--api-key <api-key>] [--json]
apiease update widget --widget-handle <handle> --file <path> [--base-url <url>] [--shop-domain <shop-domain>] [--api-key <api-key>] [--json]
apiease update variable --variable-handle <handle> --file <path> [--base-url <url>] [--shop-domain <shop-domain>] [--api-key <api-key>] [--json]
apiease update function --function-handle <handle> --file <path> [--base-url <url>] [--shop-domain <shop-domain>] [--api-key <api-key>] [--json]
apiease delete request --request-handle <handle> [--base-url <url>] [--shop-domain <shop-domain>] [--api-key <api-key>] [--json]
apiease delete widget --widget-handle <handle> [--base-url <url>] [--shop-domain <shop-domain>] [--api-key <api-key>] [--json]
apiease delete variable --variable-handle <handle> [--base-url <url>] [--shop-domain <shop-domain>] [--api-key <api-key>] [--json]
apiease delete function --function-handle <handle> [--base-url <url>] [--shop-domain <shop-domain>] [--api-key <api-key>] [--json]
```

## Initialize a Project

Create a new project from the local template repository:

```bash
apiease init my-project
```

Initialize the current directory, for example after cloning an empty GitHub repository:

```bash
git clone <your-empty-repo-url>
cd <your-repo-directory>
apiease init .
```

If you are already in the target directory, `apiease init` defaults to the same behavior as `apiease init .`.

Current behavior:

- During local CLI development, the CLI resolves the template from `../apiease-template`.
- In installed usage, the CLI downloads the template from [kevinstl-org/apiease-template](https://github.com/kevinstl-org/apiease-template).
- The template is copied directly into `./my-project`.
- The CLI writes project metadata to `.apiease/project.json`.
- The metadata includes the template git version and a manifest of template-managed file hashes.
- Customer-owned template files are copied but excluded from the stored manifest: `CUSTOM_README.md` and `CUSTOM_AGENT_GUIDANCE.md`.
- The template-owned `README.md` is tracked in the manifest and can be refreshed by `apiease upgrade` like other managed template files.
- The template `.git` and `.idea` directories are excluded.
- `node_modules` is excluded if it exists in the template.
- Existing files and folders are allowed when they do not collide with template paths.
- Existing template files with identical content are reused instead of treated as collisions.
- Existing conflicting files are preserved, skipped, and reported after init completes.
- Skipped conflicting files are not added to the stored template manifest, so future `upgrade --dry-run` output continues to show them as conflicts until you resolve them.

Expected output:

```text
Creating APIEase project: my-project
Using template: ../apiease-template
Project created successfully.

Next steps:
cd my-project
git init
```

For existing directories:

- The CLI reports `Initializing APIEase project: ...` instead of `Creating APIEase project: ...`.
- The CLI reports `Project initialized successfully.` instead of `Project created successfully.`
- The CLI reports skipped existing conflicting paths instead of overwriting them.
- The CLI omits `git init` when the destination already contains a `.git` directory.
- The CLI omits the entire `Next steps:` section when there are no remaining next steps to show.

To initialize a project from resources already stored in APIEase, use
`apiease init --from-existing-resources`. APIEase deterministically normalizes
legacy records where possible. If an individual record still cannot be safely
represented, initialization continues with the valid resources and the CLI
reports the skipped resource, its safe diagnostic codes, and that the APIEase
record was not deleted. JSON output includes the same records in
`result.skippedResources`.

### Initialize from Existing APIEase Resources

This mode is distinct from regular `apiease init`:

```bash
apiease init my-project --from-existing-resources
```

- The destination defaults to `.` when `[project-name]` is omitted.
- The destination must be new or empty. The CLI does not merge this checkout into a populated directory.
- The CLI performs a real clone of the public `APIEase/apiease-template` repository at `main` and preserves it as a normal Git checkout. It never clones or requests access to an internal customer repository.
- After cloning, the CLI obtains a stable canonical snapshot directly from APIEase's Mongo authority, verifies its contract versions, template identity, counts, limits, mappings, exact file digests, and aggregate resource snapshot digest, and only then publishes the complete direct managed namespace. The resource snapshot digest covers canonical files under `resources/`; `.apiease/project.json` remains independently verified project and template metadata but does not affect the live Mongo resource baseline.
- Initialization does not read or wait for the store repository, its GitHub availability, repository provisioning, or asynchronous reconciliation.
- Template sample files absent from the verified snapshot are removed. Unmanaged template files and local workflow directories remain untouched.
- Operational Project API state is stored at the path Git resolves for `apiease/project-state-v1.json`, including in linked worktrees. It is ignored local state, not canonical source.
- Managed files and operational state are not published when artifact verification fails. Operational state is written last after a successful managed overlay.

Project API authentication requires both the API key and the matching shop domain. The shop domain selects the shop; it does not grant authority by itself.

## Project API Workflow

Run Project API commands from anywhere inside a checkout initialized with `apiease init --from-existing-resources`, or after the first successful `apiease pull` in a plain `apiease init` checkout. These commands use the repository top level resolved by Git.

Plain `apiease init` copies the starter files and records template upgrade metadata; it does not authenticate or establish a Project API baseline. Run `git init` if needed, then `apiease pull` to initialize that checkout from APIEase. `apiease validate` remains read-only and explains this recovery step until initialization succeeds. Use `init --from-existing-resources` when starting in a new or empty destination.

### Read installed instructions

Resource instructions are developer-written Markdown explaining how to create and
edit requests, widgets, variables, and functions. `apiease init` installs a checked
copy in `docs/resource-instructions/`; `apiease upgrade` maintains it. A script
copies content from APIEase's authoritative instruction bundle; it does not author
the instructions. Resource JSON under `resources/*` is the project source you edit.

Project instructions in `AGENTS.md`, `README.md`, and
`docs/shared-ongoing-ai-guidance.md` explain project structure and the CLI workflow.
Start with `AGENTS.md` and `docs/resource-instructions/README.md`. Read the index's
small required core and adapter envelope, then modules for the resource family,
request type, and provider involved. Reading instructions requires neither store
authentication nor a sibling APIEase checkout. Keep customer intent in the
conversation and durable project decisions in `CUSTOM_*` files.

1. Initialize with `apiease init my-project --from-existing-resources` and enter it.
   Plain `apiease init my-project` installs the template without authentication;
   use `git init` if needed and `apiease pull` to establish synchronization before
   project validation or apply.
2. Read installed project instructions and applicable resource instructions.
3. Inspect relevant resource JSON and dependencies, then edit canonical files.
4. Run `apiease validate` for the complete project without executing resources.
5. Run `apiease apply` when authorized, or `apiease apply --require-approval` for
   deferred review. Git diffs present edits; they grant no mutation authority.
6. When notified, preview `apiease upgrade --dry-run` and upgrade template files.

### Inspect project status

Use `apiease design-context` for current **project status**: resource inventory,
dependencies, local changes, and a **baseline check**. It requires authentication
and an initialized checkout, but is optional for reading instructions.

```bash
apiease design-context
apiease design-context --resource-path resources/requests/read-product-page.json
```

The **synchronization baseline** is the server state recorded after successful
synchronization or apply. A baseline check compares that recorded state with
current server state to detect intervening changes. It is separate from detecting
local edits and does not use Git commits as authority.

The command returns one JSON result on stdout. `result.inventory`, `dependencies`,
and `dependencyDiagnostics` cover the whole project. `localEdits.hasManagedEdits`
compares local content with the synchronization baseline; `differencesFromServer`
contains creates and updates relative to current server resources.
`baselineCheck.status` is `current` or `changed`, with details in `conflicts`.
A successful status read returns exit code 0 even when the baseline changed.
Reconcile deliberately before apply; validation and apply still enforce server
concurrency checks. Status does not synchronize or authorize changes.

`canonicalBodies` contains only sources selected with repeated `--resource-path`;
it is empty by default. Selection does not narrow inventory, dependencies,
validation, or apply. The command writes no instruction cache or context files.
Authentication and transport failures have no stale-state fallback.

Migration: instruction downloads, `--inline`, `--output-dir`, and
`--project-requirements` are retired. Read installed instructions after `init` or
`upgrade`; keep requirements in the conversation or `CUSTOM_*` files. Scripts must
consume the status fields above instead of `protocol`, `readFirst`, `files`, or
`cache`. CLI and server require design-context contract version 3; deploy them
together. Versions 1 and 2 fail explicitly. Other Project API and CLI JSON envelope
versions are unchanged. Invalid options exit 2; authentication/authorization,
contract, checkout-integrity, and service errors retain their existing exit codes.

### Pull Verified Resources

```bash
apiease pull
```

`pull` fetches and verifies the same stable Mongo-authoritative snapshot used by existing-resource initialization. It does not read or wait for the store repository, its GitHub availability, repository provisioning, or asynchronous reconciliation. It refuses to change files when the direct managed namespace differs from the ignored local baseline. It does not merge stale local and server source.

`pull` and `init --from-existing-resources` write resource JSON with two-space indentation, canonical key and array ordering, and a final LF newline. Existing compact resource files remain supported and become formatted on the next successful pull. `rename` also writes the two-space format; validation, apply, deletion intent, and archives accept both encodings.

The CLI verifies the exact server artifact bytes before formatting local files. It converts local resource files back to the canonical wire encoding in memory for validation, change-set construction, hashes, and baseline comparisons. Switching between the compact and two-space encodings does not count as a resource edit; actual source changes still require reconciliation or explicit `--force`. Server hashes, resource versions, and stored baselines keep their existing meaning. Other indentation, reordered keys or canonical arrays, malformed JSON, and invalid resource fields remain invalid.

For a recognized legacy template checkout containing `cliVersion` and `template.manifest`, the first pull verifies the authenticated bootstrap before publishing canonical files, project identity, bindings, and the baseline. It preserves the existing directory, Git history and remotes, configuration, documentation, and unrelated files. The original template metadata is retained in `.apiease/template.json`, which `apiease upgrade` then reads and updates independently of operational `.apiease/project.json`.

Legacy recovery accepts empty resource directories and existing direct resource files whose canonical wire encoding exactly matches the verified snapshot. Conflicting, unrecognized, or noncanonical resource files require backup and deliberate reconciliation before retrying; `--force` cannot discard unbound legacy files. Malformed metadata, existing incompatible operational state, and project/shop identity mismatches stop recovery. Artifact digests and resource mappings are always verified.

To deliberately discard direct managed-file edits and replace them with the verified server snapshot:

```bash
apiease pull --force
```

The forced command reports a bounded warning. Both forms preserve unmanaged files and the `delete` and `archive` workflow directories. Operational state is replaced only after managed publication succeeds; a publication failure is a local-integrity failure and leaves the previous state unchanged.

### Validate a Project

```bash
apiease validate
```

`validate` builds the complete Canonical Resource Change Set, performs local schema, canonical path, size, UTF-8, canonical-byte, and digest checks, and then submits the change set for authoritative server validation. It does not persist state, move deletion files, execute resources, call external providers, or verify runtime behavior.

### Apply a Project

```bash
apiease apply
```

Personal terminal apply is immediate and noninteractive. The CLI builds one complete Canonical Resource Change Set containing the exact Mongo baseline, verified bindings, explicit deletion intent, and safe secure-input instructions. It validates and plans that change set, displays the exact plan, and submits the same change set for synchronous apply through the shared backend pipeline. It does not ask for confirmation. In JSON mode the plan is returned in `result.plan`.

To submit the same personal change set for deferred review without mutating live resources:

```bash
apiease apply --require-approval
```

The server stores the exact immutable Project Change Artifact and creates a pending Project Proposal. The CLI returns proposal metadata and leaves local state and deletion files unchanged until a later approved apply commits the artifact. Git diff remains local presentation and is never the submitted artifact.

After a committed or replayed receipt, the CLI updates ignored local state and archives receipt-proven deletion intent. It does not wait for asynchronous Git projection. Even after successful server validation and atomic persistence, a person must verify affected live resources through the established APIEase execution paths.

The CLI never resolves baseline, resource-version, already-exists, or idempotency conflicts automatically. On conflict, preserve the intended source and deletion files, run a verified `apiease pull`, reconcile deliberately, and run `apiease apply` again. A new invocation is a new logical apply; only an ambiguous retry of the same logical request reuses its operation key.

### Rename a Bound Resource

Use the rename command instead of manually renaming a bound resource file:

```bash
apiease rename request old-handle new-handle
```

The supported resource types are `request`, `widget`, `variable`, and `function`. Handles must be lowercase slugs containing letters, numbers, and hyphens. The command atomically moves the canonical file, rewrites its handle, and updates the ignored binding path while retaining immutable resource authority. The rename is local only; run `apiease apply` to modify APIEase.

Manually removing or renaming a bound direct resource file is not a deletion or rename. It is a local-integrity failure.

### Delete and Archive Resource Source

Express deletion by moving the canonical source file into its resource family's `delete` directory:

```text
resources/functions/delete/<handle>.json
resources/requests/delete/<handle>.json
resources/variables/delete/<handle>.json
resources/widgets/delete/<handle>.json
```

The file must remain canonical and its type and handle must match its path. The resource must already have an ignored local-state binding with immutable identity and an expected resource version. A live direct source file and delete intent cannot coexist. Conflicting or duplicate delete/archive intent fails locally.

After apply proves the deletion committed, the CLI moves the file to the corresponding archive directory:

```text
resources/functions/archive/<handle>.json
resources/requests/archive/<handle>.json
resources/variables/archive/<handle>.json
resources/widgets/archive/<handle>.json
```

Delete and archive files are source-controlled workflow artifacts. They are excluded from canonical change sets and snapshot digests, survive pull, and are never archived by validation, planning, conflicts, or transport failures.

### Protected and Deferred Values

Canonical source, operational state, output, logs, deletion files, and archives must never contain raw protected values. Existing protected targets use the canonical preserve placeholder and retain their server-side values.

The CLI does not accept secure values. The current version 1 server contract cannot create a newly protected target in an unset/deferred state, so that case fails closed. When a finalized server contract reports `requiredSecureValues`, the CLI returns only safe selectors (`resourceType`, `handle`, and `fieldPath`) and warns you to configure every listed value in the authenticated APIEase UI before runtime use. An unset required value must not be treated as an empty string or placeholder value.

## Check for Template Upgrades

`apiease upgrade` updates project instructions, installed resource instructions,
and other template-managed files. It preserves `CUSTOM_*` guidance, resource JSON,
and operational bindings and synchronization state.

```bash
apiease upgrade --check
apiease upgrade --dry-run
apiease upgrade
apiease upgrade --on-conflict ignore
apiease upgrade --on-conflict overwrite
```

`--check` and `--dry-run` compare actual files and manifests as well as the recorded
template version; neither writes files. Exit code 0 means current; 1 means changes,
conflicts, or a failed check. `--dry-run --on-conflict overwrite` previews which
conflicting files would be replaced.

Unchanged managed files update normally. Differing local content is a conflict.
If the installed instruction manifest declares a higher protocol version, the CLI
reports it as newer; differing hashes and modification times do not establish age.
Interactive upgrades offer **Overwrite** or **Ignore**, defaulting to Ignore.
Scripts and agents use `--on-conflict overwrite|ignore`. Without an explicit
overwrite choice, noninteractive upgrades preserve and report conflicts without
prompting. Overwrite applies only to template-managed paths.

Resource instructions and their project entry points resolve as one set, so
ignoring a conflict preserves a coherent instruction set. Ignored paths remain
pending in template metadata and are not marked updated. An upgrade with unresolved
conflicts exits 1. Move custom guidance to `CUSTOM_*` before choosing overwrite.
Unrelated files remain untouched. The bundled product knowledge file retains its
existing always-refresh policy.

Template provenance lives in `.apiease/template.json` for operational checkouts,
and in `.apiease/project.json` before first synchronization. Older operational
checkouts without provenance treat differing existing files as conflicts; they do
not silently adopt those bytes as an unmodified template baseline.

`pull`, `validate`, `apply`, and `design-context` perform a shared, inexpensive
update check. Public templates use a commit feed without downloading the full
template; local development also compares template content. Available updates and
unavailable checks are reported on stderr, leaving JSON stdout unchanged. An
unavailable check does not mean current and does not block the requested command.
Checks never install updates. Use `upgrade --check` for a full file comparison.

## Configure Authentication

When `--api-key`, `--base-url`, or `--shop-domain` are omitted, `apiease` first checks the corresponding process environment variable. For any value still missing, it loads the active APIEase environment from your home directory and resolves the value from the selected env file.

Create the APIEase home directory:

```bash
mkdir -p ~/.apiease
```

Declare the active environment in `~/.apiease/environment`. The CLI uses that value to load the matching `~/.apiease/.env.<environment>` file. The examples below use `local`, `staging`, and `production`, but custom environment names such as `qa` are supported when the matching env file exists.

For a local setup:

```bash
printf 'local\n' > ~/.apiease/environment
printf 'APIEASE_API_KEY=your-local-api-key\nAPIEASE_BASE_URL=https://your-local-apiease-host.example.com\nAPIEASE_SHOP_DOMAIN=your-local-shop.myshopify.com\n' > ~/.apiease/.env.local
```

For a staging setup:

```bash
printf 'staging\n' > ~/.apiease/environment
printf 'APIEASE_API_KEY=your-staging-api-key\nAPIEASE_BASE_URL=https://your-staging-apiease-host.example.com\nAPIEASE_SHOP_DOMAIN=your-staging-shop.myshopify.com\n' > ~/.apiease/.env.staging
```

For a production setup:

```bash
printf 'production\n' > ~/.apiease/environment
printf 'APIEASE_API_KEY=your-production-api-key\nAPIEASE_BASE_URL=https://your-production-apiease-host.example.com\nAPIEASE_SHOP_DOMAIN=your-production-shop.myshopify.com\n' > ~/.apiease/.env.production
```

Configuration precedence is:

1. Command flags: `--api-key`, `--base-url`, and `--shop-domain`
2. Process environment: `APIEASE_API_KEY`, `APIEASE_BASE_URL`, and `APIEASE_SHOP_DOMAIN`
3. The same variables in `~/.apiease/.env.<environment>` selected by `~/.apiease/environment`

Each value is resolved independently at the first non-empty source. Project API requests require all three values, and both `x-apiease-api-key` and `x-shop-myshopify-domain` are sent for authentication. API keys are never included in JSON output or diagnostics.

If home configuration is needed and is missing, invalid, or unreadable, the CLI fails fast with a structured error. The most common fixes are:

- Create `~/.apiease/environment` if it does not exist.
- Set `~/.apiease/environment` to the non-blank environment name that matches the env file you want to load.
- Create the matching `~/.apiease/.env.<environment>` file for the selected environment.
- Add a non-empty `APIEASE_API_KEY` entry to that env file.
- Add `APIEASE_BASE_URL` and `APIEASE_SHOP_DOMAIN` when you want those values to be optional on each CLI command.

## Manage Resources

CRUD commands require a resource name immediately after the verb. Supported resource names are `request`, `widget`, `variable`, and `function`.

Human-readable CRUD failures display the API error code and message, plus available field errors, structured diagnostics, and resource or dependency context. Errors without details display only the information supplied. Local validation, configuration, and transport failures use the same readable output. CRUD `--json` output preserves the structured response, including nested API error details.

Bare command shapes such as `apiease create` or `apiease read --request-id ...` are not supported.

Use `--request-handle` for `request`, `--widget-handle` for `widget`, `--variable-handle` for `variable`, and `--function-handle` for `function`.

Legacy id or name option flags remain available as compatibility aliases; pass handles through those options during migration only.

If you are running from this repository without `npm link`, replace `apiease` with `./bin/apiease-cli` in the examples below.

Create a JSON file that contains the resource definition you want to send to APIEase. For example, a request definition file might look like this:

```json
{
  "handle": "cli-demo-request",
  "name": "CLI demo request",
  "type": "http",
  "method": "GET",
  "address": "https://example.com/products"
}
```

Resource source files use `handle` as the stable repository identifier. `id` is server-owned and should not be stored in request, widget, variable, or function source files. Widget source files use `handle` for the stable identifier and `name` for display text.

Handles must be lowercase slug values using letters, numbers, and hyphens, for example `cli-demo-request`.

`apiease create` is idempotent by `handle` for `request`, `widget`, `variable`, and `function` source files. When a source file has a valid `handle`, the CLI looks up the remote resource by handle, updates it when found, and creates it when missing.

Lookup failures other than not found stop the command instead of falling back to create. Human output reports either `<Resource> created successfully.` or `<Resource> updated successfully.`, and JSON output keeps the structured `operation` value as `created` or `updated`. Rerunning `apiease create widget --file <widget.json>` updates the existing widget instead of creating a duplicate.

For older request source files that still have `id` metadata or no `handle`, run create with `--auto-update-source-identifier`. `--auto-update-source-identifier` rewrites the source JSON file before creating the resource. For requests, it updates only identifier metadata in the local request JSON; it does not change request configuration such as `type`, `method`, `address`, `parameters`, `triggers`, `liquid`, `body`, or `nextRequest`.

```bash
apiease create request \
  --file ./request-definition.json \
  --auto-update-source-identifier
```

For older widget source files, it migrates legacy widget fields to `handle` and `name` and removes server-owned id fields.

```bash
apiease create widget \
  --file ./widget-definition.json \
  --auto-update-source-identifier
```

Create or update resources by handle:

```bash
apiease create request \
  --file ./request-definition.json \
  --base-url https://your-apiease-host.example.com \
  --shop-domain your-shop.myshopify.com
apiease create widget \
  --file ./widget-definition.json \
  --base-url https://your-apiease-host.example.com \
  --shop-domain your-shop.myshopify.com
apiease create variable \
  --file ./variable-definition.json \
  --base-url https://your-apiease-host.example.com \
  --shop-domain your-shop.myshopify.com
apiease create function \
  --file ./function-definition.json \
  --base-url https://your-apiease-host.example.com \
  --shop-domain your-shop.myshopify.com
```

If your active `~/.apiease/.env.<environment>` file already defines `APIEASE_BASE_URL` and `APIEASE_SHOP_DOMAIN`, you can omit those flags:

```bash
apiease create request \
  --file ./request-definition.json
```

To override the home configuration for a single command, pass `--api-key` explicitly:

```bash
apiease create request \
  --file ./request-definition.json \
  --base-url https://your-apiease-host.example.com \
  --shop-domain your-shop.myshopify.com \
  --api-key your-apiease-api-key
```

Read resources:

```bash
apiease read request --request-handle cli-demo-request
apiease read widget --widget-handle promo-banner
apiease read variable --variable-handle sale-banner
apiease read function --function-handle apply-discount
```

Update resources:

```bash
apiease update request --request-handle cli-demo-request --file ./request-definition.json
apiease update widget --widget-handle promo-banner --file ./widget-definition.json
apiease update variable --variable-handle sale-banner --file ./variable-definition.json
apiease update function --function-handle apply-discount --file ./function-definition.json
```

Delete resources:

```bash
apiease delete request --request-handle cli-demo-request
apiease delete widget --widget-handle promo-banner
apiease delete variable --variable-handle sale-banner
apiease delete function --function-handle apply-discount
```

## JSON Output

Add `--json` when you want machine-readable output. For `init --from-existing-resources`, `pull`, `validate`, `apply`, and `rename`, stdout contains exactly one CLI result envelope version 1 JSON document. Progress, warnings, and human guidance go only to stderr.

```bash
apiease create request \
  --file ./request-definition.json \
  --base-url https://your-apiease-host.example.com \
  --shop-domain your-shop.myshopify.com \
  --json
```

Project command envelopes have this stable shape:

```json
{
  "cliResultVersion": 1,
  "command": "validate",
  "state": "success",
  "outcome": "PROJECT_VALID",
  "result": {},
  "diagnostics": [],
  "requiredSecureValues": []
}
```

`state` is `success`, `accepted`, or `failure`. `outcome` preserves the authoritative APIEase outcome when present. Success data is normalized under `result`; failures use a normalized `error` with stable `code` and, when available, `category`. Diagnostics are bounded, deterministic, and secret-safe. `requiredSecureValues` contains only safe selectors. Optional `outcome`, `result`, and `error` fields are omitted when they do not apply.

Stable Project API exit codes are:

| Exit code | Meaning |
| ---: | --- |
| `0` | Success or a valid asynchronous accepted state |
| `1` | Unexpected internal failure |
| `2` | Usage or configuration failure |
| `3` | Authentication or authorization failure |
| `4` | Validation or contract failure |
| `5` | Concurrency, idempotency, or already-exists conflict |
| `6` | Local integrity, state, Git checkout, or managed-publication failure |
| `7` | Exhausted retry or service/transport failure |

## Retries and Deadlines

Eligible requests use one initial attempt plus at most three retries. The default bounded backoff is 250 ms, 500 ms, and 1,000 ms. A `429` response is retried no earlier than its valid `Retry-After` value. Eligible transport and `503` retries preserve byte-equivalent request input; ambiguous apply retries also preserve the same operation key. Bootstrap returns one stable Mongo snapshot and is never polled for repository readiness or Git projection. Authentication, contract, validation, concurrency, and idempotency conflicts stop immediately.

Default per-request timeouts and overall operation deadlines are:

| Operation | Request timeout | Overall deadline |
| --- | ---: | ---: |
| Bootstrap (init/pull) | 120 seconds | 15 minutes |
| Validate | 60 seconds | 5 minutes |
| Plan (during apply) | 60 seconds | 5 minutes |
| Apply | 120 seconds | 10 minutes |

No local Project API state is changed after validation, planning, transport failure, or conflict. A replayed apply receipt is treated as committed success.

## Containers and Noninteractive Use

The same `apiease` executable works without a writable home directory. Supply explicit flags or process environment variables and add `--json` for noninteractive machine output:

```bash
docker run --rm \
  -e APIEASE_API_KEY \
  -e APIEASE_BASE_URL \
  -e APIEASE_SHOP_DOMAIN \
  -v "$PWD:/workspace" \
  -w /workspace \
  <image-with-apiease> \
  apiease validate --json
```

The container needs Node.js 20, Git for checkout-based workflows, and network access to the configured APIEase base URL. It does not require Kubernetes, Helm, APIEase application source, or a writable home directory.

## Notes

- The public installed command name is `apiease`.
- `init` uses `../apiease-template` during local CLI development and otherwise downloads the template from [kevinstl-org/apiease-template](https://github.com/kevinstl-org/apiease-template).
- Resource definition files must be valid JSON with an object as the root value.
- Resource source files should use `handle`, not `id`, as the source-owned identifier.
- Project API commands require API key, base URL, and shop domain values resolved through flags, process environment, or the selected home environment file.
- Default output is human-readable. Project command `--json` output uses CLI result envelope version 1.
- Maintainer release verification is documented in [`docs/internal/releasing.md`](docs/internal/releasing.md).
