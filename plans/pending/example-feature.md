# Example Feature Implementation

## Overview
This is an example plan file showing how to structure implementation plans.

## Requirements
- Requirement 1: Create a new feature component
- Requirement 2: Add data fetching logic
- Requirement 3: Integrate with existing authentication

## Technical Approach
- **Location**: `/app/example/page.tsx`
- **Components**: Create reusable components in `/components/example`
- **Backend**: Add Convex queries in `/convex/example.ts`
- **Styling**: Use Tailwind CSS with shadcn/ui components

## Implementation Steps

### 1. Create Backend Logic
```typescript
// convex/example.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getExampleData = query({
  args: {},
  handler: async (ctx) => {
    // Implementation here
    return [];
  },
});
```

### 2. Create Frontend Component
- Create `/app/example/page.tsx`
- Use `useQuery` to fetch data from Convex
- Implement responsive layout with Tailwind

### 3. Add Navigation
- Update sidebar to include new route
- Add authentication check if needed

## Acceptance Criteria
- [ ] Backend query returns correct data
- [ ] Frontend displays data properly
- [ ] Responsive design works on mobile
- [ ] Authentication is enforced
- [ ] No console errors or warnings

## Notes
- This plan should be moved to `/plans/in-progress` when work begins
- Move to `/plans/completed` when all acceptance criteria are met
- If blocked, keep in `/plans/in-progress` and document the blocker
