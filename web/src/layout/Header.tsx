import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/organisms/NotificationBell";
import UserMenu from "@/components/organisms/UserMenu";
import { AccountStatusNavIndicator } from "@/components/molecules/AccountStatusNavIndicator";
import { RNRReminderBadge } from "@/features/candidates/components/RNRReminderBadge";
import { ProcessingRemindersBadge } from "@/features/processing/components/ProcessingRemindersBadge";
import IdleUsersNotification from "@/features/admin/components/IdleUsersNotification";
import { RecruiterNavPerformanceRating } from "@/features/candidates/components/RecruiterNavPerformanceRating";
import SessionAvailabilityToggles from "@/features/staff/components/SessionAvailabilityToggles";

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

export default function Header({ onMobileMenuToggle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full bg-[#0a0e1a] border-b border-violet-500/20">
      <div className="relative z-10 flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileMenuToggle}
            className="md:hidden text-violet-200 hover:bg-white/10"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <img src="/logo.png" alt="Affiniks RMS" className="h-11 object-contain" />
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="pointer-events-none absolute -inset-1 hidden rounded-2xl bg-amber-400/10 blur-md sm:block"
              aria-hidden
            />
            <RecruiterNavPerformanceRating />
          </div>
          <RNRReminderBadge />
          {/* Processing team unified badge */}
          <ProcessingRemindersBadge />
          {/* <SessionAvailabilityToggles /> */}
          <IdleUsersNotification />
          <NotificationBell />
          <AccountStatusNavIndicator />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
