import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/organisms/NotificationBell";
import UserMenu from "@/components/organisms/UserMenu";
import { RNRReminderBadge } from "@/features/candidates/components/RNRReminderBadge";

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

export default function Header({ onMobileMenuToggle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-[#051027] overflow-hidden py-1">
      {/* Background Texture & Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20"></div>
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.02'/%3E%3C/svg%3E")`,
        }}
      ></div>

      {/* Hero Mark - Stylized "A" */}
      <div className="absolute top-2 right-4 w-12 h-12 opacity-10">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <defs>
            <linearGradient id="heroGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#141518" />
              <stop offset="100%" stopColor="#0D0E10" />
            </linearGradient>
          </defs>
          <path
            d="M100 20 L180 180 L160 180 L100 40 L40 180 L20 180 Z"
            fill="url(#heroGradient)"
          />
          <path d="M80 120 L120 120 L100 80 Z" fill="#0D0E10" />
        </svg>
      </div>

      {/* Diagonal Streaks */}
      <div className="absolute top-3 right-6 w-8 h-0.5 bg-gradient-to-r from-[#6EE7F9] to-[#A78BFA] opacity-15 blur-sm transform rotate-45"></div>
      <div className="absolute top-5 right-4 w-6 h-0.5 bg-gradient-to-r from-[#6EE7F9] to-[#A78BFA] opacity-20 blur-sm transform rotate-45"></div>

      {/* Star Specks */}
      <div className="absolute top-2 right-8 w-0.5 h-0.5 bg-white opacity-4 rounded-full"></div>
      <div className="absolute top-4 right-5 w-0.5 h-0.5 bg-white opacity-3 rounded-full"></div>
      <div className="absolute top-6 right-7 w-0.5 h-0.5 bg-white opacity-4 rounded-full"></div>
      <div className="absolute top-8 right-3 w-0.5 h-0.5 bg-white opacity-3 rounded-full"></div>
      <div className="flex h-14 items-center px-4 relative z-10">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 md:hidden text-white hover:bg-white/10"
          onClick={onMobileMenuToggle}
          aria-label="Toggle mobile menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo */}
        <div className="flex items-center gap-4">
          {/* Professional Logo */}
          <div className="flex items-center space-x-3">
            <img
              src="/logo.png"
              alt="Affiniks RMS Logo"
              className="w-40 h-24 object-contain"
            />
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side actions */}
        <div className="flex items-center space-x-1">
          <RNRReminderBadge />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
