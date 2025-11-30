# JobFiltr - AI-Powered Job Posting Verification Platform

A modern full-stack TypeScript application that uses AI and web research to detect ghost jobs, scams, and red flags in job postings. Built with Next.js, Convex, and Clerk authentication.

## ✨ Key Features

### JobFiltr Scanner
- **AI-Powered Analysis**: Advanced OpenAI-based job posting evaluation
- **Web Research Integration**: Comprehensive company verification using Tavily API
  - Company website and legitimacy verification
  - Official careers page cross-referencing
  - Duplicate job posting detection across major job boards
  - Company reputation research from trusted sources
- **Smart Red Flag Detection**: Identifies common scam patterns and ghost job indicators
- **Community Reviews**: Share and read experiences from other job seekers
- **Beautiful UI**: Modern, luxury-themed interface with animated scanning effects

## 🚀 Tech Stack

- **Frontend**: Next.js 15 with App Router, Tailwind CSS 4
- **Backend**: Convex (real-time database and serverless functions)
- **AI**: OpenAI GPT-4o-mini for job analysis
- **Web Search**: Tavily API for company verification
- **Authentication**: Clerk
- **Language**: TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components

## 📋 Prerequisites

Before you begin, make sure you have:

- Node.js 18+ installed
- npm or yarn package manager
- A Clerk account (free) - [Sign up here](https://clerk.com)
- A Convex account (free) - [Sign up here](https://convex.dev)
- An OpenAI API key - [Get one here](https://platform.openai.com/api-keys)
- A Tavily API key (optional, for web research) - [Get one here](https://tavily.com)

## 🛠️ Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd template-nextjs-clerk
npm install
```

### 2. Set Up Convex

1. **Create a Convex account**: Go to [convex.dev](https://convex.dev) and sign up
2. **Install Convex CLI**:
   ```bash
   npm install -g convex
   ```
3. **Login to Convex**:
   ```bash
   npx convex login
   ```
4. **Initialize your project**:
   ```bash
   npx convex dev
   ```
   - This will create a new Convex project and give you a deployment URL
   - Copy the deployment URL (it looks like `https://your-project.convex.cloud`)

### 3. Set Up Clerk

1. **Create a Clerk account**: Go to [clerk.com](https://clerk.com) and sign up
2. **Create a new application** in your Clerk dashboard
3. **Get your keys** from the Clerk dashboard:
   - Go to "API Keys" in your Clerk dashboard
   - Copy the "Publishable key" and "Secret key"

### 4. Configure JWT Template in Clerk

This is **critical** for Clerk to work with Convex:

1. In your Clerk dashboard, go to **"JWT Templates"**
2. Click **"New template"**
3. Select **"Convex"** from the list
4. Name it `convex` (lowercase)
5. Set the **Issuer** to your Clerk domain (e.g., `https://your-app.clerk.accounts.dev`)
6. Save the template

### 5. Environment Variables

Create a `.env.local` file in your project root:

```env
# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**Where to find these:**
- `NEXT_PUBLIC_CONVEX_URL`: From step 2 when you ran `npx convex dev`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk dashboard → API Keys → Publishable key
- `CLERK_SECRET_KEY`: Clerk dashboard → API Keys → Secret key

### 6. Configure Convex Environment Variables

1. Go to your [Convex dashboard](https://dashboard.convex.dev)
2. Select your project
3. Go to **"Settings"** → **"Environment Variables"**
4. Add these variables:
   ```
   CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev
   OPENAI_API_KEY=sk-...your-openai-key...
   TAVILY_API_KEY=tvly-...your-tavily-key...
   ```

   **Important Notes:**
   - Replace `https://your-app.clerk.accounts.dev` with your actual Clerk issuer domain from step 4
   - Get your OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Get your Tavily API key from [Tavily](https://tavily.com) (optional but recommended for full web research features)
   - Without Tavily API, the scanner will still work but with limited company verification capabilities

### 7. Update Convex Auth Config

Update `convex/auth.config.ts` with your Clerk domain:

```typescript
export default {
  providers: [
    {
      domain: "https://your-app.clerk.accounts.dev", // Replace with your domain
      applicationID: "convex",
    },
  ]
};
```

## 🏃‍♂️ Running the Application

### Development Mode

```bash
# Run both frontend and backend
npm run dev
```

This starts:
- Next.js frontend at `http://localhost:3000`
- Convex backend (dashboard opens automatically)

### Individual Services

```bash
# Frontend only
npm run dev:frontend

# Backend only
npm run dev:backend
```

### Production

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🔧 Available Scripts

- `npm run dev` - Start development servers (frontend + backend)
- `npm run dev:frontend` - Start only Next.js frontend
- `npm run dev:backend` - Start only Convex backend
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 📁 Project Structure

```
├── app/                         # Next.js pages (App Router)
│   ├── filtr/                   # JobFiltr scanner page
│   ├── tasks/                   # Task management
│   └── layout.tsx               # Root layout with providers
├── components/                  # React components
│   ├── scanner/                 # JobFiltr scanner components
│   │   ├── UnifiedScanForm.tsx
│   │   ├── UnifiedScanResults.tsx
│   │   ├── EnhancedCommunityReviewForm.tsx
│   │   └── ScanHistoryList.tsx
│   ├── ui/                      # shadcn/ui components
│   └── app-sidebar.tsx          # Main navigation sidebar
├── convex/                      # Backend functions and schema
│   ├── auth.config.ts           # Clerk authentication config
│   ├── schema.ts                # Database schema (jobScans, communityReviews)
│   ├── ghostJobDetector.ts      # AI analysis with web research
│   ├── jobScans.ts              # Job scan mutations and queries
│   └── communityReviews.ts      # Community review functions
├── public/                      # Static assets
├── middleware.ts                # Route protection
└── .env.example                 # Environment variable template
```

## 🔐 Authentication Flow

This application includes:
- Sign up/Sign in pages via Clerk
- Protected routes using middleware (JobFiltr requires authentication)
- User session management
- Integration between Clerk and Convex for authenticated API calls
- User-specific data isolation (users can only see their own scans)

## 🗄️ Database Schema

The application uses Convex with the following main tables:

### jobScans
Stores job posting analysis results including:
- User ID (row-level security)
- Job input (URL or text)
- AI analysis report with red flags and confidence scores
- Web research results (company verification, duplicate postings, etc.)
- Timestamp

### communityReviews
User-submitted reviews for job postings:
- Reference to jobScan
- User experiences (did apply, got ghosted, etc.)
- Comments and recommendations
- Submission date

All data is real-time synchronized across clients and includes TypeScript type safety.

## 🎯 Using JobFiltr

1. **Navigate to JobFiltr**: Click "JobFiltr" in the sidebar or visit `/filtr`
2. **Choose scan type**:
   - **Quick Scan**: Fast AI analysis with community insights
   - **Deep Analysis**: Comprehensive web research + AI evaluation
3. **Input job posting**:
   - Paste a job posting URL (LinkedIn, Indeed, Glassdoor, etc.)
   - Or copy/paste the full job description text
4. **Review results**:
   - Legitimacy score and verdict (scam/ghost job/legitimate)
   - Detailed red flags with severity ratings
   - Web research verification (company website, careers page, duplicates)
   - AI analysis and recommendations
5. **Share your experience**: Help the community by submitting a review

## 🆘 Troubleshooting

### Common Issues

1. **"Convex client not configured"**
   - Check your `NEXT_PUBLIC_CONVEX_URL` in `.env.local`
   - Make sure Convex dev server is running (`npm run dev`)

2. **Authentication not working**
   - Verify JWT template is created in Clerk with issuer domain
   - Check `CLERK_JWT_ISSUER_DOMAIN` in Convex dashboard
   - Ensure `convex/auth.config.ts` has correct domain

3. **AI analysis failing**
   - Verify `OPENAI_API_KEY` is set in Convex dashboard
   - Check your OpenAI API key is valid and has credits
   - Review Convex function logs in the dashboard

4. **Web research not working**
   - Verify `TAVILY_API_KEY` is set in Convex dashboard (optional)
   - Without Tavily, analysis will still work but with limited verification
   - Check Tavily API key is valid at [tavily.com](https://tavily.com)

5. **Build errors**
   - Run `npm run lint` to check for linting issues
   - Ensure all environment variables are set
   - Clear `.next` folder and rebuild: `rm -rf .next && npm run build`

### Getting Help

- [Convex Documentation](https://docs.convex.dev)
- [Clerk Documentation](https://clerk.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repo to [Vercel](https://vercel.com)
3. Add your environment variables in Vercel dashboard
4. Deploy!

### Deploy Convex

Convex automatically deploys when you push to your main branch. Configure this in your Convex dashboard under "Settings" → "Deploy Settings".

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

**Happy coding! 🎉**

For questions or issues, please open a GitHub issue or check the documentation links above.