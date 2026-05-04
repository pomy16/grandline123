"use client";

import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { AuthGate } from "../../components/auth-gate";
import { PageHeader } from "../../components/page-header";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { apiFetch } from "../../lib/api-client";

type KeywordRule = {
  id: string;
  name: string;
  includeKeywords: string[];
  excludeKeywords: string[];
  category?: string | null;
  game: string;
  minPrice?: string | null;
  maxPrice?: string | null;
  priority: string;
  webhookTarget: string;
  caseInsensitive: boolean;
  fuzzyMatching: boolean;
  active: boolean;
  cooldownSeconds: number;
};

const emptyForm = {
  name: "",
  includeKeywords: "pokemon\npokémon\nbooster box\nelite trainer box",
  excludeKeywords: "used\ndamaged\ndigital\nproxy\nfake\nresealed",
  category: "Sealed",
  game: "POKEMON",
  minPrice: "",
  maxPrice: "",
  priority: "NORMAL",
  webhookTarget: "DEFAULT",
  caseInsensitive: true,
  fuzzyMatching: false,
  active: true,
  cooldownSeconds: 900
};

export default function RulesPage() {
  const [rules, setRules] = useState<KeywordRule[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadRules() {
    setLoading(true);
    const payload = await apiFetch<{ data: KeywordRule[] }>("/api/rules");
    setRules(payload.data);
    setLoading(false);
  }

  useEffect(() => {
    loadRules().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Failed to load rules.");
      setLoading(false);
    });
  }, []);

  function startEdit(rule: KeywordRule) {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      includeKeywords: rule.includeKeywords.join("\n"),
      excludeKeywords: rule.excludeKeywords.join("\n"),
      category: rule.category ?? "",
      game: rule.game,
      minPrice: rule.minPrice ?? "",
      maxPrice: rule.maxPrice ?? "",
      priority: rule.priority,
      webhookTarget: rule.webhookTarget,
      caseInsensitive: rule.caseInsensitive,
      fuzzyMatching: rule.fuzzyMatching,
      active: rule.active,
      cooldownSeconds: rule.cooldownSeconds
    });
  }

  async function saveRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await apiFetch(editingId ? `/api/rules/${editingId}` : "/api/rules", {
      method: editingId ? "PATCH" : "POST",
      body: JSON.stringify(form)
    });
    setMessage(editingId ? "Rule updated." : "Rule created.");
    setEditingId(null);
    setForm(emptyForm);
    await loadRules();
  }

  async function deleteRule(ruleId: string) {
    const rule = rules.find((item) => item.id === ruleId);
    if (!window.confirm(`Delete rule "${rule?.name ?? "selected rule"}"? Matching and routing behavior will update immediately.`)) return;
    await apiFetch(`/api/rules/${ruleId}`, { method: "DELETE" });
    setMessage("Rule deleted.");
    await loadRules();
  }

  return (
    <>
      <PageHeader title="Keyword rules" description="Create include and exclude matching rules with game, category, priority, webhook target, and fuzzy matching options." />
      <AuthGate>
        <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? "Edit rule" : "Create rule"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={saveRule}>
                <Input required placeholder="Rule name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                <textarea
                  className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Include keywords, one per line"
                  value={form.includeKeywords}
                  onChange={(event) => setForm({ ...form, includeKeywords: event.target.value })}
                />
                <textarea
                  className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Exclude keywords, one per line"
                  value={form.excludeKeywords}
                  onChange={(event) => setForm({ ...form, excludeKeywords: event.target.value })}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select className="h-9 rounded-md border border-border bg-background px-3 text-sm" value={form.game} onChange={(event) => setForm({ ...form, game: event.target.value })}>
                    {["POKEMON", "ONE_PIECE", "BOTH", "UNKNOWN"].map((game) => (
                      <option key={game}>{game}</option>
                    ))}
                  </select>
                  <Input placeholder="Category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
                  <Input type="number" placeholder="Min price" value={form.minPrice} onChange={(event) => setForm({ ...form, minPrice: event.target.value })} />
                  <Input type="number" placeholder="Max price" value={form.maxPrice} onChange={(event) => setForm({ ...form, maxPrice: event.target.value })} />
                  <select className="h-9 rounded-md border border-border bg-background px-3 text-sm" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
                    {["LOW", "NORMAL", "HIGH", "CRITICAL"].map((priority) => (
                      <option key={priority}>{priority}</option>
                    ))}
                  </select>
                  <select className="h-9 rounded-md border border-border bg-background px-3 text-sm" value={form.webhookTarget} onChange={(event) => setForm({ ...form, webhookTarget: event.target.value })}>
                    {["DEFAULT", "POKEMON", "ONE_PIECE", "HIGH_PRIORITY", "ERROR_LOG"].map((target) => (
                      <option key={target}>{target}</option>
                    ))}
                  </select>
                  <Input type="number" min={0} placeholder="Cooldown seconds" value={form.cooldownSeconds} onChange={(event) => setForm({ ...form, cooldownSeconds: Number(event.target.value) })} />
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
                    Active
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.caseInsensitive} onChange={(event) => setForm({ ...form, caseInsensitive: event.target.checked })} />
                    Case-insensitive
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.fuzzyMatching} onChange={(event) => setForm({ ...form, fuzzyMatching: event.target.checked })} />
                    Fuzzy matching
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button>
                    <Save size={16} aria-hidden />
                    {editingId ? "Save" : "Create"}
                  </Button>
                  {editingId ? (
                    <Button type="button" variant="ghost" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </form>
              {message ? <div className="mt-4 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">{message}</div> : null}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
                <Plus size={16} aria-hidden />
                New rule
              </Button>
            </div>
            {loading ? <div className="text-sm text-muted-foreground">Loading rules...</div> : null}
            <div className="grid gap-4 lg:grid-cols-2">
              {rules.map((rule) => (
                <Card key={rule.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle>{rule.name}</CardTitle>
                      <Badge tone={rule.active ? "success" : "default"}>{rule.active ? "Active" : "Paused"}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="info">{rule.game}</Badge>
                      <Badge>{rule.priority}</Badge>
                      <Badge>{rule.webhookTarget}</Badge>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Include</div>
                      <div>{rule.includeKeywords.join(", ") || "-"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Exclude</div>
                      <div>{rule.excludeKeywords.join(", ") || "-"}</div>
                    </div>
                    <div className="text-muted-foreground">
                      Category: {rule.category ?? "-"} | Cooldown: {rule.cooldownSeconds}s
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" onClick={() => startEdit(rule)}>Edit</Button>
                      <Button type="button" variant="destructive" onClick={() => deleteRule(rule.id)}>
                        <Trash2 size={16} aria-hidden />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </AuthGate>
    </>
  );
}
