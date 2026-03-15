# Contributing to TrackVibe

Thank you for your interest in contributing to TrackVibe. This document describes how to report bugs, request features, and submit pull requests.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Development setup

1. Clone the repository.
2. See [docs/RUNNING-LOCAL.md](docs/RUNNING-LOCAL.md) for local setup (backend, frontend, optional Redis).
3. Ensure `npm run lint` and `npm run test` pass in both `backend/` and `frontend/` before making changes.

## Code style

- Follow the [.editorconfig](.editorconfig) settings for indentation and line endings.
- Backend: JavaScript (ES modules); frontend: TypeScript, React.
- Run `npm run lint` in each package before committing.

## Pull requests

1. Fork the repo and create a branch (e.g. `feature/add-x` or `fix/y`).
2. Make your changes. Keep PRs focused and reasonably sized.
3. Run `npm run lint` and `npm run test` in both `backend/` and `frontend/`.
4. Update documentation if needed.
5. Open a PR with a clear description. CI will run lint and tests on push.

We use a single integration branch (`main`) and movable tags for promotion. See [docs/WORKFLOW.md](docs/WORKFLOW.md) for the full flow.

## Reporting bugs

Open an issue with:

- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, Node version)

## Requesting features

Open an issue with a description of the feature and use case. Discussion is welcome before implementation.
