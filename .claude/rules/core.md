# Core & Workflow Rules

## Phase Management [For Multi-Phase Work]

For implementations spanning 3+ phases, use this system:

### Phase File Structure
```
.claude/phases/
  PHASE-01-done.md       (rename when complete)
  PHASE-02-active.md     ← only ONE active at a time
  PHASE-03-pending.md
```

### Phase File Format
```markdown
# Phase 02 — [Feature Name]
Status: ACTIVE | PENDING | DONE

## Goal
One sentence. What does completing this phase deliver?

## Tasks
- [ ] Task 1
- [ ] Task 2

## Acceptance Criteria
- [ ] Criterion 1

## Decisions Made This Phase
<!-- Log here as you go, then move to DECISIONS.md -->
```

### Rules
- One active phase at a time (never start next phase without explicit approval)
- Re-read active phase file when context refills (don't rely on chat history)
- If plan needs to change, ask explicitly before changing it
- Phase files contain goals/tasks only — no code snippets
- Rename `PHASE-02-active.md` → `PHASE-02-done.md` when complete

## Decision Logging

Log non-trivial technical decisions to `.claude/DECISIONS.md`.

### What to Log
- Choosing library/framework over alternatives
- Choosing architecture pattern
- Rejecting a common approach and why
- Any decision made under time pressure or uncertainty

### What NOT to Log
- Implementation details
- Decisions with only one reasonable option
- Stylistic choices already covered by rules

### Format
```markdown
## YYYY-MM-DD — [Title]

**Chosen:** What was decided
**Alternatives:** What else was considered
**Why:** Full reasoning — be specific, not generic
**Trade-offs:** What is lost or risked with this choice
**Revisit if:** Condition under which this should be reconsidered
```

## Git Workflow

### Branching Strategy
Never commit directly to `main`. Every change requires a feature branch.

Branch naming — lowercase, hyphen-separated, max 50 characters:
```
feature/1.1.0-engine-integration
fix/null-pointer-exception
refactor/split-user-service
chore/update-dependencies
```

Delete branches after merge (both remote and local).

### Commit Messages — Conventional Commits [MUST]

Format: `<type>(<scope>): <short description>`

| Type | When |
|------|------|
| `feat` | New feature/capability |
| `fix` | Bug fix |
| `refactor` | Code change, no behavior change |
| `chore` | Dependencies, build, tooling |
| `docs` | Documentation only |
| `test` | Adding/fixing tests |

### Merge Commits
Use `--no-ff` to preserve branch history.

### Documentation — MANDATORY
ALL features MUST be documented BEFORE merging to main:
- [ ] README.md — Update if user-facing changes
- [ ] CHANGELOG.md — Add entry (Keep a Changelog format)
- [ ] Code comments for new functions
- [ ] Architecture docs updated if design changed

### Version Management
ALL merges to main that add features or fixes MUST increment the version number in **both locations** (see CLAUDE.md Quick Reference).

Follow Semantic Versioning 2.0.0:
- **MAJOR** (X.0.0) — Incompatible API changes
- **MINOR** (0.X.0) — New features (backwards-compatible)
- **PATCH** (0.0.X) — Bug fixes (backwards-compatible)
