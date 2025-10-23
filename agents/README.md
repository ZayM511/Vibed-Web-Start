# Agents Directory

This directory contains specialized Claude Code agents for automated task execution.

## What Are Agents?

Agents are autonomous AI workers with specific expertise. They:
- Work in the **background** or **foreground**
- Have specialized knowledge for specific tasks
- Can be **proactively launched** by Claude or **manually requested** by you
- Execute multi-step workflows independently

## How Agents Work

### Automatic (Proactive) Usage
Claude automatically launches agents when tasks match their expertise:

```
You: "Add a new user dashboard feature"
Claude: [reads plans/pending/user-dashboard.md]
Claude: [launches feature-implementer agent]
Agent: [implements the feature autonomously]
Claude: [reports results to you]
```

### Manual Usage
Explicitly request an agent:

```
You: "Use the feature-implementer agent to build the payment system"
Claude: [launches feature-implementer agent with specific task]
```

## Agent File Structure

Each agent is a Markdown file with these sections:

```markdown
# Agent Name

## Purpose
One-sentence description of what this agent does

## When to Use
- Specific scenarios when this agent should be used
- Trigger conditions for proactive activation

## Expertise
- Domain knowledge this agent has
- Technologies it specializes in
- Patterns it knows

## Process
Step-by-step workflow the agent follows:
1. Analysis phase
2. Implementation phase
3. Validation phase

## Expected Output
What the agent delivers when complete
```

## Creating a New Agent

### 1. Identify the Need
Create an agent when you have:
- **Repetitive specialized tasks**: API integrations, UI components, etc.
- **Domain expertise needed**: Security reviews, performance optimization
- **Multi-step workflows**: Deploy pipelines, testing procedures

### 2. Define the Agent
Create `/agents/agent-name.md`:

```markdown
# API Integration Agent

## Purpose
Integrate third-party APIs with proper error handling and type safety

## When to Use
**PROACTIVE**: Use this agent when detecting API integration requests

Triggers:
- User mentions "integrate [service] API"
- Plan contains external API integration
- Task requires HTTP client setup

## Expertise
- RESTful API patterns
- TypeScript type generation from API schemas
- Error handling and retry logic
- Rate limiting and caching
- Authentication flows (OAuth, API keys, JWT)

## Process
1. Research API documentation
2. Set up environment variables
3. Create type-safe API client
4. Implement error handling
5. Add request/response logging
6. Write integration tests

## Expected Output
- Fully typed API client in /lib/api/
- Environment variable documentation
- Error handling examples
- Usage examples in comments
```

### 3. Test the Agent
Try it out:
- Create a plan that matches the agent's expertise
- Run `/cook` and verify the agent is launched
- Check that it follows the defined process

## Best Practices

### Agent Naming
- Use descriptive names: `api-integrator.md`, `ui-component-builder.md`
- Avoid generic names: `helper.md`, `task-runner.md`

### Agent Scope
- **Focused expertise**: Each agent should have a specific domain
- **Not too broad**: "feature-builder" is too general
- **Not too narrow**: "button-component-builder" is too specific

### Making Agents Proactive
Use the **PROACTIVE** keyword in "When to Use":

```markdown
## When to Use
**PROACTIVE**: Use this agent automatically when detecting security-related tasks

Triggers:
- User mentions "security", "vulnerability", or "audit"
- Code review finds security issues
- Authentication/authorization changes
```

### Agent Dependencies
If an agent needs specific tools or configurations:

```markdown
## Prerequisites
- Environment variables: `API_KEY`, `API_SECRET`
- Dependencies: `npm install axios zod`
- Tools: Requires Bash, Edit, Write tools
```

## Integration with Plans

Agents and plans work together:

| Plans | Agents |
|-------|--------|
| **What** to build | **How** to build it |
| Feature specifications | Implementation expertise |
| One-time blueprints | Reusable processes |
| Project-specific | Project-agnostic patterns |

**Example workflow:**
1. Plan: `/plans/pending/stripe-integration.md` (what: add payment system)
2. Agent: `/agents/api-integrator.md` (how: integrate external APIs)
3. `/cook` command matches plan to agent
4. Agent implements plan using its expertise

## Available Agents

### feature-implementer.md
- **Purpose**: Build full-stack features with Next.js + Convex + Clerk
- **Use for**: Complete features requiring frontend + backend + auth
- **Expertise**: Next.js App Router, Convex, Clerk, TypeScript

*Add more agents as you create them*

## Tips

1. **Start with common patterns**: Create agents for tasks you do repeatedly
2. **Document the process**: Capture your best practices in agent workflows
3. **Iterate and improve**: Update agents as you discover better approaches
4. **Share knowledge**: Agents codify team knowledge and standards
5. **Keep them updated**: As tech stack evolves, update agent expertise

## Debugging Agents

If an agent isn't working as expected:

1. **Check the trigger conditions**: Is "When to Use" clear enough?
2. **Verify the process**: Are steps well-defined and actionable?
3. **Test manually**: Ask Claude to use the agent explicitly
4. **Review output**: Did it produce what you expected?
5. **Refine**: Update the agent file based on results

## Example: Building a New Agent

Let's say you frequently add new dashboard widgets. Create:

**`/agents/dashboard-widget-builder.md`**
```markdown
# Dashboard Widget Builder

## Purpose
Create new dashboard widgets following project patterns

## When to Use
**PROACTIVE**: When user requests new dashboard widgets or metrics displays

## Expertise
- Dashboard component patterns in /components/dashboard
- Chart libraries (recharts)
- Real-time data with Convex subscriptions
- Responsive grid layouts

## Process
1. Create widget component in /components/dashboard/widgets/
2. Add Convex query for widget data
3. Integrate with dashboard grid system
4. Add loading and error states
5. Implement real-time updates
6. Add responsive sizing

## Expected Output
- New widget component with TypeScript types
- Convex query for data fetching
- Integration in main dashboard
- Responsive design for all screen sizes
```

Then use it:
```
You: "Add a widget showing monthly revenue"
Claude: [launches dashboard-widget-builder agent]
Agent: [creates the widget following the pattern]
```

---

**Ready to create your first agent?** Start with a task you do often and document the perfect way to do it!
