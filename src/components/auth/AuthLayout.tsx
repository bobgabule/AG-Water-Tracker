import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Layout wrapper for authentication pages.
 * Provides consistent styling with dark gradient background,
 * centered content card, and AG Water Tracker branding.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background with farm image overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(20, 40, 60, 0.9), rgba(10, 30, 20, 0.7)),
            url('/bg-farm.jpg')`,
          backgroundColor: '#1a3a2a',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-sky-900/20 via-emerald-900/10 to-green-950/10" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/logo.svg"
            alt="AG Water Tracker"
            className="h-20 mx-auto"
          />
        </div>

        {/* Content card */}
        <div className="w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
