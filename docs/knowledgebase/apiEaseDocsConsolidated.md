SOURCE
https://docs.apiease.com/docs/overview/apiease

TITLE
APIEase

CONTENT
# APIEase

The API Integration And Automation Runtime
===========================================

APIEase is a managed system where your API requests, workflows, and custom logic 
run, so you don’t have to build or maintain that infrastructure yourself.

**What It Does** - APIEase executes secure HTTP requests, triggers Shopify Flow 
actions, runs custom logic defined through Liquid Requests, and runs internal system functions through System Requests. [Learn more...](https://docs.apiease.com/docs/overview/what-it-does)

**How It Works** - Add fully configurable HTTP, Shopify Flow, Liquid, or System Requests 
to APIEase, and trigger them manually, from your storefront, through webhooks, 
on a cron schedule, from an external HTTP client, or via a Proxy Endpoint. [Learn more...](https://docs.apiease.com/docs/overview/how-it-works)

**Why You Need It** - Use APIEase to integrate and serve API calls with custom 
logic and automation without having to build, maintain, or host the backend. 
It securely supplies confidential credentials to any request, allowing them 
to be triggered from your storefront or from external systems without exposing 
those credentials publicly. [Learn more...](https://docs.apiease.com/docs/overview/why-you-need-it)

**Widgets** - Build reusable storefront widgets with Liquid and JavaScript, then render them using a theme app block. [Learn more...](https://docs.apiease.com/docs/widgets/widgets-page)

Looking for a quick answer? Choose your task in the [APIEase FAQ](https://docs.apiease.com/docs/general/faq/faq).

SOURCE
https://docs.apiease.com/docs/overview/what-it-does

TITLE
What It Does

CONTENT
# What It Does

APIEase defines and runs four types of requests: [HTTP Requests](https://docs.apiease.com/docs/requests/request-types/http-requests), [Flow Requests](https://docs.apiease.com/docs/requests/request-types/flow-requests), [Liquid Requests](https://docs.apiease.com/docs/requests/request-types/liquid-requests), and [System Requests](https://docs.apiease.com/docs/requests/request-types/system-requests). Each request type is executed inside APIEase's managed environment, keeping credentials secure and ensuring logic is processed server-side.

APIEase also includes [Functions](https://docs.apiease.com/docs/functions/functions-overview) and [Widgets](https://docs.apiease.com/docs/widgets/widgets-page). Functions are reusable Liquid helpers for Liquid Requests, while Widgets are designed for storefront UI instead of API execution.

You can combine these building blocks to connect an [external API](https://docs.apiease.com/docs/requests/connect-external-api) or [synchronize data with another system](https://docs.apiease.com/docs/requests/synchronize-external-data). APIEase executes the saved workflow, while each API provider remains the authority for its endpoints, credentials, permissions, payloads, and usage limits.

## [HTTP Requests](https://docs.apiease.com/docs/requests/request-types/http-requests)

HTTP Requests let you call external APIs using any method (GET, POST, PUT, PATCH, DELETE). You define the URL, headers, body, and parameters. APIEase executes the call on the server and returns the response to the system that triggered it.

## [Flow Requests](https://docs.apiease.com/docs/requests/request-types/flow-requests)

Flow requests send data from APIEase into a Shopify Flow workflow through the APIEase Flow Trigger. To run a saved APIEase request from a workflow that starts in Shopify Flow, use the [APIEase Flow Action](https://docs.apiease.com/docs/requests/shopify-flow-integration/run-saved-request-from-flow); the saved request keeps the type needed for its operation, such as HTTP.

## [Liquid Requests](https://docs.apiease.com/docs/requests/request-types/liquid-requests)

Liquid Requests run custom logic written in Liquid. They let you transform data, extract fields, perform simple conditionals, construct dynamic request bodies, and call reusable [Functions](https://docs.apiease.com/docs/functions/using-functions-in-liquid-requests). The Liquid code executes within APIEase and can use inputs from any trigger source.

## [System Requests](https://docs.apiease.com/docs/requests/request-types/system-requests)

System Requests run internal APIEase functions (they do not call an external URL). This is useful for app-managed actions such as setting, getting, or deleting persisted variables.

## [Widgets](https://docs.apiease.com/docs/widgets/widgets-page)

Widgets are reusable storefront components that render Liquid templates with optional JavaScript. They are added to your theme through the APIEase app block and can be updated centrally in the APIEase admin.

## [Functions](https://docs.apiease.com/docs/functions/functions-overview)

Functions are reusable Liquid helpers that run inside a parent Liquid Request. Use them to keep shared formatting, transformation, and response-shaping logic in one place instead of repeating the same Liquid across multiple requests.

## What APIEase does not supply

APIEase does not provide another company's private API documentation or credentials, bypass provider permissions, or decide how records from different systems should be matched. Before building an integration, obtain the provider's current API contract and define the workflow's business rules. See [Connect to an external API](https://docs.apiease.com/docs/requests/connect-external-api) for the required information.

## [Secure Parameter Storage](https://docs.apiease.com/docs/overview/why-you-need-it)

Sensitive request parameters -- such as API keys, tokens, and passwords -- are masked after saving, omitted from normal read interfaces, and decrypted when APIEase executes the request. This protects the saved request configuration, but it does not filter private data from an external API's response. Sensitive Variables and APIEase API keys have different visibility rules. See [Credentials, authentication, and security](https://docs.apiease.com/docs/general/faq/credentials-and-security).

SOURCE
https://docs.apiease.com/docs/overview/how-it-works

TITLE
How It Works

CONTENT
# How It Works

APIEase runs the requests and logic you define. Each request ([HTTP](https://docs.apiease.com/docs/requests/request-types/http-requests), [Flow](https://docs.apiease.com/docs/requests/request-types/flow-requests), [Liquid](https://docs.apiease.com/docs/requests/request-types/liquid-requests), or [System](https://docs.apiease.com/docs/requests/request-types/system-requests)) is configured in the APIEase admin and executed inside the APIEase runtime, where confidential parameters remain secure.

This page describes how requests are configured, how they are triggered, and how these elements combine to create custom functionality.

APIEase also includes reusable [Functions](https://docs.apiease.com/docs/functions/functions-overview), persisted [Variables](https://docs.apiease.com/docs/variables/variables-overview), and storefront widgets. Widgets render Liquid and JavaScript through the Widget App Block or Widget App Embed and are managed in the same admin.

---

## Configuring Requests

When you create a request, you choose the type ([HTTP Request](https://docs.apiease.com/docs/requests/request-types/http-requests), [Flow Request](https://docs.apiease.com/docs/requests/request-types/flow-requests), [Liquid Request](https://docs.apiease.com/docs/requests/request-types/liquid-requests), or [System Request](https://docs.apiease.com/docs/requests/request-types/system-requests)) and define the parameters it needs. These parameters can include:
- values passed in at trigger time
- values extracted from earlier requests
- Liquid based transformations
- confidential parameters stored securely in APIEase (see [Why Secure Parameter Handling Matters](https://docs.apiease.com/docs/overview/why-you-need-it))

Each request is saved as a reusable and callable unit of logic.

If you need reusable helper logic inside a Liquid Request, create a [Function](https://docs.apiease.com/docs/functions/functions-overview) and call it from Liquid instead of repeating the same template code.

For setup steps, see [How to Add Requests](https://docs.apiease.com/docs/requests/how-to-add-requests).

If you need to manage persisted values outside of a request, use [Variables Overview](https://docs.apiease.com/docs/variables/variables-overview).

---

## Configuring Widgets

Create widgets in the APIEase admin by defining a name, handle, and Liquid template. You can add optional inline or external JavaScript that loads when the widget renders. See [Widgets page](https://docs.apiease.com/docs/widgets/widgets-page) and [Widget edit page](https://docs.apiease.com/docs/widgets/widget-edit-page) for the full workflow.

## Displaying Widgets

Use the **APIEase Widget App Block** for widgets on a specific page or template, or the **APIEase Widget App Embed** for widgets that should run across the storefront. See [Widget App Extensions](https://docs.apiease.com/docs/widgets/widget-app-extensions).

---

## Triggering Requests

A configured request can be invoked through several available trigger types. Each trigger activates the same underlying request definition, allowing the logic to run without duplication. Triggers are available in the following order:

### [Webhooks](https://docs.apiease.com/docs/requests/triggers/webhooks/trigger-requests-from-a-webhook)

Run a request automatically when Shopify or an external system sends a webhook to APIEase.

### [Cron Schedule](https://docs.apiease.com/docs/requests/triggers/cron-schedule)

Use a built in cron schedule to run a request at recurring intervals.

### [Proxy Endpoint](https://docs.apiease.com/docs/requests/triggers/proxy-endpoint)

Expose a request as a public API endpoint with an optional shared secret. External systems call the endpoint and APIEase runs the associated request.

### [Manual Calls](https://docs.apiease.com/docs/requests/triggers/manual-calls)

Invoke any request directly from the APIEase admin for testing or on demand execution.

### [Storefront calls](https://docs.apiease.com/docs/requests/triggers/storefont-calls)

Trigger a request from your storefront using Shopify's app proxy. The storefront sends only non confidential data and APIEase performs the execution on the server side.

### [Remote Calls](https://docs.apiease.com/docs/requests/triggers/calling-requests-remotely)

 Send an HTTP call from any external system to APIEase to initiate a request with authentication.

### [Chained Request](https://docs.apiease.com/docs/requests/request-parameters/chained-requests)

Run a request from within another request. A request can call additional requests and pass outputs downstream, allowing multi step workflows.

---

## Combining Request Types and Triggers

Because each request is modular and can be triggered in any of these ways, users can create custom functionality by combining:
- the request type (HTTP, Flow, Liquid, or System)
- the trigger source
- any number of chained steps

This supports use cases ranging from simple API calls to multi step workflows that coordinate data across multiple systems, without building or hosting a backend.

SOURCE
https://docs.apiease.com/docs/overview/why-you-need-it

TITLE
Why You Need It

CONTENT
# Why You Need It

Connecting APIs, running custom logic, and coordinating workflows usually requires a backend. Most stores solve this by building and hosting a custom app, creating one off server functions, or chaining together several single purpose tools. Each project introduces new infrastructure to build, deploy, and maintain, and each client or use case often requires a separate implementation.

APIEase provides a central place for all API calls, logic, and automation to run. Instead of building a backend for each project, you define requests in APIEase and use them wherever they are needed: in the storefront, in Flow, from webhooks, on a schedule, or from external systems. This removes the need to manage separate servers, reduces infrastructure tasks for every new integration, and makes it possible to reuse the same request definitions across multiple workflows and use cases.

APIEase also handles the related operational concerns that a backend normally carries, such as concurrency control, safe parameter handling, execution tracking, and request chaining. As a result, you can create fully functional integrations that behave like a custom app without actually building and operating the app itself.

Widgets extend that same model to storefront UI. You can build reusable Liquid and JavaScript components in APIEase and place them in a theme through the app block, without maintaining a separate widget service or front-end app.

---

## Why Secure Parameter Handling Matters

API calls and external services often require confidential values such as API keys, tokens, or account credentials. These values cannot be placed in the storefront because anything delivered to a browser is visible through developer tools. Liquid code, JavaScript, and JSON embedded in a theme can all be inspected by anyone who loads the page.

If confidential parameters are exposed in the storefront, they can be used to access external systems, submit unauthorized requests, or retrieve private data. This creates a clear risk for the store, the merchant, and the systems being connected.

APIEase lets you mark confidential request parameters as **Sensitive**. These values are masked after saving, omitted from normal read interfaces, and decrypted only when APIEase executes the request. Even when a request is triggered from the storefront, those saved request parameters remain inside the APIEase environment.

This protection applies to the saved request configuration; it does not filter an external API's response. Before making a request publicly callable, ensure its response does not contain credentials or other private data. Sensitive Variables and APIEase API keys also have different visibility rules. See [Credentials, authentication, and security](https://docs.apiease.com/docs/general/faq/credentials-and-security) for the distinctions.

SOURCE
https://docs.apiease.com/docs/developers/developer-overview

TITLE
Developer overview

CONTENT
# Developer overview

This section is the developer entry point for building with APIEase as code.

For most teams, the recommended path starts with `apiease-template`, uses `apiease-cli` for day-to-day operations, and reaches for the [APIEase Public API](https://docs.apiease.com/docs/developers/apiease-public-api) only when direct HTTP automation is the better fit.

If you are new to this workflow, start with [Quickstart with apiease-template](https://docs.apiease.com/docs/developers/quickstart-with-apiease-template).

## Choose an interface

Choose the interface based on where you want the work and its review history to live:

| Interface | Best fit |
| --- | --- |
| APIEase admin | Create, edit, test, and run resources interactively. |
| Apex in APIEase | Ask the in-product assistant to propose changes to requests, widgets, Variables, and Functions, then review and approve the exact proposal. |
| `apiease-template` | Establish a repository layout for source-controlled requests, widgets, variables, and functions. |
| `apiease-cli` | Initialize or upgrade a template project and sync its saved resource definitions with APIEase. |
| APIEase public API | Build custom HTTP automation for saved resources or execute an existing saved request remotely. |
| Coding agent in a template repository | Edit version-controlled resource definitions, review them in git, and optionally sync them through `apiease-cli`. |

These are separate workflows. Apex uses an in-product proposal review before approved changes are applied. A coding agent working in an `apiease-template` repository changes local files first, so the git diff can be the review boundary. See [Using APIEase with AI agents](https://docs.apiease.com/docs/developers/using-apiease-with-ai-agents) for the safety and resource-scope distinctions.

## Recommended path

Use this reading order when you are getting started:

1. [Why use the template](https://docs.apiease.com/docs/developers/why-use-the-template) to understand why `apiease-template` is the recommended starting point
2. [Quickstart with apiease-template](https://docs.apiease.com/docs/developers/quickstart-with-apiease-template) to initialize the project, configure auth, and sync resources
3. [Resource handles](https://docs.apiease.com/docs/developers/resource-handles) to understand stable identifiers for source-controlled resources
4. [apiease-template](https://docs.apiease.com/docs/developers/apiease-template) to understand the repository layout and what belongs in source control
5. [apiease-cli](https://docs.apiease.com/docs/developers/apiease-cli) for the command-line workflow that manages saved resources
6. [APIEase Public API](https://docs.apiease.com/docs/developers/apiease-public-api) when you need lower-level HTTP integration
7. [Using APIEase with AI agents](https://docs.apiease.com/docs/developers/using-apiease-with-ai-agents) when Codex-style agents will work inside the repository

## Choose the right page

Use these pages based on the job you need to do:

- [Quickstart with apiease-template](https://docs.apiease.com/docs/developers/quickstart-with-apiease-template): the canonical start-here path for repository-based APIEase development
- [Why use the template](https://docs.apiease.com/docs/developers/why-use-the-template): why the template comes before the CLI or public API in most projects
- [Resource handles](https://docs.apiease.com/docs/developers/resource-handles): stable public identifiers for requests, widgets, variables, and functions
- [apiease-template](https://docs.apiease.com/docs/developers/apiease-template): expected repository layout, template-managed files, and version-controlled artifacts
- [apiease-cli](https://docs.apiease.com/docs/developers/apiease-cli): installation, configuration, CRUD commands, and template upgrade workflow
- [APIEase Public API](https://docs.apiease.com/docs/developers/apiease-public-api): authentication, resource routes, remote request execution, and direct HTTP usage
- [Using APIEase with AI agents](https://docs.apiease.com/docs/developers/using-apiease-with-ai-agents): repository-first guidance for Codex-style agents
- [Developer and automation FAQ](https://docs.apiease.com/docs/general/faq/developer-and-automation): concise answers about public API access, handles, remote execution, source control, the CLI, and AI-assisted workflows

## How this fits the rest of the docs

The Developers section focuses on the developer workflow around repositories, the CLI, and the public API.

For request behavior, request contracts, and other platform concepts, use the existing docs instead of treating this section as a duplicate reference:

- [Requests Overview](https://docs.apiease.com/docs/requests/requests-overview)
- [Request Types Overview](https://docs.apiease.com/docs/requests/request-types/request-types-overview)
- [Request Parameters Overview](https://docs.apiease.com/docs/requests/request-parameters/request-parameters-overview)
- [Triggers Overview](https://docs.apiease.com/docs/requests/triggers/triggers-overview)
- [Widgets Overview](https://docs.apiease.com/docs/widgets/widgets-overview)
- [Functions](https://docs.apiease.com/docs/functions/functions-overview)
- [Variables](https://docs.apiease.com/docs/variables/variables-overview)

## Practical workflow summary

In the intended workflow, you initialize a repository from the template, keep resource definitions in git, use `apiease-cli` to sync them with APIEase, and use the public API directly only when you need lower-level automation outside the normal CLI path.

SOURCE
https://docs.apiease.com/docs/developers/why-use-the-template

TITLE
Why use the template

CONTENT
# Why use the template

If you plan to build with APIEase as code, start from `apiease-template`.

It is the recommended starting point because it gives you a real project structure, a supported CLI workflow, and a safer way to keep APIEase resources under source control. The template is how APIEase turns requests, widgets, variables, and functions into repository-managed assets instead of one-off platform state.

If you want the full setup steps, start with [Quickstart with apiease-template](https://docs.apiease.com/docs/developers/quickstart-with-apiease-template).

## Start here when

Use the template if you want to:

- keep APIEase resources in git instead of only in the APIEase UI
- initialize a project with `apiease init` and manage it with [apiease-cli](https://docs.apiease.com/docs/developers/apiease-cli)
- give humans and AI agents the same repository layout and operating guidance
- adopt future template improvements through `apiease upgrade`

For most developer workflows, the template should come first, the CLI should be the normal operating tool, and the [APIEase Public API](https://docs.apiease.com/docs/developers/apiease-public-api) should stay available for lower-level integrations.

## What the template gives you

### A real repository shape

The template creates a defined project layout instead of asking each team to invent one.

Today that means:

- `apiease.config.js` as the source of truth for resource directories
- `resources/requests`
- `resources/widgets`
- `resources/variables`
- `resources/functions`
- `.apiease/project.json` for project metadata

That structure matters because the resource model in the repository matches the resource model in APIEase and the public API. Teams are not left guessing where files should live or how to organize saved definitions.

### Valid starting examples

The template includes example JSON files under `docs/examples/resources` that already follow the current public API shapes.

That means you can copy and adapt real starting points instead of reverse-engineering request or widget contracts from scratch. When you need the detailed request semantics behind those files, use the existing Requests docs:

- [Requests Overview](https://docs.apiease.com/docs/requests/requests-overview)
- [Request Types Overview](https://docs.apiease.com/docs/requests/request-types/request-types-overview)
- [Request Parameters Overview](https://docs.apiease.com/docs/requests/request-parameters/request-parameters-overview)
- [Triggers Overview](https://docs.apiease.com/docs/requests/triggers/triggers-overview)

### A safer upgrade path

The template is not just a folder snapshot. When you initialize a project through the CLI, APIEase stores template metadata in `.apiease/project.json`, including the template version and a manifest of template-managed files.

That gives `apiease upgrade` enough information to:

- add safe new template files later
- refresh template-managed files when they still match the previous template baseline
- skip conflicts instead of overwriting local work
- keep `CUSTOM_README.md` and `CUSTOM_AGENT_GUIDANCE.md` as customer-owned files

Without the template, you can still call the API or use the CLI, but you lose the supported upgrade model that keeps repository structure and guidance current over time.

### Better human and agent handoff

The template bundles more than empty directories. It also includes:

- `AGENTS.md` for default operating guidance
- `docs/shared-ongoing-ai-guidance.md` for shared implementation lessons
- `docs/knowledgebase/apiEaseDocsConsolidated.md` for local product reference material
- `CUSTOM_README.md` for project-specific human documentation
- `CUSTOM_AGENT_GUIDANCE.md` for project-specific agent instructions

This is one of the biggest reasons to start from the template. Humans, Codex/Claude Code style agents, and the CLI all work from the same repository instead of relying on hidden conventions or repeated prompt context.

For more on that workflow, see [Using APIEase with AI agents](https://docs.apiease.com/docs/developers/using-apiease-with-ai-agents).

## Why not start with the CLI or public API alone

You can use the CLI or the public API without fully adopting the template, but that usually pushes important project decisions back onto the team.

If you skip the template, you need to decide for yourself:

- where resource files belong
- which files should be committed
- how project-specific guidance should be separated from shared guidance
- how to keep future template changes aligned with the repository

The CLI is best understood as the tool that operates on a template-based repository. The public API is the lower-level interface behind that workflow. The template is what makes those interfaces practical for long-term team use.

## Recommended path

For most teams, the practical path is:

1. start with [Quickstart with apiease-template](https://docs.apiease.com/docs/developers/quickstart-with-apiease-template)
2. learn the project structure in [apiease-template](https://docs.apiease.com/docs/developers/apiease-template)
3. use [apiease-cli](https://docs.apiease.com/docs/developers/apiease-cli) for day-to-day sync operations
4. use the [APIEase Public API](https://docs.apiease.com/docs/developers/apiease-public-api) directly only when you need lower-level automation

That path keeps the template as the entry point while still making the CLI and public API available for the jobs they are best at.

SOURCE
https://docs.apiease.com/docs/developers/quickstart-with-apiease-template

TITLE
Quickstart with apiease-template

CONTENT
# Quickstart with apiease-template

This is the recommended way to start building with APIEase.

Use this quickstart when you want to:

- start from the APIEase template instead of inventing a repository layout
- configure APIEase authentication once and reuse it from the CLI
- keep requests, widgets, variables, and functions under source control
- sync those saved resources to APIEase through `apiease-cli`, which calls the [APIEase Public API](https://docs.apiease.com/docs/developers/apiease-public-api)

If you are new to the developer workflow, start here before the deeper pages for [apiease-template](https://docs.apiease.com/docs/developers/apiease-template), [apiease-cli](https://docs.apiease.com/docs/developers/apiease-cli), and the [APIEase Public API](https://docs.apiease.com/docs/developers/apiease-public-api).

## Install the APIEase CLI

Install the `apiease` command globally before you start the template workflow:

```bash
npm install -g apiease
```

After installation, confirm the command is available:

```bash
apiease
```

## Before you start

You need:

- Node.js 20 or newer
- a working `apiease` command from [apiease-cli](https://docs.apiease.com/docs/developers/apiease-cli)
- the APIEase base URL `https://app-admin.apiease.com`
- an APIEase API key
- a Shopify shop domain such as `yourstore.myshopify.com`

## Initialize the project from the template

Start in a new repository directory or in an existing directory that you want to turn into an APIEase project.

For a new project:

```bash
mkdir my-apiease-project
cd my-apiease-project
apiease init .
```

For an existing repository:

```bash
cd your-existing-repo
apiease init .
```

`apiease init` creates the template-based project structure and writes `.apiease/project.json`, which stores the template version and the template-managed file manifest used later by `apiease upgrade`.

After initialization, the important files and directories are:

- `apiease.config.js`
- `.apiease/project.json`
- `resources/requests`
- `resources/widgets`
- `resources/variables`
- `resources/functions`
- `docs/examples/resources`
- `CUSTOM_README.md`
- `CUSTOM_AGENT_GUIDANCE.md`

Use `resources/*` as the long-term home for the resource definitions you want to keep and version. The files under `docs/examples/resources` are starter examples you can copy and adapt.

## Configure APIEase authentication

The CLI can read authentication and environment settings from `~/.apiease`, so you do not need to repeat them on every command.

Create the home directory:

```bash
mkdir -p ~/.apiease
```

Select the active environment:

```bash
printf 'local\n' > ~/.apiease/environment
```

Create the matching env file:

```bash
printf 'APIEASE_API_KEY=your-local-api-key\nAPIEASE_BASE_URL=https://app-admin.apiease.com\nAPIEASE_SHOP_DOMAIN=yourstore.myshopify.com\n' > ~/.apiease/.env.local
```

Supported environment names are:

- `local`
- `staging`
- `production`

You can still override any value per command with `--api-key`, `--base-url`, or `--shop-domain`, but most teams should keep the shared defaults in `~/.apiease`.

## Copy the starter resources into your project

The template ships with example JSON files under `docs/examples/resources`. Copy the examples you want into the configured `resources/*` directories and then edit them for your project.

For example:

```bash
cp docs/examples/resources/requests/example-request.json resources/requests/product-details-proxy.json
cp docs/examples/resources/variables/example-variable.json resources/variables/support-api-key.json
```

Then update the copied files with your real handles, display names, endpoints, parameter values, and secrets.

The request example already uses the real public API request shape, including:

- `handle`
- `name`
- `type`
- `method`
- `address`
- `parameters`
- `triggers`

Keep the detailed request behavior in the existing Requests docs instead of re-documenting it in your repository:

- [Requests Overview](https://docs.apiease.com/docs/requests/requests-overview)
- [Request Types Overview](https://docs.apiease.com/docs/requests/request-types/request-types-overview)
- [Request Parameters Overview](https://docs.apiease.com/docs/requests/request-parameters/request-parameters-overview)
- [Triggers Overview](https://docs.apiease.com/docs/requests/triggers/triggers-overview)

## Sync resources with APIEase through the CLI

Once your JSON files are ready, use `apiease-cli` to create or update the saved resources in APIEase.

Sync a variable first if your request depends on one:

```bash
apiease create variable --file ./resources/variables/support-api-key.json
```

Sync a request from your project file:

```bash
apiease create request --file ./resources/requests/product-details-proxy.json
```

Read it back from APIEase:

```bash
apiease read request --request-handle product-details-proxy
```

Rerun `apiease create` after you change the JSON file:

```bash
apiease create request --file ./resources/requests/product-details-proxy.json
```

When a resource file has a valid `handle`, `apiease create` creates the resource if it is missing and updates the existing resource if that handle already exists. This create-or-update behavior applies to requests, widgets, variables, and functions.

Use resource-specific handle flags such as `--widget-handle`, `--variable-handle`, and `--function-handle` for read, explicit update, and delete commands. The CLI is the normal path here: it reads your local JSON file, resolves auth, and calls the underlying [APIEase Public API](https://docs.apiease.com/docs/developers/apiease-public-api) for you.

For the handle-based identifier model, see [Resource handles](https://docs.apiease.com/docs/developers/resource-handles).

Use direct HTTP calls only when you need lower-level automation outside the CLI workflow.

## Commit the project artifacts to git

The template workflow is repository-first. Commit the files that define your saved APIEase setup so changes can be reviewed and versioned like code.

In most projects, commit:

- `apiease.config.js`
- `.apiease/project.json`
- your JSON resource files under `resources/*`
- any examples you intentionally keep
- `CUSTOM_README.md`
- `CUSTOM_AGENT_GUIDANCE.md`

Typical initial commit flow:

```bash
git init
git add .
git commit -m "Initialize APIEase project"
```

Keep project-specific human guidance in `CUSTOM_README.md` and project-specific agent guidance in `CUSTOM_AGENT_GUIDANCE.md`. That keeps your custom instructions separate from the template-owned files that may later be refreshed by `apiease upgrade`.

## Keep the template current

Later, when the template changes, check whether your project can adopt the newer template version:

```bash
apiease upgrade --check
apiease upgrade --dry-run
```

If the plan looks correct, apply the safe template-managed updates:

```bash
apiease upgrade
```

This lets you pull in template improvements while preserving project-owned customization files and skipping managed conflicts instead of overwriting them.

## What this quickstart gives you

After these steps, you have:

- a template-based APIEase project repository
- reusable CLI authentication configuration
- versioned resource definitions under source control
- a repeatable path for syncing those definitions into APIEase through the CLI and public API

From here, use the deeper docs as needed:

- [apiease-template](https://docs.apiease.com/docs/developers/apiease-template)
- [apiease-cli](https://docs.apiease.com/docs/developers/apiease-cli)
- [APIEase Public API](https://docs.apiease.com/docs/developers/apiease-public-api)

SOURCE
https://docs.apiease.com/docs/developers/resource-handles

TITLE
Resource handles

CONTENT
# Resource handles

APIEase identifies saved request, widget, variable, and function resources by handle in the public API and CLI workflow.

Use handles when you want resource definitions to live in source control and sync predictably through `apiease-cli`.

## The resource identity model

Each saved resource can have three identity-related values:

- `id`: server-owned metadata generated by APIEase.
- `handle`: stable, user-controlled identifier used by public API and CLI workflows.
- `name`: human-readable display text.

Do not store server-generated `id` values in repository resource files. Create the file with a handle from the start, then keep using that handle for reads, updates, deletes, request calls, and code review.

Handles must be lowercase slug values using letters, numbers, and single hyphens between words:

```text
product-details-proxy
support-api-key
promo-banner
format-price
```

## Source file fields

Use the identifier field that belongs to the resource's public JSON shape:

| Resource | Stable source identifier | Display field | Notes |
| --- | --- | --- | --- |
| Request | `handle` | `name` | Use the handle as the request identifier in CLI and public API calls. |
| Widget | `handle` | `name` | Use the handle as the widget identifier in CLI, public API, and theme extension settings. |
| Variable | `handle` | `name` | Use `handle` in System Request arguments whenever possible. |
| Function | `handle` | `name` | The saved resource has a handle; the Liquid function tag still calls Functions by `functionName` or legacy `functionId`. |

APIEase responses may include both `id` and `handle`. Treat `id` as metadata returned by the server, not as a value to copy into source files.

## CLI identifiers

Prefer the handle-named flags for read, update, and delete commands:

| Resource | Preferred flag |
| --- | --- |
| Request | `--request-handle` |
| Widget | `--widget-handle` |
| Variable | `--variable-handle` |
| Function | `--function-handle` |

Legacy flags such as `--request-id`, `--widget-id`, `--variable-name`, and `--function-id` remain available as compatibility aliases in current CLI versions. When you use those aliases during migration, pass the handle as the value unless you are intentionally addressing an older server-owned id.

For requests, widgets, variables, and functions, `apiease create <resource> --file <path>` is idempotent when the file has a valid `handle`: the CLI creates the resource if it does not exist, or updates the existing resource with that handle if it does. Lookup failures other than not found stop the command instead of falling back to create.

## Public API identifiers

The public API item routes use the resource handle as the path value:

```text
/api/v1/resources/requests/{handle}
/api/v1/resources/widgets/{handle}
/api/v1/resources/variables/{handle}
/api/v1/resources/functions/{handle}
```

For example:

```bash
curl -X GET 'https://app-admin.apiease.com/api/v1/resources/requests/product-details-proxy' \
  -H 'x-apiease-api-key: your-apiease-api-key' \
  -H 'x-shop-myshopify-domain: yourstore.myshopify.com'
```

Some older route parameters, UI internals, and examples may still use names like `requestId`, `widgetId`, `widgetHandle`, `widgetName`, `variableName`, or `functionId`. For public CRUD workflows, treat those as legacy parameter names and pass the resource handle as the value.

## Runtime request calls

Several request execution surfaces still use the parameter name `requestId`, including Liquid `call` tags, storefront app proxy calls, widget JavaScript, and the remote caller API.

Use the request handle as the `requestId` value:

```liquid
{% call { "requestId": "product-details-proxy" } as response %}
{{ response.status }}
```

```js
const queryParams = new URLSearchParams({
  requestId: 'product-details-proxy',
});
```

This keeps runtime calls stable without copying APIEase-generated ids into theme code or repository files.

## Migrating older source files

For old request source files that still contain `id` or do not contain `handle`, run:

```bash
apiease create request --file ./resources/requests/product-details-proxy.json --auto-update-source-identifier
```

That updates only the local request identifier metadata. It does not change request behavior such as `type`, `method`, `address`, `parameters`, `triggers`, `liquid`, or `nextRequest`.

For older widget source files that still use `widgetHandle` or `widgetName`, run:

```bash
apiease create widget --file ./resources/widgets/product-details-widget.json --auto-update-source-identifier
```

That rewrites the local widget JSON before the create-or-update operation. If `widgetHandle` exists and `handle` is missing, the CLI writes `handle` from `widgetHandle`. If `widgetName` exists and `name` is missing, the CLI writes `name` from `widgetName`. Existing `handle` and `name` values are preserved, unrelated widget fields stay unchanged, and the resulting `handle` is used for create-or-update behavior.

For variables and functions, update the JSON source manually so it contains `handle`, the stable source identifier, and no server-owned id.

SOURCE
https://docs.apiease.com/docs/developers/using-apiease-with-ai-agents

TITLE
Using APIEase with AI agents

CONTENT
# Using APIEase with AI agents

This page is for coding agents such as Codex or Claude Code working in an `apiease-template` project repository.

Most agent-driven APIEase work should follow this path:

- start from [Quickstart with apiease-template](https://docs.apiease.com/docs/developers/quickstart-with-apiease-template)
- use [apiease-template](https://docs.apiease.com/docs/developers/apiease-template) as the repository structure
- sync saved resources through [apiease-cli](https://docs.apiease.com/docs/developers/apiease-cli)
- use the [APIEase Public API](https://docs.apiease.com/docs/developers/apiease-public-api) directly only when the CLI is not the right interface

## Distinguish Apex from a repository agent

Apex is the assistant inside APIEase. It can design changes to requests, widgets, Variables, and Functions during a conversation. Apex prepares a proposal first; you review the exact resource operations before approving or rejecting it.

The review shows description changes alongside the resource operations. Approval applies the exact reviewed proposal. Asking for changes rejects that immutable proposal and starts a new revision; it does not silently edit the proposal you already reviewed. Rejection, cancellation, or a failed apply leaves live resources unchanged.

For a request that could change real data, Apex may initially configure request-specific controls such as a dry-run option or a disabled `ALLOW_*` Variable when that pattern fits the integration. Inspect and test the saved request before enabling live behavior. An applied proposal confirms the APIEase resource change; it does not prove that an external integration works or that the broader business objective is complete.

A coding agent such as Codex or Claude Code uses the repository workflow documented on the rest of this page. It can manage requests, widgets, Variables, and Functions through version-controlled files and `apiease-cli`. The local diff provides the review boundary before you sync or commit changes.

## Start from the template

Agents should work inside a repository initialized with `apiease init`, not from a loose folder of one-off JSON files or ad hoc curl commands.

The template gives the agent:

- a stable repository layout under `resources/`
- starter examples under `docs/examples/resources/`
- default instructions in `AGENTS.md`
- a bundled APIEase knowledge base in `docs/knowledgebase/apiEaseDocsConsolidated.md`
- a shared guidance file in `docs/shared-ongoing-ai-guidance.md`
- project-owned customization files in `CUSTOM_README.md` and `CUSTOM_AGENT_GUIDANCE.md`

That structure is what makes Codex-style work repeatable instead of prompt-only.

## Read the local guidance first

In the current template, the intended reading order for an agent is:

1. `AGENTS.md`
2. `docs/shared-ongoing-ai-guidance.md`
3. `docs/knowledgebase/apiEaseDocsConsolidated.md`
4. `CUSTOM_AGENT_GUIDANCE.md`
5. `CUSTOM_README.md`
6. `README.md`

This order matters:

- the template-owned files explain the default APIEase workflow
- the custom files are where the project should override that default with team-specific goals, naming, and constraints

If `CUSTOM_AGENT_GUIDANCE.md` and `CUSTOM_README.md` are empty placeholders, the agent should leave them available for project-specific instructions instead of inventing hidden conventions elsewhere.

## Treat the repository as the source of truth

Inside a template-based project, the agent should treat local files as the canonical representation of saved APIEase resources.

Use `apiease.config.js` as the source of truth for resource directory names. In the current template, that means working primarily in:

- `resources/requests`
- `resources/widgets`
- `resources/variables`
- `resources/functions`

Use `docs/examples/resources/*` as copyable examples, not as the long-term home for project resources.

Resource files should use `handle` as the stable identifier across requests, widgets, variables, and functions. Do not copy server-owned `id` values into source files. For the full convention, see [Resource handles](https://docs.apiease.com/docs/developers/resource-handles).

Use the optional `description` field to record a resource's purpose, behavior, and important relationships. Descriptions are supported for all four resource types. Keep operational status, credentials, approval notes, and test claims out of descriptions. Omitting `description` from an update preserves the current text; an explicit empty string clears it.

When the task involves request behavior, do not re-invent request concepts from memory. Reuse the existing Requests documentation for detailed semantics:

- [Requests Overview](https://docs.apiease.com/docs/requests/requests-overview)
- [Request Types Overview](https://docs.apiease.com/docs/requests/request-types/request-types-overview)
- [Request Parameters Overview](https://docs.apiease.com/docs/requests/request-parameters/request-parameters-overview)
- [Triggers Overview](https://docs.apiease.com/docs/requests/triggers/triggers-overview)

## Keep authentication outside the repository

The normal agent workflow is to read APIEase authentication from `~/.apiease`, not from tracked project files.

Typical local setup:

```bash
mkdir -p ~/.apiease
printf 'local\n' > ~/.apiease/environment
printf 'APIEASE_API_KEY=your-local-api-key\nAPIEASE_BASE_URL=https://app-admin.apiease.com\nAPIEASE_SHOP_DOMAIN=yourstore.myshopify.com\n' > ~/.apiease/.env.local
```

This matters for agent work because:

- the repository can stay versioned without embedding environment-specific credentials
- the same local project can be synced against different APIEase environments
- the agent can use the CLI without repeating flags on every command

Do not commit real secrets, API keys, or environment files into the repository.

## Use a repository-first agent loop

For most Codex-style tasks, the working loop should be:

1. read the local guidance files
2. inspect the current resource files and examples
3. add or edit JSON definitions under `resources/*`
4. sync those definitions with idempotent `apiease create` commands
5. read the saved resource back when needed to confirm the change
6. review and commit the repository changes

Example flow for a request:

```bash
cp docs/examples/resources/requests/example-request.json resources/requests/product-details-proxy.json
apiease create request --file ./resources/requests/product-details-proxy.json
apiease read request --request-handle product-details-proxy
```

After editing the same file again, rerun the same create command:

```bash
apiease create request --file ./resources/requests/product-details-proxy.json
```

When a resource file has a valid `handle`, `apiease create` creates the resource if it is missing and updates the existing resource if that handle already exists. Use the same create-or-update pattern for widgets, variables, and functions. Use the resource-specific handle flags documented in [apiease-cli](https://docs.apiease.com/docs/developers/apiease-cli) for read, explicit update, and delete commands.

## Prefer the CLI over direct HTTP

For agent work inside a template repository, `apiease-cli` should be the default interface.

That keeps the workflow aligned with:

- the repository layout created by the template
- the current auth resolution model from `~/.apiease`
- the saved-resource contract exposed by the public API

Use direct HTTP calls only when you need lower-level automation that the CLI does not already cover. When you do, use the headers and routes documented in [APIEase Public API](https://docs.apiease.com/docs/developers/apiease-public-api).

For direct remote execution of an existing saved request, the current route is:

```bash
curl -X POST 'https://app-admin.apiease.com/api/remote/caller/call?requestId=product-details-proxy' \
  -H 'x-apiease-api-key: your-apiease-api-key' \
  -H 'x-shop-myshopify-domain: yourstore.myshopify.com'
```

The remote caller parameter is still named `requestId`; pass the request handle as its value for new work.

## Keep source control in the loop

The intended AI-agent workflow is not "make API calls and hope the platform state is remembered later." The repository should capture the durable definition of what the project wants APIEase to contain.

In a template-based repository, agents should usually version:

- `apiease.config.js`
- `.apiease/project.json`
- resource definitions under `resources/*`
- project-specific notes in `CUSTOM_README.md`
- project-specific agent instructions in `CUSTOM_AGENT_GUIDANCE.md`

Use git review as part of the workflow:

- inspect diffs before syncing or committing
- keep commits focused on one resource or one related change set
- use `apiease upgrade --check` and `apiease upgrade --dry-run` when updating the template baseline

Keep project-specific decisions in the `CUSTOM_*` files so later template upgrades can refresh template-owned files without overwriting local operating guidance.

## What good agent tasks look like

AI agents work best when the task says:

- which resource type should change
- which file under `resources/*` should be created or updated
- which existing docs or examples should be used as the contract reference
- whether the agent should sync through the CLI or stop at a reviewed git diff

That gives the agent a repository-first workflow with clear boundaries:

- local files define the desired state
- `apiease-cli` applies that state to APIEase
- the public API stays available for lower-level integrations
- git preserves the change history

SOURCE
https://docs.apiease.com/docs/developers/apiease-public-api

TITLE
APIEase Public API

CONTENT
# APIEase Public API

The APIEase public API is the HTTP interface behind `apiease-cli` and other external automation.

Use it when you want to:

- manage saved APIEase resources from code or scripts
- keep request, widget, variable, and function definitions under source control
- execute an existing APIEase request from outside Shopify

Most developer workflows should use the public API through `apiease-cli` from an `apiease-template` repository, but the underlying HTTP interface is available when you need direct integration.

## What the public API covers

Today, the public API has two main jobs:

1. CRUD operations for saved resources under `/api/v1/resources`
2. Remote execution of an existing saved request through `/api/remote/caller/call`

This is important because the public API is not a generic one-off proxy for arbitrary outbound calls. You first create and store APIEase resources, then APIEase manages execution using those saved definitions.

## Authentication

Public API requests are authenticated with two headers:

- `x-apiease-api-key`: your APIEase API key
- `x-shop-myshopify-domain`: the target shop domain, for example `yourstore.myshopify.com`

When you send JSON bodies, also include:

- `content-type: application/json`

Example:

```bash
curl -X GET 'https://app-admin.apiease.com/api/v1/resources/requests' \
  -H 'x-apiease-api-key: your-apiease-api-key' \
  -H 'x-shop-myshopify-domain: yourstore.myshopify.com'
```

APIEase resolves the shop from the `x-shop-myshopify-domain` header. Do not rely on shop-identifying fields in the JSON body.

This APIEase API key authenticates the caller to APIEase. It is not a Shopify access token and it is not a credential for the external service used by a saved request. Configure outbound provider credentials on that saved request, normally as [sensitive request parameters](https://docs.apiease.com/docs/requests/request-parameters/in-app-parameters/in-app-parameters-overview).

## Resource routes

The current resource base path is `/api/v1/resources`.

| Resource | Collection route | Item route |
| --- | --- | --- |
| Requests | `/api/v1/resources/requests` | `/api/v1/resources/requests/{handle}` |
| Functions | `/api/v1/resources/functions` | `/api/v1/resources/functions/{handle}` |
| Variables | `/api/v1/resources/variables` | `/api/v1/resources/variables/{handle}` |
| Widgets | `/api/v1/resources/widgets` | `/api/v1/resources/widgets/{handle}` |

Collection routes support:

- `GET` to list resources
- `POST` to create a resource

Item routes support:

- `GET` to read one resource
- `PUT` to update one resource
- `DELETE` to delete one resource

In practice, `apiease-cli` is a thin wrapper around these routes.

## Resource identity

Use handles as the public identifiers for saved resources:

- request resources use `handle`
- function resources use `handle`
- variable resources use `handle`
- widget resources use `handle`

APIEase still returns server-owned ids in some responses, such as `id`. Treat those values as APIEase metadata. Do not store them in source-controlled resource definition files, and do not use them for new public API automation. Older widget responses or examples may use `widgetId`; use `id` when you need to inspect server-owned widget metadata.

Handles must be lowercase slug values using letters, numbers, and single hyphens between words, such as `product-details-proxy` or `support-api-key`.

For a fuller explanation, see [Resource handles](https://docs.apiease.com/docs/developers/resource-handles).

## Request conventions

If you are working with request resources, keep these conventions in mind:

- `type` is required and currently supports `http`, `flow`, `liquid`, and `system`
- `method` and `address` are required for `http` requests
- `liquid` is required for `liquid` requests
- `parameters` are optional for many requests but required for `system` requests
- `triggers` are optional and describe how a saved request can run later
- For `liquid` requests, include saved Liquid `parameters` only for saved values, sensitive values, or `{parameterName}` substitution.
- Add a `storefrontAppProxy` trigger only to requests that should be called directly through Shopify's app proxy. Do not add it to Liquid helper requests that are only called by other APIEase requests.

## Resource descriptions

Requests, widgets, variables, and functions support a `description` string of up
to 65,536 Unicode characters. Use it
to explain what the resource is for, how it behaves, and important relationships
to other resources. Do not put secrets, temporary execution status, approval
notes, or unverified test claims in it.

For requests, widgets, and variables, `description` is optional. Existing legacy
resources may omit it. Functions include the same field in their resource shape.
When updating a resource, omitting `description` preserves the saved value;
sending `"description": ""` clears it. `null` is not valid. A description-only
update is still a real resource change.

The public API accepts the same request concepts already documented in the Requests section. Use those pages as the source of truth for detailed behavior instead of duplicating that material here:

- [Requests Overview](https://docs.apiease.com/docs/requests/requests-overview)
- [HTTP Requests](https://docs.apiease.com/docs/requests/request-types/http-requests)
- [Flow Requests](https://docs.apiease.com/docs/requests/request-types/flow-requests)
- [Liquid Requests](https://docs.apiease.com/docs/requests/request-types/liquid-requests)
- [System Requests](https://docs.apiease.com/docs/requests/request-types/system-requests)
- [Request Parameters Overview](https://docs.apiease.com/docs/requests/request-parameters/request-parameters-overview)
- [Triggers Overview](https://docs.apiease.com/docs/requests/triggers/triggers-overview)

## Create a request

This example matches the request shape used by the template examples and the current public request contract:

```bash
curl -X POST 'https://app-admin.apiease.com/api/v1/resources/requests' \
  -H 'content-type: application/json' \
  -H 'x-apiease-api-key: your-apiease-api-key' \
  -H 'x-shop-myshopify-domain: yourstore.myshopify.com' \
  -d '{
    "handle": "product-details-proxy",
    "name": "Product Details Proxy",
    "description": "Fetch product details for the authenticated storefront proxy endpoint.",
    "type": "http",
    "method": "POST",
    "address": "https://api.example.com/products/{productHandle}/details",
    "parameters": [
      {
        "type": "header",
        "name": "Accept",
        "value": "application/json"
      },
      {
        "type": "header",
        "name": "Authorization",
        "value": "Bearer {external_api_token}",
        "sensitive": true
      },
      {
        "type": "path",
        "name": "productHandle",
        "value": "sample-product"
      }
    ],
    "triggers": [
      {
        "type": "proxyEndpoint",
        "proxyEndpoint": {
          "path": "product-details",
          "method": "GET",
          "authenticated": true
        }
      }
    ]
  }'
```

When creating or updating a request:

- send only the fields that belong to the resource itself
- use `handle` as the stable source-owned identifier
- do not send server-owned or shop-owned metadata such as `id`, `shop`, `shopId`, `shopDomain`, or `myshopifyDomain`
- mark confidential parameter values as `sensitive: true`

## Other resource payloads

The other saved resource types follow the same handle-first identity model.

Variable example:

```json
{
  "handle": "support-api-key",
  "name": "Support API Key",
  "description": "Stores the support provider credential used by support requests.",
  "value": "replace-with-real-secret",
  "sensitive": true
}
```

Function example:

```json
{
  "handle": "format-price",
  "name": "format_price",
  "description": "Format a numeric amount for display.",
  "type": "liquid",
  "liquid": "{{ amount }} {{ currency }}",
  "parameters": [
    { "name": "amount", "type": "number" },
    { "name": "currency", "type": "string" }
  ]
}
```

Widget example:

```json
{
  "handle": "promo-banner",
  "name": "Promo Banner",
  "description": "Renders the storefront promotion banner and its client-side behavior.",
  "liquid": "<section>Sale now live</section>",
  "javascript": "",
  "externalJavascriptUrls": [],
  "disableJavascript": false
}
```

For widgets, `handle` is the stable public identifier and `name` is display text. Older widget payloads or examples may use `widgetHandle`, `widgetId`, or `widgetName`; use `handle`, `id`, and `name` for new public API automation.

## Read, update, and delete

Use the collection route to list resources:

```bash
curl -X GET 'https://app-admin.apiease.com/api/v1/resources/requests' \
  -H 'x-apiease-api-key: your-apiease-api-key' \
  -H 'x-shop-myshopify-domain: yourstore.myshopify.com'
```

Use the item route to read, update, or delete one resource:

```bash
curl -X GET 'https://app-admin.apiease.com/api/v1/resources/requests/product-details-proxy' \
  -H 'x-apiease-api-key: your-apiease-api-key' \
  -H 'x-shop-myshopify-domain: yourstore.myshopify.com'
```

```bash
curl -X PUT 'https://app-admin.apiease.com/api/v1/resources/requests/product-details-proxy' \
  -H 'content-type: application/json' \
  -H 'x-apiease-api-key: your-apiease-api-key' \
  -H 'x-shop-myshopify-domain: yourstore.myshopify.com' \
  -d '{
    "name": "Product Details Proxy Updated",
    "type": "http",
    "method": "GET",
    "address": "https://api.example.com/products/{productHandle}/details"
  }'
```

```bash
curl -X DELETE 'https://app-admin.apiease.com/api/v1/resources/requests/product-details-proxy' \
  -H 'x-apiease-api-key: your-apiease-api-key' \
  -H 'x-shop-myshopify-domain: yourstore.myshopify.com'
```

The same CRUD pattern also applies to functions, variables, and widgets with their respective handle-based item routes.

## Execute a saved request remotely

The public API also exposes a remote execution route for saved requests:

```bash
curl -X POST 'https://app-admin.apiease.com/api/remote/caller/call?requestId=product-details-proxy' \
  -H 'x-apiease-api-key: your-apiease-api-key' \
  -H 'x-shop-myshopify-domain: yourstore.myshopify.com'
```

Use that route when the request definition already exists in APIEase and you want to trigger it from another system. The query parameter is still named `requestId`, but pass the request handle as the value for new integrations. For more detail, see [Calling APIEase Requests Remotely](https://docs.apiease.com/docs/requests/triggers/calling-requests-remotely).

This endpoint executes the saved definition. It does not accept an arbitrary destination URL or replace the resource CRUD routes.

## Response shape

Successful responses follow a simple pattern:

- collection reads return `{ ok: true, shopDomain, <resourcePlural> }`
- single-resource reads and writes return `{ ok: true, shopDomain, <resourceSingular> }`

Structured failures use this pattern:

```json
{
  "ok": false,
  "errorCode": "INVALID_REQUEST_CREATE_CONTRACT",
  "message": "Unable to create request",
  "fieldErrors": []
}
```

Common status codes across the public API include:

- `400` for invalid JSON, invalid shop context, or resource-specific bad input
- `401` for failed authentication
- `404` for missing resources on item routes
- `405` for unsupported methods
- `415` for non-JSON create or update bodies
- `422` for contract validation failures
- `500` for unexpected server failures

## Recommended workflow

For most teams, the practical workflow is:

1. keep resource definitions in a repository
2. manage them through `apiease-cli`
3. let the CLI call the public API using your configured base URL, API key, and shop domain
   In most cases, that base URL should be `https://app-admin.apiease.com`.
4. use direct HTTP calls only when you need custom automation outside the CLI

That keeps your APIEase resources versioned in git while still using the same public API contract that powers the CLI.

SOURCE
https://docs.apiease.com/docs/developers/apiease-cli

TITLE
apiease-cli

CONTENT
# apiease-cli

`apiease-cli` is the Node-based command-line tool for working with APIEase from a repository.

GitHub repository: [APIEase/apiease-cli](https://github.com/APIEase/apiease-cli)

Use it when you want to:

- initialize a project from the APIEase template
- keep requests, widgets, variables, and functions under source control
- create or update, read, and delete saved APIEase resources from local JSON files
- apply template updates without overwriting local conflicts

In practice, `apiease-cli` is the thin layer between your repository and the [APIEase Public API](https://docs.apiease.com/docs/developers/apiease-public-api).

## How the CLI fits the workflow

The intended developer workflow is:

1. start from an APIEase project repository
2. use `apiease init` to copy in the current template structure
3. configure APIEase authentication for the target environment
4. store resource definitions in git as JSON files
5. use idempotent `apiease create` commands to sync those files with APIEase, then `read` or `delete` resources when needed
6. use `apiease upgrade` to pull safe template updates later

This keeps your APIEase configuration versioned in git while still using the same public API contract that powers the CLI.

## Install

`apiease-cli` requires Node.js 20 or newer.

Install the published package from npm:

```bash
npm install -g apiease
```

The installed command is:

```bash
apiease
```

If you are developing the CLI itself from its repository, install its dependencies and link the local package:

```bash
npm install
npm link
```

If you are working directly inside the CLI repository without linking it globally, use `./bin/apiease-cli` instead.

## Configure authentication

Every CRUD command needs three values:

- an APIEase base URL, which normally should be `https://app-admin.apiease.com`
- an APIEase API key
- a Shopify shop domain

You can pass all three values explicitly on each command:

```bash
apiease create request \
  --file ./request-definition.json \
  --base-url https://app-admin.apiease.com \
  --shop-domain yourstore.myshopify.com \
  --api-key your-apiease-api-key
```

If any of those values are omitted, the CLI reads your active APIEase environment from `~/.apiease`.

Create the home directory:

```bash
mkdir -p ~/.apiease
```

Declare the active environment in `~/.apiease/environment`. Common values are:

- `local`
- `staging`
- `production`

Custom environment names such as `qa` are also supported when the matching `~/.apiease/.env.qa` file exists.

Example local setup:

```bash
printf 'local\n' > ~/.apiease/environment
printf 'APIEASE_API_KEY=your-local-api-key\nAPIEASE_BASE_URL=https://app-admin.apiease.com\nAPIEASE_SHOP_DOMAIN=yourstore.myshopify.com\n' > ~/.apiease/.env.local
```

Configuration precedence is:

1. explicit command flags
2. the selected `~/.apiease/.env.<environment>` file

Important details:

- if you provide all three explicit values, the CLI skips home configuration resolution
- if you provide only some values, the CLI merges them with the active home environment
- `APIEASE_API_KEY` is always required
- `APIEASE_BASE_URL` and `APIEASE_SHOP_DOMAIN` must resolve either from flags or from the active env file

## Command shape

The installed command is `apiease`, but the CLI help text still uses `apiease-cli` in usage output.

Supported top-level commands are:

- `init`
- `upgrade`
- `create`
- `read`
- `update`
- `delete`

CRUD commands always require a resource name immediately after the verb. Supported resources are:

- `request`
- `widget`
- `variable`
- `function`

Legacy bare command shapes such as `apiease read --request-handle product-details-proxy` are not supported. Use the resource name explicitly:

```bash
apiease read request --request-handle product-details-proxy
```

## Initialize a project

Use `init` to create or initialize a repository from the current template:

```bash
apiease init my-project
```

```bash
apiease init .
```

Current CLI behavior:

- the installed CLI retrieves the current `apiease-template`; local CLI development can use a sibling template checkout
- the command writes project metadata to `.apiease/project.json`
- metadata includes the template version and a manifest of template-managed files
- `.git`, `.idea`, and `node_modules` are excluded from the copied template
- existing conflicting files are preserved and reported instead of overwritten

That makes `init` safe to use when you are starting a new repository or layering the template into an existing directory.

## Upgrade a project

Use `upgrade` to compare your project against the current template version:

```bash
apiease upgrade --check
apiease upgrade --dry-run
apiease upgrade
```

Current behavior:

- `--check` compares the stored template version in `.apiease/project.json` to the current template version
- `--dry-run` shows planned `Add`, `Update`, `Remove`, and `Skip conflict` paths without writing files
- `upgrade` applies safe template-managed changes and leaves conflicts in place
- `CUSTOM_README.md` and `CUSTOM_AGENT_GUIDANCE.md` are treated as customer-owned files instead of template-managed content
- the project metadata is updated after safe changes are applied

This is the CLI command that keeps a template-based repository current without blindly replacing local work.

## Manage resources

The CLI manages four saved APIEase resource types:

| Resource | Definition file | Preferred identifier flag |
| --- | --- | --- |
| Request | JSON object | `--request-handle` |
| Widget | JSON object | `--widget-handle` |
| Variable | JSON object | `--variable-handle` |
| Function | JSON object | `--function-handle` |

All definition files must contain valid JSON with an object at the root. Use `handle` as the stable source-controlled identifier. Server-owned `id` values are metadata returned by APIEase and should not be stored in request, widget, variable, or function source files.

All four resource types support a `description` that records purpose, behavior,
and important relationships. Keep it in the JSON file so pull, review, and Git
history preserve the same text as APIEase. Omit the field from an update to keep
the saved description, or set it to an empty string to clear it. Do not use
`null`, and do not put credentials or temporary lifecycle status in descriptions.

Widget files use `handle` for the stable identifier and `name` for display text. Older widget files that use `widgetHandle` or `widgetName` can be migrated with `apiease create widget --file ./widget-definition.json --auto-update-source-identifier` before the create-or-update operation.

Handles should be lowercase slug values using letters, numbers, and hyphens, for example:

```json
{
  "handle": "product-details-proxy",
  "name": "Product Details Proxy",
  "description": "Fetch product details from the external catalog service.",
  "type": "http",
  "method": "GET",
  "address": "https://api.example.com/products"
}
```

Create or update a resource from a JSON file:

```bash
apiease create request --file ./request-definition.json
```

For requests, widgets, variables, and functions, `apiease create <resource>` is idempotent when the file has a valid `handle`. The CLI looks up the remote resource by handle, updates it when found, and creates it when missing.

Lookup failures other than not found stop the command instead of falling back to create. Human output reports either `<Resource> created successfully.` or `<Resource> updated successfully.`, and JSON output includes `operation` as `created` or `updated`. For example, rerunning `apiease create widget --file ./widget-definition.json` updates the existing widget instead of creating a duplicate.

Read, update explicitly, and delete by handle:

```bash
apiease read request --request-handle product-details-proxy
apiease update request --request-handle product-details-proxy --file ./request-definition.json
apiease delete request --request-handle product-details-proxy
```

The same handle-based command pattern applies to widgets, variables, and functions:

```bash
apiease create widget --file ./widget-definition.json
apiease read widget --widget-handle promo-banner
apiease update widget --widget-handle promo-banner --file ./widget-definition.json
apiease delete widget --widget-handle promo-banner

apiease create variable --file ./variable-definition.json
apiease read variable --variable-handle support-api-key
apiease update variable --variable-handle support-api-key --file ./variable-definition.json
apiease delete variable --variable-handle support-api-key

apiease create function --file ./function-definition.json
apiease read function --function-handle format-price
apiease update function --function-handle format-price --file ./function-definition.json
apiease delete function --function-handle format-price
```

Legacy flags remain available as compatibility aliases:

- `--request-id`
- `--widget-id`
- `--variable-name`
- `--function-id`

Prefer the handle-named flags in new docs, scripts, and agent instructions. If you use a legacy alias during migration, pass the resource handle as the value.

For older request files that still contain `id` metadata or no `handle`, you can migrate only the local identifier metadata:

```bash
apiease create request --file ./request-definition.json --auto-update-source-identifier
```

For older widget files that still contain `widgetHandle` or `widgetName`, you can migrate the local source fields before the create-or-update operation:

```bash
apiease create widget --file ./widget-definition.json --auto-update-source-identifier
```

The widget migration writes `handle` from `widgetHandle` only when `handle` is missing, writes `name` from `widgetName` only when `name` is missing, preserves unrelated widget fields, and uses the resulting `handle` for create-or-update behavior.

Inside a template-based repository, the example resource files currently live under:

- `docs/examples/resources/requests`
- `docs/examples/resources/widgets`
- `docs/examples/resources/variables`
- `docs/examples/resources/functions`

Those files are a starting point. Replace them with project-specific resources and commit the definitions to git.

For the broader identifier model, see [Resource handles](https://docs.apiease.com/docs/developers/resource-handles).

## Request definitions and related docs

When you manage request resources through the CLI, the JSON file uses the same request concepts as the rest of APIEase. Use the existing docs for those details:

- [Requests Overview](https://docs.apiease.com/docs/requests/requests-overview)
- [Request Types Overview](https://docs.apiease.com/docs/requests/request-types/request-types-overview)
- [Request Parameters Overview](https://docs.apiease.com/docs/requests/request-parameters/request-parameters-overview)
- [Triggers Overview](https://docs.apiease.com/docs/requests/triggers/triggers-overview)
- [Widgets Overview](https://docs.apiease.com/docs/widgets/widgets-overview)
- [Functions](https://docs.apiease.com/docs/functions/functions-overview)
- [Variables](https://docs.apiease.com/docs/variables/variables-overview)

For the underlying HTTP routes and authentication headers, see [APIEase Public API](https://docs.apiease.com/docs/developers/apiease-public-api).

## JSON output and failures

Add `--json` when you want the raw structured response:

```bash
apiease create request --file ./request-definition.json --json
```

Without `--json`, the CLI prints human-readable success and failure output.

For create-or-update commands, JSON output includes `operation: "created"` when the CLI created a missing resource and `operation: "updated"` when it updated an existing resource.

Structured failures include the APIEase error code, message, optional HTTP status, and any field errors returned by the public API.

SOURCE
https://docs.apiease.com/docs/developers/apiease-template

TITLE
apiease-template

CONTENT
# apiease-template

`apiease-template` is the starter repository that `apiease-cli` uses when you run `apiease init`.

GitHub repository: [APIEase/apiease-template](https://github.com/APIEase/apiease-template)

It is the recommended foundation for APIEase development because it gives you:

- a predictable repository layout for requests, widgets, variables, and functions
- starter JSON definitions you can adapt instead of inventing resource shapes from scratch
- template-owned guidance files for humans and coding agents
- a structure that works with `apiease-cli` upgrades and the [APIEase Public API](https://docs.apiease.com/docs/developers/apiease-public-api)

Most teams should start from the template through [apiease-cli](https://docs.apiease.com/docs/developers/apiease-cli) instead of cloning the template repository directly.

## What ships in the template

The current template includes:

- `apiease.config.js` as the source of truth for resource directory names
- `resources/requests`, `resources/widgets`, `resources/variables`, and `resources/functions` as the canonical resource folders
- `.gitkeep` files in each resource directory so the structure is committed even before you add project-specific definitions
- starter example JSON files under `docs/examples/resources`
- template guidance in `README.md`, `AGENTS.md`, `docs/shared-ongoing-ai-guidance.md`, and `docs/knowledgebase/apiEaseDocsConsolidated.md`
- user-owned customization files in `CUSTOM_README.md` and `CUSTOM_AGENT_GUIDANCE.md`

The example resources are intentionally lightweight. Use them as reference material or copy them into your working resource directories as you start defining your project.

Those examples use `handle` as the stable source-controlled identifier across requests, widgets, variables, and functions. Server-owned `id` values should not be stored in template resource files. See [Resource handles](https://docs.apiease.com/docs/developers/resource-handles) for the full identifier pattern.

Each resource definition can also carry a `description` explaining its purpose,
behavior, and important relationships. Descriptions round-trip through the CLI,
public API, export/import, and Git projection with the rest of the resource.
Legacy request, widget, or variable files may omit the field without acquiring an
empty value. In an update, omission preserves the saved description and an
explicit empty string clears it.

## Expected repository layout

This is the shape the template establishes today:

```text
your-project/
  .apiease/
    project.json
  apiease.config.js
  resources/
    requests/
    widgets/
    variables/
    functions/
  docs/
    examples/
      resources/
        requests/
        widgets/
        variables/
        functions/
    knowledgebase/
      apiEaseDocsConsolidated.md
    shared-ongoing-ai-guidance.md
  README.md
  AGENTS.md
  CUSTOM_README.md
  CUSTOM_AGENT_GUIDANCE.md
```

Important details:

- `apiease.config.js` currently sets `resources` as the root resource directory and defines the four resource subdirectories explicitly
- `.apiease/project.json` is written by `apiease init` and stores the template version plus the template-managed file manifest used by `apiease upgrade`
- the bundled examples live under `docs/examples/resources`, but the configured long-term project layout is the `resources/*` tree

## What belongs in source control

In a real project repository created from the template, commit:

- `apiease.config.js`
- `.apiease/project.json`
- your JSON resource definitions under `resources/*`
- any starter examples you choose to keep or adapt
- project documentation in `CUSTOM_README.md`
- project-specific agent instructions in `CUSTOM_AGENT_GUIDANCE.md`

Keeping these files in git gives you a versioned record of your saved APIEase configuration and preserves the metadata that `apiease upgrade` uses to apply safe template updates later.

## Template-managed and customer-owned files

`apiease-cli` treats most copied template files as template-managed. That means they are tracked in `.apiease/project.json` and may be refreshed by `apiease upgrade` when the template changes.

Two files are explicitly customer-owned:

- `CUSTOM_README.md`
- `CUSTOM_AGENT_GUIDANCE.md`

Those files are copied into the project, but they are excluded from the stored template manifest so upgrade operations do not treat them as template-managed content.

This split is the intended customization model:

- keep template defaults and shared guidance in the template-owned files
- keep project-specific decisions in the two custom files

## Intended developer workflow

The template is designed for a repository-first workflow:

1. initialize a repository with `apiease init`
2. configure APIEase authentication for the environment you want to target
3. create or adapt JSON resource definitions in your project
4. version those definitions and the project metadata in git
5. use [apiease-cli](https://docs.apiease.com/docs/developers/apiease-cli) to create or update, read, or delete the saved resources in APIEase
6. use the [APIEase Public API](https://docs.apiease.com/docs/developers/apiease-public-api) directly only when you need a lower-level integration than the CLI
7. run `apiease upgrade` later to adopt safe template updates without overwriting project-owned work

The template does not replace the core APIEase documentation. It gives you a repository structure that makes those concepts easier to manage as code. For request behavior and request contracts, use the existing docs:

- [Requests Overview](https://docs.apiease.com/docs/requests/requests-overview)
- [Request Types Overview](https://docs.apiease.com/docs/requests/request-types/request-types-overview)
- [Request Parameters Overview](https://docs.apiease.com/docs/requests/request-parameters/request-parameters-overview)
- [Triggers Overview](https://docs.apiease.com/docs/requests/triggers/triggers-overview)
- [Widgets Overview](https://docs.apiease.com/docs/widgets/widgets-overview)
- [Functions](https://docs.apiease.com/docs/functions/functions-overview)
- [Variables](https://docs.apiease.com/docs/variables/variables-overview)

## Why the template is the recommended start

Starting from the template keeps the human workflow and the AI-agent workflow aligned:

- the repository structure is explicit instead of ad hoc
- the CLI and upgrade flow understand where the project came from
- resource definitions can be reviewed and versioned like code
- agents can rely on bundled guidance and the local APIEase knowledge base instead of reconstructing platform behavior from scratch

That is why the template is the preferred starting point even if your end goal is to automate APIEase through the CLI or the public API.

SOURCE
https://docs.apiease.com/docs/requests/requests-overview

TITLE
Requests Overview

CONTENT
# Requests Overview

Everything that you can accomplish with APIEase starts with a request.

A request is a configuration that defines how APIEase should securely call an external API, trigger a Shopify Flow workflow, run Liquid logic, or execute internal system functions. Each request contains the destination (when applicable), any necessary parameters, and optional logic to determine when and how it should run.

Each request has a handle. Use the handle as the stable identifier when another request calls it, storefront code triggers it, or `apiease-cli` and the public API manage it.

A request can also have a description. Use it to summarize the request's purpose,
behavior, and important relationships, such as which widget or chained request
uses it. The description is documentation; it does not affect execution or prove
that an integration has been tested successfully.

Requests can be used for a wide variety of purposes, including:

- Calling third-party APIs from your Shopify storefront
- Receiving webhook events and responding with external actions
- Scheduling recurring data syncs with external systems
- Triggering Shopify Flow automations
- Executing multiple requests in sequence based on API responses

There are four [Request types](https://docs.apiease.com/docs/requests/request-types/request-types-overview) in APIEase: [HTTP requests](https://docs.apiease.com/docs/requests/request-types/http-requests), [Flow requests](https://docs.apiease.com/docs/requests/request-types/flow-requests), [Liquid requests](https://docs.apiease.com/docs/requests/request-types/liquid-requests), and [System requests](https://docs.apiease.com/docs/requests/request-types/system-requests).

Every request you create can include embedded parameters, dynamic storefront values, or confidential credentials stored securely on the server.

Once created, each request can be triggered in several ways. You can run it manually from the admin, trigger it automatically using a webhook, start it from the storefront using Shopify's app proxy, or schedule it to run on a repeating interval using the built in cron system.

Requests are the core building blocks of APIEase. They give you a simple and secure way to create integrations, automate tasks, and connect your storefront with external services without the need to host your own app.

SOURCE
https://docs.apiease.com/docs/requests/how-to-add-requests

TITLE
Create and manage requests

CONTENT
# Create and manage requests

Use the **Requests** page in the APIEase admin to manage requests interactively. If request definitions need to live in source control or be managed by automation, use [`apiease-cli`](https://docs.apiease.com/docs/developers/apiease-cli) or the [APIEase public API](https://docs.apiease.com/docs/developers/apiease-public-api) instead.

## Create a request

1. Open **Requests** in Shopify Admin (APIEase Requests submenu on the lower left).
   ![APIEase Requests submenu](https://cdn.shopify.com/s/files/1/0733/1820/3680/files/requests-sub-menu.png?v=1744752589)
2. Click the **Add Request** plus button in the upper-left corner.
   ![Add request button](https://cdn.shopify.com/s/files/1/0733/1820/3680/files/add-http-api-requests.png?v=1744748372)
3. Configure the request name, handle, request type, parameters, and triggers.
4. Click **Save**. The request is ready to run based on the triggers you selected.

Choose a descriptive name for people and a lowercase, hyphenated handle for integrations. Keep the handle stable after another request, storefront code, `apiease-cli`, or a public API integration starts referencing it. See [Resource handles](https://docs.apiease.com/docs/developers/resource-handles).

## Find and edit a request

The **Requests** page lists each request by name and shows its handle when the handle differs from the name. Find the request in that list, then select its name or the **Edit** action. Update the configuration and click **Save**.

Before changing a handle, check every place that may call the request, including Liquid requests, chained requests, storefront code, widgets, CLI scripts, and public API integrations.

## Duplicate a request

Use the **Duplicate** action when a new request should start with an existing request's configuration.

1. Find the source request on the **Requests** page and select **Duplicate**.
2. Review the copied configuration in the new-request editor.
3. Confirm the new name and assign a unique handle.
4. Update any provider-specific address, parameters, triggers, or write behavior, and enter any sensitive values required by the new request.
5. Click **Save** only after the copy is safe to run as a separate request.

Duplicating opens a new draft; it does not change the source request. Do not assume that a saved sensitive value was copied into the draft. Sample requests can also be duplicated into editable drafts.

## Delete a request

1. Find the request and select **Delete**.
2. Confirm the request in the deletion dialog. The row is marked **Will be deleted**.
3. Click **Save** to apply the staged deletion, or **Discard** to cancel it.

Before deleting, remove or update callers that use the request handle. Deleting the request does not automatically repair Liquid calls, chained requests, storefront code, widgets, CLI scripts, or other integrations that reference it.

## Admin, CLI, and public API workflows

These management surfaces serve different workflows:

| Surface | Best for | Resources |
| --- | --- | --- |
| APIEase admin | Interactive creation and editing in Shopify Admin | Use the resource's page, such as **Requests**, **Widgets**, **Variables**, or **Functions**. |
| `apiease-cli` | Version-controlled definitions and repeatable environment setup | Requests, widgets, variables, and functions stored as JSON files. |
| APIEase public API | Direct resource automation from an external system | Request, widget, variable, and function CRUD routes. |

Do not copy server-generated IDs into repository files. CLI and public API workflows use a resource's stable handle; see [Resource handles](https://docs.apiease.com/docs/developers/resource-handles) for the identity rules.

SOURCE
https://docs.apiease.com/docs/requests/troubleshooting-requests

TITLE
Troubleshoot requests

CONTENT
# Troubleshoot requests

Troubleshoot one layer at a time. First confirm that the saved request is safe to run and works with a manual call. Then test the trigger or the next request in a chain. This separates APIEase configuration problems from authentication, permission, and external-provider failures.

## 1. Protect live data before testing

Before executing a request, check whether its method or body can create, update, or delete data. Use a provider sandbox, test store, test record, or provider-supported dry-run option when one is available. APIEase does not add a universal dry-run mode to every external API.

Avoid repeatedly testing a write request against production while changing several settings at once. Start with the smallest input that the receiving API documents as valid, and change one part of the request between runs.

## 2. Test the saved request manually

Use a [manual call](https://docs.apiease.com/docs/requests/triggers/manual-calls) to test the request from APIEase admin before invoking it through a webhook, schedule, remote call, proxy endpoint, or storefront call from theme or widget JavaScript.

Review the returned status, body, and execution details. Record which configuration produced the result, but do not copy credentials or private response data into support messages or shared logs.

- If the manual call fails, continue with the address, method, parameters, and credentials below.
- If the manual call works but another entry point fails, keep the working request configuration and skip to [isolate the trigger](#7-isolate-the-trigger).
- If a chain fails, test each request separately before reconnecting the chain.

## 3. Verify the address and method

Compare the saved **Address** and **Method** with the receiving API's current documentation.

- Use the complete endpoint address, including the documented API version and path.
- Confirm the host belongs to the intended environment and account.
- Confirm the operation expects GET, POST, PUT, PATCH, DELETE, or OPTIONS.
- Keep query values, body fields, and path replacements in their matching [parameter locations](https://docs.apiease.com/docs/requests/request-parameters/request-parameters-overview).

For Shopify Admin GraphQL, the [address preset](https://docs.apiease.com/docs/general/shopify-api/shopify-admin-graphql-address-preset) is the safest way to select the current shop endpoint. A `404` or `405` can indicate a wrong path or method, but providers define their own responses; verify the response body and provider documentation before drawing that conclusion.

## 4. Reduce and verify parameters

Start with only the fields the receiving API requires, then add optional fields back one at a time.

Check each value against the provider's contract:

- Put authentication and content-type metadata in headers.
- Put URL filters and options in query parameters.
- Match every path parameter to a placeholder in the address.
- Send the documented body format and content type. Do not send form URL-encoded data when the API expects JSON, or JSON when it expects form data.
- Check value types, capitalization, date formats, identifiers, and required fields.

Also confirm where the value comes from. [In-app parameters](https://docs.apiease.com/docs/requests/request-parameters/in-app-vs-dynamic) are saved with the request; dynamic embedded parameters are supplied for one execution and can override a saved parameter with the same name and location. A working saved value can therefore produce a different result when a trigger supplies an override.

## 5. Isolate credentials and permissions

An authentication failure is different from an address, body, or trigger failure. Confirm that the request uses the correct kind of credential and that it is sent exactly where the receiving API requires it.

For `401` and `403` responses, follow [Credentials, authentication, and security](https://docs.apiease.com/docs/general/faq/credentials-and-security). That page distinguishes rejected credentials from permission problems and links to the Shopify automatic-token and scope checks. External providers can use status codes differently, so their response body and documentation remain authoritative.

Do not replace or expose a sensitive value merely to debug another part of the request. If the original credential is unavailable or no longer valid, create or rotate it at the issuing provider and save the replacement as a sensitive request parameter.

## 6. Separate the provider response from APIEase configuration

Once APIEase reaches the configured endpoint, the external service decides the HTTP status and response body. APIEase cannot reliably diagnose an undocumented provider response or promise that the provider uses a status code in the usual way.

Use the response safely:

1. Read the response body for a provider error code, field name, or request requirement.
2. Compare the status and body with the provider's current documentation.
3. Confirm the credential's account, environment, scopes, and access to the requested resource.
4. Reproduce the smallest documented request, changing one field at a time.
5. Contact the provider when its documentation does not explain a response from its service.

For a network error or timeout, first recheck the scheme, host, and path and confirm that the provider endpoint is available from a server-side client. Then check the provider's status information, rate limits, and expected response time. A timeout alone does not identify which system is at fault, and retrying a write operation can duplicate side effects.

## 7. Isolate the trigger

If the request works manually, test only the entry point that fails. The [triggers overview](https://docs.apiease.com/docs/requests/triggers/triggers-overview) links to the prerequisites for each execution mechanism.

- **Webhook:** confirm the intended event is selected and map fields from the actual webhook payload.
- **Cron:** confirm the five-field expression and remember that schedules use UTC.
- **Remote call:** confirm the request handle, shop-domain header, and APIEase API key.
- **Proxy endpoint:** confirm the configured path, HTTP method, and authentication choice.
- **Storefront call from theme or widget JavaScript:** confirm the directly called request has a **Storefront App Proxy** trigger and that the browser call supplies the expected runtime parameters.

Compare the failing trigger's runtime parameters with the values used by the successful manual call. Missing input, a different parameter name or location, or a dynamic override can explain why the same saved request behaves differently.

## 8. Test a chained request one step at a time

For a multi-step workflow, remove or temporarily clear **Next Request**, then run the first request by itself. Confirm that its response contains the exact field the next request references. Test the next request independently with a safe representative value before restoring the chain.

When the individual requests work, reconnect them and check:

- **Next Request** contains the intended request handle.
- Response placeholders match the previous response's object path and capitalization.
- The placeholder is in the correct header, query, path, or body field.
- The first response uses the format the next request expects.

See [Chained requests](https://docs.apiease.com/docs/requests/request-parameters/chained-requests) for response placeholder syntax. For conditions, loops, or several explicit calls, use a [Liquid request](https://docs.apiease.com/docs/requests/request-types/liquid-requests) instead of making a linear chain carry workflow logic it was not designed for.

## 9. Re-test the complete path

After the smallest manual request succeeds, add optional parameters back one at a time, reconnect the chain, and test the real trigger. Repeat the live test only after confirming its inputs and side effects.

When asking for help, share the request type, trigger type, sanitized address shape, method, status code, and a redacted provider error. Never share API keys, access tokens, passwords, customer data, or an unredacted private response.

For concise answers to common failure patterns, see the [Troubleshooting requests FAQ](https://docs.apiease.com/docs/general/faq/troubleshooting-requests).

SOURCE
https://docs.apiease.com/docs/requests/connect-external-api

TITLE
Connect to an external API

CONTENT
# Connect to an external API

APIEase can call an external or third-party HTTP API when the provider exposes the required endpoint and gives you enough information and authorization to use it. This includes supplier, warehouse, ERP, CRM, fulfillment, and other provider APIs that use supported HTTP requests.

APIEase executes the requests you configure. It cannot discover an undocumented API, obtain credentials from a provider, bypass provider permissions, or guarantee that a particular provider permits the workflow you want.

## Gather the provider information first

Get the following from the API provider's current documentation or support team:

- the base URL and exact endpoint for each operation
- the HTTP method, such as `GET`, `POST`, `PUT`, `PATCH`, or `DELETE`
- the authentication scheme and credentials issued to you
- required headers and content type
- required path, query, and body fields, including their data types
- example success and error responses
- pagination behavior for list endpoints
- rate limits and any retry guidance
- a sandbox or test account, when the provider offers one
- webhook event and signature requirements if the provider needs to notify another system

Also define the business operation in concrete terms. For example, "read products changed since a timestamp" is actionable; "connect the supplier" is not enough to identify an endpoint or payload.

Do not send production credentials to APIEase support or place them in documentation examples. Enter credentials only in the intended request configuration after the provider issues them to you.

## Map each operation to an APIEase request

Most provider integrations use one saved [HTTP request](https://docs.apiease.com/docs/requests/request-types/http-requests) for each external API operation. Configure the provider's method, address, headers, body, and parameters in that request.

For a basic provider call:

1. [Create a request](https://docs.apiease.com/docs/requests/how-to-add-requests) and choose **HTTP** as the request type.
2. Enter the documented method and address, such as `https://api.example.com/v1/products`.
3. Add only the headers and parameters required by the provider. See [Request parameters](https://docs.apiease.com/docs/requests/request-parameters/request-parameters-overview).
4. Add the appropriate [trigger](https://docs.apiease.com/docs/requests/triggers/triggers-overview), or leave the request available for another APIEase request to call.
5. Save and run the request with non-production data before enabling a workflow that writes real data.

The provider's API documentation remains the authority for endpoint paths, payload shapes, permissions, pagination, and rate limits. A provider-branded example for a different account, API version, or operation may not match your contract.

## Build multi-step integrations from small requests

Keep authentication, data retrieval, transformation, and destination updates separate when they are separate API operations. This makes each step easier to test and reuse.

Use:

- [chained requests](https://docs.apiease.com/docs/requests/request-parameters/chained-requests) when one request should pass response values directly to the next request
- [Liquid requests](https://docs.apiease.com/docs/requests/request-types/liquid-requests) when you need loops, conditions, data shaping, or several named request calls
- [cron schedules](https://docs.apiease.com/docs/requests/triggers/cron-schedule) for fixed-time polling
- [Shopify webhooks](https://docs.apiease.com/docs/requests/triggers/webhooks/webhooks-overview) to react to supported Shopify events

For data movement patterns and planning questions, see [Synchronize data with an external system](https://docs.apiease.com/docs/requests/synchronize-external-data).

## Know which system owns each requirement

APIEase provides saved requests, execution options, parameter handling, and composition tools. The external provider controls whether its API is available, which credentials and permissions it grants, what its data means, and how callers must handle limits or errors. Shopify likewise controls its Admin API contracts and permissions.

If any required provider detail is missing, pause configuration and request that information from the provider. Guessing an endpoint, credential type, identifier, or write payload can produce failed calls or unintended data changes.

For concise answers about capabilities, provider requirements, resource management, and synchronization, see the [Getting started and integrations FAQ](https://docs.apiease.com/docs/general/faq/getting-started-and-integrations).

SOURCE
https://docs.apiease.com/docs/requests/synchronize-external-data

TITLE
Synchronize data with an external system

CONTENT
# Synchronize data with an external system

A synchronization is a workflow built from saved APIEase requests, not a single sync switch. Define which system owns the data, how a change is detected, how records are matched, and which API operation creates or updates the destination record.

Use this pattern for supplier catalogs, warehouse stock feeds, ERP order exports, CRM customer updates, fulfillment updates, and similar integrations.

## Define the synchronization contract

Before creating requests, decide:

1. **Direction:** external system to Shopify, Shopify to external system, or both.
2. **Source of truth:** which system wins when the same field differs.
3. **Scope:** the exact objects and fields that move.
4. **Identity:** the stable key used to match records, such as a SKU, provider record ID, Shopify global ID, or another documented identifier.
5. **Change detection:** one-time import, scheduled polling, or an event-driven update.
6. **Write behavior:** create, update, or both; also decide how missing or deleted records should be handled.
7. **Operational rules:** pagination, rate limits, duplicate-event handling, retries, and partial failures required by the APIs involved.

APIEase does not decide these business rules for you. Confirm them with the owner of each system and use the current provider and Shopify API documentation as the contract.

## Choose an execution pattern

### One-time import

Run a request manually for a bounded migration or initial catalog load. Start with a small, non-production sample and verify identifiers and field mappings before increasing the batch size.

### Scheduled pull

Add a [cron schedule](https://docs.apiease.com/docs/requests/triggers/cron-schedule) when APIEase should periodically ask a provider for changes. Prefer an endpoint that can filter by an updated timestamp or cursor when the provider supports one; the provider documentation determines the available filter and pagination rules.

### Shopify event-driven update

Use a [Shopify webhook](https://docs.apiease.com/docs/requests/triggers/webhooks/webhooks-overview) when a supported Shopify event should start the workflow. Map only the event data required by the destination operation.

### Multi-step orchestration

Use a [Liquid request](https://docs.apiease.com/docs/requests/request-types/liquid-requests) when the workflow must iterate through records, branch, transform data, or call several saved requests. Use a [chained request](https://docs.apiease.com/docs/requests/request-parameters/chained-requests) for a simpler response-to-next-request sequence.

## Separate source, mapping, and destination operations

A reusable synchronization usually has these parts:

1. A source HTTP request reads changed records.
2. A Liquid request or another documented transformation maps source fields to destination fields.
3. A destination HTTP request creates or updates one destination record.
4. The orchestrating request records or returns enough status information to identify partial failures.

Keeping provider calls separate prevents one large request from mixing authentication, pagination, mapping, and writes. It also lets you test a read operation without performing a destination write.

## Products and inventory

Product and inventory synchronization needs separate identity decisions. A product, variant, SKU, inventory item, and inventory location are not interchangeable identifiers. Confirm which identifier each source field represents and which Shopify Admin API operation accepts it.

For a third-party catalog or stock feed:

- decide whether the workflow creates products, updates existing products, updates inventory, or combines those operations
- define how provider records map to Shopify products and variants
- define location mapping before writing inventory quantities
- preserve the provider cursor or updated timestamp when incremental reads require it
- make write behavior safe for repeated records according to the destination API contract

See [Import products from a third-party system](https://docs.apiease.com/docs/general/apiease-details/importing-third-party-products) for the product-specific starting pattern. For Shopify calls and permissions, see [Shopify API calls and access tokens](https://docs.apiease.com/docs/general/shopify-api/shopify-api-calls-and-access-tokens).

## Orders, customers, and fulfillments

First identify the business event and direction. Common reusable patterns include sending a newly created Shopify order to an external system, periodically pulling fulfillment updates, or updating a customer record after a Shopify event.

Treat orders, customers, fulfillments, and fulfillment orders as distinct API resources. Verify required identifiers, permissions, state transitions, and write constraints in the current API documentation for both systems. Do not assume that an order ID can be used where a fulfillment or customer ID is required.

## Validate before enabling live writes

Use provider sandbox accounts and non-production Shopify data when available. Validate a small read, its mapping, and one destination write separately. Then test pagination and repeated input before enabling a schedule or event trigger.

APIEase executes the workflow as configured; it does not validate whether a write is correct for your business. Back up important data when practical and review any request that can create, update, or delete live records.

SOURCE
https://docs.apiease.com/docs/requests/import-from-postman

TITLE
Import from Postman

CONTENT
# Import from Postman

Bring your existing Postman requests into APIEase so you do not have to recreate paths, headers, and bodies by hand.

## Export your Postman collection
1. In Postman, open the collection you want to move into APIEase.
2. Click the kebab menu (⋯) next to the collection name and choose **Export**.
3. Select **Collection v2.1 (recommended)** and save the JSON file (keep it under 1 MB so the upload limit is not exceeded).

## Upload the collection in APIEase
1. In the APIEase admin, go to **Requests**.
2. Click the **Import From Postman** icon button next to **Add Request**, and choose the exported JSON file.
3. APIEase will preview the collection and add each request to the table with the proper method, URL path, headers, query params, and body.
4. Review the imported rows, replace variable auth values (for example `{{POSTMAN_BEARER_TOKEN}}`), and click **Save** to persist them.

## How requests are mapped
- Postman variables such as `{{api_base}}` become APIEase variables (`{api_base}`) so you can wire them to [in-app parameters](https://docs.apiease.com/docs/requests/request-parameters/in-app-parameters/in-app-parameters-overview), [dynamic embedded parameters](https://docs.apiease.com/docs/requests/request-parameters/dynamic-embedded-parameters/dynamic-embedded-parameters-overview), or payloads from [chained requests](https://docs.apiease.com/docs/requests/request-parameters/chained-requests) and [webhook triggers](https://docs.apiease.com/docs/requests/triggers/webhooks/mapping-webhook-parameters).
- Path segments like `:id` and Postman URL variables become path parameters.
- Bearer, Basic, and API key auth blocks become Authorization headers with variable values so secrets are not imported; update them after import with your real credentials or secrets.

SOURCE
https://docs.apiease.com/docs/requests/export-to-postman

TITLE
Export to Postman

CONTENT
# Export to Postman

Export your APIEase requests to Postman so teammates can collaborate outside Shopify or run calls locally.

## Download your collection
1. In the APIEase admin, go to **Requests**.
2. Click the **Export To Postman** icon button (hover to see the "Export To Postman" tooltip) to the right of the request actions.
3. APIEase will download `<shop>-requests.postman_collection.json` to your browser’s downloads folder; import that file into Postman.

## What the export includes
- Only active HTTP requests are included; they stay organized using the same folder paths you set in APIEase.
- URLs include your configured host, path, and query string with APIEase variables converted to Postman variables.
- Request bodies are exported as raw payloads with Postman variables (`{{variable}}`) where APIEase variables existed.
- Authorization headers become Postman auth blocks with variable tokens so secrets are not exposed.

## Tips for using the collection
- Create a Postman environment to fill in hostnames, tokens, and any variables before sending requests.
- Replace the variable auth tokens (for example `{{POSTMAN_BEARER_TOKEN}}`) with valid credentials in your environment.
- Re-export the collection after you add or edit requests in APIEase to keep Postman in sync.

SOURCE
https://docs.apiease.com/docs/requests/request-types/request-types-overview

TITLE
Request types overview

CONTENT
# Request types overview

APIEase supports four request types. Pick the one that fits how you want to call external services, Shopify Flow, or internal system functions.

- **[HTTP requests](https://docs.apiease.com/docs/requests/request-types/http-requests)**: Standard API calls to external services. You define the endpoint, method, headers, and body content.
- **[Flow requests](https://docs.apiease.com/docs/requests/request-types/flow-requests)**: Start or continue a Shopify Flow automation, optionally including data pulled from other API calls or the storefront.
- **[Liquid requests](https://docs.apiease.com/docs/requests/request-types/liquid-requests)**: Run a Liquid template that can call other APIEase requests and shape the output—helpful for logic or combining multiple requests without a custom app.
- **[System requests](https://docs.apiease.com/docs/requests/request-types/system-requests)**: Run internal APIEase functions (for example, set/get/delete persisted variables) without calling an external URL.

Use HTTP requests when you need a direct API call, Flow requests when the action should occur inside Shopify Flow, Liquid requests when you need templating or conditional logic without a custom app, and System requests for internal app-managed actions.

Request type describes what APIEase executes. It is separate from a [trigger](https://docs.apiease.com/docs/requests/triggers/triggers-overview), which describes how a saved request starts, and from [parameters](https://docs.apiease.com/docs/requests/request-parameters/request-parameters-overview), which provide its inputs.

For quick answers about choosing a type and combining requests, see the [Building requests FAQ](https://docs.apiease.com/docs/general/faq/building-requests).

SOURCE
https://docs.apiease.com/docs/requests/request-types/http-requests

TITLE
HTTP Requests

CONTENT
# HTTP Requests

HTTP API requests are highly configurable with many options.  HTTP requests allow you to securely call any external API directly from your Shopify store or through other trigger methods such as webhooks, storefront app proxy, or a recurring schedule.

![HTTP request editor](https://cdn.shopify.com/s/files/1/0733/1820/3680/files/add-http-api-requests.png?v=1744748372)

## HTTP request fields

- **Name**: Optional display name.
- **Handle**: Stable identifier used by [chained requests](https://docs.apiease.com/docs/requests/request-parameters/chained-requests), storefront calls, `apiease-cli`, and the public API.
- **Type**: Choose **HTTP** for a standard API call to an external service.
- **Address**: Enter the full endpoint URL from the provider's API documentation (for example, `https://api.example.com/data`). Keep values that belong in the query string, path placeholders, or body in their matching parameter locations.
- **Method**: Choose the operation required by the provider: GET, POST, DELETE, PUT, PATCH, or OPTIONS.
- **Parameters ([?](https://docs.apiease.com/docs/requests/request-parameters/in-app-vs-dynamic))**:
  - **Headers**: Add required headers (Authorization, Content-Type, etc.).
  - **Query parameters**: Values to include in the query string.
  - **Body**: Add the payload for methods such as POST, PUT, or PATCH. APIEase supports standard JSON bodies and [form URL-encoded bodies](https://docs.apiease.com/docs/requests/request-parameters/form-urlencoded-bodies).
  - **Path**: Dynamic [path variables](https://docs.apiease.com/docs/requests/request-parameters/path-variables) to substitute into the address.
  - **System**: Configure [HTTP timeouts, response formats, and certificate verification](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/http-parameters), or other [System Parameters](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/overview).
  - You can provide [in app parameters](https://docs.apiease.com/docs/requests/request-parameters/in-app-vs-dynamic) or pass [dynamic embedded parameters](https://docs.apiease.com/docs/requests/request-parameters/dynamic-embedded-parameters/dynamic-embedded-parameters-overview) from the storefront.
  - If the request includes credentials or API keys, mark them as **Sensitive** so they remain encrypted and never shown in the storefront or admin UI.
  


- **Triggers ([?](https://docs.apiease.com/docs/requests/triggers/webhooks/trigger-requests-from-a-webhook))**: Choose how the request should be triggered:
  - Automatically via [webhook](https://docs.apiease.com/docs/requests/triggers/webhooks/trigger-requests-from-a-webhook)
  - On a recurring schedule using [cron](https://docs.apiease.com/docs/requests/triggers/cron-schedule)
  - As an endpoint served by APIEase via [Proxy Endpoints](https://docs.apiease.com/docs/requests/triggers/proxy-endpoint)
  - [Remote Calls](https://docs.apiease.com/docs/requests/triggers/calling-requests-remotely) from outside Shopify.
  - Manually via the "Copy and Execute" link on the requests admin page
  - From your storefront using Shopify's app proxy

- **Next Request**: You can implement [chained requests](https://docs.apiease.com/docs/requests/request-parameters/chained-requests) by setting the Next Request field to the handle of a request to run after this one completes.

For a concise comparison of request types, parameter locations, and multi-step options, see the [Building requests FAQ](https://docs.apiease.com/docs/general/faq/building-requests).

SOURCE
https://docs.apiease.com/docs/requests/request-types/flow-requests

TITLE
Flow Requests

CONTENT
# Flow Requests

Flow requests hand data from APIEase to a Shopify Flow workflow. A Flow request is a request type, not an execution mechanism: add a suitable trigger when it is the entry request, or select its handle as **Next Request** when another APIEase request should continue into Flow.

To run a saved APIEase request from a Shopify Flow workflow, use [APIEase Flow Action](https://docs.apiease.com/docs/requests/shopify-flow-integration/run-saved-request-from-flow). For the APIEase-to-Flow setup, follow [Minimal Flow integration](https://docs.apiease.com/docs/requests/shopify-flow-integration/minimal-flow-integration).

![Flow request editor](https://cdn.shopify.com/s/files/1/0733/1820/3680/files/add-http-api-requests.png?v=1744748372)

**Flow Request Fields**

- **Name**: Optional display name.
- **Handle**: Stable identifier used when another request calls this one via a [chained request](https://docs.apiease.com/docs/requests/request-parameters/chained-requests).
- **Type**: Set to `flow` to trigger a Shopify Flow workflow.
- **Parameters ([?](https://docs.apiease.com/docs/requests/request-parameters/in-app-vs-dynamic))**:
  - **Flow**: JSON key/value pairs passed to your workflow.
  - **System**: Control [immediate responses and Flow response wait times](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/flow-parameters), or configure behavior such as [Customer Authentication](https://docs.apiease.com/docs/requests/customer-authenticated-requests).
  - Supply [in app parameters](https://docs.apiease.com/docs/requests/request-parameters/in-app-vs-dynamic) or [dynamic embedded parameters](https://docs.apiease.com/docs/requests/request-parameters/dynamic-embedded-parameters/dynamic-embedded-parameters-overview) from the storefront.
  - Mark credentials or secrets as **Sensitive** so they are encrypted and never exposed in the storefront or admin UI.

**Triggers ([?](https://docs.apiease.com/docs/requests/triggers/webhooks/trigger-requests-from-a-webhook))**: Choose how the request should be triggered:

- Automatically via [webhook](https://docs.apiease.com/docs/requests/triggers/webhooks/trigger-requests-from-a-webhook)
- On a recurring schedule using [cron](https://docs.apiease.com/docs/requests/triggers/cron-schedule)
- As an endpoint served by APIEase via [Proxy Endpoints](https://docs.apiease.com/docs/requests/triggers/proxy-endpoint)
- [Remote Calls](https://docs.apiease.com/docs/requests/triggers/calling-requests-remotely) from outside Shopify.
- Manually via the "Copy and Execute" link on the requests admin page
- From your storefront using Shopify's app proxy

See [Triggers overview](https://docs.apiease.com/docs/requests/triggers/triggers-overview) to choose an entry point and understand its prerequisite.

**Next Request**: You can specify the handle of another request to run after this request finishes. This allows you to build multi-step workflows using [chained requests](https://docs.apiease.com/docs/requests/request-parameters/chained-requests).

## Return a result from the workflow

APIEase receives the result when your workflow runs **APIEase Flow Action** with the original `executionId` in its **Flow Parameters** JSON. Follow [Minimal Flow integration](https://docs.apiease.com/docs/requests/shopify-flow-integration/minimal-flow-integration) to configure that callback.

Place the callback after the steps whose results the caller needs. Steps after the callback may still be running when the caller receives its response. Without a resolving callback, a waiting request can reach its wait limit.

## Concurrent calls and queued responses

Two simultaneous calls to the same request ID can each wait for their own Flow result. The current default allows up to 10 concurrent executions per request ID, per shop.

When the concurrency limit is reached, an additional call is queued and immediately returns **Request queued** with an execution ID. That response confirms the call was queued, not that its workflow has completed. The queued work is processed in the background when capacity becomes available.

Neither disabling immediate response nor increasing the response wait time changes this queue behavior. See [Flow Parameters](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/flow-parameters) to configure those settings.

SOURCE
https://docs.apiease.com/docs/requests/request-types/liquid-requests

TITLE
Liquid Requests

CONTENT
# Liquid Requests

Liquid requests let you run a Liquid template that can call any APIEase request and shape the output. This is useful when you want logic, variable substitution, or to combine multiple requests into one response without building a custom app.

To create a Liquid request, choose **Liquid** as the request type and enter the Liquid template. Add saved parameters only for values you want to store on the request, and add triggers only for the ways this request should run.

**Liquid Request Fields**

**Name**: You can optionally give your request a name for your reference.

**Handle**: Stable identifier used by Liquid `call` tags, chained requests, storefront calls, `apiease-cli`, and the public API.

**Type**: Set this to **liquid** to create a request that renders a Liquid template.

**Liquid**: The Liquid code that will run when this request is triggered. Your template can:

- Use standard Liquid tags like assign, if, elsif, else, for, and capture.
- Call other APIEase requests using the custom call tag shown below.
- Call saved APIEase Functions using the custom function tag shown below.
- Read saved Liquid parameters and runtime values passed in with `liquidParamsEmbedded`.

**Parameters**: Parameters are optional for Liquid requests. Add a saved parameter when a value should be stored on the request, reused as a default, marked sensitive, or inserted with `{parameterName}` before execution.

- **Liquid**: Saved key value pairs you want available for `{parameterName}` substitution.
- **System**: Configure [immediate Liquid responses](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/liquid-parameters), [response overrides](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/response-overrides), or other [System Parameters](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/overview).

**Saved Liquid parameters**

Saved Liquid parameters are configured on the request. Use them for stored defaults, server-side configured values, sensitive values, or values you want APIEase to substitute with `{parameterName}` before execution. APIEase replaces `{parameterName}` with the saved value when the request runs.

Saved Liquid parameters are different from runtime embedded Liquid parameters. Runtime embedded Liquid parameters are supplied by a caller with `liquidParamsEmbedded` and are read inside Liquid through `apiEaseParameters.liquidParams.<parameterName>`.

Example:

- Liquid parameter name: `audience`
- Liquid parameter value: `general`

```liquid
{% call {
  "requestId": "content-summary",
  "queryParamsEmbedded": {
    "audience": "{audience}"
  }
} as response %}
{{ response.status }}
```

In this example, `{audience}` is replaced by the saved Liquid parameter value before the request is executed.

If your request includes confidential values such as API keys or credentials, check the Sensitive checkbox. These values are stored on the server and are never exposed to the storefront or even the admin screen. Once they have been submitted they are encrypted in our database and only decrypted for use at runtime.

**Runtime embedded Liquid parameters**

Use `liquidParamsEmbedded` for per-call values supplied at runtime by storefront JavaScript, widget JavaScript, or another request. For storefront calls from theme or widget JavaScript, `liquidParamsEmbedded` is an APIEase runtime query parameter. Its value must be a JSON object string. Inside the Liquid request, APIEase exposes those values at `apiEaseParameters.liquidParams`.

Calling a request from theme or widget JavaScript:

```javascript
const liquidParams = {
  visitorName: "Alex",
  sourcePage: "homepage"
};

const queryParams = new URLSearchParams({
  requestId: "personalized-message",
  liquidParamsEmbedded: JSON.stringify(liquidParams)
});

fetch("/apps/apiease/integration/caller/call?" + queryParams.toString(), {
  headers: { Accept: "application/json" }
});
```

Liquid request:

```liquid
{% assign visitor_name = apiEaseParameters.liquidParams.visitorName | default: "there" | strip %}
{% assign source_page = apiEaseParameters.liquidParams.sourcePage | default: "unknown" | strip %}

{
  "message": "Hello, {{ visitor_name }}.",
  "sourcePage": {{ source_page | json }}
}
```

In this example, the APIEase runtime fields are `requestId`, `liquidParamsEmbedded`, and `apiEaseParameters.liquidParams`. The request handle, parameter keys, and values are example-specific:

- `requestId` is an APIEase runtime field. It selects which request runs, and its value should be the request handle.
- `liquidParamsEmbedded` is an APIEase runtime field. It passes a JSON object of values into a Liquid request.
- `apiEaseParameters.liquidParams` is the Liquid runtime object where those embedded Liquid parameters are exposed.
- `personalized-message` is only the example request handle.
- `visitorName` and `sourcePage` are only example-specific parameter names. Users can choose their own keys.
- `"Alex"` and `"homepage"` are only example values.

If the caller sends `{ "visitorName": "Alex" }` inside `liquidParamsEmbedded`, the Liquid request reads that value from `apiEaseParameters.liquidParams.visitorName`.

A Liquid request can also pass embedded Liquid parameters to another Liquid request with the `call` tag. In that case, provide `liquidParamsEmbedded` as an object in the call tag payload:

```liquid
{% call {
  "requestId": "personalized-message",
  "liquidParamsEmbedded": {
    "visitorName": "Alex",
    "sourcePage": "homepage"
  }
} as response %}
{{ response.data | json }}
```

**Supported Embedded Parameters**

When you invoke a request from a Liquid template using the call tag, you can include embedded parameters that override or add to the saved request configuration at runtime.

- `headersEmbedded`: Object of header key/value pairs to merge with saved request headers.
- `queryParamsEmbedded`: Object of query key/value pairs to merge with saved request query parameters.
- `pathParamsEmbedded`: Object of path key/value pairs to substitute into the saved request address path.
- `bodyEmbedded`: Object or raw string to use as the saved request body.
- `flowParamsEmbedded`: Object of key/value pairs passed into a Flow request.
- `liquidParamsEmbedded`: Object of key/value pairs made available to another Liquid request at `apiEaseParameters.liquidParams`.
- `systemParamsEmbedded`: Object of key/value pairs used by APIEase for special features such as Customer Authentication.

At runtime, embedded parameters take precedence over in app parameters for the matching scope.

**The call tag**

Use the call tag to invoke any saved APIEase request from within your Liquid template. You can bind the response to a variable with `as`. You must provide `requestId` to the call tag. For new work, pass the request handle as the `requestId` value.

Basic syntax with a hard coded request handle:

```liquid
{% call { "requestId": "product-details-proxy" } as response %}
{{ response.status }}
{{ response.data | json }}
```

Basic syntax with a request handle that must be set as a Liquid parameter:

```liquid
{% call { "requestId": "{requestHandle}" } as response %}
{{ response.status }}
{{ response.data | json }}
```

JSON style syntax:

You can also pass a single JSON object. This is convenient when you want to embed multiple parameter groups.

```liquid
{% call {
  "requestId": "product-details-proxy",
  "headersEmbedded": { "Authorization": "Bearer {api_token}" },
  "queryParamsEmbedded": { "limit": 10 },
  "pathParamsEmbedded": { "productId": "product_id" },
  "bodyEmbedded": { "note": "from Liquid" }
} as response %}
  {{ response.status }}
```

Response fields:

- `response.status`: The numeric status returned by the request.
- `response.data`: The response payload. Use the json filter to print full objects.

**The function tag**

Use the function tag to call a saved [Function](https://docs.apiease.com/docs/functions/functions-overview) from inside a Liquid Request. Functions are reusable Liquid helpers that run inside the current Liquid Request and do not create a separate request execution.

Inline syntax:

```liquid
{% function build_summary(customer.firstName, customer.lastName) as summary %}
{{ summary.message }}
```

Object syntax:

```liquid
{% function {
  "functionName": "build_summary",
  "args": {
    "firstName": "{{ customer.firstName }}",
    "lastName": "{{ customer.lastName }}"
  }
} as summary %}
{{ summary.message }}
```

Important behavior:

- `as <name>` is required.
- Inline arguments are mapped to the Function's declared parameters in order.
- Object syntax supports `functionName` or legacy `functionId`. Prefer `functionName` in new Liquid templates.
- Missing arguments resolve to `null`.
- Extra positional arguments are rejected.

For full details and more examples, see [Using Functions in Liquid Requests](https://docs.apiease.com/docs/functions/using-functions-in-liquid-requests).

**Using values from a previous response**

You can save values from one call and pass them into a second call using embedded parameters.

```liquid
{% call {"requestId": "customer-lookup"} as getCustomer %}

{% assign email = getCustomer.data.email %}

{% call {
  "requestId": "send-customer-email",
  "bodyEmbedded": { "email": email }
} as sendEmail %}

{{ sendEmail.status }}
```

**Control flow examples**

Conditional logic:

```liquid
{% call { "requestId": "product-details-proxy" } as response %}
{% if response.status == 200 %}
  Success
{% else %}
  Error
{% endif %}
```

Looping:

```liquid
{% call { "requestId": "product-details-proxy" } as response %}

{% for item in response.data.items %}
  {{ forloop.index }}. {{ item.title }}
{% endfor %}
```

Assign and capture:

```liquid
{% call { "requestId": "product-details-proxy" } as response %}

{% if response.status == 200 %}
  Success
{% else %}
  Error
{% endif %}
```

**Rendering tips**

- To print a full JSON object, use `| json`.
- When you only need a specific field, access it directly (for example, `{{ response.data.id }}`).
- Use `assign` to store values you will reuse across calls.

**Triggers**

Triggers are optional. Add a trigger only for the entry point that should run this request. Do not add the Storefront App Proxy trigger just because the request is a Liquid request; add that trigger only when storefront theme code calls this request directly through Shopify's app proxy. A Liquid request invoked by another APIEase request with the `call` tag does not need its own Storefront App Proxy trigger.

Choose how the request should be triggered:
  - Automatically via [webhook](https://docs.apiease.com/docs/requests/triggers/webhooks/trigger-requests-from-a-webhook)
  - On a recurring schedule using [cron](https://docs.apiease.com/docs/requests/triggers/cron-schedule)
  - As an endpoint served by APIEase via [Proxy Endpoints](https://docs.apiease.com/docs/requests/triggers/proxy-endpoint)
  - [Remote Calls](https://docs.apiease.com/docs/requests/triggers/calling-requests-remotely) from outside Shopify.
  - Manually via the "Copy and Execute" link on the requests admin page
  - From your storefront using Shopify's app proxy

**Next Request**

You can specify the handle of another request to run after this request finishes. This allows you to build multi step workflows using chained requests.

Use [chained requests](https://docs.apiease.com/docs/requests/request-parameters/chained-requests) for a simple linear handoff. Keep orchestration in Liquid when the workflow needs conditions, loops, response shaping, or several explicit `call` operations.

**Examples**

Hello world:

```liquid
{% assign greeting = "Hello from Liquid" %}
{{ greeting }}
```

Call a saved HTTP request and show JSON:

```liquid
{% call { "requestId": "product-details-proxy" } as r %}
{{ r.data | json }}
```

Call a Flow request with values from the template:

```liquid
{% assign orderId = params.order_id %}
{% call {
  "requestId": "start-order-flow",
  "flowParamsEmbedded": { "orderId": "{{orderId}}" }
} as flowRun %}
Run started: {{ flowRun.status }}
```

POST with a dynamic body:

```liquid
{% assign email = "test@example.com" %}
{% call {
  "requestId": "newsletter-signup",
  "headersEmbedded": { "Content-Type": "application/json" },
  "bodyEmbedded": { "email": "{{email}}", "source": "storefront" }
} as sub %}
{{ sub.status }}
```

SOURCE
https://docs.apiease.com/docs/requests/request-types/system-requests

TITLE
System Requests

CONTENT
# System Requests

System requests run internal APIEase functions. Unlike HTTP requests, System requests do not call an external URL.

If you want to manage the same persisted values manually in the admin, see [Variables Overview](https://docs.apiease.com/docs/variables/variables-overview).

## When to use System requests

Use a System request when you need an internal, app-managed action (for example, managing shop variables) instead of calling an external service.

## How to define a System request

**System Request Fields**

- **Name**: Optional display name.
- **Handle**: Stable identifier used when another request calls this one via a [chained request](https://docs.apiease.com/docs/requests/request-parameters/chained-requests).
- **Type**: Set to `system`.
- **Address**: Unused for System requests (leave blank).
- **Parameters ([?](https://docs.apiease.com/docs/requests/request-parameters/in-app-vs-dynamic))**:
  - **System**: Provide the system parameters listed below.

System request behavior is controlled by two in-app system parameters:

- `function`: One of `setVariables`, `getVariables`, or `deleteVariables`
- `arguments`: Either:
  - a JSON string representing the arguments array (recommended for persisted request definitions), or
  - an actual array at runtime (for example via `httpParameters.system.arguments`)

`arguments` must be an array (or a JSON string that parses to an array) of objects. Each array entry must include:

- `handle` (string, recommended), or
- `name` (string, legacy compatibility fallback)

Use `handle` for new System Request variable operations. Variable names are display text and can become ambiguous; handles are the stable public identifiers used by the CLI and public API.

## Supported functions

### setVariables

Each `arguments` entry supports:

- `handle` (recommended)
- `name` (legacy fallback)
- `value` (required to set a meaningful value; may be `null` if intentionally setting `null`)
- `sensitive` (optional boolean; APIEase may accept `"true"` / `"false"` but prefer a boolean)

Response `data` shape:

```json
{
  "<handle-or-name>": { "set": true }
}
```

Example system parameters:

- `function`: `setVariables`
- `arguments` (JSON string):

```json
[
  { "handle": "support-api-key", "value": "value1", "sensitive": true },
  { "handle": "support-email", "value": "help@example.com" }
]
```

Example response (`data`):

```json
{ "support-api-key": { "set": true }, "support-email": { "set": true } }
```

### getVariables

Each `arguments` entry supports:

- `handle` (recommended)
- `name` (legacy fallback)
- `defaultValue` (optional; used when the variable is missing or null/undefined)

Response `data` shape:

```json
{
  "<handle-or-name>": "<value-or-default-or-null>"
}
```

Example `arguments` (JSON string):

```json
[
  { "handle": "support-api-key" },
  { "handle": "support-email", "defaultValue": "help@example.com" }
]
```

Example response (`data`):

```json
{ "support-api-key": "persistedValue1", "support-email": "help@example.com" }
```

### deleteVariables

Each `arguments` entry supports:

- `handle` (recommended)
- `name` (legacy fallback)

Response `data` shape:

```json
{
  "<handle-or-name>": { "deleted": true }
}
```

Example `arguments` (JSON string):

```json
[
  { "handle": "support-api-key" },
  { "handle": "support-email" }
]
```

Example response (`data`):

```json
{ "support-api-key": { "deleted": true }, "support-email": { "deleted": false } }
```

SOURCE
https://docs.apiease.com/docs/requests/request-parameters/request-parameters-overview

TITLE
Request Parameters Overview

CONTENT
# Request Parameters Overview

APIEase lets you pass data into requests in several ways so each run has the inputs it needs without exposing sensitive values.

- **[In-app parameters](https://docs.apiease.com/docs/requests/request-parameters/in-app-parameters/in-app-parameters-overview)**: Saved values configured on the request. Use these when the value rarely changes or when a sensitive request parameter must remain server-side.
- **[Dynamic embedded parameters](https://docs.apiease.com/docs/requests/request-parameters/dynamic-embedded-parameters/dynamic-embedded-parameters-overview)**: Values provided at runtime by a caller, such as storefront code, a widget, or another request. They can supply headers, query values, path values, a body, Flow values, or Liquid values for one execution.
- **Path variables**: Placeholders in the request URL (`/products/{id}`) that are filled by in-app or dynamic embedded parameters when the request executes.
- **Chained request parameters**: Data passed from the response of one request into the next request in a sequence.

Choose the parameter type based on where the value comes from and whether it must stay confidential. Combine these options to keep sensitive data secure while still letting each trigger supply the context it needs.

Choose the parameter location from the receiving API's contract:

- **[Headers](https://docs.apiease.com/docs/requests/request-parameters/in-app-parameters/in-app-header-parameters)** carry request metadata, content type, or authentication.
- **[Query parameters](https://docs.apiease.com/docs/requests/request-parameters/in-app-parameters/in-app-query-parameters)** become key-value pairs in the URL query string.
- **[Path parameters](https://docs.apiease.com/docs/requests/request-parameters/in-app-parameters/in-app-path-parameters)** replace named [path variables](https://docs.apiease.com/docs/requests/request-parameters/path-variables) in the address.
- **[Body](https://docs.apiease.com/docs/requests/request-parameters/in-app-parameters/in-app-body-parameters)** carries the request payload. Use [form URL-encoded bodies](https://docs.apiease.com/docs/requests/request-parameters/form-urlencoded-bodies) only when the receiving API requires that content type.

For Liquid requests, distinguish saved Liquid parameters from runtime embedded Liquid parameters:

- **Saved Liquid parameters** are configured on the request and can be substituted with `{parameterName}` before execution. Use saved Liquid parameters for stored defaults, sensitive values, or other server-side configured values.
- **Runtime embedded Liquid parameters** are supplied by a caller with `liquidParamsEmbedded` and are read in Liquid through `apiEaseParameters.liquidParams.<parameterName>`. Use `liquidParamsEmbedded` for per-call values supplied at runtime.

See [In-app parameters vs dynamic embedded parameters](https://docs.apiease.com/docs/requests/request-parameters/in-app-vs-dynamic) for the saved-versus-runtime decision and override behavior. For quick request-building answers, see the [Building requests FAQ](https://docs.apiease.com/docs/general/faq/building-requests).

SOURCE
https://docs.apiease.com/docs/requests/request-parameters/in-app-vs-dynamic

TITLE
In-app parameters vs dynamic embedded parameters

CONTENT
# In-app parameters vs dynamic embedded parameters

Use an **in-app parameter** for a value saved with the request. Examples include `Content-Type: application/json`, a stable provider setting, or a sensitive request credential that must stay server-side.

Use a **dynamic embedded parameter** for a runtime value that can change on each call. For example, storefront code can pass the ID of the product currently being viewed instead of saving one product ID on the request. Dynamic embedded parameters are also called runtime parameters or embedded parameters.

Both forms use the same locations: headers, query parameters, path parameters, body, Flow parameters, Liquid parameters, and supported System parameters. If a saved parameter and dynamic embedded parameter have the same name in the same location, the dynamic embedded value normally overrides the saved value for that execution. Some [System Parameters](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/overview), including `REQUEST_TIMEOUT_SECONDS`, `IMMEDIATE_FLOW_RESPONSE`, and `RECORD_RUNTIME_HISTORY`, use the saved request setting instead.

Start with the [request parameters overview](https://docs.apiease.com/docs/requests/request-parameters/request-parameters-overview), then use the [in-app parameter](https://docs.apiease.com/docs/requests/request-parameters/in-app-parameters/in-app-parameters-overview) or [dynamic embedded parameter](https://docs.apiease.com/docs/requests/request-parameters/dynamic-embedded-parameters/dynamic-embedded-parameters-overview) pages for setup details.

SOURCE
https://docs.apiease.com/docs/requests/request-parameters/in-app-parameters/in-app-parameters-overview

TITLE
In-app parameters overview

CONTENT
# In-app parameters overview

In-app parameters are values you configure in the APIEase admin to be injected into outgoing requests. They live on the server, so secrets and default values stay hidden from storefront visitors while still being applied every time a request runs.

**Why use in-app parameters**
- Keep secrets safe: tokens, API keys, and internal headers stay server-side.
- Ensure consistency: apply the same defaults (such as content type or store identifier) across every request.
- Reduce duplication: define values once instead of repeating them in multiple requests or client code.

**Parameter types**
- [Headers](https://docs.apiease.com/docs/requests/request-parameters/in-app-parameters/in-app-header-parameters) for auth and custom metadata.
- [Body](https://docs.apiease.com/docs/requests/request-parameters/in-app-parameters/in-app-body-parameters) for payload fields you manage centrally.
- [Path](https://docs.apiease.com/docs/requests/request-parameters/in-app-parameters/in-app-path-parameters) for URL segments that should not be exposed on the storefront.
- [Query](https://docs.apiease.com/docs/requests/request-parameters/in-app-parameters/in-app-query-parameters) for reusable query strings.
- [System](https://docs.apiease.com/docs/requests/request-parameters/in-app-parameters/in-app-system-parameters) auto-populated by APIEase for common Shopify context.
- [Flow](https://docs.apiease.com/docs/requests/request-parameters/in-app-parameters/in-app-flow-parameters) to map Shopify Flow tokens into your requests.

**How to add**
1. Open a request in the APIEase admin and click the plus icon in the Parameter column.
2. Choose the parameter location (Header, Body, Path, or Query), then enter the name and value. Turn on **Sensitive** for a credential or other confidential value.
3. Save the request. APIEase will inject these values whenever the request is executed.

After you save a sensitive request parameter, APIEase masks it and does not return its value through normal read interfaces. It decrypts the value only when executing the request. If you lose the original value, obtain or generate a replacement at its issuing provider and replace the saved value; APIEase cannot reveal it.

**When to combine with dynamic parameters**
Use in-app parameters for anything sensitive or static. If you need runtime data from the storefront (such as cart info, page context, or user input), pair them with [dynamic embedded parameters](https://docs.apiease.com/docs/requests/request-parameters/dynamic-embedded-parameters/dynamic-embedded-parameters-overview). Keep credentials and other confidential values in-app and server-side.

Sensitive parameter storage protects the saved request configuration. It does not remove private data from the external API's response. Do not make a request publicly callable if its response can contain credentials or other private data.

SOURCE
https://docs.apiease.com/docs/requests/request-parameters/in-app-parameters/in-app-header-parameters

TITLE
In-app header parameters

CONTENT
# In-app header parameters

You can add custom headers to any APIEase request directly from the request editor. Headers are used to provide additional context or authorization when making API calls. Common examples include Authorization, Content-Type, and custom authentication tokens.

**How to Add a Header Parameter**
While editing your request:
1. Click the plus icon in the Parameter column.
2. Select the **Header** radio button.
3. Enter the header name in the **Name** field.
4. Enter the header value in the **Value** field.
5. Turn on **Sensitive** if the header contains an API key, access token, password, or other confidential value.
6. Click **Save** at the top of the request editor.

**Example Header Parameter:**
- **Name**: `Content-Type`
- **Value**: `application/json`

You can also use [embedded parameters](https://docs.apiease.com/docs/requests/request-parameters/dynamic-embedded-parameters/dynamic-embedded-parameters-overview) to dynamically set parameters from your storefront.

Do not use an embedded parameter for a credential. Store the credential as a sensitive in-app parameter so storefront code never supplies it.

![In-app header parameter example](https://tawk.link/65552a3acec6a91282103248/kb/attachments/dbGjN5Waw6.png)

SOURCE
https://docs.apiease.com/docs/requests/request-parameters/in-app-parameters/in-app-body-parameters

TITLE
In-app body parameters

CONTENT
# In-app body parameters

You can add body content to any APIEase request directly from the request editor. Body parameters are used to send structured data to the receiving system, usually when making a POST, PUT, or PATCH request.

Body parameters are always entered as a complete JSON object. The name of the parameter is automatically set to body, so you only need to provide the value.

**How to Add a Body Parameter**

While editing your request:
1. Click the plus icon in the Parameter column.
2. Select the **Body** radio button.
3. Enter your JSON body in the **Value** field.
4. Click **Save** at the top of the request editor.

**Example Body Parameter**:

- **Name**: body (The body parameter name is systematically set to "body" and cannot be changed.)
- **Value**:

```json
{"arg1":"value1","arg2":"value2","arg3":"value3"}
```

You can also use [embedded parameters](https://docs.apiease.com/docs/requests/request-parameters/dynamic-embedded-parameters/dynamic-embedded-parameters-overview) to dynamically set parameters from your storefront.

![In-app body parameter entry](https://tawk.link/65552a3acec6a91282103248/kb/attachments/i0yOK5rG4k.png)

SOURCE
https://docs.apiease.com/docs/requests/request-parameters/in-app-parameters/in-app-path-parameters

TITLE
In-app path parameters

CONTENT
# In-app path parameters

You can add path parameters to any APIEase request directly from the request editor. Path parameters are used to replace [path variables](https://docs.apiease.com/docs/requests/request-parameters/path-variables) within your address.

**How to Add a Path Parameter**

While editing your request:
1. Click the plus button in the Parameter column of the request.
2. Select the **Path** radio button.
3. Enter the path parameter name in the **Name** field.
4. Enter the path parameter value in the **Value** field.
5. Click **Save** at the top.

**Example Path Parameter:**
- **Name**: `pathVariable1`
- **Value**: `inAppValue1`

If your API endpoint is structured as `https://ex.com/products/{pathVariable1}` the system will render the address as `https://ex.com/products/inAppValue1` at runtime.

You can also use [embedded parameters](https://docs.apiease.com/docs/requests/request-parameters/dynamic-embedded-parameters/dynamic-embedded-parameters-overview) to dynamically set parameters from your storefront.

![In-app path parameter configuration](https://cdn.shopify.com/s/files/1/0733/1820/3680/files/path-variable-edit.png?v=1744137415)

SOURCE
https://docs.apiease.com/docs/requests/request-parameters/in-app-parameters/in-app-query-parameters

TITLE
In-app query parameters

CONTENT
# In-app query parameters

You can add query parameters to any APIEase request directly from the request editor. Query parameters are used to pass key-value pairs in the URL, usually for filtering, identifying, or paginating data in API requests.

## How to add a query parameter

While editing your request:
1. Click the plus icon in the Parameter column.
2. Select the **Query** radio button.
3. Enter the query parameter name in the **Name** field.
4. Enter the parameter value in the **Value** field.
5. Click **Save** at the top of the request editor.

## Query parameter example

To add `status=active` to a request URL:
- **Name**: `status`
- **Value**: `active`
Result: `https://example.com/items?status=active` (additional query parameters are appended automatically).

You can also use [embedded parameters](https://docs.apiease.com/docs/requests/request-parameters/dynamic-embedded-parameters/dynamic-embedded-parameters-overview) to dynamically set parameters from your storefront.

![In-app query parameter configuration](https://cdn.shopify.com/s/files/1/0733/1820/3680/files/in-app-query-parameters.png?v=1744835524)

SOURCE
https://docs.apiease.com/docs/requests/request-parameters/in-app-parameters/in-app-system-parameters

TITLE
In-app system parameters

CONTENT
# In-app system parameters

System parameters are special values that control how a request is handled by APIEase. Unlike headers, query parameters, or body values that are sent to the destination endpoint, system parameters affect the behavior of the request itself.

These parameters are managed directly in the request editor.

See [System Parameters](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/overview) for the complete reference, including HTTP, Flow, Liquid, response overrides, and runtime history settings.

**How to Add a System Parameter**  
While editing your request:
1. Click the plus icon in the Parameter column.
2. Select the **System** radio button.
3. Enter the system parameter name in the **Name** field.
4. Enter the desired value in the **Value** field.
5. Click **Save** at the top of the request editor.

**System Parameter Example:**  
To require logged-in customers for validation, set `validateCustomer` to `true`.
- **Name**: `validateCustomer`
- **Value**: `true`
With `validateCustomer` set to true, the customer must be logged in for the call to pass validation and return a response to the storefront.

![In-app system parameter configuration](https://cdn.shopify.com/s/files/1/0733/1820/3680/files/in-app-system-parameters.png?v=1744837315)

SOURCE
https://docs.apiease.com/docs/requests/request-parameters/in-app-parameters/in-app-flow-parameters

TITLE
In-app flow parameters

CONTENT
# In-app flow parameters

Flow parameters allow you to define the input data that will be passed to a Shopify Flow workflow when the request is executed. These parameters must match the input fields defined in your Flow template.

Flow parameters are configured directly in the request editor and entered as valid JSON.

**How to Add a Flow Parameter**

While editing your Flow request:
1. Click the plus icon in the Parameter column.
2. Select the **Flow** radio button.
3. Enter the **Name** you will use to access the flow parameter within your workflow.
4. In the **Value** field, enter your Flow input in JSON format.
5. Click **Save** at the top of the request editor.

**Flow Parameter Example:**

If your Flow expects a variable named `customer_data` that contains both an email and a customer tag, you could enter:
- **Name**: customer_data
- **Value**:

```json
{
  "email": "user@example.com",
  "tag": "VIP"
}
```

You can also use [embedded parameters](https://docs.apiease.com/docs/requests/request-parameters/dynamic-embedded-parameters/dynamic-embedded-parameters-overview) to dynamically set parameters from your storefront.

![In-app flow parameter fields](https://cdn.shopify.com/s/files/1/0733/1820/3680/files/in-app-flow-parameters.png?v=1744838680)

SOURCE
https://docs.apiease.com/docs/requests/request-parameters/dynamic-embedded-parameters/dynamic-embedded-parameters-overview

TITLE
Dynamic embedded parameters overview

CONTENT
# Dynamic embedded parameters overview

**Dynamic Embedded Parameters From Storefront Overview**  
In some cases, it's not enough to define your request parameters statically in the APIEase admin. You may need to send information from your storefront that is only available at runtime, based on the customer's session, selections, or activity.

This is where dynamic embedded parameters come in.

With APIEase, you can pass query parameters, headers, body content, path values, Flow values, or Liquid request values dynamically from your storefront using embedded placeholders. These dynamic values are injected into the request at the moment it is triggered from the storefront.

**Why Use Dynamic Embedded Parameters?**

Dynamic embedded parameters allow you to tailor each API request to the individual visitor, cart, or page context. Common use cases:
- Personalization: send a customer's name, email, or cart ID to an external service
- User input: capture form field values or product selections made on the page
- Session-based logic: include discount codes, location data, or referral info based on the current session
- Product data: pass information about the product being viewed or purchased
- Analytics or tracking: include context for tracking conversions, clicks, or customer actions

Without dynamic parameters, all values must be fixed in advance, which limits your ability to respond to customer behavior or use real-time data.

**Important Security Reminder**

Dynamic embedded parameters are useful for sending runtime information, but they should **never** be used to pass confidential credentials such as:

- Shopify access tokens
- API keys
- Usernames or passwords
- Secret authorization headers

The purpose of APIEase is to keep those credentials safe and hidden on the server side. If you include them in storefront JavaScript or Liquid, they become visible to anyone who visits your store.

If you need to authenticate with an external system and use a returned authentication code, you can use **APIEase chained requests**. In this setup, the first request performs the authentication, and the second request uses the returned token or session key. Keep the authentication request private, and ensure the final response does not return a token or other confidential data to the storefront.

You can read more about [chained requests here](https://docs.apiease.com/docs/requests/request-parameters/chained-requests) and view an [authentication example here](https://docs.apiease.com/docs/general/apiease-details/authentication-example).

Always store confidential credentials in the APIEase admin. Use dynamic parameters only for data that is safe to expose and specific to the current customer or page context.

**Flexible Placement**

You can embed dynamic values into:

- Query parameters
- Headers
- Request body
- Path segments
- Flow parameters
- Liquid request parameters

Each of these can be populated using JavaScript embedded in your storefront snippet. The data you pass is merged into the request structure when it is triggered, ensuring both flexibility and security.

For Liquid requests, use `liquidParamsEmbedded` to pass a JSON object of per-call values. Inside the Liquid request, read those values from `apiEaseParameters.liquidParams.<parameterName>`. See [Dynamic embedded Liquid parameters](https://docs.apiease.com/docs/requests/request-parameters/dynamic-embedded-parameters/liquid-parameters) for a complete example.

SOURCE
https://docs.apiease.com/docs/requests/request-parameters/dynamic-embedded-parameters/path-parameters

TITLE
Dynamic embedded path parameters

CONTENT
# Dynamic embedded path parameters

Unlike query, header and body embedded parameters that are always added as parameters to your request, path parameters are used exclusively for replacing path variables.

Dynamic embedded parameters are added as query parameters to calls made to APIEase from custom liquid in your storefront.

**Example Javascript Snippet:**

```javascript
const pathParamsEmbeddedVar = JSON.stringify({
  exampleParameter1: "exampleParameterValue1",
  exampleParameter2: "exampleParameterValue2",
  exampleParameter3: "exampleParameterValue3",
});
const pathParams = new URLSearchParams({
  requestId: "product-details-proxy",
  pathParamsEmbedded: pathParamsEmbeddedVar,
});
fetch('/apps/apiease/integration/caller/call?' + pathParams)
  .then((response) => response.json())
  .then((jsonResponse) => {
    console.log(jsonResponse);
  });
```

In the above javascript snippet we see that  "**pathParamsEmbedded**" is set to the stringified "pathParamsEmbeddedVar".   APIEase looks for a query parameter named **pathParamsEmbedded**  to hold the dynamic embedded path parameters.

SOURCE
https://docs.apiease.com/docs/requests/request-parameters/dynamic-embedded-parameters/body

TITLE
Dynamic embedded body

CONTENT
# Dynamic embedded body

You can pass dynamic values from the storefront into the body of a request using embedded parameters. This is useful when you want to include customer-specific or page-specific data inside a JSON body sent to an external API.

Dynamic embedded parameters are added as query parameters to calls made to APIEase from custom liquid in your storefront.

**Example Javascript Snippet:**

```javascript
const bodyEmbeddedVar = JSON.stringify({
  exampleBody1: "exampleBodyValue1",
  exampleBody2: "exampleBodyValue2",
  exampleBody3: "exampleBodyValue3",
});

const queryParams = new URLSearchParams({
  requestId: "newsletter-signup",
  bodyEmbedded: bodyEmbeddedVar,
});

fetch('/apps/apiease/integration/caller/call?' + queryParams)
  .then((response) => response.json())
  .then((jsonResponse) => {
    console.log(jsonResponse);
  });
```

In the above javascript snippet we see that **bodyEmbedded**  is set to the stringified "bodyEmbeddedVar". APIEase looks for a query parameter named **bodyEmbedded**  to hold the dynamic embedded body parameters.

SOURCE
https://docs.apiease.com/docs/requests/request-parameters/dynamic-embedded-parameters/headers

TITLE
Dynamic embedded headers

CONTENT
# Dynamic embedded headers

You can pass dynamic values from the storefront into the headers of an APIEase request. This is useful when the external API you are calling expects information such as customer details, session context, or custom identifiers to be included in the headers.

Dynamic embedded parameters are added as query parameters to calls made to APIEase from custom liquid in your storefront.

**Example Javascript Snippet:**

```javascript
const headerParamsEmbeddedVar = JSON.stringify({
  exampleHeader1: "exampleHeaderValue1",
  exampleHeader2: "exampleHeaderValue2",
  exampleHeader3: "exampleHeaderValue3",
});

const queryParams = new URLSearchParams({
  requestId: "customer-profile",
  headersEmbedded: headerParamsEmbeddedVar,
});

fetch('/apps/apiease/integration/caller/call?' + queryParams)
  .then((response) => response.json())
  .then((jsonResponse) => {
    console.log(jsonResponse);
  });
```

In the above javascript snippet we see that **headersEmbedded**  is set to the stringified "headersEmbeddedVar". APIEase looks for a query parameter named **headersEmbedded**  to hold the dynamic embedded header parameters.

SOURCE
https://docs.apiease.com/docs/requests/request-parameters/dynamic-embedded-parameters/query-parameters

TITLE
Dynamic embedded query parameters

CONTENT
# Dynamic embedded query parameters

Query parameters can be passed dynamically from the storefront using embedded values. This allows you to include real-time data in your request URLs, such as customer email addresses, cart information, or other storefront-specific details. Dynamic embedded query parameters are added directly to your request at execution time.

Dynamic embedded parameters are added as query parameters to calls made to APIEase from custom liquid in your storefront.

**Example Javascript Snippet:**

```javascript
const queryParamsEmbeddedVar = JSON.stringify({
  exampleParameter1: "exampleParameterValue1",
  exampleParameter2: "exampleParameterValue2",
  exampleParameter3: "exampleParameterValue3",
});

const queryParams = new URLSearchParams({
  requestId: "product-search",
  queryParamsEmbedded: queryParamsEmbeddedVar,
});

fetch('/apps/apiease/integration/caller/call?' + queryParams)
  .then((response) => response.json())
  .then((jsonResponse) => {
    console.log(jsonResponse);
  });
```

In the above javascript snippet we see that **queryParamsEmbedded**  is set to the stringified "queryParamsEmbeddedVar".  APIEase looks for a query parameter named **queryParamsEmbedded**  to hold the dynamic embedded query parameters.

SOURCE
https://docs.apiease.com/docs/requests/request-parameters/dynamic-embedded-parameters/flow-parameters

TITLE
Dynamic embedded flow parameters

CONTENT
# Dynamic embedded flow parameters

You can pass dynamic values from your storefront into the input of a Shopify Flow request. This lets your Flow automation receive real-time data based on customer actions, session context, or storefront activity.

Dynamic embedded parameters are added as query parameters to calls made to APIEase from custom Liquid in your storefront.

**Example JavaScript snippet**

```html
<script>
  const flowParamsEmbeddedVar = JSON.stringify({
    exampleFlow1: "exampleFlowValue1",
    exampleFlow2: "exampleFlowValue2",
    exampleFlow3: "exampleFlowValue3",
  });
  const queryParams = new URLSearchParams({
    requestId: "start-order-flow",
    flowParamsEmbedded: flowParamsEmbeddedVar,
  });
  fetch('/apps/apiease/integration/caller/call?' + queryParams)
    .then(function (response) {
      return response.json();
    })
    .then(function (jsonResponse) {
      console.log(jsonResponse);
    });
</script>
```

In the snippet above, `flowParamsEmbedded` is set to the stringified `flowParamsEmbeddedVar`. APIEase looks for a query parameter named `flowParamsEmbedded` to hold the dynamic embedded flow parameters.

SOURCE
https://docs.apiease.com/docs/requests/request-parameters/dynamic-embedded-parameters/liquid-parameters

TITLE
Dynamic embedded Liquid parameters

CONTENT
# Dynamic embedded Liquid parameters

Use `liquidParamsEmbedded` when calling a Liquid request from theme or widget JavaScript to pass per-call values.

`requestId` and `liquidParamsEmbedded` are APIEase runtime query parameters. Set `requestId` to the request handle that should run. Set `liquidParamsEmbedded` to a JSON-stringified object. Inside the Liquid request, APIEase exposes that object at `apiEaseParameters.liquidParams`.

The keys inside `liquidParamsEmbedded` are user-defined. For example, if the caller sends `{ "visitorName": "Alex" }`, the Liquid request reads `apiEaseParameters.liquidParams.visitorName`.

Calling a request from theme or widget JavaScript:

```javascript
const liquidParams = {
  visitorName: "Alex",
  sourcePage: "homepage"
};

const queryParams = new URLSearchParams({
  requestId: "personalized-message",
  liquidParamsEmbedded: JSON.stringify(liquidParams)
});

fetch("/apps/apiease/integration/caller/call?" + queryParams.toString(), {
  headers: { Accept: "application/json" }
});
```

Liquid request:

```liquid
{% assign visitor_name = apiEaseParameters.liquidParams.visitorName | default: "there" | strip %}
{% assign source_page = apiEaseParameters.liquidParams.sourcePage | default: "unknown" | strip %}

{
  "message": "Hello, {{ visitor_name }}.",
  "sourcePage": {{ source_page | json }}
}
```

In this example:

- `requestId` is an APIEase runtime field. It selects which request runs, and its value should be the request handle.
- `liquidParamsEmbedded` is an APIEase runtime field. It passes a JSON object of values into a Liquid request.
- `apiEaseParameters.liquidParams` is the Liquid runtime object where those embedded Liquid parameters are exposed.
- `personalized-message` is only the example request handle.
- `visitorName` and `sourcePage` are only example-specific parameter names. Users can choose their own keys.
- `"Alex"` and `"homepage"` are only example values.

## Saved parameters vs embedded parameters

Saved Liquid parameters are configured on the request and can be substituted with `{parameterName}` before execution. Use saved Liquid parameters for stored defaults, sensitive values, or other server-side configured values.

Runtime embedded Liquid parameters are supplied by a caller with `liquidParamsEmbedded` and are read in Liquid through `apiEaseParameters.liquidParams.<parameterName>`. Use `liquidParamsEmbedded` for per-call values supplied at runtime.

SOURCE
https://docs.apiease.com/docs/requests/request-parameters/form-urlencoded-bodies

TITLE
Form URL-encoded bodies

CONTENT
# Form URL-encoded bodies

APIEase supports raw text request bodies when the request Content-Type is `application/x-www-form-urlencoded`. In this mode, the body is treated as a plain string instead of JSON, so form-style payloads like `productId=sku-123&quantity=2` are sent exactly as written.

## When to use this

Use form URL-encoded bodies when the receiving API expects classic HTML form submissions or legacy form payloads.

## How it works

- The request **Content-Type** header must be set to `application/x-www-form-urlencoded`.
- The **Body** parameter value is stored and sent as raw text.
- Embedded body parameters from the storefront (`bodyEmbedded`) are appended as additional form fields.
- Previous response data (when present) is appended as additional form fields.

## Example

**Headers**

- `Content-Type`: `application/x-www-form-urlencoded`

**Body**

```
productId=sku-123&quantity=2
```

**Embedded body parameters (from storefront)**

```json
{
  "warehouse": "north-2",
  "priority": "high"
}
```

**Previous response data (optional)**

```json
{
  "receiptId": "rcpt-789"
}
```

**Final request body sent**

```
productId=sku-123&quantity=2&warehouse=north-2&priority=high&receiptId=rcpt-789
```

## Notes

- If you need to encode special characters, URL-encode them in the body or embedded values.
- For JSON request bodies, keep using the standard JSON body parameter flow described in [In-app body parameters](https://docs.apiease.com/docs/requests/request-parameters/in-app-parameters/in-app-body-parameters).

SOURCE
https://docs.apiease.com/docs/requests/request-parameters/path-variables

TITLE
Path variables

CONTENT
# Path variables

Portions of your address path can be set from variables at execution time. Variables in your path are replaced by in app path parameters or dynamic embedded path parameters.

You include variables in your path surrounded with double braces.

Example Address Path Containing a Variable:

`https://ex.com/{variable1}`

Any in app path parameter or pathParamsEmbedded with the name variable1 will replace the path variables value you place in your address path. Multiple path variables can be added.

In the example above we have:

Address:  `https://ex.com/{variable1}`

Path Parameter:  

   Name: variable1

   Value: inAppValue1

When the request is executed the address will resolve to:  https://ex.com/inAppValue1

![Path variable editing in APIEase](https://cdn.shopify.com/s/files/1/0733/1820/3680/files/path-variable-edit.png?v=1744137415)

The system replaces variables in the path within curly brackets `{}` with the value specified in a path parameter.

For storefront APIEase calls via app proxy you can also set the path variable via a dynamic embedded path parameter.

```javascript
const pathParamsEmbeddedVar = JSON.stringify({
  variable1: "dynamicEmbeddedPathValue1",
});
const queryParams = new URLSearchParams({
  requestId: "product-details-proxy",
  pathParamsEmbedded: pathParamsEmbeddedVar,
});
fetch('/apps/apiease/integration/caller/call?' + queryParams)
  .then((response) => response.json())
  .then((jsonResponse) => {
    console.log(jsonResponse);
  });
```

The parameter named `variable1` in `pathParamsEmbedded` will replace `{variable1}` in your address path.

When the request is executed from your storefront via app proxy the address will resolve to: `https://ex.com/dynamicEmbeddedPathValue1`

In app path parameters act as the default parameter. Dynamic embedded parameters override the in app parameter values.

If you only have the in app `variable1=inAppValue1` then address  `https://ex.com/{variable1}` will resolve to `https://ex.com/inAppValue1`.

If you have the in app `variable1 = inAppValue1` and `pathParamsEmbedded = JSON.stringify({ variable1: "dynamicEmbeddedPathValue1" })` then address `https://ex.com/{variable1}` will resolve to `https://ex.com/dynamicEmbeddedPathValue1`. So dynamic embedded parameters override the default in app path parameters of the same name.

SOURCE
https://docs.apiease.com/docs/requests/triggers/triggers-overview

TITLE
Triggers overview

CONTENT
# Triggers overview

Choose the execution mechanism that matches where the run starts and what the caller can provide.

| Objective | Use | Main prerequisite |
| --- | --- | --- |
| Test or run a one-off action in APIEase admin | [Manual call](https://docs.apiease.com/docs/requests/triggers/manual-calls) | A saved request |
| React to a Shopify event | [Shopify webhook](https://docs.apiease.com/docs/requests/triggers/webhooks/trigger-requests-from-a-webhook) | A webhook trigger for the required event |
| Run at recurring times | [Cron schedule](https://docs.apiease.com/docs/requests/triggers/cron-schedule) | A valid five-field cron expression; schedules use UTC |
| Call a saved request from a server or external automation | [Remote call](https://docs.apiease.com/docs/requests/triggers/calling-requests-remotely) | The request handle, shop domain, and an APIEase API key |
| Publish a purpose-built HTTP route | [Proxy endpoint](https://docs.apiease.com/docs/requests/triggers/proxy-endpoint) | A unique path and method; choose whether authentication is required |
| Call from Shopify theme code | [Storefront call](https://docs.apiease.com/docs/requests/triggers/storefont-calls) | A Storefront App Proxy trigger on the directly called request |
| Call from reusable storefront UI | [Widget request call](https://docs.apiease.com/docs/requests/triggers/widget-calls) | A saved widget with JavaScript that makes a storefront call, and a Storefront App Proxy trigger on the directly called request |

Customer-authenticated calls are a restricted form of storefront call, not a separate general-purpose API. Use [customer validation](https://docs.apiease.com/docs/requests/customer-authenticated-requests) when a storefront request must require a logged-in customer or allow only selected customer IDs.

After an entry request runs, **Next Request** can continue a simple linear workflow. This is [request chaining](https://docs.apiease.com/docs/requests/request-parameters/chained-requests), not an external trigger. A [Flow request](https://docs.apiease.com/docs/requests/request-types/flow-requests) can similarly hand data to Shopify Flow after starting from any suitable entry point.

For quick comparisons and prerequisites, see the [Running requests FAQ](https://docs.apiease.com/docs/general/faq/running-requests).

SOURCE
https://docs.apiease.com/docs/requests/triggers/webhooks/webhooks-overview

TITLE
Webhooks overview

CONTENT
# Webhooks overview

Use Shopify webhooks to start APIEase requests automatically when store events occur. This is ideal for reacting in real time to orders, carts, customers, and other updates without polling.

In APIEase, use uppercase webhook event constants such as `ORDERS_CREATE`, `CARTS_UPDATE`, and `CUSTOMERS_UPDATE`. These correspond to Shopify topic names such as `orders/create`, `carts/update`, and `customers/update`.

You can add a webhook trigger to any request. See the [Shopify webhook topics](https://shopify.dev/docs/api/admin-graphql/2023-10/enums/WebhookSubscriptionTopic) for the underlying Shopify event list.

## [Trigger requests from a webhook](https://docs.apiease.com/docs/requests/triggers/webhooks/trigger-requests-from-a-webhook)
- Configure how to start requests from webhook events.

## [Mapping webhook parameters](https://docs.apiease.com/docs/requests/triggers/webhooks/mapping-webhook-parameters)
- Map webhook payload fields into your request parameters.

SOURCE
https://docs.apiease.com/docs/requests/triggers/webhooks/trigger-requests-from-a-webhook

TITLE
Trigger requests from a webhook

CONTENT
# Trigger requests from a webhook

This guide shows how to configure a webhook trigger in APIEase. In APIEase, use uppercase webhook event constants such as `ORDERS_CREATE` and `CARTS_UPDATE`. These correspond to Shopify webhook topics such as `orders/create` and `carts/update`. Shopify maintains the full list of [webhook topics](https://shopify.dev/docs/api/admin-graphql/2023-10/enums/WebhookSubscriptionTopic).

![Webhook trigger selection](https://cdn.shopify.com/s/files/1/0733/1820/3680/files/trigger-webhook-http.png?v=1744409941)

## Add a webhook trigger
1. In the APIEase admin, open the request (click the edit icon if needed).
2. In the **Trigger** column, click the plus icon.
3. Select **Webhook**.
4. Choose the APIEase webhook event constant (for example `ORDERS_CREATE`, `CUSTOMERS_UPDATE`, or `CARTS_UPDATE`).

After saving, APIEase will execute the request every time that event is received from Shopify.

![Webhook trigger for Flow](https://cdn.shopify.com/s/files/1/0733/1820/3680/files/trigger-webhook-flow.png?v=1744409941)

## Example: webhook-triggered Flow request
If you want to start a Shopify Flow automation whenever a cart updates:
1. Create a new request and select **Flow** as the request type.
2. Choose your Flow template and fill required parameters.
3. Add a webhook trigger and select `CARTS_UPDATE`.

Each cart update triggers the request and starts the Flow. Any webhook fields you need can also be mapped into Flow input parameters.

## Webhook payload as body
When the request is triggered, the webhook payload is passed as the body.

- Base body (example for the Shopify topic `discounts/create`, which APIEase represents as `DISCOUNTS_CREATE`):
```json
{
  "admin_graphql_api_id": "gid://shopify/DiscountAutomaticNode/1",
  "title": "Automatic free shipping",
  "status": "ACTIVE",
  "created_at": "2016-08-29T12:00:00-04:00",
  "updated_at": "2016-08-29T12:00:00-04:00"
}
```
- If you add body parameters, they are merged:
```json
{
  "admin_graphql_api_id": "gid://shopify/DiscountAutomaticNode/1",
  "title": "Automatic free shipping",
  "status": "ACTIVE",
  "created_at": "2016-08-29T12:00:00-04:00",
  "updated_at": "2016-08-29T12:00:00-04:00",
  "additional_body_parameter": "some_value"
}
```
- If your body parameters override a webhook field, the original is preserved with `_0` suffix:
```json
{
  "admin_graphql_api_id": "gid://shopify/DiscountAutomaticNode/1",
  "title": "Title that I prefer",
  "title_0": "Automatic free shipping",
  "status": "ACTIVE",
  "created_at": "2016-08-29T12:00:00-04:00",
  "updated_at": "2016-08-29T12:00:00-04:00"
}
```

To pull specific payload values into headers, query params, or body fields, see [Mapping webhook parameters](https://docs.apiease.com/docs/requests/triggers/webhooks/mapping-webhook-parameters).

SOURCE
https://docs.apiease.com/docs/requests/triggers/webhooks/mapping-webhook-parameters

TITLE
Mapping webhook parameters

CONTENT
# Mapping webhook parameters

When a Shopify webhook triggers a request in APIEase, the full webhook payload is forwarded as the request body. You can map any field from that payload into query parameters, headers, or body fields that your endpoint expects.

When you choose the webhook trigger in APIEase, use the uppercase webhook event constant, such as `PRODUCTS_DELETE`. Shopify documentation refers to the same event by its topic name, such as `products/delete`.

**How mapping works**

Add a parameter to your request with:
- **Type**: Query, Header, or Body
- **Name**: The name expected by the destination endpoint
- **Value**: A reference to the webhook payload field, wrapped in curly braces

## Example: simple payload value
For the APIEase event constant `PRODUCTS_DELETE` (Shopify topic `products/delete`), the payload includes:

```json
{
  "id": 788032119674292922
}
```

To send this value as a query parameter named `deleted_product_id`, add:
- Type: Query
- Name: `deleted_product_id`
- Value: `{id}`

This pulls the `id` field from the webhook and renders an address like `https://example.com?deleted_product_id=788032119674292922`.

![Mapping a webhook payload field to a query parameter](https://cdn.shopify.com/s/files/1/0733/1820/3680/files/mapping-webhook-parameter-query.png?v=1744666126)

## Example: nested payload value
If the value you need is nested, use dot notation. For the APIEase event constant `PRODUCT_LISTINGS_REMOVE` (Shopify topic `product_listings/remove`), the payload includes:

```json
{
  "product_listing": {
    "product_id": 788032119674292922
  }
}
```

To pass the nested `product_id` value to your endpoint, set the parameter value to `{product_listing.product_id}` (as a query, header, or body value depending on what the endpoint requires).

## Tips
- The webhook payload is already the request body; additional body parameters you add are merged into that body.
- Use descriptive parameter names so the rendered request matches what your downstream API expects.

SOURCE
https://docs.apiease.com/docs/requests/triggers/cron-schedule

TITLE
Cron schedule

CONTENT
# Cron schedule

Use the built-in scheduler when you need a request to run at fixed times without any webhook or manual trigger.

## Add a cron schedule
1. Open the request and click the edit icon if needed.
2. In the **Trigger** column, click the plus icon.
3. Select **Cron**.
4. Enter a cron expression (minute, hour, day-of-month, month, day-of-week) such as `0 * * * *` for hourly or `0 2 * * *` for 2 AM daily.
5. Save. APIEase will run the request whenever the expression matches.

## Tips
- Cron uses a 5-field format: minute, hour, day of month, month, day of week.
- Cron schedules use UTC. Convert the intended local time to UTC and account for daylight-saving changes when applicable.
- Use `*/15 * * * *` for every 15 minutes, `0 9 * * 1-5` for 9 AM on weekdays, and `0 0 1 * *` for the first day of each month.
- Make sure the request has all required parameters so the scheduled runs succeed without manual input.

SOURCE
https://docs.apiease.com/docs/requests/triggers/proxy-endpoint

TITLE
Proxy endpoint

CONTENT
# Proxy endpoint

Create a purpose-built HTTP endpoint that executes an APIEase request and returns its final response to the caller--no custom server needed. Unlike a [remote call](https://docs.apiease.com/docs/requests/triggers/calling-requests-remotely), a proxy endpoint has its own configured path and method and can be authenticated or unauthenticated.

## Endpoint format
Your proxy endpoint URL looks like:
```
https://app-admin.apiease.com/api/proxy/<shop-name>/<your-path>
```
- `<shop-name>` identifies your shop.
- `<your-path>` is the custom path you choose for this endpoint.

When someone calls this URL using the HTTP method you specify (GET, POST, etc.), APIEase runs the linked request and relays the request’s final response to the caller. This is useful for lightweight APIs, receiving events, or letting external systems start your workflows.

## How it works
1. The first path segment after `/proxy/` identifies your shop.
2. The remaining path is the custom endpoint path you configure.
3. APIEase matches the incoming request to your Proxy Endpoint.
4. APIEase runs the configured request using the incoming data.
5. The request’s final response is returned to the caller.

## Authentication options

- **Authenticated**: The caller supplies an APIEase API key. The shop is already identified by the `<shop-name>` segment in the proxy URL.
- **Unauthenticated**: Anyone who can reach the URL can call it. Treat all incoming values as untrusted and do not return credentials or private data.

Proxy endpoints are intended for external HTTP callers. For code running on the Shopify storefront, use a [storefront call](https://docs.apiease.com/docs/requests/triggers/storefont-calls) through Shopify's app proxy instead.

## Configure a proxy endpoint trigger
1. Open any APIEase request.
2. Click the plus icon under **Triggers**.
3. Select the **Proxy Endpoint** radio button.
4. Set:
   - **Request Path**: The public endpoint path.
   - **HTTP Method**: The allowed verb for the endpoint.
   - **Authenticated**: `true` or `false`.
5. Save. Your public API endpoint is ready to use.

SOURCE
https://docs.apiease.com/docs/requests/triggers/manual-calls

TITLE
Manual calls

CONTENT
# Manual calls

You can run any configured APIEase request on demand from the admin interface. This is useful for testing, debugging, or performing one-off actions without setting up a trigger.

## Run a manual call
1. Open the APIEase admin and go to **Requests**.
2. Find the request you want to run and click the **Copy and Execute** button in the **Actions** column.
3. Click the **Execute and Run** button. APIEase executes the request immediately.
4. View the response and execution details in the run output.

## Tips
- Manual runs use the same saved request configuration as other triggers (storefront, webhook, schedule, etc.), so they are a controlled way to validate request logic before adding another entry point. A manual run can still create, update, or delete live data.
- If a run fails, use the response details to adjust parameters or request configuration, then run again.
- Before testing a request that can create, update, or delete data, use a test environment or provider-supported dry run when available. Follow [Troubleshoot requests](https://docs.apiease.com/docs/requests/troubleshooting-requests) to isolate the request, provider response, trigger, and chained steps.

SOURCE
https://docs.apiease.com/docs/requests/triggers/storefont-calls

TITLE
Storefront calls

CONTENT
# Storefront calls

Run any APIEase request directly from your Shopify storefront using Shopify's app proxy. This lets you start workflows from theme code without exposing credentials or private logic in the browser.

For a reusable storefront component, put the JavaScript request call in an [APIEase widget](https://docs.apiease.com/docs/requests/triggers/widget-calls). The widget uses the same storefront route and Storefront App Proxy trigger described below.

## Storefront access boundary

APIEase verifies that the call was routed through Shopify's app proxy and that the directly called request has a Storefront App Proxy trigger. That does not make the request customer-authenticated: anyone who can use the storefront route can call it unless you add [customer validation](https://docs.apiease.com/docs/requests/customer-authenticated-requests).

The same-origin app-proxy path lets theme code avoid a direct browser call to APIEase. This is the documented APIEase storefront route, but it is not a guarantee that arbitrary browser requests to external services will avoid CORS restrictions. Browser-origin and CORS behavior still depends on the route being called and the response headers returned by that service.

## How it works
- Your theme calls the APIEase app proxy path (for example `/apps/apiease/integration/caller/call`) and includes the request handle as the `requestId` value for the request to run.
- Shopify forwards the call through the app proxy. If the customer is logged in, Shopify passes the customer id to APIEase.
- APIEase executes the request on the server, injects any sensitive parameters you saved in the admin, and returns the request's final response to the storefront.

## Add Storefront Request
1. Go to the Requests page.
2. Click the plus icon at the top left of the page.
3. At a minimum, set your Address and Method.
4. If this exact request should be called directly from your storefront through Shopify's app proxy, add the `Storefront App Proxy` trigger.
5. Click **Save** at the top of the screen.

## Call from your theme
Use the copied snippet as-is to verify the integration, then extend it with any [dynamic embedded parameters](https://docs.apiease.com/docs/requests/request-parameters/dynamic-embedded-parameters/dynamic-embedded-parameters-overview) you need for runtime data.

```html
<script>
  const queryParams = new URLSearchParams({
    requestId: "status-message",
  });
  fetch('/apps/apiease/integration/caller/call?' + queryParams.toString(), {
    headers: { Accept: 'application/json' },
  }).
    then(function(response) {return response.json();}).
    then(function(jsonResponse) {console.log(jsonResponse);});
</script>
```

- `requestId` is an APIEase runtime query parameter that tells APIEase which request to run. Use the request handle as this value for new storefront code.
- Add `pathParamsEmbedded`, `queryParamsEmbedded`, `headersEmbedded`, `bodyEmbedded`, `flowParamsEmbedded`, or `liquidParamsEmbedded` as needed to pass dynamic embedded parameters from the storefront.
- For Liquid requests, `liquidParamsEmbedded` passes a JSON object of runtime values. Inside the Liquid request, read those values from `apiEaseParameters.liquidParams.<parameterName>`.
- Keep confidential values stored in the APIEase request configuration; do not place secrets in storefront code.

Do not add a Storefront App Proxy trigger to helper requests that are only invoked by another APIEase request or by a Liquid `call` tag.

## Customer validation options
If the customer is logged in when the app proxy runs, Shopify includes their customer id in the call.

- Require a logged-in customer: add a system parameter named `validateCustomer` with value `true`.
- Restrict to selected customers: add one system parameter named `customerId` for each allowed Shopify customer ID.

For detailed setup and screenshots, see [Customer authenticated requests](https://docs.apiease.com/docs/requests/customer-authenticated-requests). If validation fails, APIEase blocks the call and no response is returned to the storefront.

SOURCE
https://docs.apiease.com/docs/requests/triggers/widget-calls

TITLE
Widget Request Calls

CONTENT
# Widget Request Calls

Widgets are reusable storefront components managed inside APIEase. They can render UI and call requests. If you have not used widgets before, start with [Widgets overview](https://docs.apiease.com/docs/widgets/widgets-overview).

To call a request from a widget, use JavaScript to send a [storefront call](https://docs.apiease.com/docs/requests/triggers/storefont-calls) through Shopify's app proxy. Add the **Storefront App Proxy** trigger to the directly called request and save it.

## How it works
- The widget's JavaScript runs in the browser.
- The JavaScript calls the request through Shopify's app proxy.
- The request executes on the server and returns a response.

To configure the widget-side request call, see [Using Requests in Widgets](https://docs.apiease.com/docs/widgets/using-requests-in-widgets).

A widget is the reusable Liquid, CSS, and JavaScript component. The request remains a separate server-side resource. Choose a [Widget App Block](https://docs.apiease.com/docs/widgets/widget-app-block) to place the widget on a specific page or section, or a [Widget App Embed](https://docs.apiease.com/docs/widgets/widget-app-embed) for a widget that should load across the storefront.

## Passing values to Liquid requests
Widget JavaScript uses the same APIEase integration endpoint as storefront calls. For Liquid requests, set `requestId` to the request handle and pass per-call values with `liquidParamsEmbedded`.

`liquidParamsEmbedded` should contain a JSON object string. Inside the Liquid request, read those values from `apiEaseParameters.liquidParams.<parameterName>`.

## Security warning
Widgets run in the browser and are inspectable. Sensitive credentials must not be placed in widgets. Configure credentials inside the APIEase request where they are stored securely. Treat all widget inputs as untrusted.

SOURCE
https://docs.apiease.com/docs/requests/triggers/calling-requests-remotely

TITLE
Calling APIEase requests remotely

CONTENT
# Calling APIEase requests remotely

Use a remote call when a trusted server, automation, or external application needs to run an existing request by its handle. The caller authenticates directly to APIEase with an APIEase API key and identifies the target shop in a header.

A remote call is different from a [Proxy Endpoint](https://docs.apiease.com/docs/requests/triggers/proxy-endpoint): a proxy endpoint gives a request a purpose-built path and HTTP method and can be public, while the remote caller uses APIEase's shared caller URL and always requires the APIEase remote-call headers. Neither is the Shopify app-proxy route used by [storefront calls](https://docs.apiease.com/docs/requests/triggers/storefont-calls).

## 1. Create an APIEase API key

1. Navigate to the Settings page in the APIEase admin.
2. Click **Generate API Key**.
3. Copy and store the key securely. You will use this key to authenticate your external calls.

## 2. Make the remote call

**Address**: `https://app-admin.apiease.com/api/remote/caller/call?requestId=<your-request-handle>`

**Headers:**
- `x-shop-myshopify-domain`: `your-store.myshopify.com`
- `x-apiease-api-key`: `YOUR_API_KEY`

Replace `<your-request-handle>` with the handle of the request you want to call. The query parameter is still named `requestId`, but the value should be the request handle for new integrations.

Keep the APIEase API key in the trusted external system. Do not put it in storefront JavaScript, theme Liquid, or widget code.

SOURCE
https://docs.apiease.com/docs/requests/request-parameters/chained-requests

TITLE
Chained requests

CONTENT
# Chained requests

Chained requests allow you to call one request after another, using the response from the first request as input to the second. Chaining is a continuation after an entry request runs, not a trigger that external callers invoke directly.

For example, you might need to:

- Authenticate with an external service
- Receive an access token in the response
- Use that token to make a second request to retrieve data or perform an action

## Set the next request

Set the request handle of the next request you would like to call in the **Next Request** field.

## How chaining works in APIEase

Each request in APIEase can optionally trigger another request once it completes. The second request can use values from the first request's response body as parameters.

Let's say you have two requests:

- Request A: Authenticates with a service and receives a token
- Request B: Uses that token to call a protected endpoint

Here's an example of what the JSON response from Request A might look like:

```json
{
  "auth": {
    "token": "YOUR_ACCESS_TOKEN"
  }
}
```
In Request B, you can reference the token value using curly braces:

`Authorization: Bearer {auth.token}`
This tells APIEase to pull the token field from the auth object in the JSON response and insert it into the header of the second request.

![Chained request editor overview](https://cdn.shopify.com/s/files/1/0733/1820/3680/files/chained-requests-description.png?v=1744331402)

## Use response data in the next request

You can use response values from Request A in multiple parts of Request B:

- Query parameters
- Headers
- Request body
- URL paths

For example, suppose Request A returns the following JSON:

```json
{
  "user": {
    "id": "abc123",
    "email": "user@example.com"
  }
}
```
You could then use those values in Request B like this:

- In a query string: `?user_ref={user.id}`
- In a header: `X-User-Email: {user.email}`
- In the body:

```json
{
  "ref_id": "{user.id}"
}
```
The curly brace syntax tells APIEase to substitute in the corresponding value from the previous response.

## Authentication example

If you want to see this in action, we've created a walkthrough of a common use case: authenticating with a service, storing the returned access token, and using it in a follow-up request.

[View Authentication Example](https://docs.apiease.com/docs/general/apiease-details/authentication-example)

## When to use chained requests

Use chained requests when:

- You need to authenticate before calling a protected API
- You need to transform or fetch dynamic data before continuing
- You want to build multi-step workflows inside APIEase without building and hosting a custom backend

Use a chain for a simple linear handoff. If the workflow needs conditions, loops, response shaping, or several explicit calls, use a [Liquid request](https://docs.apiease.com/docs/requests/request-types/liquid-requests) instead.

SOURCE
https://docs.apiease.com/docs/requests/shopify-flow-integration/architecture

TITLE
APIEase + Shopify Flow integration architecture

CONTENT
# APIEase + Shopify Flow integration architecture

APIEase and Shopify Flow play different roles. Use Flow for logic and native Shopify actions, and use APIEase to call external APIs, handle credentials, and pass responses into Flow.

## Core philosophy
- Shopify Flow is the logic engine: branching, conditions, and Shopify-native actions.
- APIEase is the API execution layer: authenticated API calls, scheduling, response handling, and triggering Flow when needed.

## Starting in Shopify Flow

A workflow with a Shopify Flow trigger can invoke an existing APIEase request using [APIEase Flow Action](https://docs.apiease.com/docs/requests/shopify-flow-integration/run-saved-request-from-flow). Set its required Flow Parameters JSON to include `requestId` with the saved request handle. That request can remain HTTP, Liquid, or another type appropriate to its operation. No prior APIEase Flow execution is needed.

## Why start in APIEase
- You need to call external APIs (ERP, warehouse, AI, CRM, etc.).
- You need to store or use credentials that Flow should not handle.
- You need the API response available inside Flow (Flow’s native HTTP action does not return a response).
- You want flexible triggers: schedules, webhooks, storefront actions, or manual runs.

## Example architecture
1. Start in APIEase: fetch or receive data from an external system.
2. Chain a Flow request: send the response into Shopify Flow via the APIEase Flow trigger.
3. Use Flow logic: run conditions, evaluate the data, or transform it with Run Code.
4. Optional follow-up call: chain another APIEase request to update an external system based on Flow output.

## When to call Shopify APIs
- Use Flow’s native Send Admin API Request when it is simple and credential-free.
- Prefer APIEase when the call needs credentials, depends on another API’s response, or is part of a larger chained workflow.

## Common use cases
- Import products or inventory from external systems.
- Push Shopify order data to ERPs or 3PLs.
- Sync inventory with a warehouse.
- Call third-party AI or recommendation engines.
- React to webhooks with chained logic plus outbound API calls.
- Build backend workflows without a custom app.

## Summary
Put APIEase at the edges (inbound/outbound APIs, credentials, chaining) and Flow in the middle as the logic engine. If a workflow touches external services or credentialed calls, start or end in APIEase and run the logic in Flow.

SOURCE
https://docs.apiease.com/docs/requests/shopify-flow-integration/run-saved-request-from-flow

TITLE
Run a saved request from Shopify Flow

CONTENT
# Run a saved request from Shopify Flow

Use **APIEase Flow Action** when a Shopify Flow workflow needs to run a request already saved in APIEase.

1. Save the request in APIEase in the same store. Keep its type appropriate to the work: for an external API call, use **HTTP** with the required URL, method, parameters, and credentials. Mark credentials **Sensitive**. Copy the request's **Handle**.
2. Create or open your Shopify Flow workflow with the trigger you need, such as an order event.
3. Add the **APIEase Flow Action** (`apiease-flow-action`).
4. Set the required **Flow Parameters** field to valid JSON containing `requestId` with your saved request handle:

```json
{"requestId":"inventory-sync"}
```

5. Supply any additional values the saved request needs, then turn on the workflow. When the action runs, APIEase invokes the saved request through normal request execution.

The JSON key is `requestId` even when its value is a handle. The saved request's internal ID also works. Use the handle, not its display name, a full request URL, or a separate `requestHandle` field. You do not need a proxy endpoint, remote API key, storefront trigger, or conversion to the **Flow** request type for this action. Normal request configuration and usage limits still apply.

For requests using workflow data, include fields alongside `requestId` in the JSON and configure the saved request to consume those values through its previous-response parameter mappings. Ensure the final text remains valid JSON when inserting Shopify Flow variables. Keep API credentials saved as Sensitive request parameters rather than including them in the workflow JSON.

## When executionId is needed

For a workflow that starts in Shopify Flow, `executionId` is not required:

```json
{"requestId":"inventory-sync","orderId":"123456789"}
```

`executionId` is relevant when APIEase has already started a Shopify Flow workflow and is waiting for its result. Preserve the execution ID supplied in that trigger's `flowParameters` when returning output through APIEase Flow Action. Including both `executionId` and `requestId` resolves the earlier execution and then runs the selected saved request.

The action has one required input field, **Flow Parameters**. It does not declare structured output fields for later Shopify Flow steps. If you need an external API response available inside Flow, start the request in APIEase and pass its response into a chained Flow request; see [Minimal Flow integration](https://docs.apiease.com/docs/requests/shopify-flow-integration/minimal-flow-integration).

SOURCE
https://docs.apiease.com/docs/requests/shopify-flow-integration/add-flow-request

TITLE
How to add a Flow request in APIEase

CONTENT
# How to add a Flow request in APIEase

Follow these steps to create a Flow request and send data into Shopify Flow.

1. Go to **Requests** in APIEase.
2. Click the **Add Request** plus button in the upper-left corner.
3. (Optional) Name the request (for example, `Flow - Inventory Update`).
4. Set **Request type** to **Flow** so the request triggers a Shopify Flow workflow.
5. (Optional) Add **Flow** parameters with any JSON you want to send into the workflow.
6. (Optional) Chain this Flow request from another request by setting it as the **Next Request** of the prior step.
7. Save the request.

To pass the initiating APIEase API key's friendly name to your workflow, see [Pass metadata to Shopify Flow](https://docs.apiease.com/docs/general/apiease-details/system/system-variables/apiease-metadata). The example shows how to send a whole metadata object or just its name and read it from the trigger's `flowParameters` JSON text.

SOURCE
https://docs.apiease.com/docs/requests/shopify-flow-integration/minimal-flow-integration

TITLE
Minimal Flow integration with APIEase

CONTENT
# Minimal Flow integration with APIEase

This setup starts in APIEase and triggers a Shopify Flow workflow. To start in Shopify Flow and run a saved APIEase request instead, follow [Run a saved request from Shopify Flow](https://docs.apiease.com/docs/requests/shopify-flow-integration/run-saved-request-from-flow).

1. Create and save a **Flow** request in APIEase. Add any Flow parameters your workflow needs.
2. In Shopify Flow, create a workflow using the **APIEase Flow Trigger**.
3. Add a **Condition** matching the trigger's `requestId` to the saved Flow request's ID. This trigger field contains the request ID, not its handle. You can find the ID in the request's edit-page URL.
4. Add your workflow steps. The trigger's `flowParameters` is JSON text containing the inputs and an `executionId` generated by APIEase.
5. To return a result to the waiting APIEase request, add the **APIEase Flow Action**. Its required **Flow Parameters** field must contain JSON preserving that `executionId`. You can pass through the trigger's `flowParameters` variable, or parse it in **Run code**, add result fields, and serialize it again. Do not replace it with an empty object or invent an execution ID.
6. Turn on the workflow. Run the saved Flow request from APIEase, from one of its configured triggers, or by chaining to its handle as **Next Request** from another request.

For example, a **Run code** step that receives the trigger's `flowParameters` can return a JSON string for the action:

```javascript
export default function main(input) {
  const parameters = JSON.parse(input.flowParameters);
  parameters.result = "complete";
  return {message: JSON.stringify(parameters)};
}
```

Select that step's `message` output as the action's **Flow Parameters** value. Configure the Run code input to include the trigger's `flowParameters`.

APIEase normally waits for a callback containing the matching `executionId`, subject to its Flow response wait limit (25 seconds by default). Without that callback it can time out; completion of an unrelated action does not resolve the request. An immediate-response configuration returns before workflow completion.

To also run a subsequent saved APIEase request, add its handle as `requestId` inside the returned JSON while preserving `executionId`. APIEase resolves the originating execution first, then invokes that saved request. The trigger's top-level `requestId` identifies the originating Flow request; a `requestId` inside the action JSON selects a request to run.

SOURCE
https://docs.apiease.com/docs/requests/shopify-flow-integration/cat-image-inventory

TITLE
APIEase integrated with Shopify Flow - Cat image inventory

CONTENT
# APIEase integrated with Shopify Flow - Cat image inventory

This demo shows how a storefront button triggers APIEase, Shopify Flow, and a chained GraphQL call to adjust inventory based on a cat image’s width.

![APIEase request chain](https://cdn.shopify.com/s/files/1/0733/1820/3680/files/flow-cat-image-inventory-requests.png?v=1743029544)

## How the demo works
1. A storefront button calls an APIEase proxy endpoint.
2. APIEase calls The Cat API to fetch a random image (includes width/height).
3. The Cat API response is passed to Shopify Flow via a chained Flow request.
4. Flow runs logic to classify the image size (small, medium, large).
5. Flow returns the matching location and inventory item to APIEase.
6. A final APIEase request calls Shopify GraphQL to increment the correct variant’s inventory.
7. The storefront shows success or error after the mutation completes (Shopify inventory updates may take a moment to appear).

## APIEase request chain
1. **Request #1: The Cat API**  
   - Name: `Flow - Cat Images - Get Cat`  
   - Handle: `flow-cat-images-get-cat`
   - Type: `http`  
   - Address: `https://api.thecatapi.com/v1/images/search`  
   - Method: `GET`  
   - Next Request: `flow-cat-images-add-cat`  
   - Sample response:
     ```json
     {
       "data": [
         {
           "id": "ced",
           "url": "https://cdn2.thecatapi.com/images/ced.jpg",
           "width": 720,
           "height": 960
         }
       ],
       "status": 200
     }
     ```
   The response is forwarded as `previousRequestResponse` into the Flow request.

2. **Request #2: Shopify Flow (APIEase Flow Trigger)**  
   - Name: `Flow - Cat Images - Add Cat`  
   - Handle: `flow-cat-images-add-cat`
   - Type: `flow`  
   - Next Request: `flow-cat-images-increment-inventory`  
   - Incoming Flow parameters:
     ```json
     {
       "requestFlowParameters": {},
       "previousRequestResponse": {
         "0": {
           "id": "ced",
           "url": "https://cdn2.thecatapi.com/images/ced.jpg",
           "width": 720,
           "height": 960
         }
       },
       "executionId": "99524b60-0b4d-11f0-8ea0-67506abcdec8"
     }
     ```
   - Flow adds `incrementInventoryParameter` (location and inventory item) and returns:
     ```json
     {
       "status": 200,
       "data": {
         "requestFlowParameters": {},
         "previousRequestResponse": {
           "0": {
             "id": "ced",
             "url": "https://cdn2.thecatapi.com/images/ced.jpg",
             "width": 720,
             "height": 960
           }
         },
         "executionId": "99524b60-0b4d-11f0-8ea0-67506abcdec8",
         "incrementInventoryParameter": {
           "location": "gid://shopify/Location/80446030117",
           "inventoryItemId": "gid://shopify/InventoryItem/52358268420389"
         }
       }
     }
     ```

This example uses an explicit `X-Shopify-Access-Token` header for the Shopify Admin API call. For automatic shop access token usage and overrides, see [Automatic vs overridden Shopify access tokens](https://docs.apiease.com/docs/general/shopify-api/automatic-vs-overridden-shopify-access-tokens).

3. **Request #3: Shopify GraphQL**  
   - Name: `Flow - Cat Images - Increment Inventory`  
   - Type: `http`  
   - Address: `https://store-apiease-admin-local.myshopify.com/admin/api/2025-01/graphql.json`  
   - Method: `POST`  
   - Headers:  
     - `X-Shopify-Access-Token`: `[access-token]`  
     - `Content-Type`: `application/json`  
   - GraphQL body (uses Flow output for replacements):
     ```json
     {
       "query": "mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {  inventoryAdjustQuantities(input: $input) {  userErrors { field message }  inventoryAdjustmentGroup {  createdAt reason changes { name delta }  }  }  }",
       "variables": {
         "input": {
           "reason": "correction",
           "name": "available",
           "changes": [
             {
               "delta": 1,
               "inventoryItemId": "{incrementInventoryParameter.inventoryItemId}",
               "locationId": "{incrementInventoryParameter.location}"
             }
           ]
         }
       }
     }
     ```

## Shopify Flow workflow
1. Trigger: **apiease-flow-trigger**.
2. Condition: Confirm the incoming `requestId` value matches the saved Flow request ID, not its handle (available in the request edit-page URL).
3. Action: Shopify **Get location data** to retrieve variants and locations.
4. Action: **Run Code** to classify image size and select the matching inventory item.
5. Action: **apiease-flow-action** to return Flow parameters (including `incrementInventoryParameter`) to APIEase.

![Shopify Flow workflow](https://cdn.shopify.com/s/files/1/0733/1820/3680/files/flow-cat-image-inventory-workflow.png?v=1743029544)

### Run Code inputs
```graphql
query {
  getLocationData {
    id
    inventoryLevels {
      item {
        id
        sku
        variant {
          title
          sellableOnlineQuantity
        }
      }
    }
  }
  flowParameters
}
```

### Run Code script
```javascript
export default function main(input) {
  const { getLocationData, flowParameters } = input;
  const flowParametersObject = JSON.parse(flowParameters);
  const firstImage = flowParametersObject.previousRequestResponse['0'];
  const width = firstImage?.width;

  if (typeof width !== 'number') {
    return { message: 'Image width not found or invalid.', targetSize: null };
  }

  let targetSize;
  if (width < 400) {
    targetSize = 'Small';
  } else if (width < 800) {
    targetSize = 'Medium';
  } else {
    targetSize = 'Large';
  }

  if (!Array.isArray(getLocationData) || getLocationData.length === 0) {
    return { message: 'No location data found.' };
  }

  const incrementInventoryParameter = {};
  for (const location of getLocationData) {
    for (const level of location.inventoryLevels) {
      const item = level.item;
      const variant = item?.variant;
      if (variant?.title === targetSize) {
        incrementInventoryParameter.location = location.id;
        incrementInventoryParameter.inventoryItemId = item.id;
      }
    }
  }

  flowParametersObject.incrementInventoryParameter = incrementInventoryParameter;
  const flowParametersStringified = JSON.stringify(flowParametersObject);
  return { message: flowParametersStringified };
}
```

The Run Code step classifies the image size and attaches `incrementInventoryParameter` so APIEase can substitute those values in the GraphQL mutation.

![Run Code setup](https://cdn.shopify.com/s/files/1/0733/1820/3680/files/flow-cat-image-inventory-run-code.png?v=1743118558)

### APIEase Flow Action

![APIEase Flow Action variables](https://cdn.shopify.com/s/files/1/0733/1820/3680/files/flow-cat-image-inventory-action-variable.png?v=1743120408)

SOURCE
https://docs.apiease.com/docs/requests/examples/facebook-graph-api

TITLE
Facebook Graph API example

CONTENT
# Facebook Graph API example

This demo page calls the Facebook Graph API through APIEase to fetch album photos and render them on a Shopify storefront.

- Demo: `https://apiease-demo.myshopify.com/pages/facebook-album-1` (password `eacoht`)
- Endpoints used:
  - Photo: `https://developers.facebook.com/docs/graph-api/reference/photo/`
  - Album photos: `https://developers.facebook.com/docs/graph-api/reference/album/photos/`

## JavaScript
```javascript
let dumpId = null;

async function getPhoto(photoId) {
  const pathParamsEmbeddedVar = JSON.stringify({ photoId });
  const getPicturesQueryParams = new URLSearchParams({
    pathParamsEmbedded: pathParamsEmbeddedVar,
    requestId: 'facebook-photo',
  });

  const res = await fetch(
    '/apps/apiease/integration/caller/call?' + getPicturesQueryParams,
    { headers: { 'ngrok-skip-browser-warning': 'any' } },
  );

  if (!res.ok) {
    console.error('Failed to fetch the data. Status code: ' + res.status);
    return;
  }

  const json = await res.json();
  const imageData = json.data.images;
  const imageByHeight = imageData.find((image) => image.height === 130);
  if (!imageByHeight) return;

  const imageUrl = imageByHeight.source;
  document.getElementById('facebookResponseDisplay').innerHTML +=
    `<img class="fbPhotos" src="${imageUrl}">`;
}

async function callApi() {
  const pathParamsEmbeddedVar = JSON.stringify({ albumId: '122103599360059617' });
  const getAlbumQueryParams = new URLSearchParams({
    pathParamsEmbedded: pathParamsEmbeddedVar,
    requestId: 'facebook-album-photos',
  });

  const res = await fetch(
    '/apps/apiease/integration/caller/call?' + getAlbumQueryParams,
    { headers: { 'ngrok-skip-browser-warning': 'any' } },
  );

  if (!res.ok) {
    console.error('Failed to fetch the data. Status code: ' + res.status);
    return;
  }

  const json = await res.json();
  const albumData = json.data.data;
  for (const item of albumData) {
    await getPhoto(item.id);
  }
}

callApi();
```

## HTML
```html
<div id="demoHtml">
  <div>
    You can call <a target="_blank" href="https://developers.facebook.com/docs/graph-api">Facebook Graph API</a>
    to retrieve content from Facebook.
  </div>
  <div>
    The following images from the
    <a target="_blank" href="https://www.facebook.com/media/set/?set=a.122103599360059617&type=3">APIEase Facebook Page</a>
    are being retrieved from the Facebook Graph API via APIEase.<br>
  </div>

  <div class="response-box">
    APIEase Response:
    <div id="facebookResponseDisplay"></div>
  </div>
</div>
```

## CSS
```css
#demoHtml * {
  font-family: 'Helvetica Neue', sans-serif;
}
#demoHtml button {
  padding: 8px 12px;
  background-color: #007bff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.response-box {
  position: relative;
  border: 1px solid #ccc;
  padding: 10px;
  background-color: #e6ecff;
  margin-top: 10px;
}
.fbPhotos {
  outline: 1px solid #000;
  margin: 20px;
}
```

SOURCE
https://docs.apiease.com/docs/requests/examples/http-dump

TITLE
HTTP Dump example

CONTENT
# HTTP Dump example

This demo uses HTTP Dump to inspect requests sent from APIEase.

- Demo: `https://apiease-demo.myshopify.com/pages/http-dump` (password `eacoht`)
- Endpoints used: `https://httpdump.app/create-dump` and `https://httpdump.app/dumps`

## JavaScript
```javascript
let dumpId = null;

async function callApi() {
  if (dumpId === null) {
    const createDumpQueryParams = new URLSearchParams({
      requestId: 'http-dump-create',
    });

    const res = await fetch(
      '/apps/apiease/integration/caller/call?' + createDumpQueryParams,
      { headers: { 'ngrok-skip-browser-warning': 'any' } },
    );

    if (res.ok) {
      const json = await res.json();
      const temp = document.createElement('div');
      temp.innerHTML = json.data;
      const titleText = temp.querySelector('title')?.textContent;
      dumpId = titleText?.split(' - ')[1];

      document.getElementById('apiEaseResponse').innerHTML =
        'See that a POST was made to HTTP Dump here: ' +
        `<a href="https://httpdump.app/inspect/${dumpId}" target="_blank">` +
        `https://httpdump.app/inspect/${dumpId}</a>`;
    } else {
      console.error('Failed to fetch the data. Status code: ' + res.status);
    }
  }

  const queryParamsEmbeddedVar = document.getElementById('queryParameter').value;
  const headersEmbeddedVar = document.getElementById('headerParameter').value;
  const bodyEmbeddedVar = document.getElementById('bodyParameter').value;
  const pathParamsEmbeddedVar = JSON.stringify({ dumpId });

  const callDumpQueryParams = new URLSearchParams({
    requestId: 'http-dump-inspect',
    queryParamsEmbedded: queryParamsEmbeddedVar,
    headersEmbedded: headersEmbeddedVar,
    bodyEmbedded: bodyEmbeddedVar,
    pathParamsEmbedded: pathParamsEmbeddedVar,
  });

  const res = await fetch(
    '/apps/apiease/integration/caller/call?' + callDumpQueryParams,
    { headers: { 'ngrok-skip-browser-warning': 'any' } },
  );

  if (res.ok) {
    await res.json(); // response logged in HTTP Dump
  }
}

document.getElementById('submitButton').addEventListener('click', callApi);
document.getElementById('queryParameter').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    callApi();
  }
});
```

## HTML
```html
<div id="demoHtml">
  <div>
    HTTP Dump is an excellent resource for testing your APIEase requests.<br>
    Submit the following form to see APIEase call an HTTP Dump address.
  </div>
  <div style="display: flex;">
    <div style="flex: 1; padding-right: 10px;">
      <label for="queryParameter">Query Parameter:</label>
      <input type="text" id="queryParameter" style="width: 100%;" value='{"queryParam1": "queryValue1"}'>
      <label for="headerParameter">Header:</label>
      <input type="text" id="headerParameter" style="width: 100%;" value='{"queryParam1": "queryValue1"}'>
      <label for="bodyParameter">Body:</label>
      <input type="text" id="bodyParameter" style="width: 100%;" value='{"bodyParam1": "bodyValue1"}'>
    </div>
  </div>
  <button id="submitButton">Submit</button>

  <div class="response-box">
    APIEase Response:
    <div id="apiEaseResponse"></div>
  </div>
</div>
```

## CSS
```css
#demoHtml * {
  font-family: 'Helvetica Neue', sans-serif;
}
#demoHtml button {
  padding: 8px 12px;
  background-color: #007bff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.response-box {
  position: relative;
  border: 1px solid #ccc;
  padding: 10px;
  background-color: #e6ecff;
  margin-top: 10px;
}
```

SOURCE
https://docs.apiease.com/docs/requests/examples/cat-api

TITLE
Cat API example

CONTENT
# Cat API example

This demo calls The Cat API via APIEase and displays a random cat image.

- Demo: `https://apiease-demo.myshopify.com/pages/auth-api` (password `eacoht`)
- Endpoint: `https://api.thecatapi.com/v1/images/search`

## JavaScript
```javascript
function callApi() {
  const queryParamsCaller = new URLSearchParams({
    requestId: 'cat-random-image',
  });

  fetch('/apps/apiease/integration/caller/call?' + queryParamsCaller, {
    headers: { 'ngrok-skip-browser-warning': 'any' },
  })
    .then((response) => response.json())
    .then((jsonResponse) => {
      document.getElementById('catApiResponseImage').src = jsonResponse.data[0].url;
    });
}
```

## HTML
```html
<div id="demoHtml">
  <div id="catApiDemo">
    <div style="display: flex; align-items: center;">
      <p>The Cat API returns random images of cats.</p>
      <button onclick="callApi()">Get</button>
    </div>
    <div class="response-box">
      APIEase Response:<br>
      <img id="catApiResponseImage">
    </div>
  </div>
 </div>
```

## CSS
```css
#demoHtml * {
  font-family: 'Helvetica Neue', sans-serif;
}
#demoHtml button {
  padding: 8px 12px;
  background-color: #007bff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.response-box {
  position: relative;
  border: 1px solid #ccc;
  padding: 10px;
  background-color: #e6ecff;
  margin-top: 10px;
}
```

SOURCE
https://docs.apiease.com/docs/requests/examples/agify-api

TITLE
Agify API example

CONTENT
# Agify API example

This demo calls the Agify API through APIEase to estimate age based on a name.

- Demo: `https://apiease-demo.myshopify.com/pages/open-api` (password `eacoht`)
- Endpoint: `https://api.agify.io?name=Jo`

## JavaScript
```javascript
function callApi() {
  const agifyInputName = document.getElementById('agifyInputName').value;
  const queryParamsEmbedded = JSON.stringify({ name: agifyInputName });
  const queryParamsCaller = new URLSearchParams({
    requestId: 'agify-age-lookup',
    queryParamsEmbedded,
  });

  fetch('/apps/apiease/integration/caller/call?' + queryParamsCaller)
    .then((response) => response.json())
    .then((jsonResponse) => {
      document.getElementById('ageifyResponseAge').innerHTML =
        'Agify thinks you are ' + jsonResponse.data.age + '.';
    });
}

document.getElementById('submitButton').addEventListener('click', callApi);
document.getElementById('agifyInputName').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    callApi();
  }
});
```

## HTML
```html
<div id="demoHtml">
  <p><a href="https://agify.io/" target="_blank">Agify</a> will guess your age based on your name.</p>
  <div>
    <label for="agifyInputName">Name:</label>
    <input type="text" id="agifyInputName">
    <button id="submitButton">Submit</button>
  </div>
  <div class="response-box">
    APIEase Response:
    <p id="ageifyResponseAge"></p>
  </div>
</div>
```

## CSS
```css
#demoHtml * {
  font-family: 'Helvetica Neue', sans-serif;
}
#demoHtml button {
  padding: 8px 12px;
  background-color: #007bff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.response-box {
  position: relative;
  border: 1px solid #ccc;
  padding: 10px;
  background-color: #e6ecff;
  margin-top: 10px;
}
```

SOURCE
https://docs.apiease.com/docs/requests/customer-authenticated-requests

TITLE
Customer-authenticated requests

CONTENT
# Customer-authenticated requests

Customer validation restricts a [storefront call](https://docs.apiease.com/docs/requests/triggers/storefont-calls) using the logged-in customer ID that Shopify sends through its app proxy. It does not authenticate remote calls or proxy endpoints, and it does not accept a customer ID supplied directly by browser code as proof of identity.

## Automatic customer ID injection

Need to inject the logged-in customer ID into request values? See [Automatic Shopify Customer ID Injection](https://docs.apiease.com/docs/general/apiease-details/automatic-shopify-customer-id-injection).

## Customer validation options

Choose one of these options on the directly called request.

### Require any logged-in customer

Add a System parameter named `validateCustomer` with value `true`.

![Validate customer system parameter toggle](https://tawk.link/65552a3acec6a91282103248/kb/attachments/zy4MAt-qUF.png)

The call passes only when Shopify's app proxy supplies a logged-in customer ID.

### Allow selected customer IDs

Add a System parameter named `customerId` with the allowed Shopify customer ID as its value. To allow multiple customers, add one `customerId` System parameter for each allowed ID. Do not enter a JSON array into one parameter value.

![Customer id system parameter example](https://tawk.link/65552a3acec6a91282103248/kb/attachments/zFgy2rIovc.png)

An allowlisted customer must also be logged in so Shopify can supply the matching ID. Use separate requests only when the request configuration itself must differ by customer.

If validation fails, APIEase blocks the request instead of executing it or returning its normal response to the storefront.

SOURCE
https://docs.apiease.com/docs/functions/functions-overview

TITLE
Functions Overview

CONTENT
# Functions Overview

The Functions page lets you create reusable Liquid helpers that can be called from [Liquid Requests](https://docs.apiease.com/docs/requests/request-types/liquid-requests).

Functions run inside the parent Liquid request execution. They are not standalone requests, do not have their own triggers, and do not count as separate request executions.

## Open the Functions page

In the APIEase admin, select **Functions** from the main navigation.

## What you can do

- View all saved functions for the current shop
- Create a new function
- Open an existing function and update it
- Duplicate a function as a starting point for a variation
- Delete functions you no longer need

## Functions list

The Functions page shows a table with five columns:

- **Name**: The function name. Select the name or the edit action to open the function.
- **Type**: Currently `liquid`.
- **Description**: The saved description. If no description is set, APIEase shows a short Liquid preview instead.
- **Last updated**: The last saved date.
- **Actions**: Edit, duplicate, or delete the function.

Additional list behavior:

- Use the **Add function** button to create a new function.
- If a delete is in progress, the row is dimmed and marked **Will be deleted**.
- If no functions exist yet, the page shows `No functions yet.`

## Create or edit a function

Each function includes these fields:

- **Name**: Required. This is the function name you call from Liquid.
- **Description**: Use it to explain what the function returns, when to use it, and important relationships to requests or other resources. Keep credentials and temporary execution status out of it.
- **Type**: Currently fixed to `liquid`.
- **Parameters**: Optional parameter definitions for the function.
- **Liquid**: Required. The Liquid code that runs when the function is called.

When you manage Functions through `apiease-cli` or the public API, include a stable `handle` in the JSON source file. The Function `name` remains the value used by the current Liquid function tag. For the repository identifier pattern, see [Resource handles](https://docs.apiease.com/docs/developers/resource-handles).

The editor supports the same save bar behavior used elsewhere in APIEase:

- The save bar appears when you make changes.
- Use **Save** to persist the function.
- Use **Discard** to return to the last saved version.

## Function parameters

Each parameter row includes:

- **Name**: Required
- **Description**: Optional
- **Type**: Required metadata

Supported parameter types:

- `string`
- `number`
- `boolean`
- `object`
- `array`

Important behavior:

- Parameter types are descriptive metadata for this version of Functions. They help document expected inputs, but APIEase does not strictly enforce them at runtime.
- Parameter names must be unique within a function.
- Only declared parameters are exposed inside the function body.

## How Functions behave

Functions are intended to reduce repetition inside Liquid request logic.

Use a Function when you want to:

- Reuse the same Liquid transformation in multiple places
- Standardize formatting or response shaping
- Keep Liquid requests shorter and easier to maintain

Do not use a Function when you need:

- An external API call
- A webhook, schedule, or manual trigger
- A standalone execution target

For invocation syntax and runtime examples, see [Using Functions in Liquid Requests](https://docs.apiease.com/docs/functions/using-functions-in-liquid-requests).

SOURCE
https://docs.apiease.com/docs/functions/using-functions-in-liquid-requests

TITLE
Using Functions in Liquid Requests

CONTENT
# Using Functions in Liquid Requests

APIEase Functions are reusable Liquid helpers that run inside a parent [Liquid Request](https://docs.apiease.com/docs/requests/request-types/liquid-requests).

When a Liquid request calls a Function:

- The Function runs in process as part of the parent Liquid request
- The Function does not create a separate request execution
- The Function does not add separate request charges

## The function tag

Use the `function` tag to call a saved Function and assign its result to a variable.

Basic syntax:

```liquid
{% function build_summary(customer.firstName) as summary %}
{{ summary }}
```

`as <name>` is required. APIEase assigns the Function result to that alias and you can use it later in the template.

## Inline positional syntax

The simplest syntax is an inline function call by name:

```liquid
{% function format_price(product.price, cart.currency.iso_code) as formattedPrice %}
{{ formattedPrice }}
```

Arguments are matched to the saved parameter definitions in order.

If your Function defines these parameters:

1. `amount`
2. `currency`

Then the example above maps:

- `product.price` to `amount`
- `cart.currency.iso_code` to `currency`

Supported inline argument styles include:

- String literals
- Number literals
- Boolean literals
- `null`
- Liquid variables and simple Liquid expressions

Example:

```liquid
{% function build_summary("Kevin, Jr.", 42, true, null, customer.firstName | append: " Smith") as summary %}
{{ summary.message }}
```

## Object syntax

You can also call a Function with a JSON object. This is useful when you want named arguments or want to resolve the Function dynamically.

Example using `functionName`:

```liquid
{% function {
  "functionName": "build_summary",
  "args": {
    "firstName": "{{ customer.firstName }}",
    "lastName": "{{ customer.lastName }}"
  }
} as summary %}
{{ summary.message }}
```

Use `functionName` for new Liquid templates. `functionId` remains a legacy option when you already have a server-owned function id, but do not copy server-owned ids into repository-managed examples.

You can also pass a variable that already contains the invocation object:

```liquid
{% function functionInput as summary %}
{{ summary.message }}
```

This form is useful when your Liquid context already includes a prebuilt function input object.

## Accessing parameters inside the Function

Inside the saved Function body, each declared parameter is available as a Liquid variable by its parameter name.

If your Function declares:

- `firstName`
- `lastName`

Then the Function body can use:

```liquid
{{ firstName }}
{{ lastName }}
```

Important behavior:

- Only declared parameters are exposed inside the Function body.
- Missing arguments resolve to `null`.
- Extra positional arguments are rejected with an error.

## Return behavior

A Function returns whatever its Liquid body renders.

If the rendered output is valid JSON, APIEase parses it before assigning the alias. This lets a Function return:

- Objects
- Arrays
- Numbers
- Booleans
- `null`

If the rendered output is not valid JSON, APIEase returns trimmed text.

String example:

```liquid
Hello {{ firstName }}
```

Object example:

```liquid
{
  "message": "Hello {{ firstName }}",
  "name": "{{ firstName }}"
}
```

Then call it like this:

```liquid
{% function build_summary(customer.firstName, customer.lastName) as summary %}
{{ summary.message }}
```

## Example: reusable title builder

Saved Function:

```liquid
{{ prefix }} {{ title | strip }}
```

Declared parameters:

- `prefix`
- `title`

Liquid Request:

```liquid
{% function build_title("Sale:", product.title) as computedTitle %}

{% call {
  "requestId": "create-tagline",
  "bodyEmbedded": {
    "title": computedTitle
  }
} as response %}

{{ response.status }}
```

## Guardrails and errors

APIEase includes a few protections for Functions:

- Recursive Function calls are not allowed.
- Nested Function calls are limited to a maximum depth of 10.
- Calling a missing Function raises an error.
- Malformed inline invocation syntax raises an error.
- Omitting `as <name>` raises an error.

## When to use Functions vs. Requests

Use a Function when you need reusable Liquid logic.

Use a [Liquid Request](https://docs.apiease.com/docs/requests/request-types/liquid-requests) when you need the overall executable workflow.

Use an [HTTP Request](https://docs.apiease.com/docs/requests/request-types/http-requests), [Flow Request](https://docs.apiease.com/docs/requests/request-types/flow-requests), or [System Request](https://docs.apiease.com/docs/requests/request-types/system-requests) when you need to call an external or app-managed operation.

SOURCE
https://docs.apiease.com/docs/variables/variables-overview

TITLE
Variables Overview

CONTENT
# Variables Overview

The Variables page lets you manage persisted shop variables for the current store directly from the APIEase admin.

For built-in values supplied during request execution, see [System Variables](https://docs.apiease.com/docs/general/apiease-details/system/system-variables/overview). These are automatically available and are not managed on the Variables page.

These are the same variables used by [System Requests](https://docs.apiease.com/docs/requests/request-types/system-requests), so you can manage values manually in the admin or read and write them programmatically in request flows.

## Open the Variables page

In the APIEase admin, select **Variables** from the main navigation.

## What you can do

- View all saved variables for the current shop
- Create a new variable
- Open an existing variable and update its value
- Mark a variable as sensitive so its value stays masked in the UI
- Add a description of the variable's purpose and where it is used
- Delete variables you no longer need

## Variables list

The Variables page shows a table with four columns:

- **Name**: The variable display name. Select the name or the edit action to open the variable.
- **Value**: The current value summary. Non-sensitive values are shown directly. Sensitive values are masked.
- **Sensitive**: Shows `Yes` or `No`.
- **Actions**: Edit or delete the variable.

Additional list behavior:

- Use the **Add variable** button to create a new variable.
- If a value is long, the list truncates it for display.
- If a delete is in progress, the row is dimmed and marked **Will be deleted**.
- If no variables exist yet, the page shows `No variables yet.`

## Create a variable

To create a variable:

1. Open the **Variables** page.
2. Select **Add variable**.
3. Enter a **Name**.
4. Confirm or edit the **Handle**.
5. Optionally add a **Description** of the variable's purpose and relationships.
6. Enter a **Value**.
7. Turn on **Sensitive** if the value should stay hidden after it is saved.
8. Use the save bar to save the variable.

Notes:

- `Name` is required when creating a variable.
- `Handle` is the stable public identifier used by System Requests, `apiease-cli`, and the public API. APIEase generates it from the name until you edit it manually.
- The save bar appears when you make changes.
- You can use **Discard** in the save bar to abandon unsaved edits.

## Edit a variable

To edit a variable:

1. Open the variable from the list.
2. Update the **Name**, **Handle**, **Description**, **Value**, and, if needed, the **Sensitive** checkbox.
3. Save from the save bar.

Important behavior:

- Keep the **Handle** stable if requests, CLI scripts, or public API integrations already reference the variable.
- Existing sensitive values stay masked in the editor. If you leave the masked value as-is and save, APIEase keeps the stored value.
- If you want to replace a sensitive value, type a new value before saving.
- If you turn off **Sensitive** for an existing masked variable, enter the replacement plain-text value before saving because APIEase does not reveal the stored secret back into the form.

The **Sensitive** setting for a Variable reduces accidental disclosure in the APIEase admin; it is not the same boundary as a sensitive request parameter. The underlying Variable value remains available to authorized runtime and programmatic workflows, including System requests, Liquid workflows, and authenticated external systems. Do not return a sensitive Variable from a publicly callable request.

Descriptions are not secret storage. Do not copy the variable value, credentials,
approval state, or temporary execution results into the description.

## Delete a variable

Use the delete action in the list to remove a variable.

Delete applies immediately. Unlike staged changes on some other pages, there is no separate bulk save step for deletions on the Variables page.

## When to use the Variables page vs. System Requests

Use the Variables page when you want to manage values manually in the admin.

Use [System Requests](https://docs.apiease.com/docs/requests/request-types/system-requests) when you want to set, get, or delete variables as part of an automated flow.

SOURCE
https://docs.apiease.com/docs/widgets/widgets-overview

TITLE
Widgets overview

CONTENT
# Widgets overview

APIEase widgets are reusable storefront UI components that you build and manage in APIEase, then render in your Shopify theme through the APIEase Widget App Block or Widget App Embed. A widget can output Liquid (markup) and optionally run JavaScript, which makes it a good fit for UI that needs to stay flexible but still integrate with your backend logic.

Add a description to explain what the widget renders, where it is intended to be
used, and which requests or variables it relies on. The description travels with
the widget through the public API, CLI, and project review, but it is not rendered
on the storefront.

## Why widgets are useful

- **UI + secure API requests, together:** Widgets help you connect storefront UI components to secure API requests powered by APIEase, without moving secrets or request logic into the theme.
- **Rich UI with Liquid + JavaScript:** Liquid plus inline JavaScript and external JavaScript libraries lets you build interactive, dynamic widgets while still relying on APIEase for secure request execution.
- **Easy placement anywhere:** Widget App Extensions make it straightforward to add widgets to a specific page or template, or run selected widgets across the storefront.

## Learn more

Learn more about the [Widgets page](https://docs.apiease.com/docs/widgets/widgets-page) to manage and organize your widgets, the [Widget edit page](https://docs.apiease.com/docs/widgets/widget-edit-page) to configure a widget's Liquid, JavaScript, and handle, and [Widget App Extensions](https://docs.apiease.com/docs/widgets/widget-app-extensions) to choose between placement-specific and global widget rendering.

SOURCE
https://docs.apiease.com/docs/widgets/widgets-page

TITLE
Widgets page

CONTENT
# Widgets page

The Widgets page is where you manage reusable storefront widgets. Each widget has a handle, Liquid template, and optional JavaScript that can be rendered in a theme app block.

## What you can do

- View every widget by name and handle
- See JavaScript status (None, Inline, External (#), or Disabled)
- Add a new widget
- Edit widgets
- Duplicate or delete widgets and save or discard staged changes

## Widget list table

The table shows each widget with the name, handle, JavaScript status, and actions for edit, duplicate, and delete. Use it to confirm which widgets have JavaScript enabled before you place them in a theme.

When you duplicate or delete a widget, the change is staged in the table:

- Staged duplicates appear as new rows labeled **Staged duplicate**.
- Deletes dim the row and show **Will be deleted**.
- Actions for staged rows are disabled until you save or discard.

## Staged changes and save bar

Duplicate and delete actions do not apply immediately. They are staged and collected until you choose what to do:

- **Save** applies all staged duplicates and deletions.
- **Discard** cancels staged changes and returns to the last saved list.

## Create a widget

Select **Add Widget** (the plus button) to open the widget editor. This is where you define the Liquid template, optional JavaScript, and handle you will reference in your theme.

SOURCE
https://docs.apiease.com/docs/widgets/widget-edit-page

TITLE
Widget edit page

CONTENT
# Widget edit page

The widget editor is where you define how a widget renders and behaves. Use it to set the widget name, handle, Liquid template, and optional JavaScript.

## Widget fields

### Widget name

The display name used in the Widgets list. When you create a new widget, the handle is auto generated from the name until you manually edit the handle.

### Widget handle

The identifier used by the storefront block to load the widget. Keep this stable if the widget is already used in a theme, and update the theme block if you change it.

### Liquid template

The Liquid markup that renders inside the widget container. Use it to output HTML and Liquid variables needed by the storefront.

### External JavaScript URLs

One URL per line. APIEase loads these scripts when the widget renders.

### JavaScript

Inline JavaScript that runs after the widget HTML is inserted on the page. Use it for widget specific behavior.

### Disable JavaScript

When checked, the widget renders its Liquid template but does not load any JavaScript from the inline or external fields.

## Save and delete

- The save bar appears when you make changes.
- **Save** applies your edits.
- **Discard** reverts to the last saved version.
- Delete widgets from the Widgets page (deletions are staged and saved there).

## AI widget builder

Use the assistant panel to generate or refine a widget draft. When you accept a draft, the editor updates the Liquid and JavaScript fields so you can review and save.

SOURCE
https://docs.apiease.com/docs/widgets/widget-app-extensions

TITLE
Widget App Extensions

CONTENT
# Widget App Extensions

Widgets can render in your Shopify storefront through the APIEase Widget App Block or the APIEase Widget App Embed.

Use the App Block when a widget belongs in a specific theme section, page, or template. Use the App Embed when a widget should load across the storefront.

## Before you start

- Create and save a widget in APIEase.
- Copy the widget handle from the widget editor.

## Choosing between App Block and App Embed

Use the **Widget App Block** for the normal placement-specific path. Choose it when a widget belongs in one theme section, page, or template.

Use the **Widget App Embed** only for site-wide widgets that should load on every storefront page. Good fits include non-visual background widgets, tracking, floating widgets, popups, and banners that position themselves.

If a widget is ordinary page content, use the Widget App Block. Do not add ordinary section or content widgets to **Global widget handles** unless you intentionally want them to load across the entire storefront.

## Next steps

- Add a widget to a specific page or template with the [Widget App Block](https://docs.apiease.com/docs/widgets/widget-app-block).
- Run selected widgets globally with the [Widget App Embed](https://docs.apiease.com/docs/widgets/widget-app-embed).

SOURCE
https://docs.apiease.com/docs/widgets/widget-app-block

TITLE
Widget App Block

CONTENT
# Widget App Block

The APIEase Widget App Block renders a widget in a specific Shopify theme section, page, or template. This is the normal path for page content widgets and other widgets that need a specific placement in the storefront.

## Before you start

- Create and save a widget in APIEase.
- Copy the widget handle from the widget editor.

## Add the widget to your theme

1. Open Shopify admin and go to **Online Store** -> **Themes**.
2. Select **Customize** on the theme you want to update.
3. Navigate to the page or template where the widget should appear.
4. Add the **APIEase Widget App Block** block to the section.
5. Paste the widget handle into the **Widget handle** setting.
6. Save the theme changes.

## Update or move a widget

- If you change the widget handle, update the block setting to match.
- To move the widget, remove the block from the current section and add it to the new location.

## Troubleshooting

- If the block shows "Widget handle not configured", confirm the handle value is set and saved.
- If the widget does not render, confirm the handle matches exactly and the widget is saved in APIEase.

## Related pages

- Compare the App Block with the App Embed in [Widget App Extensions](https://docs.apiease.com/docs/widgets/widget-app-extensions).
- Use the [Widget App Embed](https://docs.apiease.com/docs/widgets/widget-app-embed) for widgets that should run across the storefront.

SOURCE
https://docs.apiease.com/docs/widgets/widget-app-embed

TITLE
Widget App Embed

CONTENT
# Widget App Embed

The APIEase Widget App Embed is optional. Enable it only for widgets that should run on every storefront page.

When the App Embed is enabled, APIEase loads the registered widgets on every storefront page. Their Liquid can render globally, and their JavaScript can run globally.

Globally registered widgets should be designed for site-wide use. They can be non-visual background widgets or self-positioned visual widgets, such as floating widgets, popups, or banners.

Do not register ordinary section or content widgets globally unless you intentionally want them to load on every storefront page.

## Before you start

- Create and save a widget in APIEase.
- Copy the widget handle from the widget editor.

## Register global widgets

1. Open Shopify admin and go to **Online Store** -> **Themes**.
2. Select **Customize** on the theme you want to update.
3. Open **App embeds**.
4. Enable the **APIEase Widget App Embed**.
5. Add one or more widget handles to **Global widget handles**.
6. Save the theme changes.

Use the **Global widget handles** setting to register one or more widget handles. Separate multiple handles with new lines or commas.

## Troubleshooting

- If a global widget does not run, confirm the App Embed is enabled and the theme changes are saved.
- If a widget does not render, confirm the handle matches exactly and the widget is saved in APIEase.
- If a visual widget appears on pages where it should not appear, remove it from **Global widget handles** and add it with the [Widget App Block](https://docs.apiease.com/docs/widgets/widget-app-block) instead.

## Related pages

- Compare the App Embed with the App Block in [Widget App Extensions](https://docs.apiease.com/docs/widgets/widget-app-extensions).
- Use the [Widget App Block](https://docs.apiease.com/docs/widgets/widget-app-block) for ordinary page content or section-specific widgets.

SOURCE
https://docs.apiease.com/docs/widgets/using-requests-in-widgets

TITLE
Using Requests in Widgets

CONTENT
# Using Requests in Widgets

Widgets can call APIEase requests through JavaScript. The widget's JavaScript runs in the browser, but the request runs on the server. This separation keeps integrations secure by keeping credentials and private logic off the storefront.

For the JavaScript call below, add the **Storefront App Proxy** trigger to the directly called request and save it. The JavaScript sends a [storefront call](https://docs.apiease.com/docs/requests/triggers/storefont-calls) through Shopify's app proxy. The widget contains the storefront UI, the request performs the server-side work, and an [App Block or App Embed](https://docs.apiease.com/docs/widgets/widget-app-extensions) determines where the widget loads.

## Configure a request call
1. Get the handle for the request you want to run.
2. In the widget edit page, the **Liquid** field is required; you can use a simple placeholder like `<div></div>`.
3. Paste the JavaScript below into the widget's **JavaScript** field to call the APIEase integration endpoint with `fetch` and read the JSON response:

```js
const queryParams = new URLSearchParams({
  requestId: 'product-details-proxy',
});

fetch('/apps/apiease/integration/caller/call?' + queryParams)
  .then(function (response) {
    return response.json();
  })
  .then(function (jsonResponse) {
    console.log(jsonResponse);
  });
```

## Security warning
Never place sensitive credentials (API keys, access tokens, passwords) in a widget. Widgets are delivered to the browser and are inspectable. Configure credentials inside the APIEase request so they are stored securely and only used on the server.

SOURCE
https://docs.apiease.com/docs/general/faq/faq

TITLE
FAQ

CONTENT
# FAQ

Choose the category that matches what you are trying to do:

- [Understand APIEase and connect another system](https://docs.apiease.com/docs/general/faq/getting-started-and-integrations): capabilities, request management, external APIs, and data synchronization.
- [Build a request](https://docs.apiease.com/docs/general/faq/building-requests): request types, methods, addresses, parameters, chains, Variables, Functions, Liquid, and System requests.
- [Manage credentials, authentication, and security](https://docs.apiease.com/docs/general/faq/credentials-and-security): APIEase API keys, Shopify access tokens, external credentials, permissions, and sensitive values.
- [Run a request](https://docs.apiease.com/docs/general/faq/running-requests): manual, remote, webhook, scheduled, proxy, storefront, Shopify Flow, and widget execution.
- [Troubleshoot a request](https://docs.apiease.com/docs/general/faq/troubleshooting-requests): safe testing, errors, unexpected responses, trigger differences, and multi-step failures.
- [Use developer tools and automation](https://docs.apiease.com/docs/general/faq/developer-and-automation): the public API, resource handles, `apiease-cli`, `apiease-template`, and AI-assisted workflows.

SOURCE
https://docs.apiease.com/docs/general/faq/getting-started-and-integrations

TITLE
Getting started and integrations FAQ

CONTENT
# Getting started and integrations FAQ

## What can I build with APIEase?

APIEase lets you save and run HTTP, Flow, Liquid, and System requests, combine requests into workflows, and build storefront widgets. Common uses include third-party API calls, Shopify automations, scheduled data movement, event-driven actions, and server-side storefront integrations. Start with [What APIEase does](https://docs.apiease.com/docs/overview/what-it-does) and [Requests overview](https://docs.apiease.com/docs/requests/requests-overview).

## Can APIEase connect to any external or third-party API?

APIEase can connect to an external HTTP API when the provider exposes the required operation and gives you the endpoint, authentication, permissions, and payload contract. APIEase cannot guarantee support for every provider or discover a private or undocumented API. Use the [external API setup guide](https://docs.apiease.com/docs/requests/connect-external-api) to evaluate a supplier, ERP, CRM, warehouse, or other provider integration.

## What information do I need from an API provider?

You need the endpoint and HTTP method, authentication instructions and issued credentials, required headers and parameters, request and response shapes, permissions, pagination, rate limits, and preferably a test environment. The provider's current documentation or support team must supply provider-specific details. See the complete [provider information checklist](https://docs.apiease.com/docs/requests/connect-external-api).

## Can APIEase obtain provider documentation or credentials for me?

No. APIEase cannot retrieve missing provider documentation, issue another company's API key or access token, bypass permissions, or infer a safe write payload from incomplete requirements. Ask the provider for the missing contract or credential, then use [Connect to an external API](https://docs.apiease.com/docs/requests/connect-external-api) to map it to APIEase.

## How do I create, find, edit, duplicate, or delete a request?

Open **Requests** in the APIEase admin. Create a request with **Add Request**; find existing requests in the list; select the request name or **Edit** to update it; use **Duplicate** for a new draft based on it; and use **Delete**, then **Save**, to apply a confirmed deletion. The full lifecycle and handle precautions are in [Create and manage requests](https://docs.apiease.com/docs/requests/how-to-add-requests).

## Should I manage resources in the admin, with the CLI, or through the public API?

Use the APIEase admin for interactive work. Use `apiease-cli` when requests, widgets, variables, or functions should be JSON files in source control. Use the public API for direct external automation. CLI and public API workflows use stable resource handles and are separate from clicking actions in the admin. Compare the workflows in [Create and manage requests](https://docs.apiease.com/docs/requests/how-to-add-requests) and read [Resource handles](https://docs.apiease.com/docs/developers/resource-handles).

## How do I synchronize or import products and inventory?

Build a workflow that reads the provider data, maps stable product, variant, SKU, inventory-item, and location identifiers correctly, and calls the appropriate Shopify Admin API operation. Choose a one-time, scheduled, or event-driven pattern based on how changes are exposed. Plan it with [Synchronize data with an external system](https://docs.apiease.com/docs/requests/synchronize-external-data), then use the [third-party product import pattern](https://docs.apiease.com/docs/general/apiease-details/importing-third-party-products).

## How do I synchronize orders, customers, or fulfillments?

Define the direction, source of truth, matching identifier, business event, and destination operation first. Then combine provider-neutral HTTP requests with a schedule, Shopify webhook, Liquid orchestration, or a simple request chain as needed. Follow the [order, customer, and fulfillment synchronization guidance](https://docs.apiease.com/docs/requests/synchronize-external-data).

## Is a one-time import the same as an ongoing synchronization?

No. A one-time import is a bounded run. An ongoing sync also needs change detection, stable record matching, pagination, repeated-input behavior, error handling, and a schedule or event trigger. Use the patterns in [Synchronize data with an external system](https://docs.apiease.com/docs/requests/synchronize-external-data) before enabling recurring or event-driven writes.

SOURCE
https://docs.apiease.com/docs/general/faq/building-requests

TITLE
Building requests FAQ

CONTENT
# Building requests FAQ

## Which request type should I choose?

Choose **HTTP** to call an external API, **Flow** to start or continue Shopify Flow, **Liquid** to apply template logic or orchestrate other saved requests, and **System** to manage APIEase Variables without calling an external URL. See the [request types overview](https://docs.apiease.com/docs/requests/request-types/request-types-overview) for a focused comparison.

## Where do I set the HTTP method and endpoint URL?

Set **Method** and **Address** on an HTTP request. The method is the operation the provider documents, such as GET, POST, PUT, PATCH, DELETE, or OPTIONS; the address is the provider's full endpoint URL. Do not put query parameters or a request body into the Address field when APIEase provides a matching parameter location. See [HTTP requests](https://docs.apiease.com/docs/requests/request-types/http-requests).

## Should a value be a header, query parameter, path parameter, or body?

Put the value where the receiving API's contract requires it: headers carry metadata or authentication, query parameters appear after `?` in the URL, path parameters replace placeholders such as `{productId}`, and the body carries the request payload. These locations are not interchangeable. Use the [request parameters overview](https://docs.apiease.com/docs/requests/request-parameters/request-parameters-overview) to reach the setup page for each location, including JSON and form URL-encoded bodies.

## What is the difference between an in-app parameter and a dynamic embedded parameter?

An **in-app parameter** is saved on the request; a **dynamic embedded parameter** is supplied for one execution by a caller such as storefront code, a widget, or another request. Use a saved value for stable configuration or a sensitive request parameter, and a runtime or embedded value for per-call input. When both provide the same parameter, the dynamic embedded value overrides the saved value. See [In-app parameters vs dynamic embedded parameters](https://docs.apiease.com/docs/requests/request-parameters/in-app-vs-dynamic).

## How do I run a second request with data from the first response?

Set the first request's **Next Request** to the second request's handle, then use `{field}` or `{object.field}` placeholders in the second request to read values from the previous response body. This is a chained request, also called a request chain or multi-step request. Follow [Chained requests](https://docs.apiease.com/docs/requests/request-parameters/chained-requests) for supported parameter locations and an authentication example.

## When should I use a Liquid request instead of a request chain?

Use a simple request chain for a linear handoff from one response to the next. Use a Liquid request when the workflow needs conditions, loops, response shaping, several explicit `call` operations, or reusable Function calls. Liquid requests are executable workflows; they do not replace the HTTP requests that perform external API calls. See [Liquid requests](https://docs.apiease.com/docs/requests/request-types/liquid-requests).

## What is the difference between Variables and System requests?

Variables are persisted values for the current store; System requests are executable requests that get, set, or delete those values during a workflow. Manage a value manually on the [Variables page](https://docs.apiease.com/docs/variables/variables-overview), or use a [System request](https://docs.apiease.com/docs/requests/request-types/system-requests) when automation must manage it. A System request does not call an external API.

## What is a Function, and how is it different from a Liquid request?

A Function is reusable Liquid helper logic that runs inside a parent Liquid request. It has no trigger and is not a standalone request execution. Use a Function to reuse transformations or formatting, and use a Liquid request for the overall executable workflow. See [Functions overview](https://docs.apiease.com/docs/functions/functions-overview) and [Using Functions in Liquid requests](https://docs.apiease.com/docs/functions/using-functions-in-liquid-requests).

SOURCE
https://docs.apiease.com/docs/general/faq/credentials-and-security

TITLE
Credentials, authentication, and security FAQ

CONTENT
# Credentials, authentication, and security FAQ

## What is the difference between an APIEase API key, a Shopify access token, and an external API credential?

They authenticate different calls and are not interchangeable:

- An **APIEase API key** authenticates an external system calling APIEase. Create, reveal, copy, and delete these keys from **Settings**. See [APIEase API Key](https://docs.apiease.com/docs/general/settings/apiease-api-key).
- A **Shopify access token** authenticates a call to the Shopify Admin API. APIEase normally uses the shop access token from the Shopify installation automatically. See [Shopify API calls and access tokens](https://docs.apiease.com/docs/general/shopify-api/shopify-api-calls-and-access-tokens).
- An **external-provider credential** authenticates an outbound call from APIEase to another service. The provider supplies the API key, Bearer token, OAuth credential, username, or password and defines how it must be sent. See [Authentication example](https://docs.apiease.com/docs/general/apiease-details/authentication-example).

## Can APIEase find, reveal, or generate a credential for another service?

No. APIEase cannot retrieve, reveal, or generate a private API key, token, password, client secret, or other credential owned by Shopify or another provider. Obtain it from that provider's dashboard, authentication endpoint, or support team.

The shop access token installed through APIEase is a separate case: APIEase stores and uses it for eligible Shopify Admin API requests, but you do not retrieve it from APIEase. If you need an explicit Shopify token, create one through Shopify and follow [Custom access token](https://docs.apiease.com/docs/general/shopify-api/custom-access-token).

## Where should I put an external API key, Bearer token, or other provider credential?

Save it as a request parameter in the location required by the provider, and mark the parameter **Sensitive**. Common formats include an `Authorization: Bearer YOUR_ACCESS_TOKEN` header or a provider-specific API-key header. Do not put credentials in storefront JavaScript, theme Liquid, widget code, or dynamic embedded parameters.

The provider's documentation is the authority for the header name, prefix, token endpoint, and required permissions. See [In-app header parameters](https://docs.apiease.com/docs/requests/request-parameters/in-app-parameters/in-app-header-parameters) and [In-app parameters overview](https://docs.apiease.com/docs/requests/request-parameters/in-app-parameters/in-app-parameters-overview).

## Can I recover a sensitive value after I save it?

It depends on the resource:

- A sensitive **request parameter** is masked after saving, omitted from normal read interfaces, and decrypted only when APIEase executes the request. APIEase does not reveal the saved value back to you; replace it if you no longer have the original.
- A sensitive **Variable** is masked in the APIEase admin, but its value remains available to authorized runtime and programmatic workflows. See [Variables overview](https://docs.apiease.com/docs/variables/variables-overview).
- An **APIEase API key** remains revealable and copyable from **Settings**. See [APIEase API Key](https://docs.apiease.com/docs/general/settings/apiease-api-key).

Marking a value sensitive does not remove secrets or private data from an external API's response. A publicly callable request must not return credentials or other private response data.

## How do I authenticate with an external API?

Follow the external provider's current authentication contract. For a static credential, add it as a sensitive header, body, query, or path parameter exactly where the provider requires it. For a short-lived token, create one request that obtains the token and chain it to the request that uses the response value.

APIEase does not perform an unspecified OAuth flow automatically. You need the provider's token URL, credential requirements, scopes, and request format. See the [Authentication example](https://docs.apiease.com/docs/general/apiease-details/authentication-example) and [Chained requests](https://docs.apiease.com/docs/requests/request-parameters/chained-requests).

## Why does an authenticated request return 401 or 403?

A `401 Unauthorized` response usually means the receiving API did not accept the credential. Check that the credential is present, current, intended for that environment or account, and formatted exactly as the provider requires.

A `403 Forbidden` response usually means the credential was recognized but is not allowed to perform the operation. Check scopes, roles, resource access, account restrictions, and whether the credential belongs to the correct shop or provider account. Providers can use these status codes differently, so inspect the response body and their documentation before changing the request.

For Shopify calls, also confirm the request qualifies for [automatic token usage](https://docs.apiease.com/docs/general/shopify-api/automatic-vs-overridden-shopify-access-tokens) and review [shop access token permissions](https://docs.apiease.com/docs/general/shopify-api/manage-shop-access-token-permissions).

## Do I need to add a Shopify access token to every Shopify Admin API request?

Usually not. APIEase automatically injects the installed shop access token when an HTTP request targets the current shop's domain, its path starts with `/admin/api`, and the request does not already contain an `X-Shopify-Access-Token` header.

The [Shopify Admin GraphQL address preset](https://docs.apiease.com/docs/general/shopify-api/shopify-admin-graphql-address-preset) is the simplest way to use the correct address. See [Automatic vs overridden Shopify access tokens](https://docs.apiease.com/docs/general/shopify-api/automatic-vs-overridden-shopify-access-tokens) for all prerequisites.

## How do I override the automatic Shopify access token?

Add an `X-Shopify-Access-Token` header containing `YOUR_ACCESS_TOKEN`. APIEase treats any case-insensitive match for that header name as an explicit override and does not inject the installed shop access token.

Use an override only when you intentionally need a different Shopify token. You are responsible for obtaining, storing, rotating, and granting the required scopes to that token. See [Custom access token](https://docs.apiease.com/docs/general/shopify-api/custom-access-token).

## How do I change permissions for the automatic Shopify token?

Open **Settings**, then **Permissions**, select the additional Shopify Admin API scopes, save, and complete Shopify's approval flow. Changing scopes can require reauthorization and does not change the logic of existing requests.

Use the permissions page only for APIEase's installed shop access token. A custom Shopify token or external-provider credential must be managed where it was issued. See [Manage shop access token permissions](https://docs.apiease.com/docs/general/shopify-api/manage-shop-access-token-permissions).

## How should I rotate or revoke credentials?

Rotate each credential at its issuing source, update every request or caller that uses it, test the replacement, and then revoke the old credential. For APIEase API keys, create and save a replacement in **Settings**, update external callers, verify them, then delete the old key and save the change. For Shopify or external-provider credentials, use that provider's rotation and revocation workflow.

APIEase cannot rotate a provider-owned credential on your behalf.

SOURCE
https://docs.apiease.com/docs/general/faq/running-requests

TITLE
Running requests FAQ

CONTENT
# Running requests FAQ

## How should I run a request?

Choose the entry point that matches the caller: use a manual call in APIEase admin, a webhook for a Shopify event, cron for a recurring schedule, a remote call from a trusted external system, a proxy endpoint for a purpose-built HTTP route, or a storefront call from theme code or an APIEase widget's JavaScript. The [triggers overview](https://docs.apiease.com/docs/requests/triggers/triggers-overview) compares prerequisites for each option.

## How do I test or run a request once from APIEase admin?

Use a **Manual Call**. From the Requests page, choose **Copy and Execute**, then **Execute and Run**. Manual execution is useful for a one-off action or for checking the saved configuration before adding another entry point. Follow [Manual calls](https://docs.apiease.com/docs/requests/triggers/manual-calls) for the procedure and [Troubleshoot requests](https://docs.apiease.com/docs/requests/troubleshooting-requests) when the run fails or returns an unexpected result.

## What is the difference between a remote call and a proxy endpoint?

Use a **remote call** to run a saved request by handle through APIEase's shared caller URL; it requires an APIEase API key and shop-domain header. Use a **proxy endpoint** when you need a configured path and HTTP method that can be authenticated or unauthenticated. Neither is the Shopify app-proxy route used by storefront code. See [Calling APIEase requests remotely](https://docs.apiease.com/docs/requests/triggers/calling-requests-remotely) and [Proxy endpoint](https://docs.apiease.com/docs/requests/triggers/proxy-endpoint).

## How do I run a request when a Shopify event occurs?

Add a **Webhook** trigger and choose the APIEase event constant that corresponds to the Shopify topic, such as `ORDERS_CREATE`. APIEase passes the webhook payload as the body, and you can map payload fields into other request parameters. See [Trigger requests from a webhook](https://docs.apiease.com/docs/requests/triggers/webhooks/trigger-requests-from-a-webhook) and [Mapping webhook parameters](https://docs.apiease.com/docs/requests/triggers/webhooks/mapping-webhook-parameters).

## How do I run a request on a recurring schedule?

Add a **Cron** trigger with a five-field cron expression. APIEase evaluates cron schedules in UTC, so convert the intended local time and account for daylight-saving changes where applicable. See [Cron schedule](https://docs.apiease.com/docs/requests/triggers/cron-schedule).

## How should storefront theme code call an APIEase request?

Use a **Storefront App Proxy** trigger on the request that theme code calls directly, then call APIEase through Shopify's app-proxy path. This keeps saved credentials out of browser code, but the route is callable unless you add customer validation. It also does not promise that arbitrary browser calls to other services will avoid CORS restrictions. See [Storefront calls](https://docs.apiease.com/docs/requests/triggers/storefont-calls).

## How do I require a logged-in customer or allow only selected customers?

For a storefront call, add `validateCustomer=true` as a System parameter to require any logged-in customer. To allow selected customers, add one `customerId` System parameter for each allowed Shopify customer ID--not a JSON array in one value. Customer validation relies on the identity Shopify supplies through its app proxy; it is not authentication for remote calls or proxy endpoints. See [Customer-authenticated requests](https://docs.apiease.com/docs/requests/customer-authenticated-requests).

## What is the difference between a widget, an App Block, and an App Embed?

A **widget** is reusable storefront Liquid, CSS, and JavaScript. An **App Block** places a widget in a specific theme section or template, while an **App Embed** loads selected widgets across the storefront. See [Widgets overview](https://docs.apiease.com/docs/widgets/widgets-overview) and [Widget App Extensions](https://docs.apiease.com/docs/widgets/widget-app-extensions).

## How do I send APIEase data into Shopify Flow?

Create a **Flow request** and map the values Flow should receive. Add a trigger if the Flow request is the entry point, or set the Flow request as **Next Request** after an HTTP, Liquid, or other APIEase request. See [How to add a Flow request](https://docs.apiease.com/docs/requests/shopify-flow-integration/add-flow-request) and the [APIEase + Shopify Flow architecture](https://docs.apiease.com/docs/requests/shopify-flow-integration/architecture).

## How do I run several requests in sequence?

Set **Next Request** to the next request's handle and reference fields from the previous response in the next request's parameters. This creates a simple linear request chain; it is not an external trigger. For conditions, loops, response shaping, or several explicit calls, use a Liquid request instead. See [Chained requests](https://docs.apiease.com/docs/requests/request-parameters/chained-requests).

SOURCE
https://docs.apiease.com/docs/general/faq/troubleshooting-requests

TITLE
Troubleshooting requests FAQ

CONTENT
# Troubleshooting requests FAQ

## How do I test an APIEase request safely?

Check whether the request can change live data, then use a provider sandbox, test record, or provider-supported dry run when available. Run the smallest valid version as a [manual call](https://docs.apiease.com/docs/requests/triggers/manual-calls), change one setting at a time, and add the trigger only after the saved request works. Follow [Troubleshoot requests](https://docs.apiease.com/docs/requests/troubleshooting-requests) for the ordered workflow.

## Why is my request not working?

First test it manually, then verify the address and method, required parameters and body format, credentials and permissions, and the external provider's response. If the manual call works, isolate the trigger and its runtime values. The [request troubleshooting guide](https://docs.apiease.com/docs/requests/troubleshooting-requests) provides the complete sequence.

## What should I check when the response is unexpected?

Compare the returned status and body with the receiving API's current documentation, then reduce the request to its required fields. Confirm value types, identifiers, content type, and whether a dynamic embedded parameter overrode a saved value. APIEase cannot assign a universal meaning to an undocumented provider response.

## Why does a request work manually but fail from a webhook, schedule, remote call, proxy, storefront, or widget?

The saved request is probably not the first layer to change. Check the failing call's prerequisites and compare its runtime parameters with the successful manual run. For storefront calls from theme or widget JavaScript, the directly called request needs a **Storefront App Proxy** trigger. Missing input, a different name or parameter location, or a runtime override can change the result. Start with the [triggers overview](https://docs.apiease.com/docs/requests/triggers/triggers-overview).

## Why does my request return 401 or 403?

A `401` commonly means the receiving API rejected or did not receive the credential; a `403` commonly means the credential lacks permission for the operation. Providers can define these responses differently. Use the response body and provider documentation, then follow [Credentials, authentication, and security](https://docs.apiease.com/docs/general/faq/credentials-and-security) for external-provider and Shopify-specific checks.

## How do I troubleshoot a timeout or network error?

Recheck the address scheme, host, and path, then confirm that the provider endpoint is available and review its status information, rate limits, and expected response time. A timeout alone does not show which system caused the delay. Be careful with retries because repeating a write request can create duplicate side effects.

## How do I find which request in a chain failed?

Test each request independently before reconnecting **Next Request**. Confirm that the first response contains the exact field path and capitalization referenced by the next request, then test the completed chain. See [Chained requests](https://docs.apiease.com/docs/requests/request-parameters/chained-requests) and the [multi-step troubleshooting workflow](https://docs.apiease.com/docs/requests/troubleshooting-requests).

## Can APIEase explain every error returned by an external API?

No. The external service controls its statuses and response bodies, and provider-specific behavior may not follow common HTTP conventions. APIEase can help you isolate the request configuration, but an undocumented provider response must be checked against that provider's documentation or support.

SOURCE
https://docs.apiease.com/docs/general/faq/developer-and-automation

TITLE
Developer tools and automation FAQ

CONTENT
# Developer tools and automation FAQ

## Should I use the APIEase admin, Apex, the CLI, the template, or the public API?

Use the APIEase admin for interactive configuration and testing. Use Apex for conversational proposals covering requests, widgets, Variables, and Functions inside APIEase. For source-controlled work, start with [`apiease-template`](https://docs.apiease.com/docs/developers/why-use-the-template) and use [`apiease-cli`](https://docs.apiease.com/docs/developers/apiease-cli) to sync saved resources. Use the [public API](https://docs.apiease.com/docs/developers/apiease-public-api) directly for custom HTTP automation that the CLI does not cover.

A coding agent working in a template repository is a separate workflow from Apex. See the [developer overview](https://docs.apiease.com/docs/developers/developer-overview) for the complete comparison.

## Is the APIEase public API an arbitrary outbound API proxy?

No. The APIEase public API manages saved request, widget, Variable, and Function resources, and it can execute an existing saved request remotely. Create the saved resource first; you cannot send the remote caller an arbitrary destination URL and use APIEase as a one-off proxy. See the [public API contract](https://docs.apiease.com/docs/developers/apiease-public-api).

## How do I authenticate to the APIEase public API?

Send your APIEase API key in `x-apiease-api-key` and the target shop domain in `x-shop-myshopify-domain`. This key authenticates calls into APIEase; it is not a Shopify access token or an external provider credential. Learn how the key is stored and rotated on the [APIEase API Key](https://docs.apiease.com/docs/general/settings/apiease-api-key) page.

## How do I run a saved request from another system?

Send a request to `/api/remote/caller/call?requestId={request-handle}` with the APIEase authentication headers. Although the query parameter is named `requestId`, use the saved request's handle as its value for new integrations. Follow [Calling APIEase Requests Remotely](https://docs.apiease.com/docs/requests/triggers/calling-requests-remotely) for the complete example and parameter behavior.

## What is a resource handle, and should I store an id in git?

A handle is the stable, user-controlled public identifier for a saved request, widget, Variable, or Function. Use it in source files, CLI commands, and public API item routes. Do not store server-owned `id` values in repository resource definitions. See [Resource handles](https://docs.apiease.com/docs/developers/resource-handles) for formats, legacy aliases, and execution surfaces that still call the value `requestId`.

## How do I keep APIEase resources in source control?

Initialize a repository with `apiease init`, store request, widget, Variable, and Function definitions under the directories configured by `apiease.config.js`, and commit those files to git. Use the [template quickstart](https://docs.apiease.com/docs/developers/quickstart-with-apiease-template) for setup and the [`apiease-template` reference](https://docs.apiease.com/docs/developers/apiease-template) for file ownership and upgrade behavior.

## Does `apiease create` create duplicates when I rerun it?

Not when a request, widget, Variable, or Function file has a valid `handle`. `apiease create <resource> --file <path>` reads the remote resource by handle, updates it when found, and creates it when missing. Lookup failures other than not found stop the command. See [`apiease-cli`](https://docs.apiease.com/docs/developers/apiease-cli) for supported resources, flags, and migration options.

## Can an AI agent manage APIEase resources for me?

Yes, but choose the workflow deliberately. Apex can propose creates, updates, and deletes for requests, widgets, Variables, and Functions, with an in-product review before approval. A coding agent in an `apiease-template` repository can manage the same families as files and sync them with `apiease-cli`, with git diffs providing a review boundary. Follow [Using APIEase with AI agents](https://docs.apiease.com/docs/developers/using-apiease-with-ai-agents).

## Does Apex preview or wait for approval before changing a resource?

Yes. Apex presents an immutable proposal with the exact resource operations and full before-and-after description changes for creates and updates. Approve it to apply those reviewed bytes, reject it to leave live resources unchanged, or request changes to begin a new proposal revision. Approval and application do not by themselves verify that an external integration works end to end.

Request execution safety is narrower: Apex may initially use an integration-specific dry-run setting or disabled `ALLOW_*` Variable where appropriate. Inspect and test the request before enabling live behavior. See [Using APIEase with AI agents](https://docs.apiease.com/docs/developers/using-apiease-with-ai-agents) for this distinction.

SOURCE
https://docs.apiease.com/docs/general/settings/apiease-api-key

TITLE
APIEase API Key

CONTENT
# APIEase API Key

The APIEase API Key shown on the **Settings** page is strictly for authenticating remote API calls into APIEase.
It is not a Shopify access token and cannot be used to call Shopify APIs directly.

## When to use it

Use this key for Remote Calls (calling APIEase Requests remotely from an external system).

See: [Remote Calls](https://docs.apiease.com/docs/requests/triggers/calling-requests-remotely)

## Add an API key

1. In APIEase, open the **Settings** page.
2. Select **Add API Key**.
3. In **API Key Name**, enter a descriptive name (for example, `production`, `staging`, or `ci`).
4. Save the change.
5. Use **Show** or **Copy**, then store the generated key securely (for example, in a password manager or secret manager).

The key remains available on the **Settings** page. Use **Show** to reveal it or **Copy** to copy it. Anyone with access to this page can reveal or copy the key, so limit admin access appropriately.

## Use the key name during execution

The friendly name of the key that authenticated the initiating request is available as `{apieaseMetaData.apieaseApiKeyName}`. This contains the name, never the secret key, and remains available through chained requests and nested Liquid calls. See [apieaseMetaData](https://docs.apiease.com/docs/general/apiease-details/system/system-variables/apiease-metadata) for availability and a Shopify Flow example.

## What it is not

This is different from the shop access token APIEase uses to call the Shopify Admin API:
[Shop access token](https://docs.apiease.com/docs/general/shopify-api/shop-access-token)

## Security

Treat this key like a secret. Store it securely and create separate keys for separate external systems. To rotate a key, create and save a replacement, update and verify its callers, then delete the old key and save the change.

Deleting a key revokes access for callers that still use it. APIEase API keys are different from sensitive request parameters: API keys remain revealable and copyable in **Settings**, while sensitive request parameters are masked after saving and are not returned through normal read interfaces.

SOURCE
https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/overview

TITLE
System Parameters

CONTENT
# System Parameters

System Parameters are named settings that control how APIEase handles a request. Use them to adjust timeouts, choose response formats, return before processing finishes, or control other supported request behavior.

Add them using the **System** parameter type on the request. For example, an HTTP request can have a System parameter named `REQUEST_TIMEOUT_SECONDS` with value `30`.

System Parameters configure request behavior. [System Variables](https://docs.apiease.com/docs/general/apiease-details/system/system-variables/overview) provide values you can reference during execution. Choosing the **System** parameter type also does not change the request's type: HTTP, Flow, and Liquid requests can all use their supported System Parameters.

## Add or change a parameter

1. Open the saved request in the APIEase request editor.
2. Click the **+** icon in the Parameter column.
3. Select **System**.
4. Enter the exact **Name** and **Value** shown in the relevant guide below.
5. Click **Save** at the top of the request editor.

Edit an existing parameter to change its value. Remove an optional parameter to restore its default behavior. Names are case-sensitive; for settings enabled by `true`, enter the lowercase text `true` without quotes in the editor.

## Parameter reference

| Guide | Parameters | Applies to |
| --- | --- | --- |
| [HTTP Parameters](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/http-parameters) | `REQUEST_TIMEOUT_SECONDS`, `RESPONSE_BODY_MODE`, `VERIFY_SSL_CERT` | HTTP requests |
| [Flow Parameters](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/flow-parameters) | `IMMEDIATE_FLOW_RESPONSE`, `FLOW_RESPONSE_WAIT_TIME` | Flow requests |
| [Liquid Parameters](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/liquid-parameters) | `IMMEDIATE_LIQUID_RESPONSE` | Liquid requests |
| [Concurrency Limit Response](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/concurrency-limit-response) | `CONCURRENCY_LIMIT_EXCEEDED_RESPONSE` | All request types; applies only at an existing concurrency check |
| [Response Overrides](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/response-overrides) | `APIEASE_RESPONSE_CODE_OVERRIDE`, `APIEASE_RESPONSE_MESSAGE_OVERRIDE`, `OVERRIDE_APIEASE_RESPONSE_CODE`, `OVERRIDE_APIEASE_RESPONSE_MESSAGE` | Completed responses; result-driven overrides are specific to Flow and Liquid |
| [Runtime History](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/runtime-history) | `RECORD_RUNTIME_HISTORY` | Request execution and chains |
| [Customer-authenticated requests](https://docs.apiease.com/docs/requests/customer-authenticated-requests) | `validateCustomer`, `customerId` | Shopify storefront app-proxy calls |
| [System Requests](https://docs.apiease.com/docs/requests/request-types/system-requests) | `function`, `arguments` | System requests that manage shop variables |

A parameter only affects the request types and execution paths that support it. Adding an arbitrary System parameter does not create a new APIEase feature or change a service-wide limit.

## Saved settings and runtime values

Save these settings on the request for consistent behavior across calls. Some System parameters also accept dynamic values through supported request execution interfaces, but the usual dynamic-override rule has exceptions:

- `CONCURRENCY_LIMIT_EXCEEDED_RESPONSE` accepts only the saved literal `429`; runtime callers cannot override it.
- `REQUEST_TIMEOUT_SECONDS` uses the saved request setting; runtime callers cannot override it.
- `IMMEDIATE_FLOW_RESPONSE` and `RECORD_RUNTIME_HISTORY` are read from the saved request parameters. Configure them in the editor.

See [in-app parameters vs dynamic embedded parameters](https://docs.apiease.com/docs/requests/request-parameters/in-app-vs-dynamic) for the general distinction. Follow each parameter's guide for defaults, supported values, and limits.

SOURCE
https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/http-parameters

TITLE
HTTP Parameters

CONTENT
# HTTP Parameters

These [System Parameters](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/overview) apply to saved [HTTP requests](https://docs.apiease.com/docs/requests/request-types/http-requests). Add each setting with the **System** parameter type and save the request.

| Name | Example value | Default |
| --- | --- | --- |
| `REQUEST_TIMEOUT_SECONDS` | `30` | 15 seconds |
| `RESPONSE_BODY_MODE` | `TEXT` | Normal automatic response handling |
| `VERIFY_SSL_CERT` | `true` | Certificate verification enabled |

## Set the request timeout

Set `REQUEST_TIMEOUT_SECONDS` to a positive number of seconds, such as `30` for a 30-second outbound HTTP timeout. Omitted, invalid, zero, or negative values use the 15-second default.

Configure this parameter on the saved request. Dynamic embedded values cannot override it. This timeout applies to the outbound HTTP call; it does not extend the calling application's connection timeout or the [Flow response wait time](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/flow-parameters).

## Choose the response body format

Set `RESPONSE_BODY_MODE` to one of these values:

| Value | Behavior |
| --- | --- |
| `JSON` | Parse a JSON response into structured data. If text cannot be parsed as JSON, keep the original text. |
| `TEXT` | Return the response body as UTF-8 text, including when it contains JSON. |
| `BASE64` | Encode the response bytes as Base64, useful for binary content such as images or PDFs. |

With `BASE64`, the response contains `data.base64` and a top-level `mimeType`. The MIME type comes from the destination's Content-Type header, with `application/octet-stream` as the fallback.

Mode values are trimmed and normalized to uppercase. Omitting the parameter or entering an unsupported value restores normal automatic response handling. This setting changes how APIEase reads the response; it does not change the outbound request's Content-Type.

## Control HTTPS certificate verification

`VERIFY_SSL_CERT` defaults to `true`, which verifies the destination's HTTPS certificate. Keep this enabled for normal use.

Setting it to `false` disables certificate verification. This weakens HTTPS authentication and should only be used for a controlled endpoint whose certificate issue you understand. The current setting uses an exact text comparison: only `true` enables verification when the parameter is present. Use `true` or remove the parameter to restore verification.

To change the status or message APIEase returns after a completed HTTP response, see [Response Overrides](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/response-overrides).

SOURCE
https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/flow-parameters

TITLE
Flow Parameters

CONTENT
# Flow Parameters

Use System parameters on a saved [Flow request](https://docs.apiease.com/docs/requests/request-types/flow-requests) to control whether APIEase waits for the workflow's response and how long it waits.

Add these settings with the **System** parameter type. The **Flow** parameter type is for values you pass into the workflow.

For settings shared with other request types, see [Response Overrides](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/response-overrides) and [Runtime History](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/runtime-history).

## Add a setting

1. Open your saved Flow request in the APIEase request editor.
2. Click the **+** icon in the Parameter column.
3. Select **System**.
4. Enter the **Name** and **Value** from the table below, using the exact capitalization shown.
5. Click **Save** at the top of the request editor.

| Name | Example value | Effect |
| --- | --- | --- |
| `IMMEDIATE_FLOW_RESPONSE` | `true` | Return without waiting for the Flow result. |
| `FLOW_RESPONSE_WAIT_TIME` | `60` | Wait up to 60 seconds for the Flow result when immediate response is disabled. |

## Enable immediate response

Set `IMMEDIATE_FLOW_RESPONSE` to `true` to let the caller continue while the workflow runs in the background. The immediate response does not contain the final Flow result or confirm that the workflow has completed.

To restore waiting, set `IMMEDIATE_FLOW_RESPONSE` to `false` or remove the parameter. Waiting is the default.

If both parameters are present and immediate response is enabled, `FLOW_RESPONSE_WAIT_TIME` does not make the caller wait.

For how concurrent requests are handled, see [Concurrent calls and queued responses](https://docs.apiease.com/docs/requests/request-types/flow-requests).

## Adjust the response wait time

Set `FLOW_RESPONSE_WAIT_TIME` to the number of **seconds** APIEase should wait for the Flow response. For example, use `60` to allow up to one minute. Keep `IMMEDIATE_FLOW_RESPONSE` disabled when you want the caller to wait.

- **Default:** 25 seconds when the parameter is omitted.
- **Minimum:** 10 seconds. Lower values are raised to 10.
- **Maximum:** 86,400 seconds (24 hours). Higher values are capped at 86,400.

Use a whole number without a unit suffix. This setting controls APIEase's Flow response wait; it does not extend timeouts imposed by the calling application or the connection. Reaching the wait limit does not mean the Shopify workflow has completed or been canceled.

See [Return a result from the workflow](https://docs.apiease.com/docs/requests/request-types/flow-requests) for how APIEase receives the response it is waiting for.

SOURCE
https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/liquid-parameters

TITLE
Liquid Parameters

CONTENT
# Liquid Parameters

Use the `IMMEDIATE_LIQUID_RESPONSE` [System parameter](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/overview) on a [Liquid request](https://docs.apiease.com/docs/requests/request-types/liquid-requests) when the caller can continue without waiting for the rendered result.

## Enable immediate response

Add a parameter with these editor values, then save the request:

| Field | Value |
| --- | --- |
| Type | **System** |
| Name | `IMMEDIATE_LIQUID_RESPONSE` |
| Value | `true` |

APIEase starts rendering the Liquid template and returns status `200` with the acknowledgment `Liquid request received and processing.` as its response data. The acknowledgment does not contain the rendered result or confirm that rendering or any requests invoked by the template succeeded.

Errors that occur during background processing cannot be returned through that already-sent response. Use immediate response when the caller does not need the final result.

## Restore waiting

Set `IMMEDIATE_LIQUID_RESPONSE` to `false` or remove it to wait for the rendered result. Waiting is the default. Only the lowercase text `true` enables immediate response.

[Response Overrides](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/response-overrides) can customize a completed Liquid result, including values returned by the template. They do not change an immediate Liquid acknowledgment.

SOURCE
https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/concurrency-limit-response

TITLE
Concurrency Limit Response

CONTENT
# Concurrency limit response

Add the System parameter `CONCURRENCY_LIMIT_EXCEEDED_RESPONSE` with value `429`
to reject a new call immediately when its existing concurrency limit is exceeded.
Rejected work will not execute later.

## Configure a request

1. Open the request in the APIEase editor and add a parameter.
2. Choose **System** as the parameter type.
3. Enter **Name** `CONCURRENCY_LIMIT_EXCEEDED_RESPONSE` and **Value** `429`.
4. Save the request.

For programmatic request configuration, add this entry to `parameters`:

```json
{
  "type": "system",
  "name": "CONCURRENCY_LIMIT_EXCEEDED_RESPONSE",
  "value": "429",
  "sensitive": false
}
```

Use exactly `429`, without quotes in the editor. Empty values, other codes,
whitespace-padded values, and dynamic expressions such as `{responseCode}` are
invalid. Runtime embedded parameters cannot override this saved setting.
Remove the parameter to restore the request type's normal overflow behavior.

## Behavior by request type

| Type | When its existing concurrency limit is exceeded |
| --- | --- |
| HTTP | Reject before sending the outbound call. |
| Flow | Reject before triggering Shopify Flow, without adding the call to the queue. |
| Liquid and System | The parameter is accepted, but these types currently have no concurrency limit for it to change. |

This setting does not change any limit, threshold, or counting scope. HTTP keeps
its existing approximate overload protection; Flow keeps its existing shared
request limit. When capacity is available, execution proceeds normally.

## HTTP status and result status

With the setting enabled, a direct API caller still waiting for the result gets
actual **HTTP 429** and a result containing:

```json
{
  "status": 429,
  "error": "rate_limit_exceeded",
  "message": "The concurrency limit was exceeded. This request was rejected and will not execute later."
}
```

The result may also include execution metadata. No `Retry-After` header is sent.
Response-code or message overrides cannot turn this rejection into success.
`IMMEDIATE_FLOW_RESPONSE=true` cannot turn a rejected Flow submission into a
successful or queued acknowledgment.

Without the setting, HTTP keeps its existing direct API response of **HTTP 200**
with JSON `status: 429` on concurrency overflow. That JSON field alone is not the
HTTP transport status. Flow keeps its existing queueing behavior without the
setting. Request types that do not queue will not start queueing.

## Chains and background calls

Each chain member uses its own setting. For `A -> B -> C`, if B has the parameter
and exceeds its limit, B is rejected and C does not execute. A's parameter does
not enable the setting for B. Without the parameter, B keeps its existing
overflow and chain behavior.

A may already have performed its work. APIEase does not roll back or
automatically retry earlier members. **Retrying the entire chain can repeat
those earlier effects.** A waiting caller receives the rejection as HTTP 429.

An asynchronous acknowledgment already sent cannot be changed retroactively.
The later execution result and existing history mechanisms retain the rejection.
Background calls without a waiting HTTP client retain the equivalent rejected
result. The behavior is consistent across local and standalone execution.

Rejected submissions are not queued, triggered, dispatched, or recovered for
later execution. The setting applies to new submissions and does not cancel
previously accepted or queued work.

SOURCE
https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/response-overrides

TITLE
Response Overrides

CONTENT
# Response Overrides

Use these [System Parameters](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/overview) to customize the status code or message APIEase returns after a request completes. For example, a workflow can complete successfully but return a business result such as `409` with the message `Item unavailable`.

## Set a response code or message

Add either or both parameters to the saved request with type **System**:

| Name | Example value | Effect |
| --- | --- | --- |
| `APIEASE_RESPONSE_CODE_OVERRIDE` | `409` | Set the response status code. |
| `APIEASE_RESPONSE_MESSAGE_OVERRIDE` | `Item unavailable` | Set the response's `message` field. |

The code must be an integer from **200 through 599**, or its three-digit text representation. The message must be text; an empty string is allowed. Unresolved variable references are not accepted as override values.

Direct overrides do not require either of the flags below. Their values can also use normal request variable substitution, such as `{responseCode}` or `{responseMessage}` from a previous request's response. The resolved values must meet the same code and message rules.

These direct overrides apply to completed HTTP responses and successful System, Liquid, or Flow results. An HTTP destination's error status, such as `404`, can be overridden when APIEase received a normal HTTP response; a transport failure cannot.

Overrides change the APIEase response, not the destination API or the work already performed. The message is a response field, not an HTTP reason phrase. Response data remains unchanged by the override, although HTTP statuses **204**, **205**, and **304**, and HEAD responses, are sent without a body.

## Read overrides from a Flow or Liquid result

For a result-dependent status or message, add either or both flags to the saved request with type **System**:

| Name | Value | Field read from the result |
| --- | --- | --- |
| `OVERRIDE_APIEASE_RESPONSE_CODE` | `true` | `apieaseSystemData.apieaseResponseCodeOverride` |
| `OVERRIDE_APIEASE_RESPONSE_MESSAGE` | `true` | `apieaseSystemData.apieaseResponseMessageOverride` |

The flags default to disabled. Enter lowercase `true` as the parameter value to enable each one independently. These flags read completed **Flow or Liquid** output; HTTP and System results do not supply output-based overrides.

The returned `apieaseSystemData` object is separate from the [apieaseMetaData System Variable](https://docs.apiease.com/docs/general/apiease-details/system/system-variables/apiease-metadata). It must be at the top level of the current result, not nested inside another result property.

### Set overrides in a Liquid result

Make the rendered result a JSON object with `apieaseSystemData` at its top level:

```json
{
  "available": false,
  "apieaseSystemData": {
    "apieaseResponseCodeOverride": 409,
    "apieaseResponseMessageOverride": "Item unavailable"
  }
}
```

### Set overrides in a Shopify Flow result

Set `apieaseSystemData.apieaseResponseCodeOverride` in the JSON sent through **APIEase Flow Action → Flow Parameters**. A **Run code** step can add the override while preserving the original `executionId` that APIEase needs to resolve the waiting call.

Start with a workflow using the **APIEase Flow Trigger**, as described in [Minimal Flow integration](https://docs.apiease.com/docs/requests/shopify-flow-integration/minimal-flow-integration).

1. On the saved APIEase Flow request, add a **System** parameter named `OVERRIDE_APIEASE_RESPONSE_CODE` with value `true`, then save. Keep `IMMEDIATE_FLOW_RESPONSE` set to `false` or remove it so APIEase waits for the result.
2. In Shopify Flow, add a **Run code** step after the workflow steps that determine the result. Configure its **Input** to include the trigger's `flowParameters`:

   ```graphql
   {
     flowParameters
   }
   ```

3. Define the Run code **Output** schema:

   ```graphql
   type Output {
     message: String!
   }
   ```

4. Use this **Code** to return a `409` response:

   ```javascript
   export default function main(input) {
     const parameters = JSON.parse(input.flowParameters);

     parameters.apieaseSystemData = {
       ...parameters.apieaseSystemData,
       apieaseResponseCodeOverride: 409
     };

     return { message: JSON.stringify(parameters) };
   }
   ```

   Replace `409` with the code appropriate to your workflow result. Codes must be integers from **200 through 599**.

5. Add **APIEase Flow Action** after Run code. In its **Flow Parameters** field, use the variable picker to select that **Run code → message** output. This passes the serialized JSON back to APIEase. The Run code output named `message` carries the entire callback JSON; it does not itself override the APIEase response message.

The returned JSON has this shape, alongside any other preserved input or result fields:

```json
{
  "executionId": "<original execution ID from the APIEase trigger>",
  "apieaseSystemData": {
    "apieaseResponseCodeOverride": 409
  }
}
```

Preserve the trigger's actual `executionId`; do not replace it with the placeholder above. Keep `apieaseSystemData` at the top level, without an extra `data` wrapper.

To also override the response message, add `apieaseResponseMessageOverride: "Item unavailable"` to the same `apieaseSystemData` object and enable the **System** parameter `OVERRIDE_APIEASE_RESPONSE_MESSAGE` with value `true` on the saved request.

The override applies to the original caller's response when the callback arrives while APIEase is still waiting. The Flow action's callback acknowledgment is independent of that response code. A late callback cannot change an immediate, queued, or timed-out response already returned to the caller. See [Flow Parameters](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/flow-parameters) for response wait settings.

## Precedence and invalid values

APIEase resolves the code and message independently, using this order:

1. A valid value from the Flow or Liquid result, when its corresponding flag is `true`.
2. A valid direct System parameter value.
3. The normal response code or message.

Invalid override values are ignored and reported with an `INVALID_RESPONSE_OVERRIDE` warning. An invalid output override can therefore fall back to a valid direct setting. Removing the parameters restores normal response behavior.

## Responses that are not overridden

Overrides do not replace authentication or validation failures, concurrency rejections, transport errors, failed execution, or incomplete Flow results. In particular, queued Flow acknowledgments, immediate Flow responses, Flow wait timeouts, and immediate Liquid acknowledgments keep their normal responses.

To use a Flow or Liquid result to determine the response, keep immediate response disabled. See [Flow Parameters](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/flow-parameters) and [Liquid Parameters](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/liquid-parameters).

In a request chain, these settings apply to the current request's result. A later request can supply the final response returned by the chain; configure overrides on the request whose response you intend to return.

SOURCE
https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/runtime-history

TITLE
Runtime History

CONTENT
# Runtime History

`RECORD_RUNTIME_HISTORY` is a [System parameter](https://docs.apiease.com/docs/general/apiease-details/system/system-parameters/overview) that controls the detail retained in a request's runtime history entry. This is the execution history carried through a request chain, including when that chain passes history into a Shopify Flow workflow.

## Retain runtime values

On the saved request whose values you want to retain, add:

| Field | Value |
| --- | --- |
| Type | **System** |
| Name | `RECORD_RUNTIME_HISTORY` |
| Value | `true` |

With `true`, APIEase includes runtime parameter values and response data in that request's history entry. Saved parameters explicitly marked **Sensitive** remain redacted. Response bodies and other runtime values can still contain confidential data, so enable this only when the chain needs those details.

## Default behavior

The default is `false`. Remove the parameter or set it to `false` to redact response data and runtime parameter values from the history entry. APIEase still records the history entry; this setting controls its detail rather than turning history collection on or off.

Configure this on each saved request whose history should include runtime detail. A setting on one request does not enable it for every request in the chain, and dynamic embedded values do not override this saved setting.

This parameter does not control the ordinary response sent to the caller or the previous-response data passed to the next request. It is not required for normal [chained request](https://docs.apiease.com/docs/requests/request-parameters/chained-requests) parameter substitution, and it does not configure persistent log retention.

SOURCE
https://docs.apiease.com/docs/general/apiease-details/system/system-variables/overview

TITLE
System Variables overview

CONTENT
# System Variables overview

System Variables are built-in values provided by APIEase during request execution. Reference them wherever APIEase supports runtime variable substitution or Liquid rendering.

They are distinct from [persisted shop variables](https://docs.apiease.com/docs/variables/variables-overview), which you create and manage on the Variables page. They are also distinct from [System-type request parameters](https://docs.apiease.com/docs/requests/request-parameters/in-app-parameters/in-app-system-parameters), which control request behavior. You do not need to create or configure a System parameter to enable System Variables.

## Reference a System Variable

Names are case-sensitive. Use single braces, such as `{variableName}`, for APIEase runtime substitution. Use dot notation to access a child of an object.

For example, [apieaseMetaData](https://docs.apiease.com/docs/general/apiease-details/system/system-variables/apiease-metadata) provides supported information about the current execution:

- Whole object: `{apieaseMetaData}`
- API key friendly name: `{apieaseMetaData.apieaseApiKeyName}`

A bare `apieaseMetaData` value without braces is literal text. In native Liquid expressions, use Liquid syntax instead, such as `{{ apieaseMetaData.apieaseApiKeyName }}`.

Availability depends on where APIEase performs runtime substitution or Liquid rendering. Arbitrary widget JavaScript is not automatically rewritten to replace System Variable references.

## Unresolved references

If APIEase cannot resolve a single-brace reference, such as `{apieaseMetaDataFFFFF}`, it leaves the reference unchanged and execution continues.

APIEase reports an `UNRESOLVED_VARIABLE` warning in backend logs, the response's `warnings` array, and call history. The warning identifies the variable and the parameter's type and name, includes the request ID when available, and explains that execution continued. Parameter values are not included in the warning.

Referencing an absent object child can also produce this warning. For example, `{apieaseMetaData.apieaseApiKeyName}` is unresolved when the initiating request did not authenticate with a named APIEase API key. Check the spelling and case of the reference and whether the child is available for that execution.

These unchanged-reference and warning rules apply to APIEase single-brace substitution. They do not apply to native Liquid expressions such as `{{ apieaseMetaData.apieaseApiKeyName }}`, which are handled by Liquid rendering.

SOURCE
https://docs.apiease.com/docs/general/apiease-details/system/system-variables/apiease-metadata

TITLE
apieaseMetaData

CONTENT
# apieaseMetaData

`apieaseMetaData` is an automatically available [System Variable](https://docs.apiease.com/docs/general/apiease-details/system/system-variables/overview) object containing supported information about the current execution. You do not create it on the Variables page or enable it with a System parameter.

## Reference the object or a child

| Reference | Value |
| --- | --- |
| `{apieaseMetaData}` | The whole metadata object |
| `{apieaseMetaData.apieaseApiKeyName}` | The authenticating APIEase API key's friendly name, when available |

The spelling is case-sensitive. A bare `apieaseMetaData` value without braces is literal text.

When `{apieaseMetaData}` is the entire value, Flow, Liquid, System, and JSON body parameter values preserve the object. Text destinations, such as headers and query parameters, receive serialized JSON text for the object.

Metadata is available where APIEase performs runtime substitution or Liquid rendering. Arbitrary widget JavaScript is not automatically rewritten.

## apieaseMetaData.apieaseApiKeyName

`apieaseApiKeyName` contains the friendly name of the [APIEase API key](https://docs.apiease.com/docs/general/settings/apiease-api-key) used to authenticate the initiating request. It contains the name, never the secret key.

It is currently the only supported metadata child. For a fictional API key named `Example integration`, the object is:

```json
{"apieaseApiKeyName": "Example integration"}
```

If execution did not authenticate with a named APIEase API key, `apieaseMetaData` is `{}` and `apieaseApiKeyName` is absent. Referencing that absent child with single braces can produce an [unresolved-variable warning](https://docs.apiease.com/docs/general/apiease-details/system/system-variables/overview).

The initiating request's authentication information remains available through [chained requests](https://docs.apiease.com/docs/requests/request-parameters/chained-requests) and nested Liquid calls.

## Pass metadata to Shopify Flow

Create a [Flow request](https://docs.apiease.com/docs/requests/shopify-flow-integration/add-flow-request), then add a Flow-type parameter:

| Setting | Value |
| --- | --- |
| Type | `flow` |
| Name | `myMetadata` |
| Value | `{apieaseMetaData}` |

You choose the output parameter name: `myMetadata` is an example, not a required name. For this example, initiate the request with an APIEase API key named `Example integration`, either directly or through a request chain.

In Shopify Flow, use the **APIEase Flow Trigger** as described in the [minimal Flow integration](https://docs.apiease.com/docs/requests/shopify-flow-integration/minimal-flow-integration). Its `flowParameters` field is JSON text. After parsing it, the payload includes:

```json
{
  "requestFlowParameters": {
    "myMetadata": {
      "apieaseApiKeyName": "Example integration"
    }
  },
  "executionId": "example-execution-id"
}
```

APIEase generates the actual `executionId`. The metadata object is under `requestFlowParameters.myMetadata`; its friendly name is at `requestFlowParameters.myMetadata.apieaseApiKeyName` after parsing `flowParameters`.

For a **Run code** step, include the trigger field in the input query:

```graphql
query {
  flowParameters
}
```

Then read the child in the workflow's JavaScript:

```javascript
export default function main(input) {
  const parameters = JSON.parse(input.flowParameters);
  return {
    callingIntegration:
      parameters.requestFlowParameters.myMetadata.apieaseApiKeyName ?? ""
  };
}
```

Define the Run code output so later workflow steps can select `callingIntegration`:

```graphql
type Output {
  callingIntegration: String!
}
```

The output is `Example integration` for this example, or an empty string when the metadata child is absent. If your workflow returns a result to APIEase, follow the minimal integration's instructions to preserve `executionId` in the callback.

### Pass only the name

To send only the friendly name instead of the object, configure:

| Setting | Value |
| --- | --- |
| Type | `flow` |
| Name | `callingIntegration` |
| Value | `{apieaseMetaData.apieaseApiKeyName}` |

After parsing the trigger's `flowParameters`, `requestFlowParameters.callingIntegration` is `"Example integration"`. If the child is absent, the single-brace reference stays unchanged and can produce an unresolved-variable warning.

## Use native Liquid

In an APIEase Liquid template, access the friendly name directly:

```liquid
{{ apieaseMetaData.apieaseApiKeyName }}
```

For the fictional key above, this renders `Example integration`. Native Liquid expressions follow Liquid rendering behavior, not APIEase's single-brace unresolved-reference warning rules.

SOURCE
https://docs.apiease.com/docs/general/apiease-details/ip-address-whitelisting

TITLE
APIEase IP address for whitelisting

CONTENT
# APIEase IP address for whitelisting

APIEase makes API calls from a fixed IP address. This is useful if the external system you are calling requires IP whitelisting for security purposes.

The IP address used by APIEase for all outgoing requests is **34.117.76.19**.

This address is static and does not change.

Use Case ExampleSome systems, like ERP or warehouse management platforms, require incoming API calls to originate from a known IP address. Shopify does not provide a fixed IP address range for native webhook or Flow executions, but APIEase gives you a reliable, fixed IP for secure integration.

By using APIEase to make your API calls, you can meet the IP whitelisting requirements of your external systems while still reacting to events in Shopify such as new orders, inventory changes, or customer updates.

SOURCE
https://docs.apiease.com/docs/general/apiease-details/importing-third-party-products

TITLE
Import products from a third-party system

CONTENT
# Import products from a third-party system

Use APIEase to compose the provider read, data mapping, and Shopify write operations required by a third-party product import. This pattern applies to a supplier catalog, warehouse API, stock feed, or internal product system, but the exact endpoints and field mappings come from the provider and Shopify API contracts.

Start with [Synchronize data with an external system](https://docs.apiease.com/docs/requests/synchronize-external-data). It covers direction, source of truth, record identity, change detection, pagination, and safe write planning.

## Required information

- The provider endpoint that lists products or inventory changes
- The provider's authentication, pagination, and rate-limit requirements
- The fields and identifiers returned for products, variants, SKUs, inventory items, and locations
- The Shopify Admin API operations and permissions required for each write
- The rule for matching an external record to an existing Shopify record
- The intended create, update, missing-record, and deletion behavior

If the provider does not document an endpoint, credential, identifier, or payload, obtain that information before configuring the import. APIEase cannot infer or issue it.

## Build the import from focused requests

1. Create an [HTTP request](https://docs.apiease.com/docs/requests/request-types/http-requests) that reads a bounded page of provider data.
2. Create a separate HTTP request for the specific Shopify product or inventory operation.
3. Use a [Liquid request](https://docs.apiease.com/docs/requests/request-types/liquid-requests) when the workflow must loop through records, transform fields, or call several saved requests.
4. Run the read and one write with test data before processing a larger page.
5. Add a [cron schedule](https://docs.apiease.com/docs/requests/triggers/cron-schedule) only after pagination and repeated records behave as intended.

For a simple response-to-next-request sequence, a [chained request](https://docs.apiease.com/docs/requests/request-parameters/chained-requests) may be enough. Shopify Flow can also participate when the store's workflow should own part of the automation; see [Shopify Flow integration](https://docs.apiease.com/docs/requests/shopify-flow-integration/architecture).

## Keep product and inventory identity separate

A product, variant, SKU, inventory item, and location are different concepts. Do not assume one identifier works for every Shopify operation. Define the mapping explicitly and use the identifier required by the current Shopify Admin API operation.

For Shopify authentication and permissions, see [Shopify API calls and access tokens](https://docs.apiease.com/docs/general/shopify-api/shopify-api-calls-and-access-tokens).

SOURCE
https://docs.apiease.com/docs/general/apiease-details/automatic-shopify-customer-id-injection

TITLE
Automatic Shopify Customer ID Injection

CONTENT
# Automatic Shopify Customer ID Injection

APIEase can replace `{SHOPIFY_LOGGED_IN_CUSTOMER_ID}` at runtime with the logged-in Shopify customer ID from the current storefront request.

You can use this placeholder in any value context where variable replacement is supported, including:

- Header parameter values
- Query parameter values
- Body parameter values
- Address values via path parameters
- System parameter values
- Liquid parameter values used for `{parameterName}` substitution
- Liquid request values that reference saved Liquid parameters
- Flow parameter values

## Examples

### Header value

Set a header parameter like:

- Name: `X-Customer-Id`
- Value: `{SHOPIFY_LOGGED_IN_CUSTOMER_ID}`

At runtime, APIEase resolves it to the logged-in customer ID (for example `1234567890`).

### Query value

Set a query parameter like:

- Name: `customerId`
- Value: `{SHOPIFY_LOGGED_IN_CUSTOMER_ID}`

Resulting call example:

```text
https://api.example.com/orders?customerId=1234567890
```

### Body value

Use the placeholder inside JSON body values:

```json
{
  "customerId": "{SHOPIFY_LOGGED_IN_CUSTOMER_ID}",
  "action": "sync"
}
```

At runtime, `customerId` is replaced with the logged-in Shopify customer ID.

### Address value (via path parameter)

If your URL uses a path parameter, set that parameter value to the placeholder:

- URL template: `https://api.example.com/customers/{customerId}/orders`
- Path parameter `customerId` value: `{SHOPIFY_LOGGED_IN_CUSTOMER_ID}`

Resolved runtime URL example:

```text
https://api.example.com/customers/1234567890/orders
```

### System parameter value

You can also use the placeholder as a system parameter value. Example:

- Name: `customerId`
- Value: `{SHOPIFY_LOGGED_IN_CUSTOMER_ID}`

This is useful when downstream request logic expects customer ID as a system value.

### Liquid request values

Use a saved Liquid parameter when you want the customer-id placeholder resolved before the template renders, then reference that saved value in the template with `{customerId}`.

Set a Liquid parameter:

- Name: `customerId`
- Value: `{SHOPIFY_LOGGED_IN_CUSTOMER_ID}`

Then use it in the Liquid request:

```liquid
{% call {
  "requestId": "customer-orders",
  "queryParamsEmbedded": {
    "customerId": "{customerId}"
  }
} as response %}
{{ response.status }}
```

This example only applies when you choose to use a saved Liquid parameter. Do not trust a storefront-supplied customer id for authentication; use the validation options below when customer identity matters.

### Flow parameter value

In Flow request parameters, set a value such as:

- Name: `customerId`
- Value: `{SHOPIFY_LOGGED_IN_CUSTOMER_ID}`

At runtime, APIEase resolves this to the logged-in customer ID before executing the request.

## Prerequisite

This only works when the request runs in Shopify app proxy/storefront context where Shopify provides `logged_in_customer_id`.

## Recommended validation

Set system parameter `validateCustomer=true` so requests fail fast when no customer is logged in.

## Behavior when no logged-in customer is available

If no logged-in Shopify customer ID is available, `{SHOPIFY_LOGGED_IN_CUSTOMER_ID}` is not resolved.

With `validateCustomer=true`, APIEase blocks the request during validation. Without it, the unresolved placeholder may continue downstream as a literal value.

SOURCE
https://docs.apiease.com/docs/general/apiease-details/authentication-example

TITLE
Authentication example

CONTENT
# Authentication example

Many external APIs require authentication before you can access their data or services. Some use a static credential. Others require a login or token request followed by a second request that sends the short-lived access token.

Use the provider's current API documentation to determine the token URL, request fields, response fields, scopes, and required authorization format. APIEase cannot supply or generate provider credentials.

## Step 1: Create the authentication request

Start by setting up your first request to authenticate with the external service. This is typically a POST request with your client credentials in the body.

Example:

- Method: `POST`
- URL: [https://example.com/api/authenticate](https://example.com/api/authenticate)
- Body:

```json
{
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET"
}
```

This request will return an access token in the response. For example:

```json
{
  "auth_token": "YOUR_ACCESS_TOKEN"
}
```

Mark saved client credentials as **Sensitive**. APIEase masks sensitive request parameters after saving and decrypts them only when it executes the request.

## Step 2: Create the follow-up request

Next, create a second request to access the secured endpoint. Give it the handle `secure-request`.

This request will use the `auth_token` returned from the authentication request.

For example, you might need to include the token in a header:

- Type: Header  
- Name: `Authorization`
- Value: `Bearer {auth_token}`

Or include it in the body:

- Type: Body  
- Value:

```json
{
  "session_token": "{auth_token}"
}
```

## Step 3: Chain the requests

Go back to your authentication request and set **Next Request** to the handle of your follow-up request (`secure-request`).

When the authentication request completes successfully, APIEase will automatically execute the next request and insert the token where specified.

![Chained requests example](https://cdn.shopify.com/s/files/1/0733/1820/3680/files/chained-requests-example.png?v=1744331402)

## Keep the response private

Saved sensitive parameters stay in APIEase during request execution, and chained response values can pass directly to the next request. However, APIEase does not remove tokens or private fields from an external API's response. Do not expose this authentication request or a final chained response to a storefront or other public caller if the response can contain credentials or private data.

If the provider uses a static API key or Bearer token instead, you usually need only one request. Save the credential as a sensitive [in-app header parameter](https://docs.apiease.com/docs/requests/request-parameters/in-app-parameters/in-app-header-parameters) using the exact header name and format required by the provider.

SOURCE
https://docs.apiease.com/docs/general/shopify-api/shopify-api-calls-and-access-tokens

TITLE
Shopify API calls and access tokens

CONTENT
# Shopify API calls and access tokens

APIEase can call the Shopify Admin API on your behalf. It uses the [shop access token](https://docs.apiease.com/docs/general/shopify-api/shop-access-token) that was issued during Shopify OAuth and stored for the shop. If for some reason you need to use a [custom access token](https://docs.apiease.com/docs/general/shopify-api/custom-access-token) you can override the system injected shop access token.

[Manage shop access token permissions](https://docs.apiease.com/docs/general/shopify-api/manage-shop-access-token-permissions) controls which scopes are granted to the shop access token. When you request new scopes, Shopify reauthorizes the app and issues an updated shop access token with the new permissions.

## Key concepts
- [Automatic token usage](https://docs.apiease.com/docs/general/shopify-api/automatic-vs-overridden-shopify-access-tokens): APIEase injects the shop access token when a request targets the Shopify Admin API and no override token is provided.
- [Override token usage](https://docs.apiease.com/docs/general/shopify-api/automatic-vs-overridden-shopify-access-tokens): A request includes an explicit `X-Shopify-Access-Token` header and APIEase uses that token instead of the shop access token.
- [Shop access token](https://docs.apiease.com/docs/general/shopify-api/shop-access-token): The Shopify OAuth token stored for the shop and used for Shopify Admin API calls.
- [Custom access token](https://docs.apiease.com/docs/general/shopify-api/custom-access-token): A standalone token you generate and provide explicitly when a request must use a different Shopify Admin API token.
- [Scope and permissions](https://docs.apiease.com/docs/general/shopify-api/manage-shop-access-token-permissions): The specific Shopify Admin API permissions granted to the shop access token, and the reauthorization flow that updates it after scope changes.

## Caution on write permissions
Write permissions allow APIEase to create, update, or delete store data when triggered by configured requests, flows, schedules, webhooks, or proxy endpoints. This capability is powerful and potentially destructive if used incorrectly, and some write operations cannot be reversed.

APIEase does not validate the business correctness of your requests. It executes requests exactly as configured using the permissions you approve.

We strongly recommend backing up relevant store data or testing write-enabled requests in a non-production environment before enabling write permissions. You are responsible for request correctness, safe testing, and any data changes or deletions caused by those requests.

## When to use what
- Use automatic token usage for most Shopify Admin API calls inside APIEase.
- Use an override token when a call must run with a different token for a different shop or with permissions that need to differ from the Shop access token.
- Update scopes on [Manage shop access token permissions](https://docs.apiease.com/docs/general/shopify-api/manage-shop-access-token-permissions) when a request needs new Shopify Admin API access.

SOURCE
https://docs.apiease.com/docs/general/shopify-api/automatic-vs-overridden-shopify-access-tokens

TITLE
Automatic vs overridden Shopify access tokens

CONTENT
# Automatic vs overridden Shopify access tokens

APIEase determines how to authenticate Shopify Admin API requests based on the request address and headers. It does not validate business correctness. It executes requests exactly as configured.

## Automatic shop access token usage
APIEase injects the [shop access token](https://docs.apiease.com/docs/general/shopify-api/shop-access-token) when a request targets the Shopify Admin API and no override token is provided. This is useful because you do not need to generate a token manually, you do not need to configure a token header in each request, and you can update its permissions quickly on [Manage shop access token permissions](https://docs.apiease.com/docs/general/shopify-api/manage-shop-access-token-permissions). For the fastest setup, select the [Shopify Admin GraphQL address preset](https://docs.apiease.com/docs/general/shopify-api/shopify-admin-graphql-address-preset) in the request address dropdown to ensure the request qualifies for automatic token usage.

## Overridden custom access token usage
APIEase overrides your shop access token when you provide a [custom access token](https://docs.apiease.com/docs/general/shopify-api/custom-access-token) in an explicitly set `X-Shopify-Access-Token` header. This is useful when a call must run under a different Shopify token, such as testing a separate app, using a token from another shop, or matching permissions that differ from the stored shop access token.

## Decision rules
1. If the request targets a Shopify Admin API endpoint and no explicit override token is provided, APIEase injects the shop access token automatically.
2. If the request includes an `X-Shopify-Access-Token` header, APIEase treats it as an explicit override and uses that token instead of the shop access token.
3. If the request does not target a Shopify Admin API endpoint, APIEase does not inject the shop access token. The request behaves like any other outbound HTTP call.

## What counts as a Shopify Admin API endpoint
APIEase treats an address as a Shopify Admin API endpoint when:
- The address path starts with `/admin/api`.
- The address host matches the shop domain for the current shop.

Common Admin API patterns include:
- `https://yourstore.myshopify.com/admin/api/2024-07/graphql.json`
- `https://yourstore.myshopify.com/admin/api/2024-07/products/count.json`

## Examples

### GraphQL request with automatic token usage
This request targets the Shopify Admin API and does not include an override token. APIEase adds the shop access token automatically.

- Address: `https://yourstore.myshopify.com/admin/api/2024-07/graphql.json`
- Method: `POST`
- Headers:
  - `Content-Type`: `application/json`
- Body:

```json
{
  "query": "query { shop { name } }"
}
```

### GraphQL request with an override token
This request includes an `X-Shopify-Access-Token` header. APIEase uses the override token instead of the shop access token.

- Address: `https://yourstore.myshopify.com/admin/api/2024-07/graphql.json`
- Method: `POST`
- Headers:
  - `X-Shopify-Access-Token`: `YOUR_ACCESS_TOKEN`
  - `Content-Type`: `application/json`
- Body:

```json
{
  "query": "query { shop { name } }"
}
```

### REST request example
The Shopify REST Admin API is deprecated. Only use REST if you understand the impact and you have a specific need.

- Address: `https://yourstore.myshopify.com/admin/api/2024-07/products/count.json`
- Method: `GET`
- Headers:
  - `X-Shopify-Access-Token`: `YOUR_ACCESS_TOKEN`

## What the UI communicates
When a request targets the Shopify Admin API, the request editor uses labels to show which token is used:
- Automatically using shop access token.
- Overriding shop access token.

## Troubleshooting
- 401 Unauthorized usually means the token is missing or invalid.
- 403 Forbidden usually means the token is valid but missing the required scope.
- Missing scope symptoms include access denied errors or empty data where the Admin API expects permissions.
- Token override mistakes include using the wrong shop domain, using an expired token, or entering the header name or value incorrectly.
- Confirm granted scopes on [Manage shop access token permissions](https://docs.apiease.com/docs/general/shopify-api/manage-shop-access-token-permissions) and reauthorize if you need more access.
- The Permissions page changes APIEase's installed shop access token. Manage an override token's scopes and rotation through the Shopify app that issued it.

SOURCE
https://docs.apiease.com/docs/general/shopify-api/shopify-admin-graphql-address-preset

TITLE
Shopify Admin GraphQL address preset

CONTENT
# Shopify Admin GraphQL address preset

You can take advantage of [automatic shop access token usage](https://docs.apiease.com/docs/general/shopify-api/automatic-vs-overridden-shopify-access-tokens) by selecting the prepopulated Shopify Admin GraphQL option in the request address dropdown for HTTP requests.

## Why this helps
The preset fills in a Shopify Admin API address that matches your shop domain and api path like this: `https://yourstore.myshopify.com/admin/api/2025-10/graphql.json`. That address pattern triggers APIEase to inject the shop access token automatically, so you do not need to add an `X-Shopify-Access-Token` header manually.

## How to use it
1. Open your HTTP request in the request editor.
2. Open the request address dropdown.
3. Select **Shopify Admin GraphQL**.
4. Save the request.

SOURCE
https://docs.apiease.com/docs/general/shopify-api/shop-access-token

TITLE
Shop access token

CONTENT
# Shop access token

The shop access token is the Shopify OAuth token issued when a shop installs APIEase. APIEase stores it per shop and uses it to call the Shopify Admin API on that shop's behalf.
If the shop access token does not have the permissions your request needs, you can adjust its permissions as described in [Manage shop access token permissions](https://docs.apiease.com/docs/general/shopify-api/manage-shop-access-token-permissions).

You do not need to retrieve or reveal this installed token to use it. APIEase injects it into eligible requests during execution. APIEase does not provide the stored Shopify OAuth token for copying; if you require an explicit token, obtain a [custom access token](https://docs.apiease.com/docs/general/shopify-api/custom-access-token) from Shopify.

## How APIEase uses it
- APIEase app usage: internal Shopify Admin API calls that APIEase makes for the shop use the shop access token.
- Automatic request usage: when a request targets a Shopify Admin API endpoint and you do not provide an override token, APIEase injects the shop access token automatically.

SOURCE
https://docs.apiease.com/docs/general/shopify-api/custom-access-token

TITLE
Custom access token

CONTENT
# Custom access token

If you decide that you need a custom access token rather than using the [shop access token](https://docs.apiease.com/docs/general/shopify-api/shop-access-token) that can be [used automatically](https://docs.apiease.com/docs/general/shopify-api/automatic-vs-overridden-shopify-access-tokens) follow these instructions to get a custom Shopify access token.

APIEase cannot generate, retrieve, or reveal a custom Shopify access token. Shopify issues the token, and you are responsible for copying it when Shopify displays it, storing it securely, granting its scopes, and rotating or revoking it.

For how APIEase uses custom tokens in requests, see [Overridden custom access token usage](https://docs.apiease.com/docs/general/shopify-api/automatic-vs-overridden-shopify-access-tokens).

1. In your store admin, go to **Settings**.
2. Go to **Apps and sales channels**.
3. Click **Develop apps**.
4. Click **Create an app** and give it a name.
5. Configure permissions: click **Configure Admin API scopes** or **Configure Storefront API scopes** and choose the permissions required. (You must set scopes before you can install and get a token.)
6. Click **Install app** (top right).
7. Click **Reveal token once**. Copy and save your access token—this is the only time it will be shown.

Add the token to the APIEase request as a sensitive `X-Shopify-Access-Token` header with a value such as `YOUR_ACCESS_TOKEN`. Adding this header overrides APIEase's automatically injected shop access token.

SOURCE
https://docs.apiease.com/docs/general/shopify-api/manage-shop-access-token-permissions

TITLE
Manage shop access token permissions

CONTENT
# Manage shop access token permissions

The Permissions page manages Shopify Admin API permissions for the [shop access token](https://docs.apiease.com/docs/general/shopify-api/shop-access-token) that APIEase stores for each shop. Use it to review current permissions, request new scopes, and reauthorize the shop token when access needs change.

These settings do not change a [custom access token](https://docs.apiease.com/docs/general/shopify-api/custom-access-token) supplied in an `X-Shopify-Access-Token` header. Manage that token's scopes through the Shopify app that issued it.

## What the Permissions page is for
- Manage OAuth scopes for the stored shop access token.
- Enable future Shopify Admin API calls that require new scopes.
- Keep a clear view of which permissions are granted to APIEase.

## Workflow
1. Open **Settings**, then **Permissions**.
2. Review the current granted scopes.
3. Select the additional scopes you need.
4. Save changes.
5. Complete the Shopify approval flow.
6. Return to the Permissions page and verify the scopes are granted.

## Notes and edge cases
- If you remove scopes, APIEase requests a scope revocation. Shopify may keep a scope if it is required by the app or by Shopify. The Permissions page will show that the scope remains granted.
- If Shopify keeps a scope that you attempted to remove, you may need to reinstall or reauthorize to fully reset the token.
- Existing requests that depend on removed scopes can fail with 403 responses until scopes are restored.
- Changing scopes does not alter request logic. APIEase executes requests exactly as configured.

## Safety note
Write scopes can create, update, or delete store data. Test requests in a non production environment before using them in live flows.

SOURCE
https://docs.apiease.com/docs/general/shopify-api/shopify-graphql-product-count

TITLE
Shopify GraphQL API - Product count

CONTENT
# Shopify GraphQL API - Product count

Demonstration of calling the Shopify GraphQL API to get a count of products in your Shopify product inventory:

Demo store password: eacoht

[https://apiease-demo.myshopify.com/pages/shopify-graphql-api-products](https://apiease-demo.myshopify.com/pages/shopify-rest-api-products)

This example includes an explicit `X-Shopify-Access-Token` header. For automatic shop access token usage and overrides, see [Automatic vs overridden Shopify access tokens](https://docs.apiease.com/docs/general/shopify-api/automatic-vs-overridden-shopify-access-tokens).

Example of APIEase Request for Shopify Product Count

- **Address**: [https://apiease-demo.myshopify.com/admin/api/2024-07/graphql.json](https://apiease-demo.myshopify.com/admin/api/2024-01/products/count.json)
- **Method**: `POST`
- **Header parameters:**
  - **Name**: `X-Shopify-Access-Token`  
    **Value**: `your-shopify-access-token` (see [Custom access token](https://docs.apiease.com/docs/general/shopify-api/custom-access-token))
  - **Name**: `Content-Type`  
    **Value**: `application/json`
- **Body parameters:**
  - **Value**:

```json
{ "query": "query { productsCount { count } }" }
```

SOURCE
https://docs.apiease.com/docs/general/shopify-api/shopify-rest-product-count

TITLE
Shopify REST API - Product count

CONTENT
# Shopify REST API - Product count

Demonstration of calling the Shopify REST API to get a count of products in your Shopify product inventory:

Demo store password: eacoht

[https://apiease-demo.myshopify.com/pages/shopify-rest-api-products](https://apiease-demo.myshopify.com/pages/shopify-rest-api-products)

This example includes an explicit `X-Shopify-Access-Token` header. For automatic shop access token usage and overrides, see [Automatic vs overridden Shopify access tokens](https://docs.apiease.com/docs/general/shopify-api/automatic-vs-overridden-shopify-access-tokens).

Example of APIEase Request for Shopify Product Count

- **Address**: [https://apiease-demo.myshopify.com/admin/api/2024-01/products/count.json](https://apiease-demo.myshopify.com/admin/api/2024-01/products/count.json)
- **Method**: `GET`
- **Header**:
  - **Name**: `X-Shopify-Access-Token`
  - **Value**: your access token (see [Custom access token](https://docs.apiease.com/docs/general/shopify-api/custom-access-token))
