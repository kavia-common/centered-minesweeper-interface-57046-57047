# Tests (Vitest)

This project uses **Vitest** + **React Testing Library** for unit/integration tests.

## Run in CI mode

```bash
npm test
```

## Watch mode (local dev)

```bash
npm run test:watch
```

Notes:
- Tests are run in `jsdom`.
- Engine tests are deterministic (no dependency on random mine placement).
- UI tests avoid assumptions about exact mine locations; when needed, randomness is mocked.
