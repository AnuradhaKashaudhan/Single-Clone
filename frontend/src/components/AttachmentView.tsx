'use client';
import React, { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Attachment {
  id: number;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
}

interface AttachmentViewProps {
  attachment: Attachment;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentView({ attachment }: AttachmentViewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isImage = attachment.mime_type.startsWith('image/');
  const fileUrl = `${API_URL}${attachment.file_path}`;

  if (isImage) {
    return (
      <>
        <div
          className="mt-1.5 rounded-lg overflow-hidden cursor-pointer max-w-[280px]"
          onClick={() => setLightboxOpen(true)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fileUrl}
            alt={attachment.file_name}
            className="w-full object-cover rounded-lg max-h-56 hover:opacity-90 transition-opacity"
            loading="lazy"
          />
          <div className="text-[10px] text-current/60 mt-1 truncate max-w-[270px]">
            {attachment.file_name}
          </div>
        </div>

        {/* Lightbox */}
        {lightboxOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setLightboxOpen(false)}
          >
            <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl}
                alt={attachment.file_name}
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
              />
              <button
                onClick={() => setLightboxOpen(false)}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                ✕
              </button>
              <div className="text-white text-sm text-center mt-2 opacity-70">
                {attachment.file_name} · {formatBytes(attachment.file_size)}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // File (non-image)
  const ext = attachment.file_name.split('.').pop()?.toUpperCase() || 'FILE';
  return (
    <a
      href={fileUrl}
      download={attachment.file_name}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1.5 flex items-center gap-3 p-2.5 bg-black/10 dark:bg-white/10 rounded-lg hover:bg-black/15 dark:hover:bg-white/15 transition-colors max-w-[280px] group"
    >
      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">{ext}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium truncate">{attachment.file_name}</div>
        <div className="text-[11px] opacity-60">{formatBytes(attachment.file_size)}</div>
      </div>
      <svg className="w-4 h-4 opacity-50 group-hover:opacity-80 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    </a>
  );
}
