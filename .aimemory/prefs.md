#P id|rule
specFirst|HARD: a feature starts with a spec in French in docs/specs/<nom>.md: Statut, Spec (Besoin, Décisions prises, règles, API, Nouveaux éléments, Tables touchées, Hors périmètre), À valider, Plan (steps with checkboxes, ending with Fin de feature). Spec work writes documents only. Code needs the user's explicit go; answering open points is not that go
memoryStrict|HARD: always follow .aimemory strictly; it wins over any other memory of how to work. User, 2026-11-02
stepPause|HARD: on a spec plan, implement one step, then stop for the user's OK
moneyCents|HARD: every amount is an integer in cents, named with the suffix Cents, never a Float, in the code, the database and the API
noBackendTests|HARD: no tests at all here, no TDD, unit or e2e. Business rules still go in domain entities, without spec files. User decision 2026-10-06
firebaseDocs|HARD: anything Firebase is based exclusively on firebase.google.com docs, read first and cited. If the doc has no answer, say so and ask before using another source
mapboxDocs|HARD: anything Mapbox is based exclusively on the official Mapbox docs
noNullableNoDuplicate|Avoid nullable columns and duplicated columns: propose a sub-table or a reference instead
