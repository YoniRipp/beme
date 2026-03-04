import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAdminStats } from '@/hooks/useAdminStats';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AdminSystemHealth() {
  const { data, isLoading } = useAdminStats();

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">Loading system health...</CardContent>
      </Card>
    );
  }

  const { recentErrors, tableSizes } = data;
  const hasErrors = recentErrors.count > 0;
  const totalDbSize = tableSizes.reduce((sum, t) => sum + t.sizeBytes, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">System Health</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          {hasErrors ? (
            <AlertTriangle className="h-5 w-5 text-red-500" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">Errors (last 24h)</span>
              <Badge variant={hasErrors ? 'destructive' : 'secondary'}>
                {recentErrors.count}
              </Badge>
            </div>
            {hasErrors && recentErrors.lastErrorMessage && (
              <p className="text-sm text-muted-foreground mt-1 truncate max-w-lg">
                Latest: {recentErrors.lastErrorMessage.slice(0, 200)}
              </p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-sm">Database Tables</span>
            <span className="text-sm text-muted-foreground">Total: {formatBytes(totalDbSize)}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {tableSizes.map((t) => (
              <div key={t.table} className="flex justify-between text-sm bg-muted/50 rounded px-2 py-1">
                <span className="text-muted-foreground truncate mr-2">{t.table}</span>
                <span className="font-mono text-xs">{formatBytes(t.sizeBytes)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
