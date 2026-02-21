---
description: Commits all changes, pushes to origin main, and deploys to live (Convex + Vercel) with auto-fix on errors
allowed-tools: Bash, Read, Edit, Write, Grep, Glob
argument-hint: []
---

# Command: /kickpush

Commit all uncommitted changes, push to origin main, then deploy both the Convex backend and Vercel frontend to production. Automatically fix and retry on deploy errors.

## Steps

### Phase 1: Commit & Push

1. **Check current status**
   - Run `git status` to see all untracked and modified files
   - Run `git log origin/main..HEAD --oneline` to check for unpushed commits

2. **Stage all changes**
   - Run `git add -A` to stage everything

3. **Commit** (if there are staged changes)
   - Generate a concise commit message summarizing the changes
   - Create the commit:
   ```
   git commit -m "$(cat <<'EOF'
   <commit message>

   Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
   EOF
   )"
   ```

4. **Push to origin**
   - Run `git push origin main`

### Phase 2: Deploy Convex Backend

5. **Deploy Convex**
   - Run `npx convex deploy`
   - If deployment fails:
     - Analyze the error output
     - Make minimal targeted fixes
     - Retry `npx convex deploy`
     - Repeat until success or same error occurs 5+ times

### Phase 3: Deploy Vercel Frontend

6. **Deploy Vercel**
   - Run `vercel --prod`
   - If deployment fails:
     - Fetch detailed logs using Vercel MCP if available, otherwise analyze CLI output
     - Identify root cause (TypeScript, ESLint, compilation, env vars, dependencies)
     - Make minimal targeted fixes
     - Retry `vercel --prod`
     - Repeat until success or same error occurs 5+ times

7. **If fixes were made during deploy, commit & push them**
   - Stage the fix files, commit with message describing what was fixed
   - Push to origin main

### Phase 4: Report

8. **Report results**
   - Deployment URLs (Convex dashboard + Vercel production URL)
   - Summary of what was committed and pushed
   - Any errors that were auto-fixed during deployment
   - Confirm everything is live

## Error Handling

- If there are no changes to commit, skip Phase 1 and go straight to deployment
- If push fails due to conflicts, run `git pull --rebase` then retry push
- If authentication fails, inform the user to check credentials
- If the SAME deploy error occurs 5+ times, stop and ask for manual intervention
- If deploy fixes were needed, always commit and push those fixes before reporting success

## Important Notes

- Always deploy Convex BEFORE Vercel so the backend is ready when the frontend goes live
- Never skip the commit/push step — the live site should always match the pushed code
