import type { ReactNode } from 'react'
import { Card } from '../layout/Card'

interface StatsCardProps {
  label: string
  value: string
  sublabel?: string
  icon?: ReactNode
}

export function StatsCard({ label, value, sublabel, icon }: StatsCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-100">{value}</p>
          {sublabel && <p className="mt-0.5 text-xs text-slate-500">{sublabel}</p>}
        </div>
        {icon && <div className="text-slate-600">{icon}</div>}
      </div>
    </Card>
  )
}
