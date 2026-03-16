import { Bars3Icon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router';
import { useUserRole } from '../hooks/useUserRole';
import { useTranslation } from '../hooks/useTranslation';
import { hasPermission } from '../lib/permissions';
import FarmSelector from './FarmSelector';

interface HeaderProps {
  farmName: string | null;
  onMenuOpen: () => void;
}

export default function Header({ farmName, onMenuOpen }: HeaderProps) {
  const role = useUserRole();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canCrossFarm = hasPermission(role, 'cross_farm_access');
  const headerBg = role === 'super_admin' ? 'bg-super-admin' : 'bg-surface-header';

  return (
    <header className={`fixed top-0 inset-x-0 z-30 transition-colors duration-200 ${headerBg}`}>
      <div className="flex items-center justify-between px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          onClick={() => navigate('/', { viewTransition: true })}
          className="flex items-center gap-1 cursor-pointer"
          aria-label={t('nav.map')}
        >
          <img src="/ag-logo-white.png" alt="AG" className="h-10" />
          <div className="flex flex-col justify-center leading-tight text-left">
            <span className="text-white text-xs">{t(role === 'super_admin' ? 'app.waterTrackerAdmin' : 'app.waterTracker')}</span>
            {canCrossFarm ? (
              <FarmSelector />
            ) : (
              farmName && (
                <p className="text-white text-lg font-bold -mt-0.9">{farmName}</p>
              )
            )}
          </div>
        </button>
        <button
          onClick={onMenuOpen}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label={t('nav.openMenu')}
        >
          <Bars3Icon className="h-7 w-7 text-white" />
        </button>
      </div>
    </header>
  );
}
