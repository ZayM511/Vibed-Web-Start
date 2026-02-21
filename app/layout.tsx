import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { ClerkProvider } from "@clerk/nextjs";
import ClientBody from "@/components/ClientBody";
import { Toaster } from "@/components/ui/sonner";
import { PageLoadingIndicator } from "@/components/PageLoadingIndicator";
import { ErrorNotifications } from "@/components/error-notifications";
import { GpcBanner } from "@/components/GpcBanner";
import { PageViewTracker } from "@/components/PageViewTracker";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JobFiltr - Your Job Search, Upgraded",
  description: "Your job search, upgraded. JobFiltr detects ghost jobs, scams, and spam on LinkedIn and Indeed with AI-powered filters and community reports.",
  icons: {
    icon: "/jobfiltr-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <ClientBody className={`${geistMono.variable} antialiased font-mona-regular`}>
          <ClerkProvider
            dynamic
            appearance={{
              variables: {
                colorPrimary: "#ffffff",
                colorBackground: "#000000",
                colorInputBackground: "#1a1a1a",
                colorInputText: "#ffffff",
                colorText: "#ffffff",
                colorTextSecondary: "#b3b3b3",
                colorNeutral: "#3a3a3a",
                colorDanger: "#dc2626",
                colorSuccess: "#10b981",
                colorWarning: "#f59e0b",
                borderRadius: "0.625rem",
              },
              elements: {
                card: "bg-[#1a1a1a] border-[#3a3a3a]",
                headerTitle: "text-white",
                headerSubtitle: "text-[#b3b3b3]",
                socialButtonsBlockButton: "border-[#3a3a3a] hover:bg-[#2a2a2a]",
                formButtonPrimary: "bg-white text-black hover:bg-gray-200",
                formFieldInput: "bg-[#1a1a1a] border-[#3a3a3a] text-white",
                footerActionLink: "text-white hover:text-gray-300",
                // Error messages & validation text
                formFieldLabel: "text-white text-sm",
                formFieldErrorText: "text-red-400 text-sm",
                formFieldWarningText: "text-yellow-400 text-xs",
                formFieldSuccessText: "text-emerald-400 text-sm",
                formFieldInfoText: "text-blue-400 text-sm",
                // Password visibility toggle
                formFieldInputShowPasswordButton: "text-white/60 hover:text-white focus:text-white",
                // Divider between social + email options
                dividerLine: "bg-white/20",
                dividerText: "text-white/50",
                // Other form elements for dark theme
                formFieldAction: "text-white/70 hover:text-white",
                identityPreviewEditButton: "text-white/70 hover:text-white",
                formResendCodeLink: "text-white/70 hover:text-white",
                otpCodeFieldInput: "bg-[#1a1a1a] border-[#3a3a3a] text-white",
                alternativeMethodsBlockButton: "text-white/70 border-[#3a3a3a] hover:bg-[#2a2a2a]",
                alert: "bg-red-900/30 border-red-500/30 text-red-300",
                alertText: "text-red-300",
              }
            }}
          >
            <ConvexClientProvider>
              <PageLoadingIndicator />
              <ErrorNotifications />
              <GpcBanner />
              <PageViewTracker />
              {children}
            </ConvexClientProvider>
            <Toaster />
          </ClerkProvider>
        </ClientBody>
      </body>
    </html>
  );
}
