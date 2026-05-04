import { Plus } from "lucide-react";
import { PageHeader } from "../../components/page-header";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export default function RulesPage() {
  return (
    <>
      <PageHeader title="Keyword rules" description="Create include and exclude matching rules with game, category, priority, webhook target, and fuzzy matching options." />
      <div className="mb-4 flex justify-end">
        <Button>
          <Plus size={16} aria-hidden />
          Add rule
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[
          ["Pokemon sealed products", "POKEMON", "booster box, etb, display, blister", "used, damaged, fake, resealed"],
          ["One Piece sealed products", "ONE_PIECE", "starter deck, op booster, romance dawn", "used, damaged, fake, opened"]
        ].map(([name, game, include, exclude]) => (
          <Card key={name}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{name}</CardTitle>
                <Badge tone="success">Active</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-muted-foreground">Game</div>
                <Badge tone="info">{game}</Badge>
              </div>
              <div>
                <div className="text-muted-foreground">Include</div>
                <div>{include}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Exclude</div>
                <div>{exclude}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
