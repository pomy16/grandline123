"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, RefreshCw, Save, Send, Trash2 } from "lucide-react";
import { AuthGate } from "../../components/auth-gate";
import { PageHeader } from "../../components/page-header";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { EmptyState, ErrorState, FieldError, LoadingState } from "../../components/ui/data-state";
import { Select } from "../../components/ui/form-controls";
import { Input } from "../../components/ui/input";
import { apiFetch } from "../../lib/api-client";
import { formatDateTime } from "../../lib/format";

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

const targets = ["DEFAULT", "POKEMON", "ONE_PIECE", "HIGH_PRIORITY", "ERROR_LOG", "TEST", "RESTOCK", "PRICE_DROP", "PREORDER"];

function maskWebhookUrl(url: string) {
  try {
    const parsed = new URL(url);
    const token = parsed.pathname.split("/").filter(Boolean).pop() ?? "";
    const maskedToken = token.length > 8 ? `${token.slice(0, 4)}...${token.slice(-4)}` : "...";
    return `${parsed.origin}${parsed.pathname.replace(token, maskedToken)}`;
  } catch {
    return "Invalid saved URL";
  }
}

function validateWebhookUrl(value: string) {
  if (!value.trim()) return "Discord webhook URL is required.";
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") return "Discord webhook URL must use https.";
    if (!parsed.hostname.includes("discord.com") && !parsed.hostname.includes("discordapp.com")) {
      return "URL must be a Discord webhook URL.";
    }
    return undefined;
  } catch {
    return "Discord webhook URL must be valid.";
  }
}

export default function SettingsPage() {
  const [webhooks, setWebhooks] = useState<DiscordWebhook[]>([]);
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [form, setForm] = useState(emptyWebhook);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState("900");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const formErrors = useMemo(
    () => ({
      name: form.name.trim() ? undefined : "Webhook name is required.",
      url: validateWebhookUrl(form.url),
      cooldown: Number(cooldownSeconds) >= 0 ? undefined : "Cooldown must be zero or higher."
    }),
    [form, cooldownSeconds]
  );

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiFetch<{ data: { settings: AppSetting[]; webhooks: DiscordWebhook[] } }>("/api/settings");
      setWebhooks(payload.data.webhooks);
      setSettings(payload.data.settings);
      const cooldown = payload.data.settings.find((setting) => setting.key === "notificationCooldownSeconds");
      if (typeof cooldown?.value === "number") setCooldownSeconds(String(cooldown.value));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
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
    setMessage(null);
    setError(null);
    if (formErrors.name || formErrors.url) {
      setError("Please fix the webhook form before saving.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch(editingId ? `/api/settings/webhooks/${editingId}` : "/api/settings/webhooks", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(form)
      });
      setMessage(editingId ? "Webhook updated." : "Webhook created.");
      setEditingId(null);
      setForm(emptyWebhook);
      await loadSettings();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Webhook save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function saveCooldown() {
    setMessage(null);
    setError(null);
    if (formErrors.cooldown) {
      setError(formErrors.cooldown);
      return;
    }
    try {
      await apiFetch("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ settings: { notificationCooldownSeconds: Number(cooldownSeconds) } })
      });
      setMessage("Notification cooldown updated.");
      await loadSettings();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Cooldown update failed.");
    }
  }

  async function deleteWebhook(webhook: DiscordWebhook) {
    if (!window.confirm(`Delete webhook "${webhook.name}"? Notification delivery for target ${webhook.target} may fall back to another route.`)) return;
    setMessage(null);
    setError(null);
    try {
      await apiFetch(`/api/settings/webhooks/${webhook.id}`, { method: "DELETE" });
      setMessage("Webhook deleted.");
      await loadSettings();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Webhook delete failed.");
    }
  }

  async function testWebhook(id: string) {
    setMessage(null);
    setError(null);
    try {
      const payload = await apiFetch<{ data: { ok: boolean; status: number } }>(`/api/settings/webhooks/${id}/test`, {
        method: "POST",
        body: JSON.stringify({ eventType: "NEW_PRODUCT" })
      });
      setMessage(payload.data.ok ? `Test webhook delivered (${payload.data.status}).` : `Test webhook failed (${payload.data.status}).`);
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "Webhook test failed.");
    }
  }

  const activeByTarget = targets.map((target) => ({
    target,
    count: webhooks.filter((webhook) => webhook.target === target && webhook.active).length
  }));

  return (
    <>
      <PageHeader title="Settings" description="Manage Discord webhooks, notification cooldowns, rate limits, admin settings, retention, and export options." />
      <AuthGate>
        <div className="grid gap-4 xl:grid-cols-[430px_1fr]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? "Edit Discord webhook" : "Add Discord webhook"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={saveWebhook}>
                  <div>
                    <Input required placeholder="Webhook name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                    <FieldError message={formErrors.name} />
                  </div>
                  <Select value={form.target} onChange={(event) => setForm({ ...form, target: event.target.value })}>
                    {targets.map((target) => (
                      <option key={target}>{target}</option>
                    ))}
                  </Select>
                  <div>
                    <Input required placeholder="Discord webhook URL" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} />
                    <FieldError message={formErrors.url} />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
                    Active
                  </label>
                  <div className="flex gap-2">
                    <Button disabled={saving || Boolean(formErrors.name || formErrors.url)}>
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
                {error ? <div className="mt-4"><ErrorState message={error} onRetry={loadSettings} /></div> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification cooldown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Input type="number" min={0} value={cooldownSeconds} onChange={(event) => setCooldownSeconds(event.target.value)} />
                  <FieldError message={formErrors.cooldown} />
                </div>
                <Button type="button" onClick={saveCooldown} disabled={Boolean(formErrors.cooldown)}>
                  <Save size={16} aria-hidden />
                  Save cooldown
                </Button>
                <div className="text-xs text-muted-foreground">
                  Keyword rules can override this value. Duplicate alerts are still blocked by product state hash and payload hash.
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle>Discord webhook routing</CardTitle>
                  <Button type="button" variant="secondary" onClick={loadSettings} disabled={loading}>
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                  {activeByTarget.map((route) => (
                    <div key={route.target} className="rounded-md border border-border bg-background p-3">
                      <div className="text-xs text-muted-foreground">{route.target}</div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="font-medium">{route.count} active</span>
                        <Badge tone={route.count > 0 ? "success" : "default"}>{route.count > 0 ? "Ready" : "Fallback"}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
                {loading ? <LoadingState label="Loading settings..." /> : null}
                {!loading && webhooks.length === 0 ? <EmptyState title="No webhooks configured" detail="Add a Discord webhook to enable notification delivery." /> : null}
                <div className="space-y-3">
                  {webhooks.map((webhook) => (
                    <div key={webhook.id} className="rounded-md border border-border bg-background p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium">{webhook.name}</div>
                          <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                            <span className="truncate">{revealed[webhook.id] ? webhook.url : maskWebhookUrl(webhook.url)}</span>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => setRevealed((current) => ({ ...current, [webhook.id]: !current[webhook.id] }))}
                              aria-label={revealed[webhook.id] ? "Hide webhook URL" : "Show webhook URL"}
                            >
                              {revealed[webhook.id] ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
                            </button>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">Updated {formatDateTime(webhook.updatedAt)}</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="info">{webhook.target}</Badge>
                          <Badge tone={webhook.active ? "success" : "default"}>{webhook.active ? "Active" : "Paused"}</Badge>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" onClick={() => testWebhook(webhook.id)} disabled={!webhook.active}>
                          <Send size={16} aria-hidden />
                          Test
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => startEdit(webhook)}>Edit</Button>
                        <Button type="button" variant="destructive" onClick={() => deleteWebhook(webhook)}>
                          <Trash2 size={16} aria-hidden />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
                  Routing order: test webhook, error webhook, high priority, store webhook, event-type webhook, keyword rule target, game webhook, then default webhook.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Saved admin settings</CardTitle>
              </CardHeader>
              <CardContent>
                {settings.length === 0 ? (
                  <EmptyState title="No app settings saved" detail="Settings will appear here after the first update." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-muted-foreground">
                          <th className="py-3 pr-4 font-medium">Key</th>
                          <th className="py-3 pr-4 font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {settings.map((setting) => (
                          <tr key={setting.id} className="border-b border-border/60">
                            <td className="py-3 pr-4 font-medium">{setting.key}</td>
                            <td className="py-3 pr-4 text-muted-foreground">{JSON.stringify(setting.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </AuthGate>
    </>
  );
}
