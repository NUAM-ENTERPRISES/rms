import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
// (ProfilePage uses custom `p-card` layout; no shadcn Card here)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Key,
  Edit,
  Save,
  X,
  Camera,
  Monitor,
  Smartphone,
  AlertTriangle,
  Lock,
  Activity,
  Flag,
  MapPinned,
  MapPin,
} from "lucide-react";
import { format } from "date-fns";
import {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useDeleteAccountMutation,
  useUploadProfileImageMutation,
  useGetSessionsQuery,
} from "@/features/profile/api";

const profileSchema = {
  name: "",
  email: "",
  mobileNumber: "",
  countryCode: "",
  dateOfBirth: "",
  addressCountryCode: "",
  addressStateId: "",
  address: "",
};

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"personal" | "security">("personal");
  const [sessionsPage, setSessionsPage] = useState(1);
  const sessionsLimit = 10;

  const { data: profileData, isLoading, error } = useGetProfileQuery();
  const { data: sessionsData, isLoading: isLoadingSessions } = useGetSessionsQuery(
    { page: sessionsPage, limit: sessionsLimit },
    // Only runs while ProfilePage is mounted.
    // We show sessions in both Personal and Security tabs.
    { skip: false }
  );
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();
  const [deleteAccount, { isLoading: isDeleting }] = useDeleteAccountMutation();
  const [uploadProfileImage, { isLoading: isUploading }] = useUploadProfileImageMutation();

  const userData = profileData?.data;
  const sessions = sessionsData?.data?.sessions ?? [];
  const sessionsPagination = sessionsData?.data?.pagination;
  const sessionsTotalPages = sessionsPagination?.totalPages ?? 1;

  const sessionCountLabel = useMemo(() => {
    if (!sessionsData?.data?.pagination) return `${sessions.length}`;
    return `${sessionsPagination?.total ?? sessions.length}`;
  }, [sessions.length, sessionsData?.data?.pagination, sessionsPagination?.total]);

  const form = useForm({
    defaultValues: profileSchema,
    mode: "onChange",
  });

  const handleEdit = () => {
    if (!userData) return;
    setIsEditing(true);
    form.reset({
      name: userData.name,
      email: userData.email,
      mobileNumber: userData.mobileNumber,
      countryCode: userData.countryCode,
      dateOfBirth: userData.dateOfBirth,
      addressCountryCode: userData.addressCountryCode ?? "",
      addressStateId: userData.addressStateId ?? "",
      address: userData.address ?? "",
    });
  };

  const handleSave = async (data: any) => {
    try {
      await updateProfile(data).unwrap();
      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update profile");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    form.reset();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64String = reader.result as string;
      try {
        await uploadProfileImage({ profileImage: base64String }).unwrap();
        toast.success("Profile image updated successfully");
      } catch (error: any) {
        toast.error(error?.data?.message || "Failed to upload image");
      }
    };
  };

  const handlePasswordChange = async (data: any) => {
    try {
      await changePassword(data).unwrap();
      toast.success("Password updated successfully");
      setShowPasswordDialog(false);
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to change password");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount().unwrap();
      toast.success("Account deletion requested");
      setShowDeleteDialog(false);
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to delete account");
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not provided";
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy 'at' h:mm a");
    } catch {
      return "Invalid date";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="relative w-10 h-10 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-indigo-100" />
            <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin" />
          </div>
          <p className="text-gray-400 text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
            <Shield className="h-7 w-7 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Failed to load profile</h2>
          <p className="text-gray-500 text-sm">There was an error loading your profile information.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center">
            <User className="h-7 w-7 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">No profile data</h2>
          <p className="text-gray-500 text-sm">Unable to load your profile information.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .p-root { font-family: 'Plus Jakarta Sans', sans-serif; }

        .p-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04);
        }

        .p-field-view {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 11px 14px;
          color: #111827;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 9px;
          font-weight: 500;
        }

        .p-field-label {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: #9ca3af;
          margin-bottom: 5px;
        }

        .p-input {
          background: #ffffff !important;
          border: 1.5px solid #d1d5db !important;
          border-radius: 10px !important;
          color: #111827 !important;
          font-family: 'Plus Jakarta Sans', sans-serif !important;
          font-size: 0.875rem !important;
          height: 42px !important;
          transition: border-color 0.15s, box-shadow 0.15s !important;
        }
        .p-input:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1) !important;
          outline: none !important;
        }
        .p-input::placeholder { color: #9ca3af !important; }

        .p-tab-list {
          background: #f3f4f6 !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 12px !important;
          padding: 4px !important;
        }
        .p-tab-trigger {
          color: #6b7280 !important;
          border-radius: 9px !important;
          font-family: 'Plus Jakarta Sans', sans-serif !important;
          font-weight: 600 !important;
          font-size: 0.82rem !important;
          transition: all 0.15s !important;
        }
        .p-tab-trigger[data-state="active"] {
          background: #ffffff !important;
          color: #111827 !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08) !important;
        }

        .p-btn-primary {
          background: #4f46e5;
          border: none;
          border-radius: 10px;
          color: white;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
          font-size: 0.84rem;
          padding: 9px 18px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          transition: all 0.15s;
        }
        .p-btn-primary:hover { background: #4338ca; }
        .p-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

        .p-btn-outline {
          background: #ffffff;
          border: 1.5px solid #d1d5db;
          border-radius: 10px;
          color: #374151;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
          font-size: 0.84rem;
          padding: 9px 18px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          transition: all 0.15s;
        }
        .p-btn-outline:hover { background: #f9fafb; border-color: #9ca3af; }
        .p-btn-outline:disabled { opacity: 0.55; cursor: not-allowed; }

        .p-btn-danger {
          background: #ef4444;
          border: none;
          border-radius: 10px;
          color: white;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
          font-size: 0.84rem;
          padding: 9px 18px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          transition: all 0.15s;
        }
        .p-btn-danger:hover { background: #dc2626; }
        .p-btn-danger:disabled { opacity: 0.55; cursor: not-allowed; }

        .p-session-row { transition: background 0.1s; }
        .p-session-row:hover { background: #f9fafb; }

        .p-badge-role {
          background: #eef2ff;
          color: #4f46e5;
          border-radius: 6px;
          padding: 2px 9px;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .p-badge-active {
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
          border-radius: 6px;
          padding: 2px 9px;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .p-badge-inactive {
          background: #f3f4f6;
          color: #9ca3af;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 2px 9px;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .p-divider { height: 1px; background: #f3f4f6; }

        .p-spin { animation: p-spin 0.8s linear infinite; }
        @keyframes p-spin { to { transform: rotate(360deg); } }

        .p-avatar-wrap {
          width: 80px; height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          padding: 2.5px;
          display: inline-block;
        }
        .p-avatar-inner {
          background: white;
          border-radius: 50%;
          padding: 2px;
          width: 100%; height: 100%;
        }

        .p-section-icon {
          width: 34px; height: 34px;
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .p-status-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 0 2px #dcfce7;
          display: inline-block;
        }
      `}</style>

      <div
        className="p-root"
        style={{ background: "#f5f6fa", minHeight: "100vh", padding: "2rem 1.25rem" }}
      >
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.75rem" }}>
            <div>
              <h1 style={{ color: "#111827", fontSize: "1.6rem", fontWeight: 800, margin: 0 }}>
                My Profile
              </h1>
              <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: "4px 0 0" }}>
                Manage your personal information and preferences
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {!isEditing ? (
                <button className="p-btn-primary" onClick={handleEdit}>
                  <Edit size={14} /> Edit Profile
                </button>
              ) : (
                <>
                  <button className="p-btn-outline" onClick={handleCancel}>
                    <X size={14} /> Cancel
                  </button>
                  <button className="p-btn-primary" onClick={form.handleSubmit(handleSave)} disabled={isUpdating}>
                    {isUpdating
                      ? <><div style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white" }} className="p-spin" /> Saving...</>
                      : <><Save size={14} /> Save Changes</>
                    }
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Main Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "270px 1fr", gap: "1.25rem", alignItems: "start" }}>

            {/* Left */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>

              {/* Profile Card */}
              <div className="p-card" style={{ padding: "1.75rem", textAlign: "center" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
                  <div style={{ position: "relative" }}>
                    <div className="p-avatar-wrap">
                      <div className="p-avatar-inner">
                        <Avatar style={{ width: 70, height: 70 }}>
                          <AvatarImage src={userData.profileImage || ""} />
                          <AvatarFallback style={{
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            color: "white", fontSize: "1.4rem", fontWeight: 700,
                            width: 70, height: 70,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            borderRadius: "50%"
                          }}>
                            {userData.name.split(" ").map((n: string) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                    <Label
                      htmlFor="profile-image-upload"
                      style={{
                        position: "absolute", bottom: 1, right: 1,
                        width: 26, height: 26, borderRadius: "50%",
                        background: "#4f46e5",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", border: "2px solid white",
                      }}
                    >
                      {isUploading
                        ? <div style={{ width: 11, height: 11, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white" }} className="p-spin" />
                        : <Camera size={11} color="white" />
                      }
                    </Label>
                    <Input id="profile-image-upload" type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploading} style={{ display: "none" }} />
                  </div>
                </div>

                <h2 style={{ color: "#111827", fontWeight: 700, fontSize: "1.05rem", margin: "0 0 3px" }}>{userData.name}</h2>
                <p style={{ color: "#9ca3af", fontSize: "0.82rem", margin: "0 0 12px" }}>{userData.email}</p>
                <div style={{ display: "flex", justifyContent: "center", gap: 5, flexWrap: "wrap" }}>
                  {userData.roles.map((role: string) => (
                    <span key={role} className="p-badge-role">{role}</span>
                  ))}
                </div>
              </div>

              {/* Account Status */}
              <div className="p-card" style={{ padding: "1.25rem" }}>
                <p style={{ color: "#9ca3af", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 12px" }}>
                  Account Status
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#6b7280", fontSize: "0.82rem" }}>Status</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className="p-status-dot" />
                      <span style={{ color: "#16a34a", fontSize: "0.82rem", fontWeight: 600 }}>Active</span>
                    </div>
                  </div>
                  <div className="p-divider" />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#6b7280", fontSize: "0.82rem" }}>Sessions</span>
                    <span style={{ color: "#4f46e5", fontSize: "0.82rem", fontWeight: 600 }}>
                      {sessions.length || 0} active
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Security Action */}
              <div className="p-card p-5">
  <p className="text-gray-400 text-[11px] font-bold tracking-wider uppercase mb-3">
    Quick Security
  </p>

  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#fafafa] border border-gray-200 rounded-xl p-4">

    {/* Button */}
    <button
      className="p-btn-outline flex items-center justify-center gap-1 w-full sm:w-auto px-3 py-2 text-xs whitespace-normal sm:whitespace-nowrap"
      onClick={() => setShowPasswordDialog(true)}
    >
      <Key size={13} />
      Change Password
    </button>

  </div>
</div>
            </div>

            {/* Right */}
            <div>
              <Tabs
                value={activeTab}
                onValueChange={(v) => {
                  setActiveTab(v as any);
                  setSessionsPage(1);
                }}
                defaultValue="personal"
              >
                <TabsList
                  className="p-tab-list"
                  style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr",
                    background: "#f3f4f6", border: "1px solid #e5e7eb",
                    borderRadius: 12, padding: 4, width: "100%", marginBottom: "1.1rem"
                  }}
                >
                <TabsTrigger value="personal" className="p-tab-trigger">Personal</TabsTrigger>
                <TabsTrigger value="security" className="p-tab-trigger">Security</TabsTrigger>
                </TabsList>

                {/* Personal Tab */}
                <TabsContent value="personal">
                  <div className="p-card" style={{ padding: "1.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem" }}>
                      <div className="p-section-icon" style={{ background: "#eef2ff" }}>
                        <User size={16} color="#4f46e5" />
                      </div>
                      <div>
                        <h3 style={{ color: "#111827", fontWeight: 700, fontSize: "0.95rem", margin: 0 }}>Personal Information</h3>
                        <p style={{ color: "#9ca3af", fontSize: "0.76rem", margin: 0 }}>Your personal details and contact information</p>
                      </div>
                    </div>
                    <div className="p-divider" style={{ marginBottom: "1.25rem" }} />

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.1rem" }}>
                      <div>
                        <p className="p-field-label">Full Name</p>
                        {isEditing
                          ? <Input id="name" {...form.register("name")} placeholder="Enter your full name" className="p-input" />
                          : <div className="p-field-view"><User size={14} color="#d1d5db" />{userData.name}</div>
                        }
                      </div>
                      <div>
                        <p className="p-field-label">Email Address</p>
                        {isEditing
                          ? <Input id="email" type="email" {...form.register("email")} placeholder="Enter your email" className="p-input" />
                          : <div className="p-field-view"><Mail size={14} color="#d1d5db" />{userData.email}</div>
                        }
                      </div>
                      <div>
                        <p className="p-field-label">Mobile Number</p>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: 7 }}>
                            <Input id="countryCode" {...form.register("countryCode")} placeholder="+1" className="p-input" style={{ width: 68 }} />
                            <Input id="mobileNumber" {...form.register("mobileNumber")} placeholder="1234567890" className="p-input" style={{ flex: 1 }} />
                          </div>
                        ) : (
                          <div className="p-field-view"><Phone size={14} color="#d1d5db" />{userData.countryCode} {userData.mobileNumber}</div>
                        )}
                      </div>
                      <div>
                        <p className="p-field-label">Date of Birth</p>
                        {isEditing
                          ? <Input id="dob" type="date" {...form.register("dateOfBirth")} className="p-input" />
                          : <div className="p-field-view"><Calendar size={14} color="#d1d5db" />{formatDate(userData.dateOfBirth)}</div>
                        }
                      </div>
                      <div>
                        <p className="p-field-label">Address Country Code</p>
                        {isEditing
                          ? (
                            <Input
                              id="addressCountryCode"
                              {...form.register("addressCountryCode")}
                              placeholder="e.g. IN"
                              className="p-input"
                            />
                          )
                          : (
                            <div className="p-field-view">
                              <Flag size={14} color="#d1d5db" />
                              {userData.addressCountryCode || "Not provided"}
                            </div>
                          )}
                      </div>
                      <div>
                        <p className="p-field-label">State</p>
                        {isEditing
                          ? (
                            <Input
                              id="addressStateId"
                              {...form.register("addressStateId")}
                              placeholder="Enter state"
                              className="p-input"
                            />
                          )
                          : (
                            <div className="p-field-view">
                              <MapPinned size={14} color="#d1d5db" />
                              {userData.addressStateId || "Not provided"}
                            </div>
                          )}
                      </div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <p className="p-field-label">Address</p>
                        {isEditing
                          ? (
                            <Input
                              id="address"
                              {...form.register("address")}
                              placeholder="Enter address"
                              className="p-input"
                            />
                          )
                          : (
                            <div className="p-field-view">
                              <MapPin size={14} color="#d1d5db" />
                              {userData.address || "Not provided"}
                            </div>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Login Sessions (shown on Personal tab too) */}
                  <div className="p-card" style={{ marginTop: "1.25rem", padding: "1.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem" }}>
                      <div className="p-section-icon" style={{ background: "#eef2ff" }}>
                        <Activity size={16} color="#4f46e5" />
                      </div>
                      <div>
                        <h3 style={{ color: "#111827", fontWeight: 700, fontSize: "0.95rem", margin: 0 }}>Login Sessions</h3>
                        <p style={{ color: "#9ca3af", fontSize: "0.76rem", margin: 0 }}>Your recent login sessions and security information</p>
                      </div>
                    </div>
                    <div className="p-divider" style={{ marginBottom: "1.1rem" }} />

                    {isLoadingSessions ? (
                      <div style={{ display: "flex", justifyContent: "center", padding: "2.5rem" }}>
                        <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid #e0e7ff", borderTopColor: "#4f46e5" }} className="p-spin" />
                      </div>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ background: "#f9fafb" }}>
                              {["Device", "IP Address", "Login Time", "Status"].map(col => (
                                <th key={col} style={{
                                  textAlign: "left", padding: "9px 14px",
                                  color: "#9ca3af", fontSize: "0.69rem",
                                  fontWeight: 700, letterSpacing: "0.07em",
                                  textTransform: "uppercase",
                                  borderBottom: "1px solid #f3f4f6",
                                }}>{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sessions.length ? (
                              sessions.map((session: any) => {
                                const isMobile = session.deviceType === "mobile";
                                const isTablet = session.deviceType === "tablet";
                                const DeviceIcon = isMobile || isTablet ? Smartphone : Monitor;
                                const deviceLabel = isMobile ? "Mobile Device" : isTablet ? "Tablet" : "Desktop";
                                const deviceName = session.browser && session.os
                                  ? `${session.browser} on ${session.os}`
                                  : session.userAgent?.slice(0, 40) || "Unknown Device";

                                return (
                                  <tr key={session.id} className="p-session-row">
                                    <td style={{ padding: "13px 14px", borderBottom: "1px solid #f3f4f6" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                                        <div style={{
                                          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                                          background: session.isCurrent ? "#eef2ff" : "#f9fafb",
                                          border: `1px solid ${session.isCurrent ? "#c7d2fe" : "#e5e7eb"}`,
                                          display: "flex", alignItems: "center", justifyContent: "center"
                                        }}>
                                          <DeviceIcon size={15} color={session.isCurrent ? "#4f46e5" : "#9ca3af"} />
                                        </div>
                                        <div>
                                          <p style={{ color: "#111827", fontWeight: 600, fontSize: "0.84rem", margin: 0 }}>{deviceName}</p>
                                          <p style={{ color: session.isCurrent ? "#4f46e5" : "#9ca3af", fontSize: "0.74rem", margin: 0, fontWeight: 500 }}>
                                            {session.isCurrent ? "Current Session" : deviceLabel}
                                          </p>
                                        </div>
                                      </div>
                                    </td>
                                    <td style={{ padding: "13px 14px", color: "#6b7280", fontSize: "0.84rem", borderBottom: "1px solid #f3f4f6", fontFamily: "monospace" }}>
                                      {session.ipAddress === "::1" || session.ipAddress === "127.0.0.1" ? "localhost" : session.ipAddress || "—"}
                                    </td>
                                    <td style={{ padding: "13px 14px", color: "#6b7280", fontSize: "0.84rem", borderBottom: "1px solid #f3f4f6" }}>
                                      {formatDateTime(session.loginAt)}
                                    </td>
                                    <td style={{ padding: "13px 14px", borderBottom: "1px solid #f3f4f6" }}>
                                      {session.isActive
                                        ? <span className="p-badge-active">Active</span>
                                        : <span className="p-badge-inactive">Inactive</span>
                                      }
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={4} style={{ padding: "2.5rem", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
                                  No login sessions found
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pagination */}
                    {sessionsTotalPages > 1 && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1rem" }}>
                        <p style={{ color: "#6b7280", fontSize: "0.82rem", margin: 0 }}>
                          Page <b style={{ color: "#111827" }}>{sessionsPage}</b> of{" "}
                          <b style={{ color: "#111827" }}>{sessionsTotalPages}</b>{" "}
                          · <b style={{ color: "#111827" }}>{sessionCountLabel}</b> total
                        </p>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={sessionsPage <= 1 || isLoadingSessions}
                            onClick={() => setSessionsPage((p) => Math.max(1, p - 1))}
                          >
                            Prev
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={sessionsPage >= sessionsTotalPages || isLoadingSessions}
                            onClick={() => setSessionsPage((p) => Math.min(sessionsTotalPages, p + 1))}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Security Tab */}
                <TabsContent value="security">
                  <div className="p-card" style={{ padding: "1.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem" }}>
                      <div className="p-section-icon" style={{ background: "#fef2f2" }}>
                        <Shield size={16} color="#ef4444" />
                      </div>
                      <div>
                        <h3 style={{ color: "#111827", fontWeight: 700, fontSize: "0.95rem", margin: 0 }}>Security Settings</h3>
                        <p style={{ color: "#9ca3af", fontSize: "0.76rem", margin: 0 }}>Manage your account security and privacy</p>
                      </div>
                    </div>
                    <div className="p-divider" style={{ marginBottom: "1.25rem" }} />
                    <div style={{
                      background: "#fafafa",
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      padding: "1rem 1.25rem",
                      display: "flex", alignItems: "center", justifyContent: "space-between"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 9, background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Key size={15} color="#4f46e5" />
                        </div>
                        <div>
                          <p style={{ color: "#111827", fontWeight: 600, fontSize: "0.875rem", margin: 0 }}>Password</p>
                          <p style={{ color: "#9ca3af", fontSize: "0.75rem", margin: 0 }}>Change your account password</p>
                        </div>
                      </div>
                      <button className="p-btn-outline" style={{ padding: "6px 14px", fontSize: "0.78rem" }} onClick={() => setShowPasswordDialog(true)}>
                        Change
                      </button>
                    </div>
                  </div>

                  {/* Sessions Table (only when Security tab is active) */}
                  <div className="p-card" style={{ marginTop: "1.25rem", padding: "1.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem" }}>
                      <div className="p-section-icon" style={{ background: "#eef2ff" }}>
                        <Activity size={16} color="#4f46e5" />
                      </div>
                      <div>
                        <h3 style={{ color: "#111827", fontWeight: 700, fontSize: "0.95rem", margin: 0 }}>Login Sessions</h3>
                        <p style={{ color: "#9ca3af", fontSize: "0.76rem", margin: 0 }}>Your recent login sessions and security information</p>
                      </div>
                    </div>
                    <div className="p-divider" style={{ marginBottom: "1.1rem" }} />

                    {isLoadingSessions ? (
                      <div style={{ display: "flex", justifyContent: "center", padding: "2.5rem" }}>
                        <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid #e0e7ff", borderTopColor: "#4f46e5" }} className="p-spin" />
                      </div>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ background: "#f9fafb" }}>
                              {["Device", "IP Address", "Login Time", "Status"].map(col => (
                                <th key={col} style={{
                                  textAlign: "left", padding: "9px 14px",
                                  color: "#9ca3af", fontSize: "0.69rem",
                                  fontWeight: 700, letterSpacing: "0.07em",
                                  textTransform: "uppercase",
                                  borderBottom: "1px solid #f3f4f6",
                                }}>{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sessions.length ? (
                              sessions.map((session: any) => {
                                const isMobile = session.deviceType === "mobile";
                                const isTablet = session.deviceType === "tablet";
                                const DeviceIcon = isMobile || isTablet ? Smartphone : Monitor;
                                const deviceLabel = isMobile ? "Mobile Device" : isTablet ? "Tablet" : "Desktop";
                                const deviceName = session.browser && session.os
                                  ? `${session.browser} on ${session.os}`
                                  : session.userAgent?.slice(0, 40) || "Unknown Device";

                                return (
                                  <tr key={session.id} className="p-session-row">
                                    <td style={{ padding: "13px 14px", borderBottom: "1px solid #f3f4f6" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                                        <div style={{
                                          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                                          background: session.isCurrent ? "#eef2ff" : "#f9fafb",
                                          border: `1px solid ${session.isCurrent ? "#c7d2fe" : "#e5e7eb"}`,
                                          display: "flex", alignItems: "center", justifyContent: "center"
                                        }}>
                                          <DeviceIcon size={15} color={session.isCurrent ? "#4f46e5" : "#9ca3af"} />
                                        </div>
                                        <div>
                                          <p style={{ color: "#111827", fontWeight: 600, fontSize: "0.84rem", margin: 0 }}>{deviceName}</p>
                                          <p style={{ color: session.isCurrent ? "#4f46e5" : "#9ca3af", fontSize: "0.74rem", margin: 0, fontWeight: 500 }}>
                                            {session.isCurrent ? "Current Session" : deviceLabel}
                                          </p>
                                        </div>
                                      </div>
                                    </td>
                                    <td style={{ padding: "13px 14px", color: "#6b7280", fontSize: "0.84rem", borderBottom: "1px solid #f3f4f6", fontFamily: "monospace" }}>
                                      {session.ipAddress === "::1" || session.ipAddress === "127.0.0.1" ? "localhost" : session.ipAddress || "—"}
                                    </td>
                                    <td style={{ padding: "13px 14px", color: "#6b7280", fontSize: "0.84rem", borderBottom: "1px solid #f3f4f6" }}>
                                      {formatDateTime(session.loginAt)}
                                    </td>
                                    <td style={{ padding: "13px 14px", borderBottom: "1px solid #f3f4f6" }}>
                                      {session.isActive
                                        ? <span className="p-badge-active">Active</span>
                                        : <span className="p-badge-inactive">Inactive</span>
                                      }
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={4} style={{ padding: "2.5rem", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
                                  No login sessions found
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pagination */}
                    {sessionsTotalPages > 1 && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1rem" }}>
                        <p style={{ color: "#6b7280", fontSize: "0.82rem", margin: 0 }}>
                          Page <b style={{ color: "#111827" }}>{sessionsPage}</b> of{" "}
                          <b style={{ color: "#111827" }}>{sessionsTotalPages}</b>{" "}
                          · <b style={{ color: "#111827" }}>{sessionCountLabel}</b> total
                        </p>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={sessionsPage <= 1 || isLoadingSessions}
                            onClick={() => setSessionsPage((p) => Math.max(1, p - 1))}
                          >
                            Prev
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={sessionsPage >= sessionsTotalPages || isLoadingSessions}
                            onClick={() => setSessionsPage((p) => Math.min(sessionsTotalPages, p + 1))}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Password Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 18, maxWidth: 420 }}>
            <DialogHeader>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Lock size={15} color="#4f46e5" />
                </div>
                <DialogTitle style={{ color: "#111827", fontWeight: 700 }}>Change Password</DialogTitle>
              </div>
              <DialogDescription style={{ color: "#9ca3af", fontSize: "0.84rem" }}>
                Enter your current password and choose a new one.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handlePasswordChange({
                currentPassword: formData.get("currentPassword") as string,
                newPassword: formData.get("newPassword") as string,
                confirmPassword: formData.get("confirmPassword") as string,
              });
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem", padding: "0.75rem 0" }}>
                {[
                  { id: "currentPassword", label: "Current Password", placeholder: "Enter current password" },
                  { id: "newPassword", label: "New Password", placeholder: "Enter new password" },
                  { id: "confirmPassword", label: "Confirm New Password", placeholder: "Confirm new password" },
                ].map(f => (
                  <div key={f.id}>
                    <p className="p-field-label">{f.label}</p>
                    <Input id={f.id} name={f.id} type="password" placeholder={f.placeholder} required className="p-input" />
                  </div>
                ))}
              </div>
              <DialogFooter style={{ gap: 8, marginTop: 4 }}>
                <button type="button" className="p-btn-outline" onClick={() => setShowPasswordDialog(false)}>Cancel</button>
                <button type="submit" className="p-btn-primary" disabled={isChangingPassword}>
                  {isChangingPassword
                    ? <><div style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white" }} className="p-spin" /> Changing...</>
                    : "Change Password"
                  }
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Account Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent style={{ background: "#ffffff", border: "1px solid #fecaca", borderRadius: 18, maxWidth: 420 }}>
            <DialogHeader>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AlertTriangle size={15} color="#ef4444" />
                </div>
                <DialogTitle style={{ color: "#ef4444", fontWeight: 700 }}>Delete Account</DialogTitle>
              </div>
              <DialogDescription style={{ color: "#9ca3af", fontSize: "0.84rem" }}>
                This action cannot be undone. This will permanently delete your account and remove all data.
              </DialogDescription>
            </DialogHeader>
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "0.9rem 1rem" }}>
              <p style={{ color: "#b91c1c", fontSize: "0.84rem", margin: 0 }}>
                <strong>Warning:</strong> This will permanently delete your account and all associated data.
              </p>
            </div>
            <DialogFooter style={{ gap: 8, marginTop: 4 }}>
              <button className="p-btn-outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>Cancel</button>
              <button className="p-btn-danger" onClick={handleDeleteAccount} disabled={isDeleting}>
                {isDeleting
                  ? <><div style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white" }} className="p-spin" /> Deleting...</>
                  : "Delete Account"
                }
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}