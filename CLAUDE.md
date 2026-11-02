# Working with the user

Never run `npm` commands yourself (`npm run ...`, `npm install`, `npx prisma ...`, etc.) — give the exact command as text and wait for the user to run it and paste back the result before continuing or drawing conclusions from it. Other shell commands (git, file inspection, etc.) are fine to run directly. Exception: `npx tsc --noEmit` and `npm run lint` are run directly, without asking.

# Memory lifecycle

`.aimemory/` is the versioned knowledge base of this repo: never store a secret in it. Formats: `.claude/skills/build-memory/SKILL.md`.

Always loaded:

@.aimemory/INDEX.md
@.aimemory/prefs.md

**Start** of non-trivial work (planning, and again when executing an accepted plan):

1. Load the other hot shards: `arch.md`, `hyp.md`, `done.md`.
2. Scan `ltm/CATALOG.md` for the task's tags and paths, then fetch the matching `ltm/n/<id>.md` and the relevant `ltm/edges.md` lines only. Never bulk-load `ltm/n/`.
3. Code wins over memory. On conflict, trust the code and correct the memory at the end.

**End**, before declaring a plan or feature done:

- `arch`: confirmed structure learned on the way.
- `hyp`: confirm or falsify working models.
- `done`: one `#L` line per meaningful change.
- `prefs`: if the user stated or corrected a build preference, update `.aimemory/prefs.md`, and propose the matching `CLAUDE.md` line, editing it only after the user's OK.
- `ltm`: promote only cold durable facts, never open hypotheses or prefs.

Skip both steps for a trivial one-file edit with no architectural learning.

# Commands

- `npm run start:dev` — dev server, hot reload.
- `npm run lint` — eslint --fix.
- `npm run deps:validate` — checks the architecture boundaries below via `.dependency-cruiser.js`. Run it after adding or moving a file across domain/application/infrastructure/api — a wrong import direction fails this even when `tsc` is happy.
- Schema + migrations live in `prisma/` (`prisma/schema.prisma`, `prisma/migrations/`). `npm run migration:dev --name X` creates and applies a dev migration; `npm run migration:deploy` applies pending migrations (production); `npm run migration:reset` drops, recreates and remigrates; `npm run migration:status` checks status; `npm run db:seed` fills the reference data, a reset no longer does it; `npm run prisma:generate` regenerates the client; `npm run prisma:studio` opens the Prisma data browser.
- After `migration:dev`, run `npm run prisma:generate`: since Prisma 7, `migrate dev` no longer regenerates the client. `tsc` won't catch a stale client: `PrismaRepositoryBase.client` is typed `any`.
- DB env vars: `.env.example` (DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME).

# Architecture: DDD Hexagonal + CQRS

Write flow: route (`src/configs/app.routes.ts`) → `*.http.controller.ts` (builds a `*.command.ts`, calls `commandBus.execute()`) → `*.service.ts` (`@CommandHandler`) → `domain/*.entity.ts` (business rules, raises events via `this.addEvent(...)`) → `database/*.repository.ts` (`extends PrismaRepositoryBase`, write wrapped in `repo.transaction(...)`) → event published → `application/event-handlers/*.domain-event-handler.ts` (`@OnEvent`, may live in a different module).

Read flow bypasses domain and repository entirely: `*.query-handler.ts` injects `PrismaService` (`@libs/db/prisma.service.ts`) directly and queries via the generated client, mapping the result to a plain read model itself — see `find-users.query-handler.ts` or `get-boarding-code.query-handler.ts`. This is deliberate CQRS — don't "fix" it by adding an entity or repository call to a query, even when a repository method like `findOneById` already covers the same lookup: reusing it couples the query to whatever the write side later needs and returns a full entity instead of a lean read shape. Write the query's own Prisma query instead — a trivial `findMany`/`findUnique` isn't the kind of duplication DRY is about. `get-registration-document-url.query-handler.ts` still injects repository ports: don't copy that pattern.

`npm run deps:validate` already enforces, and will fail the build on: `domain/` importing api/application/infrastructure paths, infrastructure importing api paths, commands/queries importing api paths. Don't re-litigate those — but it does **not** catch the rules below, so nothing stops you from writing code that violates them silently:

- IMPORTANT: every write that can raise a domain event must go through `repo.insert`/`repo.delete`, or a repository's own custom `save()`-style method built on `this.client.<model>.update(...)` or `.upsert(...)` (see `ride.repository.ts`'s `save()` — `PrismaRepositoryBase` has no generic `update`, since Prisma's update shape differs per aggregate) — wrapped in `repo.transaction(...)`, including single-entity writes like a delete (`delete-user.service.ts` in this codebase skips this and is a known bug, don't copy that pattern). Never call `PrismaService`/the Prisma client directly from a service. Inside a repository, always read through the `this.client` getter (`@libs/db/prisma-repository.base.ts`), never inject `PrismaService` and call it directly — `this.client` returns the ambient transaction connection when one is open. The transaction connection is propagated implicitly per request via `RequestContextService` (not passed as a parameter) — `await` every call inside the `transaction()` callback all the way down, or the write silently falls back to a non-transactional connection with no error. `deps:validate` will not catch any of this (nothing forbids application → infrastructure imports).
- A new entry point for an existing use case (a different HTTP endpoint, CLI, GraphQL, message pattern...) builds and dispatches the *same* `*.command.ts` — see `create-user.http.controller.ts`, `create-user.cli.controller.ts` and `create-user.message.controller.ts`, which all dispatch the identical `CreateUserCommand`. Never re-implement the use case's logic inside the new adapter.
- Repositories are injected via their port/interface + DI token (`@Inject(X_REPOSITORY)` from `<module>.di-tokens.ts`), never the concrete class.
- Domain events are added inside the entity (`this.addEvent(...)`) and published only by `AggregateRoot.publishEvents()`, called from the repository after a successful write. Never call `eventEmitter.emit()` / `.emitAsync()` manually from a service.
- Business logic and state transitions belong in the entity/value objects (`validate()`, methods like `user.makeAdmin()`), not in the `*.service.ts` handler. A handler should read as: build or load the entity → call one or more entity methods → save via repo. An `if` deciding a business outcome inside a handler is a sign that logic should move into the entity.
- Keep methods under ~30 lines; split out a private method when one grows past that.
- Inside an entity, an expected/recoverable business failure returns `Result<T, E>` from the method itself (e.g. `WalletEntity.withdraw()` returns `Err(new WalletNotEnoughBalanceError())` on insufficient balance) — the caller decides what to do with it. Reserve throwing from `validate()` for invariants that should never happen (state corruption), not for normal business outcomes.
- Cross-module communication defaults to Domain Events (`addEvent()` in the emitting module + `@OnEvent` in `application/event-handlers/` of the listening module) — the emitting module never knows who, if anyone, is listening. Two direct-coupling mechanisms are also allowed, judged case by case (not restricted to specific pre-approved situations): (1) dispatching another module's own Command via `commandBus.execute(...)` instead of waiting on an event; (2) a Request DTO extending another module's Request DTO. Events: see `create-wallet-when-user-is-created.domain-event-handler.ts`. Direct command: `validate-registration-document.admin.http.controller.ts` dispatches `registration`'s command from `admin`. Still never import another module's Entity, Repository, or Command/Query Handler class directly — only Command/Query classes and Request DTOs are fair game for direct cross-module reuse.
- Response DTOs whitelist fields explicitly, the way `<module>.mapper.ts`'s `toResponse()` does. Never return `entity.getProps()` or the entity itself.
- New business errors extend `ExceptionBase` and live in `domain/<module>.errors.ts`, with `code` namespaced as `MODULE.REASON` (e.g. `USER.ALREADY_EXISTS`) — distinct from the generic `GENERIC.*` exceptions in `libs/exceptions/`. A command handler catches the generic technical exception (e.g. `ConflictException` from the repository) and translates it into the specific business error before returning `Err(...)`.

# Tests

No tests in this repo: no TDD, no unit or e2e tests. `tests/` and the test scripts of `package.json` are leftovers: don't add to them or use them as a model.
