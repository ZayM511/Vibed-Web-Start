'use client';

import * as React from 'react';
import { type LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SpinnerProps = LucideProps & {
  variant?:
    | 'default'
    | 'circle'
    | 'pinwheel'
    | 'circle-filled'
    | 'ellipsis'
    | 'ring'
    | 'bars'
    | 'infinite';
};

function Default({ className, ...props }: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('animate-spin', className)}
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function Circle({ className, ...props }: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('animate-spin', className)}
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2v4" />
      <path d="m16.2 7.8 2.9-2.9" />
    </svg>
  );
}

function Pinwheel({ className, ...props }: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('animate-spin', className)}
      {...props}
    >
      <path d="M22 12a1 1 0 0 1-10 0 1 1 0 0 0-10 0" />
      <path d="M7 20.7a1 1 0 1 1 5-8.7 1 1 0 1 0 5-8.6" />
      <path d="M7 3.3a1 1 0 1 1 5 8.6 1 1 0 1 0 5 8.6" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function CircleFilled({ className, ...props }: LucideProps) {
  return (
    <div className="relative">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className={cn('absolute animate-spin', className)}
        style={{
          animationDuration: '1s',
        }}
        {...props}
      >
        <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2" />
        <path
          d="M12 2 A10 10 0 0 1 22 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className={cn('animate-spin', className)}
        style={{
          animationDuration: '1.5s',
        }}
        {...props}
      >
        <path
          d="M12 22 A10 10 0 0 1 2 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function Ellipsis({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex space-x-1', className)} {...props}>
      <div
        className="h-2 w-2 animate-bounce rounded-full bg-current"
        style={{ animationDelay: '0ms', animationDuration: '1s' }}
      />
      <div
        className="h-2 w-2 animate-bounce rounded-full bg-current"
        style={{ animationDelay: '150ms', animationDuration: '1s' }}
      />
      <div
        className="h-2 w-2 animate-bounce rounded-full bg-current"
        style={{ animationDelay: '300ms', animationDuration: '1s' }}
      />
    </div>
  );
}

function Ring({ className, ...props }: LucideProps) {
  return (
    <div className="relative inline-flex">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        {...props}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.2"
        />
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="32"
          strokeDashoffset="32"
          className="animate-[spin_1.5s_ease-in-out_infinite]"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="32;0"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </div>
  );
}

function Bars({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex space-x-1', className)} {...props}>
      <div
        className="h-6 w-1 animate-pulse bg-current"
        style={{ animationDelay: '0ms', animationDuration: '1s' }}
      />
      <div
        className="h-6 w-1 animate-pulse bg-current"
        style={{ animationDelay: '150ms', animationDuration: '1s' }}
      />
      <div
        className="h-6 w-1 animate-pulse bg-current"
        style={{ animationDelay: '300ms', animationDuration: '1s' }}
      />
    </div>
  );
}

function Infinite({ className, ...props }: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('animate-spin', className)}
      style={{
        animationDuration: '2s',
      }}
      {...props}
    >
      <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z" />
    </svg>
  );
}

export const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ variant = 'default', className, ...props }, ref) => {
    switch (variant) {
      case 'circle':
        return <Circle ref={ref} className={className} {...props} />;
      case 'pinwheel':
        return <Pinwheel ref={ref} className={className} {...props} />;
      case 'circle-filled':
        return <CircleFilled ref={ref} className={className} {...props} />;
      case 'ellipsis':
        return <Ellipsis className={className} />;
      case 'ring':
        return <Ring className={className} {...props} />;
      case 'bars':
        return <Bars className={className} />;
      case 'infinite':
        return <Infinite ref={ref} className={className} {...props} />;
      default:
        return <Default ref={ref} className={className} {...props} />;
    }
  }
);

Spinner.displayName = 'Spinner';
