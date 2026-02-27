import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import {
  XMarkIcon,
  MapIcon,
  ListBulletIcon,
  ChartBarIcon,
  CreditCardIcon,
  UsersIcon,
  GlobeAltIcon,
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router';
import { useAuth } from '../lib/AuthProvider';
import { useUserProfile } from '../hooks/useUserProfile';
import { useUserRole } from '../hooks/useUserRole';
import { useTranslation } from '../hooks/useTranslation';
import { hasPermission, type Action } from '../lib/permissions';
import { prefetchRoute, prefetchRouteDebounced, prefetchOnMenuOpen } from '../lib/routePrefetch';

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  requiredAction?: Action;
}

export default function SideMenu({ open, onClose }: SideMenuProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const userProfile = useUserProfile();
  const role = useUserRole();
  const { t } = useTranslation();

  const navItems: NavItem[] = useMemo(() => [
    { label: t('nav.map'), icon: MapIcon, path: '/' },
    { label: t('nav.wellList'), icon: ListBulletIcon, path: '/wells' },
    { label: t('nav.reports'), icon: ChartBarIcon, path: '/reports', requiredAction: 'manage_reports' as Action },
    { label: t('nav.users'), icon: UsersIcon, path: '/users', requiredAction: 'manage_users' as Action },
    { label: t('nav.subscription'), icon: CreditCardIcon, path: '/subscription', requiredAction: 'manage_farm' as Action },
    { label: t('nav.language'), icon: GlobeAltIcon, path: '/language' },
    { label: t('nav.settings'), icon: Cog6ToothIcon, path: '/settings' },
  ], [t]);

  const visibleItems = navItems.filter(
    (item) => !item.requiredAction || hasPermission(role, item.requiredAction)
  );

  // Prefetch Dashboard + Well List chunks when menu opens (benefits mobile especially)
  useEffect(() => {
    if (open) prefetchOnMenuOpen();
  }, [open]);

  const handleNav = (path: string) => {
    onClose();
    navigate(path, { viewTransition: true });
  };

  const [signOutError, setSignOutError] = useState<string | null>(null);

  const handleSignOut = async () => {
    try {
      setSignOutError(null);
      await signOut();
      onClose();
      navigate('/auth/phone', { viewTransition: true });
    } catch {
      setSignOutError(t('error.signOutFailed'));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/40 transition-opacity duration-300 ease-out data-[closed]:opacity-0"
      />
      <div className="fixed inset-0 flex justify-end">
        <DialogPanel
          transition
          className="w-72 bg-white h-full shadow-xl flex flex-col transition duration-300 ease-out data-[closed]:translate-x-full"
        >
          {/* Header */}
          <div className="bg-primary p-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-bold text-lg">{t('nav.menu')}</h2>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                aria-label={t('nav.closeMenu')}
              >
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>
            {userProfile && (
              <div>
                <p className="text-white font-medium">
                  {userProfile.first_name} {userProfile.last_name}
                </p>
                {userProfile.email && (
                  <p className="text-white/70 text-sm truncate">{userProfile.email}</p>
                )}
              </div>
            )}
          </div>

          {/* Nav items */}
          <nav className="flex-1 py-2 overflow-y-auto">
            {visibleItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                onMouseEnter={() => prefetchRouteDebounced(item.path)}
                onTouchStart={() => prefetchRoute(item.path)}
                className="w-full flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-gray-100 transition-colors text-left"
              >
                <item.icon className="h-5 w-5 text-gray-500" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Logout */}
          <div className="border-t border-gray-200 p-2">
            {signOutError && (
              <p className="text-status-danger text-sm px-5 py-1">{signOutError}</p>
            )}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-5 py-3 text-status-danger hover:bg-red-800 rounded-lg transition-colors text-left"
            >
              <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
              <span>{t('nav.logout')}</span>
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
