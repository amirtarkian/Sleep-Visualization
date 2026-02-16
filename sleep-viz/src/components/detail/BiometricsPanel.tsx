import type { BiometricRecord } from '../../providers/types'
import { Card } from '../layout/Card'
import { Heart, Activity, Wind, Thermometer } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface BiometricsPanelProps {
  biometrics: BiometricRecord[]
}

interface BiometricCardProps {
  title: string
  icon: React.ReactNode
  data: BiometricRecord[]
  unit: string
  color: string
  formatter?: (v: number) => string
}

function BiometricCard({ title, icon, data, unit, color, formatter }: BiometricCardProps) {
  if (data.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-slate-600">{icon}</span>
          <span className="text-xs font-medium text-slate-500">{title}</span>
        </div>
        <p className="text-sm text-slate-600">Not available</p>
      </Card>
    )
  }

  const values = data.map(d => d.value)
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  const min = Math.min(...values)
  const max = Math.max(...values)
  const chartData = data.map(d => ({ v: d.value }))
  const fmt = formatter || ((v: number) => v.toFixed(1))

  return (
    <Card>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color }}>{icon}</span>
        <span className="text-xs font-medium text-slate-400">{title}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold text-slate-200">{fmt(avg)}</span>
        <span className="text-xs text-slate-500">{unit}</span>
      </div>
      <div className="text-[10px] text-slate-600 mt-0.5">
        {fmt(min)}–{fmt(max)} range
      </div>
      <div className="h-8 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export function BiometricsPanel({ biometrics }: BiometricsPanelProps) {
  const hr = biometrics.filter(b => b.type === 'heartRate')
  const hrv = biometrics.filter(b => b.type === 'hrv')
  const spo2 = biometrics.filter(b => b.type === 'spo2')
  const resp = biometrics.filter(b => b.type === 'respiratoryRate')

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <BiometricCard title="Heart Rate" icon={<Heart className="h-4 w-4" />} data={hr} unit="bpm" color="#f87171" formatter={v => Math.round(v).toString()} />
      <BiometricCard title="HRV" icon={<Activity className="h-4 w-4" />} data={hrv} unit="ms" color="#a78bfa" formatter={v => Math.round(v).toString()} />
      <BiometricCard title="SpO2" icon={<Wind className="h-4 w-4" />} data={spo2} unit="%" color="#60a5fa" />
      <BiometricCard title="Respiratory Rate" icon={<Thermometer className="h-4 w-4" />} data={resp} unit="br/min" color="#34d399" />
    </div>
  )
}
