'use client';
import React, { useRef, useEffect } from 'react';

const EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '😡'];

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  userReactions: string[]; // emojis the current user already added
}

export default function ReactionPicker({ onSelect, onClose, userReactions }: ReactionPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 bottom-8 left-0 flex gap-1 bg-white dark:bg-[#2C2C2E] rounded-full shadow-lg border border-gray-200 dark:border-gray-700 px-2 py-1.5"
    >
      {EMOJIS.map((emoji) => {
        const isActive = userReactions.includes(emoji);
        return (
          <button
            key={emoji}
            onClick={() => { onSelect(emoji); onClose(); }}
            className={`text-[20px] leading-none rounded-full p-1 transition-transform hover:scale-125 ${isActive ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30' : ''}`}
            title={emoji}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );
}
