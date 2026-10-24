# Branch Protection Setup

To enforce that PRs cannot be merged without passing CI checks, configure branch protection rules in GitHub:

## Required Settings (Settings → Branches → Add rule)

**Branch name pattern:** `main` (or `master`)

### Required checks:
- ✅ **Require a pull request before merging**
  - ✅ Require approvals (set as needed, e.g., 1)
  - ✅ Dismiss stale PR approvals when new commits are pushed
  - ✅ Require review from code owners (if CODEOWNERS exists)

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - Select these status checks (will appear after first workflow run):
    - `Lint & Typecheck`
    - `Build`
    - `PR Checks`

- ✅ **Require conversation resolution before merging**

- ✅ **Do not allow bypassing the above settings**

## Workflow Behavior

The `.github/workflows/ci.yml` runs on:
1. **Pull requests** (opened, synchronize, reopened, ready_for_review) → runs all checks
2. **Push to main/master** → runs all checks

### Jobs:
1. **lint-and-typecheck** - Runs `bun run lint` and `bun run check-types` in parallel
2. **build** - Runs `bun run build` (depends on lint-and-typecheck)
3. **pr-checks** - Final gate that only runs on PRs (depends on both above)

### If checks fail:
- PR cannot be merged (branch protection blocks it)
- Red X appears on PR
- Details available in "Checks" tab of PR

### Skip CI for draft PRs:
Draft PRs don't trigger the workflow until marked "Ready for review"