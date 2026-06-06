# Contributing & Branching Model

This repo uses a **Git Flow-style** branching model. The goal: `main` is always a
clean, releasable state; day-to-day work happens on short-lived feature branches
that integrate through `develop`.

## Branches

| Branch | Purpose | Lifetime |
|--------|---------|----------|
| `main` | Released, known-good state only. Every commit is tagged (`vX.Y.Z`). Never commit directly. | permanent |
| `develop` | Integration branch. Features merge here first; it is the "next release" line. | permanent |
| `feat/<name>` | One feature / unit of work. Branches off `develop`, merges back into `develop`. | **kept** (not deleted) |
| `fix/<name>` | A bug fix. Same flow as `feat/` (off `develop`, back to `develop`). | **kept** |
| `release/<version>` | (optional) Stabilize a release; merges into both `main` and `develop`. | **kept** |
| `hotfix/<name>` | (optional) Urgent fix off `main`; merges into `main` and `develop`. | **kept** |

> **No `master`.** The default/trunk branch is **`main`**.
>
> **Feature branches are KEPT, not deleted.** This repo deviates from textbook
> Git Flow: after a `feat/*` / `fix/*` / `docs/*` branch merges into `develop`,
> we do **not** run `git branch -d`. Every feature branch stays alive (locally and
> on the remote) as a permanent, browsable record of each unit of work.

### Naming examples

```
feat/crawl-scaffolding      feat/walk-keyword-spotting
feat/reference-docs         fix/ble-uuid-typo
feat/run-sensor-fusion      release/0.2.0
```

Use kebab-case after the `feat/` or `fix/` prefix; keep names short and descriptive.

## Day-to-day flow (PR-based)

Features integrate into `develop` through a **GitHub Pull Request**, never a direct
local `git merge` into `develop`.

```bash
# start a feature
git switch develop
git pull                       # make sure develop is current with origin
git switch -c feat/walk-keyword-spotting

# ... do the work, commit in atomic steps ...

# push the branch and open a PR against develop
git push -u origin feat/walk-keyword-spotting
gh pr create --base develop --head feat/walk-keyword-spotting \
  --title "feat(aegis-edge): walk-phase keyword spotting" \
  --body  "Summary + test plan"

# after review, merge the PR (keep the branch -- do NOT use --delete-branch)
gh pr merge feat/walk-keyword-spotting --merge      # a real merge commit (no fast-forward)

# bring local develop up to the merged remote
git switch develop && git pull
```

- Always branch from an up-to-date `develop`.
- **Integrate via PR** (`gh pr create` -> `gh pr merge --merge`), so each feature has a
  reviewable, GitHub-tracked merge commit. Do **not** `git merge` into `develop` locally.
- Use a **merge commit** (`--merge`, not `--squash`/`--rebase`) so each feature stays one
  identifiable bubble in the graph.
- **Keep the feature branch after it merges** -- do not pass `--delete-branch` and do not
  run `git branch -d`. Every feature branch stays alive as a permanent record.

> Note: in this environment a safety hook blocks the assistant from running `git push`
> (it points to `gh pr create` instead). `gh pr create` pushes the branch for you, so the
> assistant can open PRs; the human runs any standalone `git push` (e.g. the initial
> develop/main sync, or pushing a branch before the PR).

## Releasing

When `develop` reaches a milestone worth marking, release via PR too:

```bash
gh pr create --base main --head develop --title "Release v0.2.0" --body "..."
gh pr merge --merge                    # develop -> main via PR
git switch main && git pull
git tag -a v0.2.0 -m "Walk phase: on-device keyword spotting"
git push origin v0.2.0                 # (human runs the push)
# update CHANGELOG.md
```

`main` advances only through these release PRs, and each carries a version tag.

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
