import { Bars3Icon } from '@heroicons/react/24/outline';

interface HeaderProps {
  farmName: string | null;
  onMenuOpen: () => void;
}

export default function Header({ farmName, onMenuOpen }: HeaderProps) {
  return (
    <header className="absolute top-0 inset-x-0 z-30 bg-[#5f7248]">
      <div className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-1">
          <img src="/ag-logo-white.png" alt="AG" className="h-10" />
          <div className="flex flex-col justify-center leading-tight">
            <span className="text-white text-xs">Water Tracker</span>
            {farmName && (
              <p className="text-white text-lg font-bold -mt-0.9">{farmName}</p>
            )}
          </div>
        </div>
        <button
          onClick={onMenuOpen}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Open menu"
        >
          <Bars3Icon className="h-7 w-7 text-white" />
        </button>
      </div>
    </header>
  );
}
