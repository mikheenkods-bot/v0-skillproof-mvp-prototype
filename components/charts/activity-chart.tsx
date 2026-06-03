"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts'

interface ActivityData {
  time: string
  activity: number
  event?: string
  type?: 'normal' | 'warning' | 'violation'
}

interface ActivityChartProps {
  data: ActivityData[]
  className?: string
}

export function ActivityChart({ data, className }: ActivityChartProps) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis 
            dataKey="time" 
            tick={{ 
              fill: 'hsl(var(--muted-foreground))',
              fontSize: 11
            }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={false}
          />
          <YAxis 
            domain={[0, 100]}
            tick={{ 
              fill: 'hsl(var(--muted-foreground))',
              fontSize: 11
            }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            labelFormatter={(label) => `Время: ${label}`}
            formatter={(value: number) => [`${value}%`, 'Активность']}
          />
          <Area
            type="monotone"
            dataKey="activity"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.1}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="activity"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, payload, index } = props
              if (payload.type === 'violation') {
                return (
                  <circle 
                    key={`dot-${index}`}
                    cx={cx} 
                    cy={cy} 
                    r={6} 
                    fill="hsl(var(--destructive))"
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  />
                )
              }
              if (payload.type === 'warning') {
                return (
                  <circle 
                    key={`dot-${index}`}
                    cx={cx} 
                    cy={cy} 
                    r={5} 
                    fill="hsl(var(--warning))"
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  />
                )
              }
              return (
                <circle 
                  key={`dot-${index}`}
                  cx={cx} 
                  cy={cy} 
                  r={4} 
                  fill="hsl(var(--primary))"
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                />
              )
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
