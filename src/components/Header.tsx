import { Bars3Icon } from '@heroicons/react/24/outline';

interface HeaderProps {
  farmName: string | null;
  onMenuOpen: () => void;
}

export default function Header({ farmName, onMenuOpen }: HeaderProps) {
  return (
    <header className="absolute top-0 inset-x-0 z-30 bg-black/40 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div>
          <h1 className="text-lg font-bold leading-tight">
            <span className="text-green-400">AG</span>
            <span className="text-white"> Well Tracker</span>
          </h1>
          {farmName && (
            <p className="text-white/70 text-sm">{farmName}</p>
          )}
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
