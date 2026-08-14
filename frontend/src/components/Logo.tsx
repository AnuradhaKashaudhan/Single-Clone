import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export default function Logo({ className = "w-12 h-12", ...props }: LogoProps) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 120 120" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path 
        d="M60 15C35 15 15 35 15 60C15 70 19 79 26 86L15 105l21-6c7 4 15 7 24 7C85 106 105 85 105 60C105 35 85 15 60 15Z" 
        stroke="#3b82f6" 
        strokeWidth="4" 
        strokeDasharray="7 6" 
        strokeLinecap="round" 
      />
      <path 
        d="M60 23C42 23 27 36 27 55C27 63 30 70 35 75L27 91l16-4.5C48 89 54 90 60 90C78 90 93 77 93 55C93 33 78 23 60 23Z" 
        fill="#3b82f6" 
      />
    </svg>
  );
}
