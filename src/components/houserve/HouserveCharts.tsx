'use client';

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface ChartPoint { date: string; bookings: number; revenue: number }

interface HouserveChartsProps {
  data: ChartPoint[];
  accentHex: string;
}

export function HouserveCharts({ data, accentHex }: HouserveChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Booking volume bar chart */}
      <div className="rounded-xl border bg-card shadow-sm p-5">
        <h3 className="font-semibold mb-4 text-sm">Bookings — last 7 days</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => [v, 'Bookings']}
            />
            <Bar dataKey="bookings" fill={accentHex} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue line chart */}
      <div className="rounded-xl border bg-card shadow-sm p-5">
        <h3 className="font-semibold mb-4 text-sm">Revenue — last 7 days</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => [formatCurrency(v), 'Revenue']}
            />
            <Line type="monotone" dataKey="revenue" stroke={accentHex} strokeWidth={2} dot={{ r: 3, fill: accentHex }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
