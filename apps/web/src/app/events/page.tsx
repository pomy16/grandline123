"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { AuthGate } from "../../components/auth-gate";
import { PageHeader } from "../../components/page-header";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { apiFetch } from "../../lib/api-client";

type ProductEvent = {
  id: string;
  type: string;
  oldValue?: unknown;
  newValue?: unknown;
  createdAt: string;
  notificationSent: boolean;
  product: {
    title: string;
    url: string;
    store: { name: string };
  };
};

export default function EventsPage() {
  const [events, setEvents] = useState<ProductEvent[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadEvents() {
    setLoading(true);
    const payload = await apiFetch<{ data: ProductEvent[] }>("/api/events");
    setEvents(payload.data);
    setLoading(false);
  }

  useEffect(() => {
    loadEvents().catch(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader title="Events" description="Timeline of detected product changes, old values, new values, timestamps, and notification status." />
      <AuthGate>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Event timeline</CardTitle>
              <Button type="button" variant="secondary" onClick={loadEvents}>
                <RefreshCw size={16} aria-hidden />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <div className="text-sm text-muted-foreground">Loading events...</div> : null}
            {events.map((event) => (
              <div key={event.id} className="rounded-md border border-border bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Badge tone={event.type === "PRICE_DROP" || event.type === "RESTOCK" ? "success" : "info"}>{event.type}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</span>
                </div>
                <div className="mt-2 font-medium">{event.product.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {event.product.store.name} | Notification: {event.notificationSent ? "sent" : "pending"}
                </div>
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                  <pre className="max-h-32 overflow-auto rounded-md bg-muted p-2">{JSON.stringify(event.oldValue ?? null, null, 2)}</pre>
                  <pre className="max-h-32 overflow-auto rounded-md bg-muted p-2">{JSON.stringify(event.newValue ?? null, null, 2)}</pre>
                </div>
              </div>
            ))}
            {events.length === 0 && !loading ? <div className="text-sm text-muted-foreground">No events yet. Run a mock scan from Stores.</div> : null}
          </CardContent>
        </Card>
      </AuthGate>
    </>
  );
}
