"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { getToken } from "../lib/api-client";
import { Card, CardContent } from "./ui/card";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setAuthenticated(Boolean(getToken()));
    setReady(true);
  }, []);

  if (!ready) {
    return <div className="text-sm text-muted-foreground">Loading admin session...</div>;
  }

  if (!authenticated) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert size={18} className="text-amber-300" aria-hidden />
            <div>
              <div className="font-medium">Admin login required</div>
              <div className="text-sm text-muted-foreground">Sign in to manage stores, rules, products, and scanner jobs.</div>
            </div>
          </div>
          <Link className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90" href="/login">
            Sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
