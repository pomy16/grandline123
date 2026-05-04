import { AlertTriangle, Bell, Boxes, CircleDollarSign, RotateCcw, Store, TrendingDown, Zap } from "lucide-react";
import { DemoProductTable } from "../components/data-table";
import { MetricCard } from "../components/metric-card";
import { PageHeader } from "../components/page-header";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { getDashboardSummary } from "../lib/api";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <>
      <PageHeader
        title="Monitoring dashboard"
        description="Operational overview for Pokemon TCG and One Piece Card Game product discovery, restocks, price changes, and notification delivery."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total monitored stores" value={summary.totalStores} icon={Store} />
        <MetricCard label="Active stores" value={summary.activeStores} icon={Zap} />
        <MetricCard label="Products found today" value={summary.productsFoundToday} icon={Boxes} />
        <MetricCard label="Alerts sent today" value={summary.alertsSentToday} icon={Bell} />
        <MetricCard label="Restocks detected" value={summary.restocksDetected} icon={RotateCcw} />
        <MetricCard label="Price drops detected" value={summary.priceDropsDetected} icon={TrendingDown} />
        <MetricCard label="Failed scans" value={summary.failedScans} icon={AlertTriangle} />
        <MetricCard label="Price signals" value="Ready" icon={CircleDollarSign} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Latest products</CardTitle>
          </CardHeader>
          <CardContent>
            <DemoProductTable />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Latest events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary.latestEvents.map((event) => (
              <div key={event.id} className="rounded-md border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <Badge tone="info">{event.type}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</span>
                </div>
                <div className="mt-2 text-sm font-medium">{event.product.title}</div>
                <div className="text-xs text-muted-foreground">{event.product.store.name}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
