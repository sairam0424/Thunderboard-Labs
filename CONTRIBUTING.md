# Contributing & Branching Model

This repo uses a **Git Flow-style** branching model. The goal: `main` is always a
clean, releasable state; day-to-day work happens on short-lived feature branches
that integrate through `develop`.

## Branches

| Branch | Purpose | Lifetime |
|--------|---------|----------|
| `main` | Released, known-good state only. Every commit is tagged (`vX.Y.Z`). Never commit directly. | permanent |
| `develop` | Integration branch. Features merge here first; it is the "next release" line. | permanent |
| `feat/<name>` | One feature / unit of work. Branches off `develop`, merges back into `develop`. | short-lived |
| `fix/<name>` | A bug fix. Same flow as `feat/` (off `develop`, back to `develop`). | short-lived |
| `release/<version>` | (optional) Stabilize a release; merges into both `main` and `develop`. | short-lived |
| `hotfix/<name>` | (optional) Urgent fix off `main`; merges into `main` and `develop`. | short-lived |

> **No `master`.** The default/trunk branch is **`main`**.

### Naming examples

```
feat/crawl-scaffolding      feat/walk-keyword-spotting
feat/reference-docs         fix/ble-uuid-typo
feat/run-sensor-fusion      release/0.2.0
```

Use kebab-case after the `feat/` or `fix/` prefix; keep names short and descriptive.

## Day-to-day flow

```bash
# start a feature
git switch develop
git switch -c feat/walk-keyword-spotting

# ... do the work, commit in atomic steps ...

# integrate it (merge commit kept on purpose, so the feature is visible in history)
git switch develop
git merge --no-ff feat/walk-keyword-spotting
git branch -d feat/walk-keyword-spotting
```

- Always branch from an up-to-date `develop`.
- Merge features back with **`--no-ff`** so each feature is one identifiable bubble in the graph.
- Delete the feature branch after it merges.

## Releasing

When `develop` reaches a milestone worth marking:

```bash
git switch main
git merge --no-ff develop
git tag -a v0.2.0 -m "Walk phase: on-device keyword spotting"
# update CHANGELOG.md, then merge main back to develop if the release made commits
```

`main` advances only through these release merges, and each carries a version tag.

## Commit messages — Conventional Commits

Format: `<type>(<scope>): <description>`

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`, `build`, `revert`

```
feat(aegis-edge): add keyword-spotting impulse config
docs(reference): correct EFR32MG12 TX-power to +10 dBm
chore(repo): add root README and branching model
```

- One logical change per commit; explain **why** in the body when it isn't obvious.
- Never commit secrets, `.env`, build artifacts, or firmware binaries (see `.gitignore`).
- Do not add `Co-Authored-By` trailers unless the repo's attribution settings ask for it.

## Scopes used in this repo

- `aegis-edge` — the buildable TinyML project
- `reference` / `docs` — the hardware documentation set
- `repo` — repo-wide tooling, structure, CI
