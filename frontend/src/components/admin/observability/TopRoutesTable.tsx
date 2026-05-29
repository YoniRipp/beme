import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { RouteMetric } from '@/core/api/admin';
import { cn } from '@/lib/utils';
import { latencyStatus, routeErrorRate, statusBand } from './format';

const LATENCY_COLORS = {
  ok: 'text-emerald-600 dark:text-emerald-400',
  warn: 'text-amber-600 dark:text-amber-400',
  bad: 'text-red-600 dark:text-red-400',
  neutral: 'text-foreground',
} as const;

/** Stacked bar showing the 2xx/3xx/4xx/5xx split for a route. */
function StatusBar({ route }: { route: RouteMetric }) {
  const total = route.total || 1;
  const bands = [
    { key: '2xx', count: statusBand(route.statusCounts, 200, 300), color: 'bg-emerald-500' },
    { key: '3xx', count: statusBand(route.statusCounts, 300, 400), color: 'bg-sky-500' },
    { key: '4xx', count: statusBand(route.statusCounts, 400, 500), color: 'bg-amber-500' },
    { key: '5xx', count: statusBand(route.statusCounts, 500, 600), color: 'bg-red-500' },
  ].filter((b) => b.count > 0);

  return (
    <div className="flex h-2 w-28 overflow-hidden rounded-full bg-muted" title={bands.map((b) => `${b.key}: ${b.count}`).join('  ')}>
      {bands.map((b) => (
        <div key={b.key} className={b.color} style={{ width: `${(b.count / total) * 100}%` }} />
      ))}
    </div>
  );
}

/** "What's used all the time" — routes ranked by volume, with reliability + latency. */
export function TopRoutesTable({ routes }: { routes: RouteMetric[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Traffic &amp; reliability by route</CardTitle>
      </CardHeader>
      <CardContent>
        {routes.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No requests recorded yet.</p>
        ) : (
          <div className="max-h-[420px] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                <TableRow>
                  <TableHead className="text-[13px]">Route</TableHead>
                  <TableHead className="text-right text-[13px]">Requests</TableHead>
                  <TableHead className="text-[13px]">Status mix</TableHead>
                  <TableHead className="text-right text-[13px]">Errors</TableHead>
                  <TableHead className="text-right text-[13px]">p50</TableHead>
                  <TableHead className="text-right text-[13px]">p95</TableHead>
                  <TableHead className="text-right text-[13px]">p99</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes.map((r) => {
                  const errPct = routeErrorRate(r);
                  return (
                    <TableRow key={r.route} className="text-[13px]">
                      <TableCell className="font-mono max-w-[220px] truncate" title={r.route}>
                        {r.route}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{r.total.toLocaleString()}</TableCell>
                      <TableCell>
                        <StatusBar route={r} />
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right tabular-nums font-medium',
                          errPct >= 5 ? 'text-red-600 dark:text-red-400' : errPct >= 1 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                        )}
                      >
                        {errPct.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{r.p50Ms} ms</TableCell>
                      <TableCell className={cn('text-right tabular-nums font-medium', LATENCY_COLORS[latencyStatus(r.p95Ms)])}>
                        {r.p95Ms} ms
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{r.p99Ms} ms</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
