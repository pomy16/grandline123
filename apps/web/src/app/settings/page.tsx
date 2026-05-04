"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Save, Send, Trash2 } from "lucide-react";
import { AuthGate } from "../../components/auth-gate";
import { PageHeader } from "../../components/page-header";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { apiFetch } from "../../lib/api-client";

type DiscordWebhook = {
  id: string;
  name: string;
  target: string;
  url: string;
  active: boolean;
  updatedAt: string;
};

type AppSetting = {
  id: string;
  key: string;
  value: unknown;
};

const emptyWebhook = {
  name: "",
  target: "DEFAULT",
  url: "",
  active: true
};

export default function SettingsPage() {
  const [webhooks, setWebhooks] = useState<DiscordWebhook[]>([]);
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [form, setForm] = useState(emptyWebhook);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState("900");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadSettings() {
    setLoading(true);
    const payload = await apiFetch<{ data: { settings: AppSetting[]; webhooks: DiscordWebhook[] } }>("/api/settings");
    setWebhooks(payload.data.webhooks);
    setSettings(payload.data.settings);
    const cooldown = payload.data.settings.find((setting) => setting.key === "notificationCooldownSeconds");
    if (typeof cooldown?.value === "number") setCooldownSeconds(String(cooldown.value));
    setLoading(false);
  }

  useEffect(() => {
    loadSettings().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Failed to load settings.");
      setLoading(false);
    });
  }, []);

  function startEdit(webhook: DiscordWebhook) {
    setEditingId(webhook.id);
    setForm({
      name: webhook.name,
      target: webhook.target,
      url: webhook.url,
      active: webhook.active
    });
  }

  async function saveWebhook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await apiFetch(editingId ? `/api/settings/webhooks/${editingId}` : "/api/settings/webhooks", {
      method: editingId ? "PATCH" : "POST",
      body: JSON.stringify(form)
    });
    setMessage(editingId ? "Webhook updated." : "Webhook created.");
    setEditingId(null);
    setForm(emptyWebhook);
    await loadSettings();
  }

  async function saveCooldown() {
    await apiFetch("/api/settings", {
      method: "PATCH",
      body: JSON.stringify({ settings: { notificationCooldownSeconds: Number(cooldownSeconds) } })
    });
    setMessage("Notification cooldown updated.");
    await loadSettings();
  }

  async function deleteWebhook(id: string) {
    await apiFetch(`/api/settings/webhooks/${id}`, { method: "DELETE" });
    setMessage("Webhook deleted.");
    await loadSettings();
  }

  async function testWebhook(id: string) {
    try {
      const payload = await apiFetch<{ data: { ok: boolean; status: number } }>(`/api/settings/webhooks/${id}/test`, {
        method: "POST",
        body: JSON.stringify({ eventType: "NEW_PRODUCT" })
      });
      setMessage(payload.data.ok ? `Test webhook delivered (${payload.data.status}).` : `Test webhook failed (${payload.data.status}).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Webhook test failed.");
    }
  }

  return (
    <>
      <PageHeader title="Settings" description="Manage Discord webhooks, notification cooldowns, rate limits, admin settings, retention, and export options." />
      <AuthGate>
        <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? "Edit Discord webhook" : "Add Discord webhook"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={saveWebhook}>
                  <Input required placeholder="Webhook name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                  <select className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" value={form.target} onChange={(event) => setForm({ ...form, target: event.target.value })}>
                    {["DEFAULT", "POKEMON", "ONE_PIECE", "HIGH_PRIORITY", "ERROR_LOG"].map((target) => (
                      <option key={target}>{target}</option>
                    ))}
                  </select>
                  <Input required placeholder="Discord webhook URL" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
                    Active
                  </label>
                  <div className="flex gap-2">
                    <Button>
                      <Save size={16} aria-hidden />
                      {editingId ? "Save" : "Create"}
                    </Button>
                    {editingId ? (
                      <Button type="button" variant="ghost" onClick={() => { setEditingId(null); setForm(emptyWebhook); }}>
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </form>
                {message ? <div className="mt-4 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">{message}</div> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification cooldown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input type="number" min={0} value={cooldownSeconds} onChange={(event) => setCooldownSeconds(event.target.value)} />
                <Button type="button" onClick={saveCooldown}>
                  <Save size={16} aria-hidden />
                  Save cooldown
                </Button>
                <div className="text-xs text-muted-foreground">
                  Keyword rules can override this value. Duplicate alerts are still blocked by product state hash and payload hash.
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Discord webhook routing</CardTitle>
                <Button type="button" variant="secondary" onClick={loadSettings}>
                  <RefreshCw size={16} aria-hidden />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? <div className="text-sm text-muted-foreground">Loading settings...</div> : null}
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="rounded-md border border-border bg-background p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{webhook.name}</div>
                      <div className="max-w-xl truncate text-xs text-muted-foreground">{webhook.url}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="info">{webhook.target}</Badge>
                      <Badge tone={webhook.active ? "success" : "default"}>{webhook.active ? "Active" : "Paused"}</Badge>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => testWebhook(webhook.id)}>
                      <Send size={16} aria-hidden />
                      Test
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => startEdit(webhook)}>Edit</Button>
                    <Button type="button" variant="destructive" onClick={() => deleteWebhook(webhook.id)}>
                      <Trash2 size={16} aria-hidden />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              {webhooks.length === 0 && !loading ? <div className="text-sm text-muted-foreground">No webhooks configured yet.</div> : null}
              <div className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
                Routing order: high priority webhook, explicit keyword rule target, game webhook, then default webhook.
              </div>
              <div className="hidden">{settings.length}</div>
            </CardContent>
          </Card>
        </div>
      </AuthGate>
    </>
  );
}
