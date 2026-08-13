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
      <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
        {children}
      </div>
    </ProtectedRoute>
  );
}
