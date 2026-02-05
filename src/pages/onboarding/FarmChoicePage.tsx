import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  BuildingOffice2Icon,
  UserGroupIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../lib/AuthProvider';
import AuthLayout from '../../components/auth/AuthLayout';

/**
 * FarmChoicePage - Second step of onboarding flow.
 * Presents two options: create a new farm or join an existing one.
 */
export default function FarmChoicePage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleCreateFarm = useCallback(() => {
    navigate('/onboarding/farm/create');
  }, [navigate]);

  const handleJoinFarm = useCallback(() => {
    navigate('/onboarding/farm/join');
  }, [navigate]);

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-white text-center mb-2">
        Set Up Your Farm
      </h1>
      <p className="text-gray-300 text-center mb-8">
        Create a new farm or join an existing one
      </p>

      <div className="space-y-4">
        <button
          onClick={handleCreateFarm}
          className="w-full p-6 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl border border-white/20 text-left transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 p-2 bg-green-500/20 rounded-lg">
              <BuildingOffice2Icon className="h-8 w-8 text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Create a Farm
              </h2>
              <p className="text-sm text-gray-400">
                Start tracking wells for a new farm
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={handleJoinFarm}
          className="w-full p-6 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl border border-white/20 text-left transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 p-2 bg-green-500/20 rounded-lg">
              <UserGroupIcon className="h-8 w-8 text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Join a Farm</h2>
              <p className="text-sm text-gray-400">
                Enter an invite code to join
              </p>
            </div>
          </div>
        </button>
      </div>

      <button
        onClick={signOut}
        className="mt-8 w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Sign out
      </button>
    </AuthLayout>
  );
}
