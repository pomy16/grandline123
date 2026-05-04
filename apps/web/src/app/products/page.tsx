import { ExternalLink, Search, Send, XCircle } from "lucide-react";
import { DemoProductTable } from "../../components/data-table";
import { PageHeader } from "../../components/page-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

export default function ProductsPage() {
  return (
    <>
      <PageHeader title="Products" description="Search products by store, game, category, stock status, price, and discovery date." />
      <Card>
        <CardHeader>
          <CardTitle>Product catalog</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground" size={16} aria-hidden />
              <Input className="pl-9" placeholder="Search title, SKU, EAN, category" />
            </div>
            <Button variant="secondary">
              <ExternalLink size={16} aria-hidden />
              Open product
            </Button>
            <Button variant="secondary">
              <Send size={16} aria-hidden />
              Test alert
            </Button>
            <Button variant="ghost">
              <XCircle size={16} aria-hidden />
              Ignore
            </Button>
          </div>
          <DemoProductTable />
        </CardContent>
      </Card>
    </>
  );
}
