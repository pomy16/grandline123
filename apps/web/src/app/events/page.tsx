import { PageHeader } from "../../components/page-header";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export default function EventsPage() {
  const events = ["NEW_PRODUCT", "PREORDER_OPENED", "PRICE_DROP", "RESTOCK"];
  return (
    <>
      <PageHeader title="Events" description="Timeline of detected product changes, old values, new values, timestamps, and notification status." />
      <Card>
        <CardHeader>
          <CardTitle>Event timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {events.map((event, index) => (
            <div key={event} className="rounded-md border border-border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge tone={event === "PRICE_DROP" ? "success" : "info"}>{event}</Badge>
                <span className="text-xs text-muted-foreground">{new Date(Date.now() - index * 900000).toLocaleString()}</span>
              </div>
              <div className="mt-2 font-medium">Demo product state change</div>
              <div className="mt-1 text-sm text-muted-foreground">Notification status: pending until Discord webhook is configured.</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
