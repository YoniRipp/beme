import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAdminStats } from '@/hooks/useAdminStats';

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AdminCharts() {
  const { data, isLoading } = useAdminStats();

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
              Loading...
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const userGrowthData = data.userGrowth.map((d) => ({
    date: formatDate(d.date),
    signups: d.count,
  }));

  const activityData = data.activityByDay.map((d) => ({
    date: formatDate(d.date),
    Workouts: d.workouts,
    'Food Entries': d.foodEntries,
    'Check-ins': d.checkIns,
  }));

  const { featureAdoption } = data;
  const total = featureAdoption.totalUsers || 1;
  const adoptionData = [
    { name: 'Workouts', value: featureAdoption.workouts, pct: Math.round((featureAdoption.workouts / total) * 100) },
    { name: 'Food', value: featureAdoption.foodEntries, pct: Math.round((featureAdoption.foodEntries / total) * 100) },
    { name: 'Sleep', value: featureAdoption.checkIns, pct: Math.round((featureAdoption.checkIns / total) * 100) },
    { name: 'Goals', value: featureAdoption.goals, pct: Math.round((featureAdoption.goals / total) * 100) },
  ];

  const tableSizeData = data.tableSizes.map((t) => ({
    name: t.table.replace(/_/g, ' '),
    size: t.sizeBytes,
    label: formatBytes(t.sizeBytes),
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* User Growth */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">User Growth (30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="signups" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Daily Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily Activity (14 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Workouts" stackId="a" fill="#3b82f6" />
              <Bar dataKey="Food Entries" stackId="a" fill="#10b981" />
              <Bar dataKey="Check-ins" stackId="a" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Feature Adoption */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Feature Adoption (30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={adoptionData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, pct }) => `${name} ${pct}%`}
              >
                {adoptionData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => {
                const item = adoptionData.find((d) => d.name === name);
                return [`${value} users (${item?.pct ?? 0}%)`, name];
              }} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Table Sizes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Database Table Sizes</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={tableSizeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={formatBytes} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => formatBytes(value)} />
              <Bar dataKey="size" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
