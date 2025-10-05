'use client';

import { Suspense } from 'react';
import WelcomeContent from './WelcomeContent';

export default function WelcomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">読み込み中...</p>
      </div>
    </div>}>
      <WelcomeContent />
    </Suspense>
  );
}