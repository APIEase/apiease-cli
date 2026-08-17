# Codex Automation Rules

If `AGENTS.md` exists at the project root, that file defines project-level coding standards.

This `.codex/AGENTS.md` file defines Codex workflow rules:

## TDD Mode

- TDD mode defaults to on for each Codex instance.
- If the user says `tdd off`, switch TDD mode off for the current Codex instance and acknowledge the change briefly. Treat this as conversation-local state, not a repository or configuration change.
- If the user says `tdd on`, switch TDD mode back on for the current Codex instance and acknowledge the change briefly.
- Do not edit files, configuration, or persisted instructions just to record a TDD mode change.
- When TDD mode is on, use test driven development for new executable behavior, public contracts, validation, integration boundaries, and regression-prone generated artifacts: write or modify tests, run and see them fail, then implement the behavior until it passes.
- When TDD mode is on, confirm each new test fails against existing behavior before any implementation changes so the test proves it can detect the missing behavior.
- When TDD mode is on, do not create or update tests for comment-only, guidance-only, or non-runtime documentation text changes. Validate those changes by inspection or review plus the normal suite validation required by the project.
- When TDD mode is on, run `.codex/run_test_suite.sh` before starting work on a task and again after completing the task. If the project AGENTS.md file says to run all tests in a specific way assume that `.codex/run_test_suite.sh` runs the project specific way so there is no need to run both.
- When TDD mode is off, the test-first workflow and required before/after full-suite runs are suspended. Make the requested change directly, then run targeted verification when it is cheap or the change is risky. State any skipped verification in the completion summary.
- TDD mode only changes workflow and test-running discipline. Coding standards, architecture guidance, task scope, safety rules, and user instructions still apply.

## General Workflow Rules

- Fix only the tests related to the current task. If other tests fail outside the task scope, warn about them but do not modify them.
- Ensure scripts and test scripts are runnable from any working directory by resolving paths relative to their own script directory.
- When all acceptance criteria are satisfied do write a brief completion summary.
- When all acceptance criteria are satisfied do not attempt or ask to work on another task.

When both `AGENTS.md` and `.codex/AGENTS.md` exist:

- Root `AGENTS.md` takes precedence for coding standards, architecture, naming, and formatting.
- `.codex/AGENTS.md` takes precedence for Codex workflow behavior such as TDD, test execution rules, and task scoping.

Codex should follow both documents.

## codex-dev-bot Goal Files

- `.codex/goals/` is the source of truth for goal submissions, active execution context, queued work, and archived task history.
- When the user asks to submit a codex-dev-bot goal or prepare one for immediate processing, write the complete goal statement to a unique, descriptively named `*.goal.md` file directly under `<project-root>/.codex/goals/`.
- When the user explicitly asks to queue, defer, or stage a goal without running it, write the file under `<project-root>/.codex/goals/queue/` instead.
- If the user asks only to draft, review, or show a goal statement, return the text without creating a submission file.
- Create the destination directory when it does not exist. Use a short kebab-case filename and the exact `.goal.md` suffix.
- Write plain UTF-8 Markdown containing only the goal statement. Do not add a shell command, heredoc delimiter, fenced-code wrapper, JSON, YAML front matter, or shell escaping.
- Preserve quotes, backticks, dollar signs, backslashes, command-like text, and multiline formatting literally in the file.
- Treat the statement as a goal-level implementation prompt that will be broken into small tasks and executed by separate Codex instances in series.
- Make the statement self-contained, ordered, actionable, and clear enough for automated task decomposition without relying on prior chat context.
- Include relevant constraints, acceptance criteria, and validation expectations in the statement when they are known.
- Do not create or edit `goal.json` or task JSON files; `create_goal.sh` owns goal materialization and task decomposition.
- Do not place a submission in `archive/`, an existing materialized goal directory, or a `tasks/` directory.
- Do not invoke `process_goals.sh` for a queued goal. Queued goals remain deferred until explicitly promoted.
- Writing a goal file does not itself start automation. When execution was explicitly requested and `create_goal.sh` is available, run `create_goal.sh --scan` from the project root; otherwise report that a scan is required.
- To release deferred work, run `create_goal.sh --promote <goal-id>` from the project root; promotion processes only that queued goal.
- After creating a goal file, report its path and whether it is immediate or queued.

---

## Code structure and design preferences

In addition to the rules above, Codex must follow these guidelines when generating or modifying code and tests in this project:

### File and module boundaries

- Prefer creating a new code file when there is a need for functionality that is not clearly described or represented by any existing code file.
- Each file should be purpose driven with a clear, cohesive responsibility. Avoid turning any file into a generic catch all of unrelated utilities.

### Redundant functionality

- Before creating a new function, search the codebase for existing functions that provide the same or similar behavior.
- If a suitable function exists, reuse or extend that function instead of creating a new one with overlapping responsibilities.
- If you find redundant or near redundant functions scattered across multiple files, create a dedicated module for that shared behavior:
  - Introduce a new code file whose purpose is to contain that shared functionality.
  - Move or refactor the redundant implementations into that module.
  - Update callers to use the new shared function(s).

### Function design and naming

- Functions should be small, focused, and single purpose. Each function should “do one thing well.”
- A general rule of thumb can be that a function should be no larger than 10 lines of code.
- Function names must be explicit and self documenting, clearly describing:
  - What the function does.
  - The main thing it returns or the main side effect it has.
- Avoid vague names like `handleData`, `processItems`, or `doWork`. Prefer names such as `filterRequestsByShopDomain` or `buildTaskSchemaFromGoal`.

### Variable naming

- Variable names must always be meaningful and descriptive.
- Avoid single letter or cryptic abbreviations (for example `d`, `x`, `cfg`) except in very small, conventional scopes (for example a simple for loop index).
- Prefer names that reveal intent over names that reflect only type or structure. For example:
  - Use `requestQueue` instead of `list`.
  - Use `shopDomainToRequestMap` instead of `map`.
- Try to use consistent variable names across code files for similar concepts or data structures.

### Object Oriented Architecture Pillars

- Enshrine the four pillars of object oriented programming in goal decomposition, architectural decisions, implementation design, and infrastructure design whenever the language, framework, or domain model makes object oriented structure appropriate.
- Encapsulation: keep state, invariants, and the behavior that changes them behind clear module, class, or service boundaries; expose intentional methods instead of leaking mutable internals.
- Abstraction: design small public interfaces around essential behavior, hiding implementation details so callers depend on stable contracts rather than concrete mechanisms.
- Inheritance: use shared base types, abstract classes, or framework inheritance only when an actual domain hierarchy exists and reuse is clearer than composition; avoid forced hierarchies.
- Polymorphism: prefer common interfaces, protocols, or parent contracts when multiple implementations must be interchangeable, allowing behavior to vary without conditional sprawl.
- Apply these pillars pragmatically: they guide every architectural decision, but they do not override simpler functional, procedural, or composition-based designs when those better fit the existing codebase.

### Tests and expectations

- Whenever possible, create or update tests alongside each new or modified function:
  - Tests must prove executable behavior, public contracts, validation rules, integration boundaries, or regression-prone generated artifacts.
  - Do not create or keep tests whose only assertion is that comments, explanatory notes, guidance text, or non-runtime documentation text exists in source files.
  - For comment-only or guidance-only changes, use inspection or review instead of source-string tests.
  - Only test documentation text when validating a rendered, emitted, or generated artifact that users or automation consume.
  - Documentation-only changes, including comment-only and guidance-only updates, do not require new or updated tests; run the normal suite validation required by the project.
  - Tests should only be created for code unless the task explicitly requires validating a rendered, emitted, or generated artifact that users or automation consume.
  - Any new production code file (class/module/component/service/utility) must include a corresponding Jest test file created or updated in the mirrored `test/` path in the same change set.
  - New public methods on existing classes must add or update tests in the related test file.
  - Ensure that each public or externally used function has at least one corresponding test when feasible.
  - Prefer one primary expectation per test:
    - Do not pack multiple unrelated expectations into a single test.
    - Only group multiple expectations in one test when those expectations always apply to every usage of the function and together define a single behavior.
  - During iterative development (multiple small code changes within a task), Codex should run only the tests associated with the code being modified, unless broader test execution is explicitly required. Full test suite runs should still occur at the start of the task and after completion to ensure no regressions.
  - For each unique behavior, edge case, or error condition, create a separate test. For example:
    - One test for normal success behavior.
    - One test for invalid input handling.
    - One test for boundary conditions.
  - Keep tests clear and intent revealing:
    - Test names should describe the specific behavior being verified.
    - Arrange tests using the standard “arrange, act, assert” structure where practical.

### Shared implementation constants in tests

- Avoid repeating implementation-owned constants in tests when the test can import or otherwise consume the same source-of-truth value used by production code. This includes fixed numeric values, timeouts, names, messages, identifiers, enum values, status values, and other shared literals.
- Use the one true constant from the implementation or a shared production constants module when importing it still leaves the test meaningful.
- Do not create parallel test constants that must be manually kept in sync with production values.
- Do not duplicate fixed implementation details or stable contract literals in tests when the production value is already exported or can reasonably be exported from a small side-effect-free module.
- If a value cannot be imported safely because its current module pulls in runtime, framework, environment, or side-effect-heavy dependencies, extract the shared value into a plain constants module and import that from both production and tests.
- Tests must still assert useful behavior, not merely assert that a constant equals itself. Import shared constants when proving that observable output, generated data, emitted messages, integration payloads, persisted state, or state transitions use the shared contract.
- Hard-coded expected values are still acceptable when intentionally documenting an external product requirement, public API contract, migration boundary, or user-facing decision that should fail if implementation changes casually.
- For snapshot or golden-file tests, shared constants can drive fixture setup and non-snapshot assertions.
- Snapshot or golden-file artifacts still need to be regenerated when intentional output changes because the artifact itself encodes the prior output.

### Development Philosophy
- You have total control of the entire codebase.
  - Do not keep redundant code, functions, variables or tests around for backwards compatibility unless explicitly required by the task.
  - Do not use abbreviations or acronyms unless they are widely known and accepted in the project domain.

These guidelines are intended to keep the codebase modular, easy to navigate, and self documenting so that Codex automation and humans can both work effectively within this project.

---

## Frontend/Backend Responsibility Rule (Must Follow)
- All user input must be sent to a backend service as early as possible.
- Business decisions, persistence, and side effects must happen server-side.
- The frontend must only handle UI state and rendering; it must not be a source of truth or perform persistence or routing logic.
- If existing code violates this, refactor toward server-side authority before adding features.
