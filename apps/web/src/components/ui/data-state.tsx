import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { Button } from "./button";

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-24 items-center justify-center gap-2 rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
      <Loader2 size={16} className="animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/30 p-6 text-center">
      <Inbox size={22} className="mb-2 text-muted-foreground" aria-hidden />
      <div className="text-sm font-medium">{title}</div>
      {detail ? <div className="mt-1 max-w-md text-sm text-muted-foreground">{detail}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
      <div className="flex min-w-0 items-center gap-2">
        <AlertTriangle size={16} className="shrink-0" aria-hidden />
        <span className="break-words">{message}</span>
      </div>
      {onRetry ? (
        <Button type="button" variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="mt-1 text-xs text-red-300">{message}</div>;
}

