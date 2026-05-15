import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart as BarChartIcon } from 'lucide-react';

export default function DailyHeatmap({ data, currencySymbol = '₹' }) {
  const fmt = (v) => `${currencySymbol}${new Intl.NumberFormat('en-IN').format(v)}`;

  if (!data || data.length === 0) return null;

  return (
    <div className="glass p-6 rounded-3xl border border-white/5 h-full">
      <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-6 flex items-center gap-2">
        <BarChartIcon size={16} className="text-primary" />
        Daily Spending Spikes
      </h3>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
              formatter={(str) => new Date(str).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="glass px-3 py-2 rounded-xl border border-white/10 shadow-2xl">
                      <p className="text-[10px] text-muted font-bold uppercase">{new Date(payload[0].payload.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                      <p className="text-sm font-black text-white">{fmt(payload[0].value)}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.amount > 1000 ? '#ef4444' : entry.amount > 500 ? '#f59e0b' : '#3b82f6'} 
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
