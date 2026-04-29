import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, Save, UserCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const initials = useMemo(() => {
    const base = fullName || user?.email || "U";
    return base
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((v) => v[0]?.toUpperCase())
      .join("") || "U";
  }, [fullName, user?.email]);

  useEffect(() => {
    if (!user) return;
    let alive = true;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name,email,avatar_url")
        .eq("user_id", user.id)
        .single();

      if (!alive) return;
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      setFullName(data?.full_name ?? "");
      setEmail(data?.email ?? user.email ?? "");
      setAvatarPath(data?.avatar_url ?? null);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [user]);

  useEffect(() => {
    if (!avatarPath) {
      setAvatarUrl(null);
      return;
    }

    let alive = true;
    (async () => {
      const { data, error } = await supabase.storage.from("profile-avatars").createSignedUrl(avatarPath, 3600);
      if (!alive) return;
      if (error) return;
      setAvatarUrl(data.signedUrl);
    })();

    return () => {
      alive = false;
    };
  }, [avatarPath]);

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() || null })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Profile updated");
    } catch (e: any) {
      toast.error(e.message || "Profile update failed");
    } finally {
      setSaving(false);
    }
  }

  async function onPickAvatar(file?: File | null) {
    if (!user || !file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("profile-avatars")
        .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
      if (uploadError) throw uploadError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("user_id", user.id);
      if (profileError) throw profileError;

      setAvatarPath(path);
      toast.success("Profile picture updated");
    } catch (e: any) {
      toast.error(e.message || "Avatar upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <UserCircle2 className="w-5 h-5 text-primary" />
        <h1 className="font-display font-bold text-2xl">Profile</h1>
      </div>

      <Card className="bg-gradient-card border-border p-5 space-y-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-24 w-24 border border-border shadow-card">
              <AvatarImage src={avatarUrl ?? undefined} alt="Profile picture" className="object-cover" />
              <AvatarFallback className="text-lg font-bold bg-secondary text-secondary-foreground">{initials}</AvatarFallback>
            </Avatar>
            <label className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center cursor-pointer shadow-neon-orange">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => onPickAvatar(e.target.files?.[0])}
              />
            </label>
          </div>

          <div className="min-w-0">
            <div className="font-display font-bold text-lg">{fullName || "Your profile"}</div>
            <div className="text-sm text-muted-foreground break-all">{email || user?.email}</div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your name" disabled={loading || saving} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={saveProfile} disabled={loading || saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" />Save changes</>}
          </Button>
        </div>
      </Card>
    </div>
  );
}