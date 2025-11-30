"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { HeaderNav } from "@/components/HeaderNav";

export default function DebugPage() {
  const debugData = useQuery(api.trainingData.debugTrainingData);

  return (
    <>
      <HeaderNav />
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-4">Debug: Training Data</h1>

        {!debugData ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
              <h2 className="font-bold text-xl mb-2">Status</h2>
              <p>Authenticated: {debugData.authenticated ? "Yes" : "No"}</p>
              {debugData.userId && <p>User ID: {debugData.userId}</p>}
              {debugData.error && <p className="text-red-500">Error: {debugData.error}</p>}
            </div>

            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
              <h2 className="font-bold text-xl mb-2">Counts</h2>
              <p>Total Training Data: {debugData.totalCount}</p>
              <p>Unlabeled: {debugData.unlabeledCount}</p>
            </div>

            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
              <h2 className="font-bold text-xl mb-2">Recent Items (First 3)</h2>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(debugData.recentItems, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
