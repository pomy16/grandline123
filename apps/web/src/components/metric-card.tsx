import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "./ui/card";

export function MetricCard({ label, value, icon: Icon }: { label: string; value: number | string; icon: LucideIcon }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-semibold">{value}</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-primary">
          <Icon size={18} aria-hidden />
        </div>
      </CardContent>
    </Card>
  );
}
