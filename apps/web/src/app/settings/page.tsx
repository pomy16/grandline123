import { Save, Send } from "lucide-react";
import { PageHeader } from "../../components/page-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Manage Discord webhooks, polling intervals, rate limits, admin account settings, notification cooldowns, retention, and export options." />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Discord webhooks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Default webhook URL" />
            <Input placeholder="Pokemon webhook URL" />
            <Input placeholder="One Piece webhook URL" />
            <div className="flex gap-2">
              <Button>
                <Save size={16} aria-hidden />
                Save
              </Button>
              <Button variant="secondary">
                <Send size={16} aria-hidden />
                Test
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Monitoring safety defaults</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Polling interval seconds" defaultValue="300" />
            <Input placeholder="Request timeout ms" defaultValue="10000" />
            <Input placeholder="Max retries" defaultValue="3" />
            <Input placeholder="Rate limit per minute" defaultValue="30" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
