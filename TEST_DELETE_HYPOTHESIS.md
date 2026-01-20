# Delete Functionality - Hypothesis & Testing

## Hypothesis

The deletion IS working on the backend when `skipConfirmation = true`, but one of these might be the issue:

### Hypothesis 1: Mutation Called Incorrectly
- Convex `useMutation` returns an async function
- Both paths call it the same way: `await deleteDocument({ documentId })`
- This should work identically in both paths
- **Likelihood: LOW** - Same call pattern in both branches

### Hypothesis 2: UI Not Updating (Reactive Query Issue)
- The mutation succeeds on backend
- The `useQuery` for `documentsByType` should auto-update
- But maybe there's a timing issue or subscription problem
- **Likelihood: MEDIUM**

###Hypothesis 3: LocalStorage Typo or Case Sensitivity
- Storage key: `"document-delete-no-confirm"`
- Checking for value: `=== "true"`
- If value is anything else (including `"True"`, `true`, `1`), it won't match
- **Likelihood: LOW** - Code looks correct

### Hypothesis 4: Error Being Silently Swallowed
- The try-catch might be catching an error we're not seeing
- Need to check console logs
- **Likelihood: MEDIUM**

### Hypothesis 5: Component Not Re-rendering
- When dialog path is used, state changes cause re-render
- When direct path is used, no state change
- Convex query should still trigger re-render when data changes
- **Likelihood: HIGH** ⭐

## Most Likely Issue

**The mutation probably works, but the UI doesn't update because:**
1. No state change occurs when skipping dialog
2. Convex query SHOULD update automatically but might not be
3. Need to force a re-render or ensure query subscription is working

## Solution Approach

### Option 1: Add Loading State
```typescript
const [isDeleting, setIsDeleting] = useState(false);

if (skipConfirmation) {
  setIsDeleting(true);  // ← Force state change
  try {
    await deleteDocument({ documentId });
  } finally {
    setIsDeleting(false);  // ← Another state change
  }
}
```

### Option 2: Manual Optimistic Update
Use Convex's optimistic updates to immediately remove from UI

### Option 3: Force Query Refetch
Manually trigger query refetch after mutation

## Debug Steps

1. Add console.logs (✅ DONE)
2. Start dev server
3. Test both paths:
   - With dialog (working baseline)
   - Without dialog (problematic path)
4. Check console for:
   - "handleDelete called" messages
   - Success/error messages
   - Any Convex errors
5. Check Network tab for mutation requests
6. Check if document actually deletes in database

## Expected Console Output

### With Dialog (Working):
```
[DEBUG] handleDelete called { documentId: "...", skipConfirmation: false }
[DEBUG] Showing confirmation dialog
[User clicks Delete]
[DEBUG] confirmDelete called { documentToDelete: "..." }
[DEBUG] Delete from dialog successful { ... }
```

### Without Dialog (Should be):
```
[DEBUG] handleDelete called { documentId: "...", skipConfirmation: true }
[DEBUG] Deleting without confirmation...
[DEBUG] Delete successful { ... }
```

### Without Dialog (If broken):
```
[DEBUG] handleDelete called { documentId: "...", skipConfirmation: true }
[DEBUG] Deleting without confirmation...
[DEBUG] Delete error: [some error]
```
OR
```
[DEBUG] handleDelete called { documentId: "...", skipConfirmation: true }
[DEBUG] Deleting without confirmation...
[DEBUG] Delete successful { ... }
[UI doesn't update - document still visible]
```

## Next Steps

1. Run the app with debug logs
2. Test deletion with localStorage set to skip confirmation
3. Based on console output, determine exact failure point
4. Apply appropriate fix from options above
