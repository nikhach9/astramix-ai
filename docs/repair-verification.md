# Repair verification: 23 November 2026

Branch: `fix/ia-reliability-2026-11-23`. Original public baseline: `4bfa55477772fb536d11805eae8413f96e019956`.

| Check | Observed result |
| --- | --- |
| Original Python suite before repairs | 64 passed |
| Current Python suite, including PHP subprocess parity | 102 passed in 13.95 seconds |
| PHP API and market cases with a newly seeded isolated database | 14 passed, 0 failed |
| Python/PHP selected-model translation | 1,043 rows, maximum difference 0.000055697 MPa; tolerance 0.0001 MPa |
| Report storage regression script | Passed: round trip, provenance, incomplete totals, legacy records, blocked/corrupt storage, fallback freshness |
| Frontend TypeScript and ESLint | Passed; final production build reports no lint/type errors |
| Next.js production static export | Passed |
| Exported HTML asset check | 13 HTML files, 129 references, 20 distinct Next.js assets, 0 missing |
| cPanel archive structure and clean extraction | Passed, using an explicit fresh database snapshot |
| Live browser workflow | Incomplete: cloud browser could not reach the local preview |
| GitHub push and remote CI | Read connection confirmed; first write rejected with 403 Resource not accessible by integration; connector reports zero installations and zero accessible repositories |

The 512-candidate warm Python search had median wall time 826.9 ms across three runs. PHP search with per-process model loading had median 111.2 ms. Python's first model load and prediction took 926.4 ms after imports. See `runtime-measurements.json` for every sample and measurement scope. These are shared-host observations, not response-time guarantees.

The tests include a hand-calculated two-recipe ranking oracle, separate w/c and w/b constraints, stable ties, exact unique-evaluation counts, invalid options, missing active factors, zero-quantity factors, normalized currency scaling, normal/test-module execution identity, non-finite predictions, grouped data partitions, model-hash mismatch, factor arithmetic, public PHP input rejection and cohort-context guards, foreign-currency price completeness and real-package import enforcement. Generated reference predictions test cross-language translation; independent arithmetic fixtures test calculations separately.

Reports preserve the exact request, factor tables, model identity and search settings. Storage tests exercise serialization and recovery. They do not substitute for live browser navigation, reload, download and layout checks. Those remain a final review item on a reachable browser session.

CI now installs PHP and runs backend/parity checks, isolated PHP market cases, report storage tests, TypeScript, lint and the production build on repair branches and pull requests. No remote green CI status is claimed before a successful publication and an observed GitHub Actions run. The authenticated account owns the repository, but the connected app currently has no repository installation; sign-in alone did not grant app write access.

The prepared code and new commits are assisted work recorded with the configured Codex identity. Existing author and committer dates are preserved. Missing local Git metadata cannot be reconstructed from ZIP file dates. No client consultation, development chronology or IA assessment evidence was invented.

A fresh archive of committed source at `a91628c` also passed all 102 Python cases, all 14 isolated PHP cases and the frontend production build. The following change updates only this verification record.
