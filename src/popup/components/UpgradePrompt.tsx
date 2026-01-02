import React from 'react';

interface UpgradePromptProps {
  feature: string;
  message: string;
}

export function UpgradePrompt({ feature, message }: UpgradePromptProps) {
  const handleUpgrade = () => {
    chrome.tabs.create({
      url: `https://jobfiltr.com/pricing?feature=${feature}`
    });
  };

  return (
    <button
      onClick={handleUpgrade}
      className="w-full py-1.5 bg-purple-600 text-white text-[10px] font-medium rounded hover:bg-purple-700 transition-colors flex items-center justify-center gap-1"
    >
      <span>✨</span>
      <span>{message}</span>
    </button>
  );
}
