import { PageHeader } from "../../components/page-header";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

export default function LogsPage() {
  return (
    <>
      <PageHeader title="Logs" description="Worker logs, scraper errors, Discord delivery errors, scan history, and filters by store and severity." />
      <Card>
        <CardHeader>
          <CardTitle>Scan and delivery logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <Input placeholder="Filter by store" />
            <Input placeholder="Filter by severity" />
            <Input placeholder="Search logs" />
          </div>
          <div className="space-y-3">
            {["Worker ready", "Mock scan queued", "Discord webhook not configured"].map((message, index) => (
              <div key={message} className="rounded-md border border-border bg-background p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <Badge tone={index === 2 ? "warning" : "success"}>{index === 2 ? "WARN" : "INFO"}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(Date.now() - index * 60000).toLocaleString()}</span>
                </div>
                <div className="mt-2">{message}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
