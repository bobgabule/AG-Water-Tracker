import { useSeatUsage } from '../hooks/useSeatUsage';
import { PLAN_LIMITS } from '../lib/subscription';

export default function SubscriptionPage() {
  const seatUsage = useSeatUsage();

  return (
    <div className="min-h-screen bg-[#c5cdb4] pt-14">
      <div className="px-4 py-4">
        <h1 className="text-2xl font-bold text-[#5f7248] tracking-wide mb-4">SUBSCRIPTION</h1>

        {/* Seat usage summary */}
        {seatUsage && (
          <div className="bg-[#dfe4d4] rounded-lg p-3 mb-4">
            <h2 className="text-xs font-semibold text-[#5f7248]/70 uppercase tracking-wider mb-2">
              {PLAN_LIMITS.name} Plan
            </h2>
            <div className="space-y-1">
              {/* Admin seats */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#5f7248]">Admins</span>
                <span className={`text-sm font-medium ${seatUsage.admin.isFull ? 'text-red-600' : 'text-[#5f7248]'}`}>
                  {seatUsage.admin.used} / {seatUsage.admin.limit}
                  {seatUsage.admin.isFull && (
                    <span className="ml-1.5 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Full</span>
                  )}
                </span>
              </div>
              {/* Meter Checker seats */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#5f7248]">Meter Checkers</span>
                <span className={`text-sm font-medium ${seatUsage.meter_checker.isFull ? 'text-red-600' : 'text-[#5f7248]'}`}>
                  {seatUsage.meter_checker.used} / {seatUsage.meter_checker.limit}
                  {seatUsage.meter_checker.isFull && (
                    <span className="ml-1.5 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Full</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-[#dfe4d4] rounded-lg p-6">
          <p className="text-[#5f7248]/70 text-center">Contact us to upgrade your plan</p>
        </div>
      </div>
    </div>
  );
}
