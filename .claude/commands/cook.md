---
description: Implement all plans in /plans/pending folder using agents in /agents folder
allowed-tools: Bash, Edit
argument-hint: []
---

# Command: /cook

Please execute all pending plans located in the `/plans/pending` folder.

## Process for each plan:

1. **Move to in-progress**: Move the plan file from `/plans/pending` to `/plans/in-progress`
2. **Identify agent**: Check if a corresponding agent exists in `/agents` folder
3. **Execute plan**:
   - Launch the appropriate agent if available
   - Otherwise, implement the plan step-by-step yourself
   - Follow the plan's instructions exactly
4. **Move to completed**: Upon successful implementation, move the plan file to `/plans/completed`
5. **Handle failures**: If implementation fails, keep the plan in `/plans/in-progress` and note the blocker

## Summary Report:

Upon completion, provide a summary including:
- Plans successfully implemented (now in `/plans/completed`)
- Plans still in progress (in `/plans/in-progress`) with reasons
- Plans skipped (none found in `/plans/pending`)
- Any issues or next steps required

## Directory Structure:
- `/plans/pending` - Plans waiting to be implemented
- `/plans/in-progress` - Plans currently being worked on
- `/plans/completed` - Plans that have been successfully implemented
