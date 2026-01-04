---
description: Commits all uncommitted changes and pushes all unpushed commits to origin main
allowed-tools: Bash
argument-hint: []
---

# Command: /commit-all

Commit all uncommitted changes and push all unpushed commits to the main origin.

## Steps

1. **Check current status**
   - Run `git status` to see all untracked and modified files
   - Run `git log origin/main..HEAD --oneline` to check for unpushed commits

2. **Stage all changes**
   - Run `git add -A` to stage all changes (new, modified, deleted files)

3. **Commit changes** (if there are staged changes)
   - Generate a concise commit message summarizing the changes
   - Create the commit using:
   ```
   git commit -m "$(cat <<'EOF'
   <commit message>

   Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
   EOF
   )"
   ```

4. **Push to origin**
   - Run `git push origin main` to push all commits to remote

5. **Report results**
   - Show what was committed (files changed)
   - Show what was pushed (number of commits)
   - Confirm success or report any errors

## Error Handling

- If there are no changes to commit, inform the user "Nothing to commit"
- If push fails due to conflicts, suggest `git pull --rebase` first
- If authentication fails, inform the user to check git credentials
