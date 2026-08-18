# APIEase Goal C Server-Contract Blockers

## Purpose and status

This internal handoff records the APIEase server work that must be finalized
before the unified `apiease` CLI can support approval-required Apex worker
apply or deferred/unset protected values end to end. It separates boundaries
already implemented in `apiease-cli` from behavior that is intentionally
unavailable until Goal C changes the authoritative APIEase contracts.

This document is a requirements handoff, not a wire contract or architecture
decision. It does not select request fields, outcomes, proposal identifiers,
worker credentials or capabilities, persistence collections, retention rules,
or a resume protocol. Goal C must inventory the existing APIEase ownership and
persistence boundaries, make those decisions explicitly, and version them in
the authoritative documentation, schema, validators, fixtures, and services.

The current authoritative inputs are:

- `../apiease/docs/apiease-cli-project-api-handoff.md`
- `../apiease/docs/apex-projects.md`
- `../apiease/backend/common/apexProjectsContract.js`
- `../apiease/contracts/apex-projects/v1/apiease-project-contract.schema.json`
- every fixture under `../apiease/contracts/apex-projects/v1/fixtures/`
- the vendored copies under this repository's `contracts/apex-projects/v1/`

## Implemented CLI boundaries

The CLI currently provides these fail-closed integration boundaries:

- Personal Project API requests use the common authentication-adapter
  abstraction. The personal adapter requires both `x-apiease-api-key` and
  `x-shop-myshopify-domain`, keeps credentials behind an opaque context, and
  does not include secrets in normalized output or diagnostics.
- Public personal `apiease apply` uses the retained candidate through
  validate, plan, and immediate apply, and only committed or replayed outcomes
  may update operational state or archive deletion intent.
- The hidden `--require-approval` option is parsed but stops at the request
  policy boundary with `PROJECT_WORKER_AUTHORITY_UNAVAILABLE`. It sends no
  invented approval field or worker authority and does not submit a proposal.
- Canonical protected values remain secret-free placeholders. Existing bound
  protected targets produce `preserve` instructions. A protected target on a
  new resource fails locally with
  `PROJECT_SECURE_INPUT_DEFERRED_UNAVAILABLE` and only bounded safe selectors:
  resource type, handle, and field path.
- The normalized command-result boundary can carry safe required-secure-value
  selectors and distinguish accepted from committed state, but the current
  server contract defines no approval-pending apply result to consume.

The CLI must remain fail closed at these boundaries. It must not collect raw
secure values, invent worker authentication, fall back from worker to personal
authority, treat approval-pending as committed, or update local state/archive
files without a committed or replayed receipt.

## Blocker 1: shop-scoped personal authentication

Goal C must amend the authoritative Project API contract and implementation so
that all Project API requests require both personal-authentication headers:

- Require `x-apiease-api-key` and `x-shop-myshopify-domain`.
- Normalize the supplied shop domain before project lookup or authorization.
- Treat the domain only as a lookup selector; it grants no authority by itself.
- Verify that the API key belongs to that exact normalized shop before parsing
  or acting on project input or deriving project, repository, and actor
  authority.
- Fail closed for a missing, malformed, cross-shop, or unauthorized pairing
  without disclosing cross-shop existence or credentials.
- Update Project API documentation, transport/authentication tests, route
  tests, schemas or other transport definitions where applicable, compatibility
  fixtures, and the CLI handoff together.

This is a server blocker even though the CLI already sends both headers. The
current APIEase v1 documentation describes only `x-apiease-api-key` and derives
the shop from that key; that contract must not be treated as satisfying the
two-header Goal C requirement.

## Blocker 2: conversation-bound worker authentication

Goal C must replace `PROJECT_WORKER_AUTHORITY_UNAVAILABLE` only after defining
and implementing an exact, fail-closed worker authentication design that:

- binds authority to the exact normalized shop, immutable project, Apex UI
  conversation, proposal, reviewed operations, candidate baseline, and
  permitted action;
- uses short-lived, least-privilege, approval-bound authority;
- derives the conversation and other trusted identities from authenticated
  server context instead of a user-controlled CLI flag;
- rejects reuse outside the bound identities, action, reviewed content, or
  validity window; and
- never uses a shared unrestricted credential or falls back to personal
  authentication.

Goal C must version the resulting authentication contract and add strict
success/failure coverage before the CLI may supply a worker authentication
adapter. This handoff deliberately does not name a worker header, token,
capability format, issuer, or validation protocol.

## Blocker 3: asynchronous proposal and approval persistence

Goal C must define and implement an approval-required apply contract that is
asynchronous and durable. At minimum it must:

- add a strict approval-required field or equivalent versioned representation
  to the apply request;
- define a stable pending outcome, HTTP status (expected to be `202`), and
  strict result and error envelopes with compatibility fixtures;
- durably persist the exact proposal before returning pending and associate it
  with the authenticated Apex conversation, marking that conversation as
  requiring review;
- expose a bounded, secret-safe review projection to that conversation;
- avoid placing a potentially 25 MB complete candidate in the existing
  conversation document, whose bounded turn/checkpoint structures are not a
  full proposal store;
- inventory existing Mongo documents and ownership boundaries first, extend an
  established boundary only when genuinely appropriate, and otherwise obtain
  explicit authority for the smallest focused proposal persistence required;
- store or immutably reference enough data to prove that a later decision
  applies to the exact candidate, baseline, operations, operation key, and
  secure-value requirements reviewed by the user;
- define idempotent repeated submission and pending replay behavior;
- define approval and rejection behavior;
- define expiration, cancellation, or an explicit decision that either does
  not apply, including their observable terminal behavior;
- define stale-baseline handling and require a fresh proposal and review when
  the reviewed proposal is stale;
- define post-approval execution that does not require the original CLI or
  ephemeral worker process to remain alive;
- allow the CLI and ephemeral worker to report accepted/pending and exit
  successfully after durable intake, without waiting for a user decision;
- recheck exact worker/approval authority and concurrency immediately before
  committing, and atomically commit only the reviewed proposal; and
- prevent the approval UI or continuation path from modifying the reviewed
  candidate or operations while approving them.

Before approval, the system must perform no live resource mutation,
`liveRevision` change, resource-version change, cache invalidation, provider or
runtime work, Git projection, or receipt claiming committed success. Pending
acceptance is successful asynchronous intake, not a commit. Approval may
commit only the exact reviewed proposal; rejection commits nothing.

The current `projectApplyOperations` ownership is documented as an idempotency
receipt store and explicitly not a proposal or approval store. This handoff
does not authorize changing that ownership or creating a new collection.

## Blocker 4: deferred/unset protected values

Goal C must add a strict, versioned representation for creating a protected
target without supplying a value. The representation and implementation must:

- distinguish deferred/unset from `preserve`, `reference`, `replace`, an empty
  string, a missing instruction, and the canonical secret-free placeholder;
- allow a new protected request parameter or sensitive variable definition to
  validate, plan, and apply without a raw value;
- persist only an explicit unset state for the protected target, never the
  placeholder token or empty string as protected data;
- keep existing protected fields on exact bound resources preservable through
  the established authoritative contract;
- return deterministic, bounded, secret-safe required-value selectors
  containing only resource type, handle, and field path;
- make the same selectors and warning available in validation/planning results,
  apply receipts and replay results, machine-readable CLI results, and future
  proposal review data without returning protected values;
- require terminal and machine-readable guidance to tell the user to configure
  every listed actual value in the authenticated APIEase UI;
- support configuring each deferred value later through the authenticated
  APIEase UI;
- make runtime use of an unset required protected target fail safely and
  clearly until configuration is complete;
- project only the canonical secret-free placeholder after UI configuration or
  other live changes, never a raw/masked value or persisted placeholder-as-
  secret; and
- update the canonical codec/projection, schemas, validators, mutation
  handlers, persistence, plans, apply and replay receipts, fixtures,
  documentation, UI behavior, and runtime services as one compatible contract.

The current v1 schema permits only `preserve`, `reference`, and `replace`.
`preserve` is invalid for a new target, while `replace` would carry a raw value
that this CLI is prohibited from accepting. Therefore the CLI must continue to
fail locally for new protected targets until Goal C finalizes this contract.

## Blocker 5: approval UI and continuation

Goal C must integrate the asynchronous proposal with its exact authenticated
Apex conversation and provide a continuation flow that:

- presents the exact stored plan, operations, summary, conflicts when
  applicable, and safe deferred-secure-value warning;
- records approve or reject against the exact immutable proposal identity;
- prevents the UI from editing candidate or operations during approval;
- triggers or authorizes asynchronous post-approval application without the
  original CLI process;
- makes pending, committed, rejected, stale, and any finalized expiry or
  cancellation state observable to the conversation and future worker
  orchestration; and
- reports committed results separately from accepted/pending results.

The initial Apex worker integration must require approval for every proposal.
A conversation-level policy allowing approval-free worker apply is deferred
until its authority, auditability, and user experience are separately designed
and authorized.

## Required Goal C contract outputs

The blockers are cleared only when the finalized APIEase change set includes:

1. authoritative documentation and executable constants for every new or
   changed contract;
2. strict JSON Schema definitions for requests, responses, errors, safe
   selectors, and any new versioned state exposed across a boundary;
3. positive and negative compatibility fixtures covering authentication,
   pending submission/replay, approval, rejection, stale baseline,
   post-approval commit, and every finalized expiry/cancellation behavior;
4. service, route, persistence, UI, projection, receipt/replay, security, and
   runtime tests appropriate to each blocker;
5. an updated `apiease-cli` Project API handoff identifying the exact finalized
   fields, outcomes, status codes, retry/idempotency rules, and authority
   derivation; and
6. a new APIEase source commit and SHA-256 provenance set for the schema and
   fixtures that the CLI can vendor and execute.

Until all applicable outputs exist, `apiease apply --require-approval` remains
worker-authority-unavailable and creation of a deferred/unset protected target
remains locally unavailable. Neither limitation may be approximated solely in
the CLI.

## Traceability to Goal B follow-on requirements

| Goal B requirement group | Handoff section |
| --- | --- |
| Shop-scoped personal authentication | Blocker 1 |
| Conversation-bound worker authentication | Blocker 2 |
| Asynchronous proposal/approval persistence, replay, rejection, expiry/cancellation, stale baseline, and post-approval execution | Blocker 3 |
| Deferred secure values across schema, persistence, UI, projection, receipt/replay, and runtime | Blocker 4 |
| Approval UI and continuation | Blocker 5 |
| Versioned schema, fixtures, documentation, and CLI provenance refresh | Required Goal C contract outputs |
