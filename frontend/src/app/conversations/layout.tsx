'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/protected-route';

export default function ConversationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden font-sans text-gray-900 dark:text-gray-100 transition-colors">
        {children}
      </div>
    </ProtectedRoute>
  );
}
