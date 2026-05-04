import { Pause, Play, Plus, RefreshCw } from "lucide-react";
import { PageHeader } from "../../components/page-header";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export default function StoresPage() {
  return (
    <>
      <PageHeader title="Stores" description="Add, edit, pause, resume, delete, and manually scan monitored stores." />
      <div className="mb-4 flex justify-end">
        <Button>
          <Plus size={16} aria-hidden />
          Add store
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Configured stores</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-3 pr-4 font-medium">Store</th>
                <th className="py-3 pr-4 font-medium">Mode</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 font-medium">Last scan</th>
                <th className="py-3 pr-4 font-medium">Next scan</th>
                <th className="py-3 pr-4 font-medium">Last error</th>
                <th className="py-3 pr-4 font-medium">Products</th>
                <th className="py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/60">
                <td className="py-3 pr-4 font-medium">Demo Mock Store</td>
                <td className="py-3 pr-4">MOCK</td>
                <td className="py-3 pr-4">
                  <Badge>Paused</Badge>
                </td>
                <td className="py-3 pr-4 text-muted-foreground">Not scanned</td>
                <td className="py-3 pr-4 text-muted-foreground">Manual</td>
                <td className="py-3 pr-4 text-muted-foreground">-</td>
                <td className="py-3 pr-4">2</td>
                <td className="py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary">
                      <RefreshCw size={16} aria-hidden />
                      Scan
                    </Button>
                    <Button variant="ghost">
                      <Play size={16} aria-hidden />
                      Resume
                    </Button>
                    <Button variant="ghost">
                      <Pause size={16} aria-hidden />
                      Pause
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}
