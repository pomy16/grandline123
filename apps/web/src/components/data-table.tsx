import { ExternalLink } from "lucide-react";
import { formatDateTime, formatMoney } from "../lib/format";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { EmptyState, LoadingState } from "./ui/data-state";

export type DashboardProductRow = {
  id: string;
  title: string;
  url: string;
  price?: string | null;
  currency: string;
  stockStatus: string;
  game: string;
  lastSeenAt: string;
  store: { name: string };
};

function stockTone(status: string) {
  if (status === "IN_STOCK") return "success";
  if (status === "PREORDER") return "warning";
  if (status === "OUT_OF_STOCK") return "danger";
  return "default";
}

export function DashboardProductTable({ rows, loading }: { rows: DashboardProductRow[]; loading: boolean }) {
  if (loading) return <LoadingState label="Loading latest products..." />;
  if (rows.length === 0) return <EmptyState title="No products yet" detail="Run a manual scan from Stores to populate the dashboard." />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-3 pr-4 font-medium">Product</th>
            <th className="py-3 pr-4 font-medium">Store</th>
            <th className="py-3 pr-4 font-medium">Game</th>
            <th className="py-3 pr-4 font-medium">Price</th>
            <th className="py-3 pr-4 font-medium">Status</th>
            <th className="py-3 pr-4 font-medium">Last seen</th>
            <th className="py-3 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border/60">
              <td className="max-w-md py-3 pr-4 font-medium">{row.title}</td>
              <td className="py-3 pr-4 text-muted-foreground">{row.store.name}</td>
              <td className="py-3 pr-4">
                <Badge tone="info">{row.game}</Badge>
              </td>
              <td className="py-3 pr-4">{formatMoney(row.price, row.currency)}</td>
              <td className="py-3 pr-4">
                <Badge tone={stockTone(row.stockStatus)}>{row.stockStatus}</Badge>
              </td>
              <td className="py-3 pr-4 text-muted-foreground">{formatDateTime(row.lastSeenAt)}</td>
              <td className="py-3 text-right">
                <Button type="button" variant="secondary" onClick={() => window.open(row.url, "_blank", "noopener,noreferrer")}>
                  <ExternalLink size={16} aria-hidden />
                  Open
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
