#P id|rule
specHowItWorks|HARD: each spec has a "Comment ça marche" section: the concrete technical flow end to end, simple and global, with short arrow diagrams between the actors (app, API, Postgres, Firebase...), readable without the code. See docs/specs/notifications-push.md
specFirst|HARD: a feature starts with a spec in French in docs/specs/<nom>.md: Statut, Spec (Besoin, Comment ça marche, Décisions prises, règles, API, Nouveaux éléments, Tables touchées, Hors périmètre), À valider, Plan (steps with checkboxes, ending with Fin de feature). Spec work writes documents only. Code needs the user's explicit go; answering open points is not that go
specSync|HARD: every decision, answer or correction of the user about a feature goes into its spec in the same turn, unasked: a decision row marked "validé par le user, <date>", the open point closed, the plan steps adjusted. User, 2026-11-03
memoryStrict|HARD: always follow .aimemory strictly; it wins over any other memory of how to work. User, 2026-11-02
stepPause|HARD: on a spec plan, implement one step, then stop for the user's OK
moneyCents|HARD: every amount is an integer in cents, named with the suffix Cents, never a Float, in the code, the database and the API
noBackendTests|HARD: no tests at all here, no TDD, unit or e2e. Business rules still go in domain entities, without spec files. User decision 2026-10-06
officialDocs|HARD: anything touching a third-party library, API or platform is based on its official documentation, read first and cited, for the version installed. Never from memory. If the doc has no answer, say so and ask before using another source
noNullableNoDuplicate|Avoid nullable columns and duplicated columns: propose a sub-table or a reference instead
prismaOnlySchema|Avoid database rules that schema.prisma cannot express (CHECK constraints, triggers, hand-written SQL in migration.sql): enforce them in the domain entity instead. User, 2026-11-04
stopAndRevisePlan|HARD: implement only what the accepted plan says. A case, edge or better shape it did not cover: stop, do not improvise, revise the plan with the user before writing more code
reuseFirst|HARD: before adding a method, query or class, search for the existing one and reuse or extend it. Ask before adding a new class when existing code no longer covers the case
noNPlusOne|HARD: load many rows with one query, never one query per id in a loop or a Promise.all
splitUseCases|Prefer two simple use cases over one with create-or-update or exists-or-not branches
noTinyHelperFiles|No one-off helper module for a trivial wrapper: inline it, or a private method on the class that owns it
noTrivialPrivate|No private method that only wraps a map, a filter or a Set: inline it
helpersOnModel|Domain helpers live on the entity or model, not in free functions or utils files
serviceHelpers|Helpers of a command service are private methods; never export one for another service: share it through the entity or the module's application services
booleanRule|A complex boolean rule goes in a named private method, with early returns or named values, never a nested ternary
namedTypes|Never infer a type with Awaited, ReturnType, Parameters, InstanceType or Pick: declare or import a named type. Public object shapes are named interfaces, not inline types
localInfer|Inside a function, let TS infer reduce and map from the initializer: no named accumulator type and no reduce<T> unless inference fails
dateFns|HARD: date math and comparisons always use date-fns (addDays, differenceInMilliseconds, isAfter...), never millisecond arithmetic or getTime() comparisons. New code only: the user keeps the existing date code as it is, do not migrate it unasked
commitStyle|Commit only when the user asks, in Conventional Commits
noCompetitorNames|HARD: the app may follow the market's usual ways of working, but no competitor or other app is ever named in the repo (code, comments, specs, memory): state the rule and its business reason instead. User, 2026-11-04
