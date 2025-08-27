import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { clearCredentials } from "@/features/auth/authSlice";
import { authApi } from "@/services/authApi";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function UserMenu() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await dispatch(authApi.endpoints.logout.initiate()).unwrap();
      dispatch(clearCredentials());
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      // Even if logout API fails, clear local state
      dispatch(clearCredentials());
      toast.success("Logged out successfully");
      navigate("/login");
    }
  };

  const handleProfile = () => {
    navigate("/profile");
    setIsOpen(false);
  };

  const handleSettings = () => {
    navigate("/settings");
    setIsOpen(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "relative h-10 w-auto rounded-md px-2 gap-2 transition-all duration-200",
            "text-white hover:text-white",
            "bg-white/10 hover:bg-white/15 focus:bg-white/15",
            "focus:outline-none focus:ring-2 focus:ring-white/20",
            "active:bg-white/20"
          )}
          aria-label="User menu"
        >
          <Avatar className="h-7 w-7 ring-2 ring-white/10 hover:ring-white/20 transition-all duration-200">
            <AvatarImage src="" alt={user.name} />
            <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline-block text-sm font-medium">
            {user.name}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isOpen ? "rotate-180" : "rotate-0"
            )}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className={cn(
          "w-56 p-1",
          "bg-white border border-gray-200 shadow-xl",
          "backdrop-blur-sm bg-white/95",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2"
        )}
        align="end"
        sideOffset={8}
        forceMount
      >
        <DropdownMenuLabel className="font-normal p-3 pb-2">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold text-gray-900 leading-none">
              {user.name}
            </p>
            <p className="text-xs text-gray-500 leading-none">{user.email}</p>
            {/* Role badges */}
            {user.roles.includes("CEO") && (
              <Badge variant="destructive" className="text-xs w-fit mt-1">
                CEO
              </Badge>
            )}
            {user.roles.includes("Director") && (
              <Badge variant="destructive" className="text-xs w-fit mt-1">
                Director
              </Badge>
            )}
            {user.roles.includes("Manager") &&
              !user.roles.includes("CEO") &&
              !user.roles.includes("Director") && (
                <Badge variant="secondary" className="text-xs w-fit mt-1">
                  Manager
                </Badge>
              )}
            {user.roles.includes("Team Head") && (
              <Badge variant="outline" className="text-xs w-fit mt-1">
                Team Head
              </Badge>
            )}
            {user.roles.includes("Team Lead") && (
              <Badge variant="outline" className="text-xs w-fit mt-1">
                Team Lead
              </Badge>
            )}
            {user.roles.includes("Recruiter") && (
              <Badge variant="outline" className="text-xs w-fit mt-1">
                Recruiter
              </Badge>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-200" />
        <DropdownMenuItem
          onClick={handleProfile}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm",
            "text-gray-700 hover:text-gray-900",
            "hover:bg-gray-50 focus:bg-gray-50",
            "focus:outline-none cursor-pointer",
            "transition-colors duration-150"
          )}
        >
          <User className="h-4 w-4 text-gray-500" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleSettings}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm",
            "text-gray-700 hover:text-gray-900",
            "hover:bg-gray-50 focus:bg-gray-50",
            "focus:outline-none cursor-pointer",
            "transition-colors duration-150"
          )}
        >
          <Settings className="h-4 w-4 text-gray-500" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-gray-200" />
        <DropdownMenuItem
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm",
            "text-red-600 hover:text-red-700",
            "hover:bg-red-50 focus:bg-red-50",
            "focus:outline-none cursor-pointer",
            "transition-colors duration-150"
          )}
        >
          <LogOut className="h-4 w-4 text-red-500" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
