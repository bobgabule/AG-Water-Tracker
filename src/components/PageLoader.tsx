import { useState, useEffect } from 'react';

interface PageLoaderProps {
  /** When true, centers in full viewport (auth pages). Default: content-area only. */
  fullScreen?: boolean;
}

export default function PageLoader({ fullScreen = false }: PageLoaderProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 150);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div
      className={`flex items-center justify-center ${
        fullScreen ? 'min-h-screen' : 'flex-1 min-h-[50vh]'
      } bg-gray-900 transition-opacity duration-150 ${
        show ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
    </div>
  );
}
