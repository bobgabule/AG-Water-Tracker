import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ListBulletIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../lib/AuthContext';
import { useWells } from '../hooks/useWells';
import { useFarmName } from '../hooks/useFarmName';
import Header from '../components/Header';
import SideMenu from '../components/SideMenu';
import MapView from '../components/MapView';

export default function DashboardPage() {
  const { userProfile } = useAuth();
  const farmName = useFarmName(userProfile?.farm_id ?? null);
  const { wells } = useWells();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleWellClick = useCallback(
    (id: string) => navigate(`/wells/${id}`),
    [navigate],
  );
  const handleMenuOpen = useCallback(() => setMenuOpen(true), []);
  const handleMenuClose = useCallback(() => setMenuOpen(false), []);
  const handleWellList = useCallback(() => navigate('/wells'), [navigate]);
  const handleNewWell = useCallback(() => navigate('/wells/new'), [navigate]);

  return (
    <div className="relative w-full h-dvh overflow-hidden">
      {/* Map layer */}
      <MapView wells={wells} onWellClick={handleWellClick} />

      {/* Header overlay */}
      <Header farmName={farmName} onMenuOpen={handleMenuOpen} />

      {/* Floating action buttons */}
      <div className="absolute bottom-6 left-4 right-4 z-20 flex justify-between pb-[env(safe-area-inset-bottom)]">
        <button
          onClick={handleWellList}
          className="bg-white text-gray-800 px-5 py-3 rounded-full shadow-lg font-medium flex items-center gap-2 hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          <ListBulletIcon className="w-5 h-5" />
          Well List
        </button>
        <button
          onClick={handleNewWell}
          className="bg-primary text-white px-5 py-3 rounded-full shadow-lg font-medium flex items-center gap-2 hover:bg-primary/90 active:bg-primary/80 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          New Well
        </button>
      </div>

      {/* Side menu drawer */}
      <SideMenu open={menuOpen} onClose={handleMenuClose} />
    </div>
  );
}
