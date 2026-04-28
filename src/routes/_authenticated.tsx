import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: Layout,
});

function Layout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(t);
  }, []);
  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center gap-3 p-6 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        {slow && (
          <div className="text-sm text-muted-foreground">
            Taking longer than usual. <button onClick={() => window.location.reload()} className="underline text-primary">Reload</button>
          </div>
        )}
      </div>
    );
  }
  return <Outlet />;
}
