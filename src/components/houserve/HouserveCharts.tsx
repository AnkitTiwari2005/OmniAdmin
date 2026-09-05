'use client';

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { Calendar, TrendingUp } from 'lucide-react';

interface ChartPoint {
  date: string;
  bookings: number;
  revenue: number;
}

interface HouserveChartsProps {
  data: ChartPoint[];
  accentHex: string;
}

export function HouserveCharts({ data, accentHex }: HouserveChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Booking volume bar chart */}
      <div className="glass-card card-highlight rounded-2xl p-6 border border-border/50 hover-lift relative overflow-hidden group">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-sm text-foreground">Booking Volume</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Service appointments scheduled over last 7 days</p>
          </div>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/50 shadow-2xs"
            style={{ backgroundColor: accentHex + '18', color: accentHex }}
          >
            <Calendar className="h-4 w-4" />
          </div>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card) / 0.9)',
                backdropFilter: 'blur(12px)',
                border: '1px solid hsl(var(--border) / 0.8)',
                borderRadius: '12px',
                fontSize: '12px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                padding: '8px 12px',
              }}
              cursor={{ fill: 'hsl(var(--muted) / 0.4)', radius: 6 }}
              formatter={(v: number) => [<span className="font-bold text-foreground">{v}</span>, 'Bookings']}
            />
            <Bar
              dataKey="bookings"
              fill={accentHex}
              radius={[6, 6, 0, 0]}
              isAnimationActive={true}
              animationDuration={900}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue Area Chart */}
      <div className="glass-card card-highlight rounded-2xl p-6 border border-border/50 hover-lift relative overflow-hidden group">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-sm text-foreground">Service Revenue</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Completed service earnings over last 7 days</p>
          </div>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/50 shadow-2xs"
            style={{ backgroundColor: accentHex + '18', color: accentHex }}
          >
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-houserve`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={accentHex} stopOpacity={0.35} />
                <stop offset="95%" stopColor={accentHex} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card) / 0.9)',
                backdropFilter: 'blur(12px)',
                border: '1px solid hsl(var(--border) / 0.8)',
                borderRadius: '12px',
                fontSize: '12px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                padding: '8px 12px',
              }}
              formatter={(v: number) => [<span className="font-bold text-foreground">{formatCurrency(v)}</span>, 'Revenue']}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={accentHex}
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#grad-houserve)"
              isAnimationActive={true}
              animationDuration={900}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
