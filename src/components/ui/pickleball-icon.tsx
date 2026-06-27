import React from 'react';

interface PickleballIconProps extends React.ComponentPropsWithoutRef<'svg'> {
  className?: string;
}

export function PickleballPaddle({ className, ...props }: PickleballIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Paddle face */}
      <rect x="6" y="3" width="10" height="11" rx="3" ry="3" />
      {/* Face design line (subtle curve or style inside the paddle) */}
      <path d="M6 9c2-1 4-1 6 0s4 1 6 0" strokeWidth="1" opacity="0.7" />
      {/* Handle throat (the triangular joint) */}
      <path d="M9 14l2.5 3h1l2.5-3" />
      {/* Handle grip */}
      <rect x="10.5" y="17" width="3" height="5" rx="0.5" fill="currentColor" stroke="none" />
      <line x1="12" y1="17" x2="12" y2="22" strokeWidth="1.5" stroke="currentColor" />
      {/* Small pickleball ball */}
      <circle cx="18" cy="18" r="2.5" />
      <circle cx="18" cy="18" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="16.8" cy="17.2" r="0.4" fill="currentColor" stroke="none" />
      <circle cx="19.2" cy="17.2" r="0.4" fill="currentColor" stroke="none" />
      <circle cx="16.8" cy="18.8" r="0.4" fill="currentColor" stroke="none" />
      <circle cx="19.2" cy="18.8" r="0.4" fill="currentColor" stroke="none" />
    </svg>
  );
}
