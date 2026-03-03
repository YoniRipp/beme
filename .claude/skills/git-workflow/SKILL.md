---
name: git-workflow
description: Git workflow and conventional commits for BMe. Use when making commits, creating branches, or writing PR descriptions.
---

# Git Workflow Skill

Standardized Git workflow, commit conventions, and PR templates for BMe development.

## When to Use

- Creating commit messages
- Naming branches
- Writing PR descriptions
- Reviewing commit history
- Managing releases

## Conventional Commits

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(voice): add food logging command` |
| `fix` | Bug fix | `fix(auth): resolve token refresh loop` |
| `docs` | Documentation | `docs(api): update endpoint descriptions` |
| `style` | Formatting only | `style: format with prettier` |
| `refactor` | Code restructuring | `refactor(db): extract query helpers` |
| `perf` | Performance improvement | `perf(api): add query result caching` |
| `test` | Adding tests | `test(voice): add executor unit tests` |
| `chore` | Maintenance | `chore(deps): update dependencies` |
| `ci` | CI/CD changes | `ci: add staging deployment` |
| `build` | Build system | `build: update vite config` |

### Scopes

Use these scopes for BMe:

| Scope | Area |
|-------|------|
| `voice` | Voice commands, transcription |
| `api` | Backend API routes |
| `auth` | Authentication, authorization |
| `db` | Database, migrations |
| `ui` | Frontend components |
| `food` | Food tracking features |
| `workout` | Workout tracking features |
| `schedule` | Schedule features |
| `insights` | AI insights features |
| `deps` | Dependencies |

### Examples

```bash
# Feature
feat(voice): add workout duration parsing

# Bug fix with issue reference
fix(api): handle empty request body

Closes #123

# Breaking change
feat(api)!: change food entry response format

BREAKING CHANGE: Food entries now return `grams` instead of `portion_size`

# Multiple lines
feat(ui): add voice feedback animation

- Add pulsing animation during recording
- Show transcript in real-time
- Display action confirmation
```

## Branch Naming

### Format

```
<type>/<ticket>-<short-description>
```

### Examples

```
feat/BM-123-voice-workout-logging
fix/BM-456-auth-refresh-token
chore/update-dependencies
docs/api-documentation
```

### Branch Types

| Prefix | Purpose |
|--------|---------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `chore/` | Maintenance tasks |
| `docs/` | Documentation |
| `refactor/` | Code refactoring |
| `test/` | Test additions |
| `hotfix/` | Urgent production fixes |

## PR Description Template

Use this template for pull requests:

```markdown
## Summary

Brief description of what this PR does (1-2 sentences).

## Changes

- List specific changes made
- Include file/component names when helpful
- Note any breaking changes

## Testing

- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] Tested on mobile viewport

## Screenshots (if applicable)

[Add screenshots or GIFs for UI changes]

## Related Issues

Closes #123
```

### PR Title Format

Same as commit message:

```
feat(voice): add workout duration parsing
fix(auth): resolve token refresh loop
```

## Commit Best Practices

### Subject Line

- Use imperative mood: "add feature" not "added feature"
- Don't capitalize first letter after type
- No period at the end
- Max 50 characters (72 including type)

### Body

- Explain **what** and **why**, not how
- Wrap at 72 characters
- Separate from subject with blank line

### Good Commits

```bash
# Clear, specific, actionable
feat(voice): parse time ranges in workout commands

Users can now say "I worked out from 10 to 12" and the system
will correctly calculate duration and create schedule entries.

# Small, focused change
fix(api): return 404 for missing food entries

Previously returned 500 with null pointer exception.
```

### Bad Commits

```bash
# Too vague
fix: fixed stuff

# Too long
feat(voice): add support for parsing time ranges in workout commands including calculating duration and creating schedule entries

# Multiple unrelated changes
feat: add voice parsing and fix auth bug and update deps
```

## Workflow Commands

### Starting Work

```bash
# Update main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feat/BM-123-voice-improvements

# Or use gh CLI
gh issue develop 123 --checkout
```

### During Development

```bash
# Stage changes
git add -p  # Interactive staging

# Commit with message
git commit -m "feat(voice): add duration calculation"

# Or open editor for longer message
git commit
```

### Before PR

```bash
# Rebase on latest main
git fetch origin
git rebase origin/main

# Fix any conflicts, then continue
git rebase --continue

# Push to remote
git push -u origin HEAD
```

### Creating PR

```bash
# Using gh CLI
gh pr create --title "feat(voice): add duration calculation" --body "
## Summary
Adds duration calculation for time-range workouts.

## Changes
- Parse 'from X to Y' patterns
- Calculate duration in minutes
- Create schedule entries with times

## Testing
- [x] Unit tests added
- [x] Manual testing completed
"
```

## Commit Message Generation

When generating commit messages, analyze the staged changes:

```bash
# View what's staged
git diff --cached

# View file list
git diff --cached --name-only
```

Then create a message that:

1. Uses the correct type based on changes
2. Uses appropriate scope
3. Summarizes the change concisely
4. Explains why in body if non-obvious

## Git Hooks

BMe uses the following hooks:

### Pre-commit

```bash
# Runs automatically
- prettier --check
- eslint
- tsc --noEmit
```

### Commit-msg

```bash
# Validates conventional commit format
```

## Rebase vs Merge

**Prefer rebase** for feature branches:

```bash
# Before opening PR
git rebase origin/main

# After PR feedback
git rebase -i HEAD~3  # Squash fixup commits
```

**Use merge** for:
- Merging PRs to main (squash merge)
- Long-running feature branches with multiple contributors

## Handling Conflicts

```bash
# During rebase
git rebase origin/main

# If conflicts occur:
# 1. Fix conflicts in files
# 2. Stage resolved files
git add .

# 3. Continue rebase
git rebase --continue

# Or abort and try again
git rebase --abort
```

## Useful Aliases

```bash
# Add to ~/.gitconfig
[alias]
  co = checkout
  br = branch
  ci = commit
  st = status
  unstage = reset HEAD --
  last = log -1 HEAD
  lg = log --oneline --graph --decorate
  amend = commit --amend --no-edit
  wip = commit -m "chore: work in progress"
```

## Changelog Generation

Conventional commits enable automatic changelog generation:

```bash
# Generate changelog
npx conventional-changelog -p angular -i CHANGELOG.md -s
```

### Changelog Categories

- **Features**: `feat` commits
- **Bug Fixes**: `fix` commits  
- **Performance**: `perf` commits
- **Breaking Changes**: commits with `!` or `BREAKING CHANGE` footer

## Quick Reference

```bash
# Feature
git commit -m "feat(scope): add new feature"

# Bug fix
git commit -m "fix(scope): fix the bug"

# Breaking change
git commit -m "feat(scope)!: breaking change description"

# With body
git commit -m "feat(scope): subject" -m "Detailed body explaining why"
```
