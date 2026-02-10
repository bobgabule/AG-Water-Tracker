import { useState, useCallback } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../lib/AuthProvider';
import { supabase } from '../../lib/supabase';
import AuthLayout from '../../components/auth/AuthLayout';

/** US States for dropdown */
const US_STATES = [
  { value: '', label: 'Select State' },
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

/**
 * CreateFarmPage - Farm creation step of onboarding flow.
 * Collects business name and address information.
 * Uses RPC to atomically create farm and farm membership.
 */
export default function CreateFarmPage() {
  const { refreshOnboardingStatus, signOut } = useAuth();
  const navigate = useNavigate();

  const [farmName, setFarmName] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      // Validate all required fields
      if (!farmName.trim()) {
        setError('Business / Legal Name is required');
        return;
      }
      if (!streetAddress.trim()) {
        setError('Street Address is required');
        return;
      }
      if (!city.trim()) {
        setError('City is required');
        return;
      }
      if (!state) {
        setError('State is required');
        return;
      }
      if (!zipCode.trim()) {
        setError('Zip Code is required');
        return;
      }

      try {
        setLoading(true);
        setError('');

        // Call RPC to create farm and membership atomically
        const { error: rpcError } = await supabase.rpc(
          'create_farm_and_membership',
          {
            p_farm_name: farmName.trim(),
            p_street_address: streetAddress.trim(),
            p_city: city.trim(),
            p_state: state,
            p_zip_code: zipCode.trim(),
          }
        );

        if (rpcError) throw rpcError;

        // Refresh status - catch separately to not block navigation
        try {
          await refreshOnboardingStatus();
        } catch {
          // Non-critical: navigation will still proceed
        }
        navigate('/app/dashboard', { replace: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to create farm';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [farmName, streetAddress, city, state, zipCode, refreshOnboardingStatus, navigate]
  );

  const handleBack = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const inputClassName =
    'w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent';

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-white text-center mb-2">
        Create Your Farm
      </h1>
      <p className="text-gray-300 text-center mb-8">
        Set up your farm to start tracking wells
      </p>

      <form onSubmit={handleSubmit}>
        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm mb-4"
          >
            {error}
          </div>
        )}

        <div className="space-y-4 mb-6">
          {/* Business / Legal Name */}
          <div>
            <label
              htmlFor="farmName"
              className="block text-gray-300 text-sm mb-1"
            >
              Business / Legal Name <span className="text-red-400">*</span>
            </label>
            <input
              id="farmName"
              type="text"
              required
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              className={inputClassName}
              placeholder="Enter Name"
            />
          </div>

          {/* Street Address */}
          <div>
            <label
              htmlFor="streetAddress"
              className="block text-gray-300 text-sm mb-1"
            >
              Street Address <span className="text-red-400">*</span>
            </label>
            <input
              id="streetAddress"
              type="text"
              required
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              className={inputClassName}
              placeholder="Enter Street Address"
            />
          </div>

          {/* City */}
          <div>
            <label
              htmlFor="city"
              className="block text-gray-300 text-sm mb-1"
            >
              City <span className="text-red-400">*</span>
            </label>
            <input
              id="city"
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={inputClassName}
              placeholder="Enter City"
            />
          </div>

          {/* State */}
          <div>
            <label
              htmlFor="state"
              className="block text-gray-300 text-sm mb-1"
            >
              State <span className="text-red-400">*</span>
            </label>
            <select
              id="state"
              required
              value={state}
              onChange={(e) => setState(e.target.value)}
              className={inputClassName}
            >
              {US_STATES.map((s) => (
                <option key={s.value} value={s.value} className="bg-gray-800">
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Zip Code */}
          <div>
            <label
              htmlFor="zipCode"
              className="block text-gray-300 text-sm mb-1"
            >
              Zip Code <span className="text-red-400">*</span>
            </label>
            <input
              id="zipCode"
              type="text"
              required
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              className={inputClassName}
              placeholder="Enter Zip"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-white transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              Creating...
            </span>
          ) : (
            'Create Farm'
          )}
        </button>
      </form>

      <button
        onClick={handleBack}
        className="mt-6 w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Sign out
      </button>
    </AuthLayout>
  );
}
