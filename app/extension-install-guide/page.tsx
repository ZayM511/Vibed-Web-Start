"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Download, Chrome, Settings, Zap, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ExtensionInstallGuidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-indigo-950/20 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl">
              <Chrome className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            Install JobFiltr Extension
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Follow these simple steps to install the JobFiltr Chrome extension and start detecting job scams
          </p>
        </motion.div>

        {/* Installation Steps */}
        <div className="space-y-6 mb-12">
          {/* Step 1 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="border-indigo-500/30 bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    1
                  </div>
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 mb-2">
                      <Download className="h-5 w-5 text-indigo-400" />
                      Download the Extension
                    </CardTitle>
                    <CardDescription>
                      Get the JobFiltr extension ZIP file
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pl-20">
                <p className="text-muted-foreground mb-4">
                  If you haven&apos;t already downloaded the extension, click the button below:
                </p>
                <Button
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = '/chrome-extension.zip';
                    link.download = 'jobfiltr-extension.zip';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Extension
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Step 2 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="border-indigo-500/30 bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    2
                  </div>
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 mb-2">
                      <Zap className="h-5 w-5 text-indigo-400" />
                      Unzip the File
                    </CardTitle>
                    <CardDescription>
                      Extract the extension files to a folder
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pl-20">
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>Locate the downloaded <code className="px-2 py-1 bg-muted rounded text-sm">jobfiltr-extension.zip</code> file</li>
                  <li>Right-click on the ZIP file and select &quot;Extract All...&quot; or use your preferred unzip tool</li>
                  <li>Choose a permanent location (e.g., <code className="px-2 py-1 bg-muted rounded text-sm">C:\Extensions\JobFiltr</code>)</li>
                  <li>Remember this location - you&apos;ll need it in the next steps</li>
                </ol>
                <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-200">
                    <strong>Important:</strong> Don&apos;t delete the unzipped folder after installation. Chrome needs these files to run the extension.
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Step 3 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="border-indigo-500/30 bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    3
                  </div>
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 mb-2">
                      <Chrome className="h-5 w-5 text-indigo-400" />
                      Open Chrome Extensions
                    </CardTitle>
                    <CardDescription>
                      Navigate to Chrome&apos;s extension management page
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pl-20">
                <p className="text-muted-foreground mb-3">
                  Open Google Chrome and go to the extensions page using one of these methods:
                </p>
                <div className="space-y-2">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <strong className="text-sm">Method 1:</strong> Type <code className="ml-2 px-2 py-1 bg-background rounded text-sm text-indigo-400">chrome://extensions/</code> in the address bar
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <strong className="text-sm">Method 2:</strong> Click the three dots menu → More Tools → Extensions
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Step 4 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="border-indigo-500/30 bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    4
                  </div>
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 mb-2">
                      <Settings className="h-5 w-5 text-indigo-400" />
                      Enable Developer Mode
                    </CardTitle>
                    <CardDescription>
                      Turn on developer mode to load unpacked extensions
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pl-20">
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>Look for the &quot;Developer mode&quot; toggle in the top-right corner</li>
                  <li>Click the toggle to turn it ON (it should turn blue)</li>
                  <li>New buttons will appear: &quot;Load unpacked,&quot; &quot;Pack extension,&quot; and &quot;Update&quot;</li>
                </ol>
              </CardContent>
            </Card>
          </motion.div>

          {/* Step 5 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Card className="border-green-500/30 bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    5
                  </div>
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                      Load the Extension
                    </CardTitle>
                    <CardDescription>
                      Install JobFiltr into Chrome
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pl-20">
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground mb-4">
                  <li>Click the &quot;Load unpacked&quot; button</li>
                  <li>Navigate to the folder where you unzipped the extension</li>
                  <li>Select the <strong>chrome-extension</strong> folder (the one containing manifest.json)</li>
                  <li>Click &quot;Select Folder&quot;</li>
                </ol>
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-200">
                    <strong>Success!</strong> The JobFiltr extension should now appear in your list of installed extensions.
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Step 6 - Optional */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <Card className="border-purple-500/30 bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    6
                  </div>
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 mb-2">
                      <Zap className="h-5 w-5 text-purple-400" />
                      Pin the Extension (Optional)
                    </CardTitle>
                    <CardDescription>
                      Keep JobFiltr easily accessible
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pl-20">
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>Click the puzzle piece icon in Chrome&apos;s toolbar</li>
                  <li>Find &quot;JobFiltr - Scam & Ghost Job Detector&quot; in the list</li>
                  <li>Click the pin icon next to it</li>
                  <li>The JobFiltr icon will now be visible in your toolbar</li>
                </ol>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <Card className="border-indigo-500/50 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl">🎉 You&apos;re All Set!</CardTitle>
              <CardDescription>Start using JobFiltr to protect yourself from job scams</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Now you can browse job boards with confidence. JobFiltr will automatically detect when you&apos;re on a supported job site and analyze postings for scams and ghost jobs.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/filtr" className="flex-1">
                  <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">
                    Try Web Version
                  </Button>
                </Link>
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Back to Home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Troubleshooting */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-12"
        >
          <h2 className="text-2xl font-bold mb-6">Troubleshooting</h2>
          <div className="space-y-4">
            <details className="group">
              <summary className="cursor-pointer p-4 bg-card border border-border rounded-lg hover:bg-accent transition-colors">
                <span className="font-semibold">Extension doesn&apos;t appear after installation</span>
              </summary>
              <div className="p-4 bg-muted/50 rounded-b-lg border-x border-b border-border -mt-1">
                <p className="text-muted-foreground">Make sure you selected the correct folder (the one containing manifest.json). Try refreshing the extensions page and loading it again.</p>
              </div>
            </details>

            <details className="group">
              <summary className="cursor-pointer p-4 bg-card border border-border rounded-lg hover:bg-accent transition-colors">
                <span className="font-semibold">&quot;Manifest file is missing or unreadable&quot; error</span>
              </summary>
              <div className="p-4 bg-muted/50 rounded-b-lg border-x border-b border-border -mt-1">
                <p className="text-muted-foreground">You may have selected the wrong folder. Make sure you&apos;re selecting the folder that contains manifest.json, not a parent or subfolder.</p>
              </div>
            </details>

            <details className="group">
              <summary className="cursor-pointer p-4 bg-card border border-border rounded-lg hover:bg-accent transition-colors">
                <span className="font-semibold">Extension is not working on job sites</span>
              </summary>
              <div className="p-4 bg-muted/50 rounded-b-lg border-x border-b border-border -mt-1">
                <p className="text-muted-foreground">Try refreshing the job page. If issues persist, check that the extension is enabled in chrome://extensions/ and that you&apos;re on a supported job board (LinkedIn, Indeed, Glassdoor, etc.).</p>
              </div>
            </details>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
