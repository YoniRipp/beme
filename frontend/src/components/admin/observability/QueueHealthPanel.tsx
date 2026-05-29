import { Layers, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { QueueCounts, QueuesResponse } from '@/core/api/admin';
import { cn } from '@/lib/utils';

interface CountChipProps {
  label: string;
  value: number;
  tone?: 'default' | 'bad' | 'busy';
}

function CountChip({ label, value, tone = 'default' }: CountChipProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border px-3 py-2 min-w-[68px]',
        tone === 'bad' && value > 0 && 'border-red-500/40 bg-red-500/5',
        tone === 'busy' && value > 0 && 'border-sky-500/40 bg-sky-500/5',
        (tone === 'default' || value === 0) && 'border-border bg-muted/20'
      )}
    >
      <span
        className={cn(
          'text-lg font-semibold tabular-nums',
          tone === 'bad' && value > 0 && 'text-red-600 dark:text-red-400'
        )}
      >
        {value.toLocaleString()}
      </span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

function QueueCard({ title, q, isDlq = false }: { title: string; q: QueueCounts; isDlq?: boolean }) {
  const failed = q.failed ?? 0;
  const stuck = failed > 0 || (isDlq && ((q.waiting ?? 0) + (q.active ?? 0)) > 0);
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        {stuck ? (
          <AlertTriangle className="h-4 w-4 text-red-500" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        )}
        <span className="font-medium text-sm">{title}</span>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">{q.name}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {q.waiting != null && <CountChip label="waiting" value={q.waiting} tone={isDlq ? 'bad' : 'default'} />}
        {q.active != null && <CountChip label="active" value={q.active} tone="busy" />}
        {q.delayed != null && <CountChip label="delayed" value={q.delayed} />}
        <CountChip label="failed" value={failed} tone="bad" />
        {q.completed != null && <CountChip label="completed" value={q.completed} />}
      </div>
    </div>
  );
}

interface QueueHealthPanelProps {
  queues: QueuesResponse | undefined;
  isLoading: boolean;
}

/** BullMQ queue health — surfaces backlogs, in-flight jobs, failures, and the DLQ. */
export function QueueHealthPanel({ queues, isLoading }: QueueHealthPanelProps) {
  const hasQueues = queues && (queues.events || queues.eventsDlq);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4" /> Background queues
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && !queues ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading queue health…</p>
        ) : !hasQueues ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No queue backend connected (Redis/BullMQ not configured).
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {queues?.events && <QueueCard title="Events" q={queues.events} />}
            {queues?.eventsDlq && <QueueCard title="Dead-letter queue" q={queues.eventsDlq} isDlq />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
