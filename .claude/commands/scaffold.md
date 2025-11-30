---
description: Scaffold all pages/screens/routes
allowed-tools: Read, Write, Edit, Glob, Bash
argument-hint: []
---

# Command: /scaffold

This command analyzes the spec sheet and scaffolds all necessary pages, screens, and routes

## Execution Steps

### Step 1: Analyze Spec Sheet
Read and analyze `.claude/spec/spec-sheet.md` to understand:
- Core features and their requirements
- User flows and interactions
- Data needs for each screen
- Integration points (APIs, services)

NOTE: If the user Doesn't have a PRD yet - 1) analyze the codebase to understand the app and 2) interview the users to write one first

### Step 2: Design Route Architecture
Based on the spec analysis, reason out:
- Authentication flow screens (sign-in, sign-up)
- Main app screens and tab structure
- Modal/overlay screens for specific interactions
- Settings and profile screens
- Onboarding flow for birth chart setup

Consider:
- Which features can coexist on one screen vs. need separate screens
- Navigation hierarchy (tabs vs. stack vs. modal)
- User journey and screen transitions
- Platform conventions (iOS/Android patterns)

### Step 3: Scaffold Routes
Create the complete route structure using Expo Router file-based routing:

**Authentication Routes** (`app/(auth)/`)
- Sign-in screen
- Sign-up screen
- Onboarding flow

**Protected Tab Routes** (`app/(tabs)/`)
- Home/Dashboard screen
- Voice Decision Coach screen
- Event Forecast/Calendar screen
- Settings screen

**Additional Routes**
- Birth chart setup flow
- Birth chart detail view
- Decision session history
- Event detail with forecast

### Step 4: Implementation
For each screen:
1. Create the route file in the correct location
2. Add basic layout structure (header, main content area, navigation)
3. Include placeholder text/components to indicate screen purpose
4. Add proper TypeScript types
5. Ensure proper navigation setup between screens

### Step 5: Summary
Output a summary report including:
- All routes created with their file paths
- Route hierarchy and navigation structure
- Features mapped to screens
- Next steps for backend integration
- Any design decisions made

## Design Principles
- **Basic Layout Only**: Create route structure with minimal placeholder UI
- **Type-Safe**: Use TypeScript throughout
- **Navigation**: Ensure proper routing and navigation setup
- **Organized**: Follow Expo Router conventions for file structure

## Notes
- Create basic route files with minimal styling
- Ensure proper authentication guards on protected routes
- Add comments indicating what each screen will contain
- Focus on getting the navigation structure right, not the UI design
