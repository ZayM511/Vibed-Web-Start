# Dashboard Redesign Plan - User Account Dashboard

**Status**: Ready for Implementation
**Priority**: High
**Estimated Complexity**: Medium-High
**Date Created**: 2025-10-24

---

## Overview

Redesign the `/tasks` page to become a comprehensive user dashboard at `/dashboard` that includes account settings, subscription management, task interface, and document management. The design will maintain the existing elegant background and color scheme while adding new functionality.

---

## Current State Analysis

### Existing Dashboard (`/app/tasks/page.tsx`)
- **Route**: `/tasks` (protected with Clerk authentication)
- **Layout**: Uses sidebar layout with `AppSidebar` and `SiteHeader`
- **Background**: Elegant animated shapes with gradient backgrounds (indigo/rose/violet)
- **Current Features**: Task management (CRUD operations via Convex)
- **Navigation**: HeaderNav component with logo, navigation items, and user authentication

### Technology Stack
- **Frontend**: Next.js 15, React 19, Tailwind CSS 4, Framer Motion
- **Authentication**: Clerk (JWT tokens)
- **Database**: Convex (real-time backend)
- **UI Components**: shadcn/ui
- **Icons**: Lucide React

---

## Target State - New Dashboard Design

### Route Structure
```
/dashboard - Main dashboard page (rename from /tasks)
  - Overview section (welcome + account type)
  - Tabs:
    ├── Tasks (existing functionality)
    ├── Documents (new: CV/Resume, Cover Letter, Portfolio)
    └── Settings (new: account settings + subscription)
```

---

## Feature Requirements

### 1. **Dashboard Overview Section**

#### Welcome Header
- Display: `"Hi [Name on account]"`
- Source: Clerk user data (`user.firstName` or `user.fullName`)
- Styling: Large, bold, gradient text matching brand colors

#### Account Type Badge
- Display current subscription tier:
  - **Free** - Default tier
  - **Pro** - $3.99/month tier
- Visual: Prominent badge with icon
- Color coding:
  - Free: Gray/neutral colors
  - Pro: Gradient (indigo to purple) with sparkle/star icon

#### Quick Stats Cards (optional enhancement)
- Total tasks completed
- Documents uploaded
- Recent activity

---

### 2. **Settings Tab - Account Management**

#### Profile Settings Section

**Editable Fields**:
1. **Name** (First Name + Last Name)
   - Input: Text field with validation
   - Default: From Clerk user profile
   - Update: Via Clerk User Profile API

2. **Email Address**
   - Conditional display:
     - If signed in with Gmail/OAuth: Display only (not editable)
     - If email/password signup: Editable field
   - Validation: Email format check
   - Update: Via Clerk User Profile API

3. **Profile Picture**
   - Display: Circular avatar (matching NavUser component style)
   - Upload: Drag & drop or file picker
   - Specs: Max 5MB, JPG/PNG format
   - Storage: Clerk stores avatar, fallback to initials
   - Preview: Real-time preview before save

**Implementation Details**:
```typescript
// Use Clerk's User Profile component or custom form
import { UserProfile } from "@clerk/nextjs";

// Or custom implementation:
- useUser() hook for current data
- user.update() for modifications
- Image upload via Clerk's image API
```

---

### 3. **Settings Tab - Subscription Management**

#### Subscription Type Display
- Current Plan Badge: Free or Pro
- Price display: "$3.99/month" for Pro
- Billing cycle: Monthly

#### Subscription Comparison Table

**Layout**: Side-by-side cards or table

| Feature | Free | Pro |
|---------|------|-----|
| **Price** | $0/month | $3.99/month |
| **Job Scans** | 10 per month | Unlimited |
| **Document Storage** | 3 documents | Unlimited |
| **AI Analysis** | Basic | Advanced |
| **Priority Support** | ❌ | ✅ |
| **Chrome Extension** | ✅ | ✅ |
| **Export Reports** | Limited | Full PDF exports |
| **History** | 30 days | Unlimited |
| **Saved Searches** | 5 | Unlimited |
| **Custom Alerts** | ❌ | ✅ |

**Visual Design**:
- Free card: Neutral colors, simple border
- Pro card: Gradient border, highlight effects, "Most Popular" badge
- CTA buttons:
  - Free users: "Upgrade to Pro" button (gradient, prominent)
  - Pro users: "Manage Subscription" button + "Cancel" link

#### Payment Integration (Phase 2)
```typescript
// Stripe integration for subscription
- Payment method management
- Subscription status tracking
- Invoice history
- Auto-renewal settings
```

**Database Schema Addition** (`convex/schema.ts`):
```typescript
subscriptions: defineTable({
  userId: v.string(),
  tier: v.union(v.literal("free"), v.literal("pro")),
  status: v.union(
    v.literal("active"),
    v.literal("canceled"),
    v.literal("past_due")
  ),
  stripeCustomerId: v.optional(v.string()),
  stripeSubscriptionId: v.optional(v.string()),
  currentPeriodStart: v.optional(v.number()),
  currentPeriodEnd: v.optional(v.number()),
  cancelAtPeriodEnd: v.optional(v.boolean()),
}).index("by_user", ["userId"])
   .index("by_stripe_customer", ["stripeCustomerId"])
```

---

### 4. **Tasks Tab**

#### Functionality
- **Preserve existing**: All current task management features
- **Enhancement**: Better visual integration with new tab system
- **Data**: Uses existing `todos` table in Convex

#### UI Updates
- Move `TodoDashboard` component into tab view
- Maintain all CRUD operations
- Keep elegant background visible
- Responsive design for mobile

---

### 5. **Documents Tab - File Management**

#### Purpose
Store and manage job application documents for easy access and drag-and-drop to applications.

#### Document Types
1. **CV/Resume**
   - Multiple versions allowed (e.g., "Resume_Tech.pdf", "Resume_Marketing.pdf")
   - Version labeling

2. **Cover Letter**
   - Template storage
   - Multiple versions

3. **Portfolio**
   - Links to external portfolios (GitHub, Behance, etc.)
   - PDF portfolio uploads

#### Features

**Upload Interface**:
```typescript
// Drag & drop zone + file picker
- Multiple file upload
- File type validation: PDF, DOCX, TXT
- Max file size: 10MB per file
- Progress indicator
- Preview thumbnails (PDF first page)
```

**Document List View**:
```
┌─────────────────────────────────────────────┐
│ 📄 Resume_Software_Engineer_2025.pdf       │
│    Uploaded: Jan 15, 2025 | 234 KB         │
│    [View] [Download] [Delete] [Drag Icon]  │
├─────────────────────────────────────────────┤
│ 📄 Cover_Letter_Template_General.docx      │
│    Uploaded: Jan 10, 2025 | 45 KB          │
│    [View] [Download] [Delete] [Drag Icon]  │
└─────────────────────────────────────────────┘
```

**Document Actions**:
- **View**: Preview in modal (PDF.js or iframe)
- **Download**: Direct download to user's device
- **Delete**: Confirmation dialog before deletion
- **Drag to Application**: Draggable element for external job application sites
- **Edit Metadata**: Rename, add notes

**File Storage**:
- **Option 1**: Convex File Storage
  ```typescript
  import { storage } from "@/convex/_generated/api";

  // Upload
  const storageId = await ctx.storage.store(file);

  // Retrieve
  const url = await ctx.storage.getUrl(storageId);
  ```

- **Option 2**: Cloud Storage (AWS S3, Cloudflare R2)
  - Better for larger files
  - CDN distribution
  - Pre-signed URLs for secure access

**Database Schema** (`convex/schema.ts`):
```typescript
documents: defineTable({
  userId: v.string(),
  fileName: v.string(),
  fileType: v.union(
    v.literal("resume"),
    v.literal("cover_letter"),
    v.literal("portfolio")
  ),
  fileFormat: v.string(), // "pdf", "docx", "txt"
  fileSize: v.number(), // bytes
  storageId: v.string(), // Convex storage ID or S3 key
  uploadedAt: v.number(),
  notes: v.optional(v.string()),
  version: v.optional(v.string()),
  metadata: v.optional(v.object({
    jobTitle: v.optional(v.string()),
    company: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  })),
}).index("by_user", ["userId"])
   .index("by_user_type", ["userId", "fileType"])
   .index("by_uploaded", ["userId", "uploadedAt"])
```

#### Drag & Drop to Applications
```typescript
// Implementation approach
- HTML5 Drag & Drop API
- DataTransfer object with file data
- Visual feedback during drag
- Compatible with most job application sites
- Fallback: Copy download link to clipboard
```

**Browser Extension Integration** (Future Enhancement):
- Auto-fill resume/cover letter fields
- Quick upload from stored documents
- One-click application completion

---

### 6. **Navigation & Layout**

#### Header Navigation (Existing HeaderNav)
- **Maintain**: Current HeaderNav component from homepage
- **Features**:
  - JobFiltr logo (links to homepage)
  - Scanner, Job Database, Dashboard links
  - Extensions dropdown
  - User authentication (UserButton or Sign In/Up)
- **Styling**: Fixed top, backdrop blur, white/10 border

#### Tab Navigation
```typescript
// Use shadcn/ui Tabs component
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="tasks">Tasks</TabsTrigger>
    <TabsTrigger value="documents">Documents</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>

  <TabsContent value="overview">
    {/* Welcome + Stats */}
  </TabsContent>

  <TabsContent value="tasks">
    <TodoDashboard />
  </TabsContent>

  <TabsContent value="documents">
    {/* Document management */}
  </TabsContent>

  <TabsContent value="settings">
    {/* Settings + Subscription */}
  </TabsContent>
</Tabs>
```

#### Sidebar (Optional)
- **Option A**: Remove sidebar for dashboard, use tabs only
- **Option B**: Keep sidebar with updated navigation items
- **Recommendation**: Use tabs for cleaner, more modern interface

---

## Design Specifications

### Background Design (PRESERVE EXISTING)

**From current `/app/tasks/page.tsx`**:
```typescript
// Base gradient
<div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.15] via-transparent to-rose-500/[0.15] blur-3xl" />

// Animated shapes (5 shapes with staggered delays)
<ElegantShape
  delay={0.3}
  width={600}
  height={140}
  rotate={12}
  gradient="from-indigo-500/[0.15]"
  className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]"
/>

// Additional shapes with different colors:
// - from-rose-500/[0.15]
// - from-violet-500/[0.15]
// - from-amber-500/[0.15]
// - from-cyan-500/[0.15]

// Bottom gradient overlay
<div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/80 pointer-events-none" />
```

**Animation specs**:
- Entrance: Fade in + slide down (opacity 0→1, y: -150→0)
- Duration: 2.4s with easeInOut
- Floating motion: Continuous y-axis movement (0→15→0 pixels, 12s loop)

### Color Scheme (PRESERVE EXISTING)

**Primary Colors**:
- **Indigo**: `#818CF8` (indigo-400) → `#6366F1` (indigo-500)
- **Purple**: `#A78BFA` (purple-400) → `#8B5CF6` (purple-500)
- **Rose**: `#FB7185` (rose-400) → `#F43F5E` (rose-500)
- **Red**: `#F87171` (red-400) → `#EF4444` (red-500)

**Gradients**:
- Hero/brand: `from-indigo-300 via-white to-rose-300`
- Accent elements: `from-indigo-400 to-violet-400`
- Buttons: `from-indigo-500 via-purple-500 to-rose-500`

**Background**:
- Base: `bg-background` (dark theme)
- Cards: `from-white/[0.08] to-white/[0.04]` with `backdrop-blur-sm`
- Borders: `border-white/10` or `border-white/20` for emphasis

**Text**:
- Primary: `text-white`
- Secondary: `text-white/70`
- Muted: `text-white/60` or `text-white/50`

### Component Styling Patterns

**Cards**:
```typescript
className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] border-white/10 backdrop-blur-sm rounded-2xl p-6"
```

**Buttons**:
```typescript
// Primary
className="bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 text-white"

// Secondary
className="bg-white/10 border border-white/20 text-white hover:bg-white/20"
```

**Input Fields**:
```typescript
className="bg-white/5 border border-white/10 text-white placeholder:text-white/50 focus:border-white/30"
```

**Badges**:
```typescript
// Free tier
className="bg-white/10 border border-white/20 text-white/80"

// Pro tier
className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-400/30 text-indigo-200"
```

---

## Implementation Plan

### Phase 1: Foundation (Days 1-2)

#### Task 1.1: Route Setup
- [ ] Rename `/app/tasks` to `/app/dashboard`
- [ ] Update all navigation links
- [ ] Update middleware if needed
- [ ] Test route access and authentication

#### Task 1.2: Layout Structure
- [ ] Create new dashboard layout with tabs
- [ ] Preserve elegant background implementation
- [ ] Add HeaderNav to dashboard page
- [ ] Implement tab navigation (Overview, Tasks, Documents, Settings)

#### Task 1.3: Database Schema Updates
- [ ] Add `subscriptions` table to `convex/schema.ts`
- [ ] Add `documents` table to `convex/schema.ts`
- [ ] Add `userProfiles` table (optional, for extended profile data)
- [ ] Run Convex schema migration

```typescript
// convex/schema.ts additions
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ... existing tables ...

  subscriptions: defineTable({
    userId: v.string(),
    tier: v.union(v.literal("free"), v.literal("pro")),
    status: v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("trialing")
    ),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
     .index("by_stripe_customer", ["stripeCustomerId"]),

  documents: defineTable({
    userId: v.string(),
    fileName: v.string(),
    fileType: v.union(
      v.literal("resume"),
      v.literal("cover_letter"),
      v.literal("portfolio")
    ),
    fileFormat: v.string(),
    fileSize: v.number(),
    storageId: v.string(),
    uploadedAt: v.number(),
    notes: v.optional(v.string()),
    version: v.optional(v.string()),
    metadata: v.optional(v.object({
      jobTitle: v.optional(v.string()),
      company: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
    })),
  }).index("by_user", ["userId"])
     .index("by_user_type", ["userId", "fileType"])
     .index("by_uploaded", ["userId", "uploadedAt"]),
});
```

---

### Phase 2: Overview Tab (Days 3-4)

#### Task 2.1: Welcome Section Component
```typescript
// components/dashboard/WelcomeSection.tsx
"use client";

import { useUser } from "@clerk/nextjs";
import { Crown, Sparkles } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function WelcomeSection() {
  const { user } = useUser();
  const subscription = useQuery(api.subscriptions.getCurrentUserSubscription);

  return (
    <div className="mb-8">
      <h1 className="text-4xl md:text-5xl font-bold mb-4">
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-purple-200">
          Hi {user?.firstName || user?.fullName || "there"}!
        </span>
      </h1>

      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-white/[0.08] to-white/[0.04] border border-white/10">
        {subscription?.tier === "pro" ? (
          <>
            <Crown className="h-5 w-5 text-indigo-400" />
            <span className="text-white font-medium">Pro Account</span>
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5 text-white/60" />
            <span className="text-white/80">Free Account</span>
          </>
        )}
      </div>
    </div>
  );
}
```

#### Task 2.2: Quick Stats Cards (Optional)
- [ ] Create `StatsCard` component
- [ ] Fetch data from Convex:
  - Total tasks completed
  - Documents uploaded
  - Recent scans
- [ ] Display in grid layout

---

### Phase 3: Settings Tab (Days 5-7)

#### Task 3.1: Profile Settings Component
```typescript
// components/dashboard/ProfileSettings.tsx
"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, User } from "lucide-react";

export function ProfileSettings() {
  const { user } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");

  const handleUpdateProfile = async () => {
    try {
      await user?.update({
        firstName,
        lastName,
      });
      setIsEditing(false);
      // Show success toast
    } catch (error) {
      // Show error toast
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await user?.setProfileImage({ file });
      // Show success toast
    } catch (error) {
      // Show error toast
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6">
        <Avatar className="h-24 w-24">
          <AvatarImage src={user?.imageUrl} />
          <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-2xl">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </AvatarFallback>
        </Avatar>

        <div>
          <Label htmlFor="avatar-upload" className="cursor-pointer">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition">
              <Upload className="h-4 w-4" />
              <span>Change Photo</span>
            </div>
          </Label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          <p className="text-sm text-white/50 mt-2">
            JPG, PNG up to 5MB
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={!isEditing}
            className="bg-white/5 border-white/10"
          />
        </div>

        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={!isEditing}
            className="bg-white/5 border-white/10"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          value={user?.primaryEmailAddress?.emailAddress || ""}
          disabled
          className="bg-white/5 border-white/10"
        />
        <p className="text-sm text-white/50 mt-1">
          {user?.externalAccounts?.length ?
            "Email managed by your OAuth provider" :
            "Contact support to change email"}
        </p>
      </div>

      <div className="flex gap-3">
        {isEditing ? (
          <>
            <Button onClick={handleUpdateProfile}>
              Save Changes
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button onClick={() => setIsEditing(true)}>
            Edit Profile
          </Button>
        )}
      </div>
    </div>
  );
}
```

#### Task 3.2: Subscription Management Component
```typescript
// components/dashboard/SubscriptionManagement.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Crown, Sparkles, X } from "lucide-react";

export function SubscriptionManagement() {
  const subscription = useQuery(api.subscriptions.getCurrentUserSubscription);
  const currentTier = subscription?.tier || "free";

  const features = [
    {
      name: "Job Scans",
      free: "10 per month",
      pro: "Unlimited",
    },
    {
      name: "Document Storage",
      free: "3 documents",
      pro: "Unlimited",
    },
    {
      name: "AI Analysis",
      free: "Basic",
      pro: "Advanced",
    },
    {
      name: "Priority Support",
      free: false,
      pro: true,
    },
    {
      name: "Export Reports",
      free: "Limited",
      pro: "Full PDF exports",
    },
    {
      name: "History",
      free: "30 days",
      pro: "Unlimited",
    },
    {
      name: "Saved Searches",
      free: "5",
      pro: "Unlimited",
    },
    {
      name: "Custom Alerts",
      free: false,
      pro: true,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Free Plan Card */}
        <Card className={`relative bg-gradient-to-br from-white/[0.08] to-white/[0.04] border-white/10 backdrop-blur-sm ${currentTier === "free" ? "ring-2 ring-white/30" : ""}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-white/60" />
                Free
              </CardTitle>
              {currentTier === "free" && (
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                  Current Plan
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-white mt-2">
              $0<span className="text-lg text-white/60">/month</span>
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {features.map((feature) => (
                <li key={feature.name} className="flex items-start gap-2">
                  {typeof feature.free === "boolean" ? (
                    feature.free ? (
                      <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="h-5 w-5 text-white/30 flex-shrink-0 mt-0.5" />
                    )
                  ) : (
                    <Check className="h-5 w-5 text-white/60 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="text-white/80">{feature.name}</span>
                    {typeof feature.free === "string" && (
                      <p className="text-sm text-white/50">{feature.free}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Pro Plan Card */}
        <Card className={`relative bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-rose-500/10 border-indigo-400/30 backdrop-blur-sm ${currentTier === "pro" ? "ring-2 ring-indigo-400" : ""}`}>
          {currentTier === "free" && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full text-sm font-medium">
              Most Popular
            </div>
          )}
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Crown className="h-5 w-5 text-indigo-400" />
                Pro
              </CardTitle>
              {currentTier === "pro" && (
                <span className="px-3 py-1 bg-indigo-500/20 rounded-full text-sm">
                  Current Plan
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-white mt-2">
              $3.99<span className="text-lg text-white/60">/month</span>
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 mb-6">
              {features.map((feature) => (
                <li key={feature.name} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-white/80">{feature.name}</span>
                    {typeof feature.pro === "string" && (
                      <p className="text-sm text-white/50">{feature.pro}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {currentTier === "free" ? (
              <Button className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 hover:opacity-90">
                Upgrade to Pro
              </Button>
            ) : (
              <div className="space-y-2">
                <Button className="w-full" variant="outline">
                  Manage Subscription
                </Button>
                <Button className="w-full" variant="ghost" size="sm">
                  Cancel Subscription
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

#### Task 3.3: Convex Functions for Subscription
```typescript
// convex/subscriptions.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getCurrentUserSubscription = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
      .first();

    // If no subscription exists, create a free tier one
    if (!subscription) {
      return {
        userId: identity.tokenIdentifier,
        tier: "free" as const,
        status: "active" as const,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }

    return subscription;
  },
});

export const createOrUpdateSubscription = mutation({
  args: {
    tier: v.union(v.literal("free"), v.literal("pro")),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        tier: args.tier,
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("subscriptions", {
        userId: identity.tokenIdentifier,
        tier: args.tier,
        status: "active",
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});
```

---

### Phase 4: Tasks Tab (Day 8)

#### Task 4.1: Integrate Existing TodoDashboard
- [ ] Move `TodoDashboard` component into tab view
- [ ] Ensure all existing functionality works
- [ ] Update styling to match new dashboard theme
- [ ] Test CRUD operations

```typescript
// In dashboard page TabsContent
<TabsContent value="tasks" className="mt-6">
  <TodoDashboard />
</TabsContent>
```

---

### Phase 5: Documents Tab (Days 9-12)

#### Task 5.1: Document Upload Component
```typescript
// components/dashboard/DocumentUpload.tsx
"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  File,
  Loader2,
  CheckCircle2
} from "lucide-react";

export function DocumentUpload() {
  const [uploading, setUploading] = useState(false);
  const uploadDocument = useMutation(api.documents.uploadDocument);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);

    for (const file of acceptedFiles) {
      try {
        // Generate storage URL
        const storageUrl = await uploadDocument({
          fileName: file.name,
          fileSize: file.size,
          fileFormat: file.type,
        });

        // Upload to Convex storage
        const response = await fetch(storageUrl, {
          method: "POST",
          body: file,
        });

        if (!response.ok) throw new Error("Upload failed");

        // Show success toast
      } catch (error) {
        // Show error toast
      }
    }

    setUploading(false);
  }, [uploadDocument]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-xl p-12 text-center
        transition-colors cursor-pointer
        ${isDragActive
          ? 'border-indigo-400 bg-indigo-500/10'
          : 'border-white/20 bg-white/5 hover:border-white/40'
        }
      `}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center gap-4">
        {uploading ? (
          <>
            <Loader2 className="h-12 w-12 text-indigo-400 animate-spin" />
            <p className="text-white">Uploading...</p>
          </>
        ) : (
          <>
            <Upload className="h-12 w-12 text-white/60" />
            <div>
              <p className="text-lg text-white mb-2">
                {isDragActive
                  ? "Drop files here"
                  : "Drag & drop files or click to browse"}
              </p>
              <p className="text-sm text-white/50">
                Supports PDF, DOC, DOCX, TXT (max 10MB)
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

#### Task 5.2: Document List Component
```typescript
// components/dashboard/DocumentList.tsx
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  Download,
  Trash2,
  Eye,
  GripVertical,
  Edit
} from "lucide-react";
import { formatBytes, formatDate } from "@/lib/utils";

export function DocumentList() {
  const documents = useQuery(api.documents.getUserDocuments);
  const deleteDocument = useMutation(api.documents.deleteDocument);

  const handleDownload = async (storageId: string, fileName: string) => {
    const url = await getDownloadUrl(storageId);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (documentId: string) => {
    if (confirm("Are you sure you want to delete this document?")) {
      await deleteDocument({ documentId });
    }
  };

  if (!documents?.length) {
    return (
      <div className="text-center py-12 text-white/50">
        <FileText className="h-12 w-12 mx-auto mb-4 text-white/30" />
        <p>No documents uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <Card
          key={doc._id}
          className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] border-white/10 backdrop-blur-sm"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <GripVertical className="h-5 w-5 text-white/40 cursor-move" />
              <FileText className="h-8 w-8 text-indigo-400" />

              <div className="flex-1">
                <h4 className="text-white font-medium">{doc.fileName}</h4>
                <p className="text-sm text-white/50">
                  {formatDate(doc.uploadedAt)} · {formatBytes(doc.fileSize)}
                </p>
                {doc.notes && (
                  <p className="text-sm text-white/60 mt-1">{doc.notes}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDownload(doc.storageId, doc.fileName)}
              >
                <Download className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(doc._id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

#### Task 5.3: Convex Functions for Documents
```typescript
// convex/documents.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getUserDocuments = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
      .order("desc")
      .collect();
  },
});

export const uploadDocument = mutation({
  args: {
    fileName: v.string(),
    fileSize: v.number(),
    fileFormat: v.string(),
    fileType: v.optional(v.union(
      v.literal("resume"),
      v.literal("cover_letter"),
      v.literal("portfolio")
    )),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Generate upload URL
    const storageId = await ctx.storage.generateUploadUrl();

    // Create document record
    await ctx.db.insert("documents", {
      userId: identity.tokenIdentifier,
      fileName: args.fileName,
      fileSize: args.fileSize,
      fileFormat: args.fileFormat,
      fileType: args.fileType || "resume",
      storageId,
      uploadedAt: Date.now(),
      notes: args.notes,
    });

    return storageId;
  },
});

export const deleteDocument = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const document = await ctx.db.get(args.documentId);
    if (!document) throw new Error("Document not found");
    if (document.userId !== identity.tokenIdentifier) {
      throw new Error("Unauthorized");
    }

    // Delete from storage
    await ctx.storage.delete(document.storageId);

    // Delete record
    await ctx.db.delete(args.documentId);
  },
});

export const getDocumentUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
```

---

### Phase 6: Testing & Polish (Days 13-14)

#### Task 6.1: Functional Testing
- [ ] Test all tabs switch correctly
- [ ] Verify profile update functionality
- [ ] Test file upload/download/delete
- [ ] Verify subscription display
- [ ] Test task CRUD operations
- [ ] Test on multiple screen sizes (mobile, tablet, desktop)
- [ ] Test with different auth methods (email, OAuth)

#### Task 6.2: Visual Testing
- [ ] Verify background animations work smoothly
- [ ] Check color consistency across components
- [ ] Test hover/focus states
- [ ] Verify responsive layouts
- [ ] Check accessibility (keyboard navigation, screen readers)

#### Task 6.3: Performance Testing
- [ ] Check page load time
- [ ] Verify smooth animations
- [ ] Test file upload performance
- [ ] Check database query efficiency
- [ ] Optimize image loading

#### Task 6.4: Documentation
- [ ] Take screenshots of each tab
- [ ] Record video walkthrough
- [ ] Document any bugs found
- [ ] Create user guide (optional)

---

## File Structure

```
app/
  dashboard/
    page.tsx (new - main dashboard)
    layout.tsx (updated - add HeaderNav)

components/
  dashboard/
    WelcomeSection.tsx (new)
    ProfileSettings.tsx (new)
    SubscriptionManagement.tsx (new)
    DocumentUpload.tsx (new)
    DocumentList.tsx (new)
    TabNavigation.tsx (new)
  HeaderNav.tsx (existing - reuse)
  TodoDashboard.tsx (existing - integrate)
  ElegantBackground.tsx (existing - reuse)

convex/
  schema.ts (updated - add subscriptions, documents)
  subscriptions.ts (new)
  documents.ts (new)
  todos.ts (existing)

lib/
  utils.ts (add formatBytes, formatDate utilities)
```

---

## Dependencies to Install

```bash
# File upload
npm install react-dropzone

# PDF preview (optional)
npm install react-pdf

# Date formatting
npm install date-fns

# Payment (Phase 2)
npm install @stripe/stripe-js stripe
```

---

## Testing Checklist

### Navigation
- [ ] Header navigation works on all pages
- [ ] Tab switching is smooth
- [ ] Mobile menu functions correctly
- [ ] All links navigate to correct pages

### Authentication
- [ ] Protected routes redirect if not logged in
- [ ] User data displays correctly
- [ ] Sign out works properly
- [ ] OAuth and email login both work

### Profile Settings
- [ ] Name updates successfully
- [ ] Profile picture uploads
- [ ] Email displays correctly (editable vs not)
- [ ] Changes persist after page refresh

### Subscription
- [ ] Current plan displays correctly
- [ ] Feature comparison is accurate
- [ ] Upgrade button appears for free users
- [ ] Manage button appears for pro users

### Tasks
- [ ] Create new task works
- [ ] Edit task works
- [ ] Delete task works
- [ ] Mark complete/incomplete works
- [ ] Tasks persist across sessions

### Documents
- [ ] File upload works (drag & drop and click)
- [ ] File type validation works
- [ ] File size limit enforced
- [ ] Download works
- [ ] Delete works (with confirmation)
- [ ] File list updates in real-time

### Visual/UX
- [ ] Background animations smooth
- [ ] Colors consistent with design
- [ ] Responsive on mobile
- [ ] No layout shifts
- [ ] Loading states clear
- [ ] Error messages helpful

---

## Success Criteria

1. ✅ Dashboard accessible at `/dashboard` route
2. ✅ All 4 tabs functional (Overview, Tasks, Documents, Settings)
3. ✅ HeaderNav present and working
4. ✅ Background design matches homepage
5. ✅ User greeting displays with first name
6. ✅ Account type badge shows Free or Pro
7. ✅ Profile settings allow name and photo updates
8. ✅ Subscription comparison clearly shows Free vs Pro
9. ✅ Document upload/download/delete works
10. ✅ Tasks tab preserves all existing functionality
11. ✅ Responsive design works on all devices
12. ✅ No console errors
13. ✅ Screenshots and videos captured for documentation

---

## Future Enhancements (Post-MVP)

### Payment Integration
- Stripe checkout for Pro subscription
- Subscription management portal
- Invoice history
- Payment method management

### Advanced Document Features
- Document versioning
- Collaborative editing
- Template library
- AI-powered resume optimization

### Analytics Dashboard
- Job search statistics
- Application tracking
- Success rate metrics
- Time-saving calculations

### Notifications
- Email alerts for subscription renewals
- Document expiration reminders
- Task deadlines
- Job match alerts

---

## Notes & Considerations

### Security
- All routes protected with Clerk authentication
- File uploads validated (type, size)
- User data scoped by `userId`
- Subscription tier enforced in backend

### Performance
- Lazy load tabs for faster initial render
- Optimize image sizes
- Use Convex pagination for large document lists
- Cache subscription status

### Accessibility
- Keyboard navigation for all features
- ARIA labels on interactive elements
- Focus management in modals
- High contrast text

### Mobile Experience
- Touch-friendly targets (min 44x44px)
- Swipe gestures for tabs (optional)
- Responsive file upload
- Collapsible sections for space

---

## Implementation Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| Phase 1 | 2 days | Route setup, layout, database schema |
| Phase 2 | 2 days | Overview tab with welcome and stats |
| Phase 3 | 3 days | Settings tab (profile + subscription) |
| Phase 4 | 1 day | Tasks tab integration |
| Phase 5 | 4 days | Documents tab with upload/management |
| Phase 6 | 2 days | Testing, polish, documentation |
| **Total** | **14 days** | Complete dashboard redesign |

---

## Resources & References

### Design Inspiration
- Current `/tasks` page background
- Homepage color scheme
- shadcn/ui component examples

### Documentation
- [Convex File Storage](https://docs.convex.dev/file-storage)
- [Clerk User Management](https://clerk.com/docs/users/overview)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Framer Motion](https://www.framer.com/motion/)

### Components
- [shadcn/ui Tabs](https://ui.shadcn.com/docs/components/tabs)
- [shadcn/ui Avatar](https://ui.shadcn.com/docs/components/avatar)
- [React Dropzone](https://react-dropzone.js.org/)

---

**Plan Status**: Ready for Implementation
**Next Step**: Begin Phase 1 - Foundation setup
**Priority**: High
**Estimated LOE**: 14 days (solo developer)

---

*This plan is a living document and may be updated as implementation progresses.*
