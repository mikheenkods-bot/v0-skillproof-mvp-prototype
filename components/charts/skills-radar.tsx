"use client"

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts'

interface SkillData {
  name: string
  score: number
}

interface SkillsRadarProps {
  skills: SkillData[]
  className?: string
}

export function SkillsRadar({ skills, className }: SkillsRadarProps) {
  const data = skills.map(skill => ({
    subject: skill.name,
    value: skill.score,
    fullMark: 100
  }))

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid 
            stroke="hsl(var(--border))"
            strokeDasharray="3 3"
          />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ 
              fill: 'hsl(var(--muted-foreground))',
              fontSize: 12
            }}
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 100]}
            tick={{ 
              fill: 'hsl(var(--muted-foreground))',
              fontSize: 10
            }}
          />
          <Radar
            name="Навыки"
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            formatter={(value: number) => [`${value}%`, 'Уровень']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
