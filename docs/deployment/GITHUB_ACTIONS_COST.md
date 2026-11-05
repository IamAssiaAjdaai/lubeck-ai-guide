# Cost-aware GitHub Actions for CITYWALK

The private repository uses a GitHub Free quota of Actions minutes. These workflows reduce **unnecessary** hosted-runner time but cannot make private hosted Actions unlimited or free after included minutes run out.

## Standard PR / push CI

The `CI` workflow uses one lightweight `changes` job (read-only PR file detection). Only related expensive jobs run:

| File area | Web tests + build | Mobile tests + Expo Doctor | PostgreSQL integration |
| --- | --- | --- | --- |
| `src/components/**`, `src/app/**` pages | Yes | No | Only for `src/app/api/**` |
| `mobile/**` | No | Yes | No |
| `packages/i18n/**`, `packages/traveler-core/**` | Yes | Yes | Yes for traveler core |
| `src/db/**`, `drizzle/**`, `src/lib/**`, `src/app/api/**` | Yes | No | Yes |
| Documentation-only | No | No | No |
| Root package changes / CI workflow changes | All relevant jobs | CI workflow change runs mobile | Yes |

We deliberately use conservative filters for backend and shared core changes. This is **not** a substitution for integration testing before a release.

- Superseded PR/branch runs are canceled with `concurrency.cancel-in-progress`.
- Web Vitest is run **once** with coverage (`npm run test:coverage`); coverage already runs all Vitest tests and enforces existing thresholds.
- Duplicate `db:verify` after the idempotent re-seed is removed; the initial database verification and single idempotency verification are retained.
- Cloudflare, restore, landing screenshot and account deletion E2E workflows cancel previous runs for the same PR.
- Workflow permissions allow only repository reading and PR file-list reading. The file-change detection action is pinned to an immutable commit.

## Full CI on demand

The `CI` workflow supports `workflow_dispatch` on GitHub Actions; a manually dispatched run executes **all three** heavy job groups, regardless of changed files. Use that for release checks after the free Actions quota renews or after establishing another runner. The Cloudflare build validation workflow can also be dispatched manually.

**Important:** GitHub Actions run automatically only after the workflow is merged into the targeted branch. While included Actions minutes are exhausted, newly opened PRs may fail before any steps; that indicates account quota rather than a code validation result.

### Local checks while the GitHub quota is exhausted

```bash
npm ci
npm run lint
npm run test:coverage
npm run build

npm --prefix mobile ci
npm run mobile:test
npm run mobile:lint
npm run mobile:typecheck
npm run mobile:doctor

# Cloudflare without deploying
npm run build:vinext
npm run deploy:vinext:dry-run
```

Run PostgreSQL integration only against a **disposable local database**. Do not point migrations, seeds, or integration tests at production Neon or production Cloudflare credentials.
