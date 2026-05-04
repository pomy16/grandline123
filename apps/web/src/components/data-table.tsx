import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

export function DemoProductTable() {
  const rows = [
    {
      title: "Pokemon TCG Scarlet & Violet Booster Box",
      store: "Demo Mock Store",
      price: "119.99 EUR",
      previous: "129.99 EUR",
      status: "IN_STOCK",
      game: "POKEMON"
    },
    {
      title: "One Piece Card Game Starter Deck Demo",
      store: "Demo Mock Store",
      price: "14.99 EUR",
      previous: "-",
      status: "PREORDER",
      game: "ONE_PIECE"
    }
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-3 pr-4 font-medium">Product</th>
            <th className="py-3 pr-4 font-medium">Store</th>
            <th className="py-3 pr-4 font-medium">Game</th>
            <th className="py-3 pr-4 font-medium">Price</th>
            <th className="py-3 pr-4 font-medium">Previous</th>
            <th className="py-3 pr-4 font-medium">Status</th>
            <th className="py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.title} className="border-b border-border/60">
              <td className="py-3 pr-4 font-medium">{row.title}</td>
              <td className="py-3 pr-4 text-muted-foreground">{row.store}</td>
              <td className="py-3 pr-4">
                <Badge tone="info">{row.game}</Badge>
              </td>
              <td className="py-3 pr-4">{row.price}</td>
              <td className="py-3 pr-4 text-muted-foreground">{row.previous}</td>
              <td className="py-3 pr-4">
                <Badge tone={row.status === "IN_STOCK" ? "success" : "warning"}>{row.status}</Badge>
              </td>
              <td className="py-3 text-right">
                <Button variant="secondary">Open product</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
