"use client";

import { useState } from "react";
import { ElegantBackground } from "@/components/ElegantBackground";
import { EnhancedScanForm } from "@/components/scanner/EnhancedScanForm";
import { FiltrPageHeader } from "@/components/FiltrPageHeader";

export default function ScannerDemoPage() {
  const [isScanning, setIsScanning] = useState(false);

  const handleManualScan = async (data: { jobInput: string; context?: string }) => {
    setIsScanning(true);
    // Simulate scanning
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsScanning(false);
    alert("Deep Analysis completed! (Demo)");
  };

  const handleGhostJobScan = async (data: { jobInput: string; jobUrl?: string; context?: string }) => {
    setIsScanning(true);
    // Simulate scanning
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsScanning(false);
    alert("Quick Scan completed! (Demo)");
  };

  return (
    <ElegantBackground>
      <div className="container max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <FiltrPageHeader />

        <div className="max-w-4xl mx-auto mt-8">
          <EnhancedScanForm
            onManualScan={handleManualScan}
            onGhostJobScan={handleGhostJobScan}
            isScanning={isScanning}
          />
        </div>
      </div>
    </ElegantBackground>
  );
}
