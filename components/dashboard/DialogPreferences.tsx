"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, CheckCircle2, XCircle } from "lucide-react";

interface DialogPreference {
  key: string;
  label: string;
  description: string;
}

const DIALOG_PREFERENCES: DialogPreference[] = [
  {
    key: "document-delete-no-confirm",
    label: "Document Deletion",
    description: "Skip confirmation when deleting documents",
  },
  // Add more dialog preferences here as needed
];

export function DialogPreferences() {
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Load all preferences from localStorage
    const prefs: Record<string, boolean> = {};
    DIALOG_PREFERENCES.forEach((pref) => {
      prefs[pref.key] = localStorage.getItem(pref.key) === "true";
    });
    setPreferences(prefs);
  }, []);

  const resetPreference = (key: string) => {
    localStorage.removeItem(key);
    setPreferences((prev) => ({
      ...prev,
      [key]: false,
    }));
  };

  const resetAllPreferences = () => {
    DIALOG_PREFERENCES.forEach((pref) => {
      localStorage.removeItem(pref.key);
    });
    setPreferences(
      DIALOG_PREFERENCES.reduce((acc, pref) => {
        acc[pref.key] = false;
        return acc;
      }, {} as Record<string, boolean>)
    );
  };

  return (
    <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-sm border-white/10">
      <CardHeader>
        <CardTitle className="text-2xl text-white">Dialog Preferences</CardTitle>
        <CardDescription className="text-white/60">
          Manage your &quot;Don&apos;t show this again&quot; preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {DIALOG_PREFERENCES.map((pref) => (
          <div
            key={pref.key}
            className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-white font-medium">{pref.label}</h3>
                {preferences[pref.key] ? (
                  <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Enabled
                  </Badge>
                ) : (
                  <Badge className="bg-white/10 text-white/50 border-white/20">
                    <XCircle className="h-3 w-3 mr-1" />
                    Disabled
                  </Badge>
                )}
              </div>
              <p className="text-white/50 text-sm">{pref.description}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => resetPreference(pref.key)}
              disabled={!preferences[pref.key]}
              className="ml-4 border-white/20 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        ))}

        <div className="pt-4 border-t border-white/10">
          <Button
            onClick={resetAllPreferences}
            variant="outline"
            className="w-full border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset All Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
