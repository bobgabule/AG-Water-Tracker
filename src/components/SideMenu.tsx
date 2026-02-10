import { useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import {
  XMarkIcon,
  MapIcon,
  ListBulletIcon,
  ChartBarIcon,
  CreditCardIcon,
  GlobeAltIcon,
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router';
import { useAuth } from '../lib/AuthProvider';
import { useUserProfile } from '../hooks/useUserProfile';
import { useUserRole } from '../hooks/useUserRole';
import { hasPermission, type Action } from '../lib/permissions';

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

const navItems: NavItem[] = [
  { label: 'Map', icon: MapIcon, path: '/' },
  { label: 'Well List', icon: ListBulletIcon, path: '/wells' },
  { label: 'Reports', icon: ChartBarIcon, path: '/reports' },
  { label: 'Subscription', icon: CreditCardIcon, path: '/subscription', requiredAction: 'manage_farm' },
  { label: 'Language', icon: GlobeAltIcon, path: '/language' },
  { label: 'Settings', icon: Cog6ToothIcon, path: '/settings' },
];

export default function SideMenu({ open, onClose }: SideMenuProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const userProfile = useUserProfile();
  const role = useUserRole();

  const visibleItems = navItems.filter(
    (item) => !item.requiredAction || hasPermission(role, item.requiredAction)
  );

  const handleNav = (path: string) => {
    onClose();
    navigate(path);
  };

  const [signOutError, setSignOutError] = useState<string | null>(null);

  const handleSignOut = async () => {
    try {
      setSignOutError(null);
      await signOut();
      onClose();
      navigate('/auth/phone');
    } catch {
      setSignOutError('Failed to sign out. Please try again.');
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
              <h2 className="text-white font-bold text-lg">Menu</h2>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close menu"
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
              className="w-full flex items-center gap-3 px-5 py-3 text-status-danger hover:bg-red-50 rounded-lg transition-colors text-left"
            >
              <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
