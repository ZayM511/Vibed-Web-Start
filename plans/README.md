# Plans Directory

This directory contains implementation plans organized by status.

## Directory Structure

```
/plans
  /pending       - Plans waiting to be implemented
  /in-progress   - Plans currently being worked on
  /completed     - Plans that have been successfully implemented
```

## Workflow

### 1. Creating a New Plan
Create a new Markdown file in `/plans/pending/` with your feature specification:

```markdown
# Feature Name

## Overview
Brief description of what needs to be built

## Requirements
- Specific requirements listed

## Technical Approach
- Architecture decisions
- File locations
- Dependencies needed

## Implementation Steps
1. Step-by-step instructions
2. Code examples if helpful
3. Integration points

## Acceptance Criteria
- [ ] Checklist of completion criteria
- [ ] Testing requirements
- [ ] Performance benchmarks
```

### 2. Implementing Plans
Use the `/cook` command to automatically implement all pending plans:

```bash
/cook
```

This will:
1. Find all plans in `/plans/pending`
2. Move each to `/plans/in-progress` when starting
3. Implement using the appropriate agent from `/agents` folder
4. Move to `/plans/completed` when done

### 3. Manual Implementation
If you want to implement a specific plan manually:

1. Move the plan from `/pending` to `/in-progress`
2. Ask Claude: "Please implement the plan in /plans/in-progress/feature-name.md"
3. When complete, move to `/completed`

## Best Practices

### Plan Naming
- Use kebab-case: `user-dashboard.md`, `payment-integration.md`
- Be descriptive: `spec-sheet-integration.md` not `feature1.md`

### Plan Content
- **Be specific**: Include file paths, function names, exact requirements
- **Include examples**: Code snippets help clarify intent
- **Define success**: Clear acceptance criteria prevent scope creep
- **Reference existing patterns**: Link to similar implementations in the codebase

### Status Management
- **Pending**: Ready to implement, no blockers
- **In-Progress**: Actively being worked on
- **Completed**: Fully implemented and tested

### When Plans Fail
If implementation is blocked:
- Keep the plan in `/in-progress`
- Add a "## Blockers" section to the plan file
- Document what's preventing completion
- Resolve blockers before moving to `/completed`

## Examples

See `example-feature.md` in the `/pending` folder for a complete example plan.

## Tips

1. **One feature per plan**: Keep plans focused on a single feature or change
2. **Update as you go**: If you discover issues during implementation, update the plan
3. **Commit completed plans**: Git tracks your implementation history through completed plans
4. **Reuse patterns**: Look at completed plans for reference when creating new ones

## Integration with Agents

Plans work best when paired with specialized agents in `/agents`:
- Plans define **what** to build
- Agents define **how** to build it

When creating a plan, consider:
- Is there an existing agent that can handle this? → Use it
- Is this a new pattern? → Consider creating a new agent
- One-off task? → Just use the plan, no agent needed
