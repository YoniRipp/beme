# Standards That Apply

| Standard | Why it applies here |
|---|---|
| `global/tech-stack` | Adding a workspace package and new mobile dependencies (jest-expo, RNTL) |
| `global/testing` | Standing up the mobile test runner; the existing frontend suites must keep passing |
| `global/domain-conventions` | Dates, units, nutrition and meal types move into `packages/shared/domain` — this is the canonical definition from now on |
| `global/critical-rules` | Touching the live web client's module resolution |
| `frontend/api-client` | `core/api/` is extracted into the shared package; the web client's call sites must not change behaviour |
| `frontend/data-fetching` | TanStack Query is used by both clients; query keys move to shared |
| `frontend/design-tokens` | The token source of truth moves to `packages/shared/tokens` |
| `frontend/components` | Only insofar as the web's components must keep compiling after the extraction |
| `backend/models` | Not modified, but `foodEntry`/`workout` shapes are mirrored by the shared types |

## Note on the backend

Foundation makes **no backend change**. The audit confirmed the API surface is already
parity-ready: `/api/food-entries` (GET/POST/PATCH/DELETE), `/api/food-entries/batch`,
`/api/food-entries/duplicate-day`, `/api/food/search`, `/api/food/barcode/:code` and
`/api/food/lookup-or-create` all exist. Mobile currently wires up four of the ten. The gap is
client-side.

Per CLAUDE.md rule #4, API shapes stay fixed — the MCP server ships separately and consumes them.
