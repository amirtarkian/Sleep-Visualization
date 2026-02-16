export type SleepStageType = 'awake' | 'rem' | 'core' | 'deep'

export interface SleepStageInterval {
  stage: SleepStageType
  startDate: Date
  endDate: Date
}

export type BiometricType = 'heartRate' | 'hrv' | 'spo2' | 'respiratoryRate' | 'bodyTemperature'

export interface BiometricRecord {
  id?: number
  sessionId: string
  type: BiometricType
  value: number
  date: Date
  sourceName: string
}

export interface SleepScore {
  overall: number
  duration: number
  efficiency: number
  deepSleep: number
  rem: number
  latency: number
  waso: number
  isFallback: boolean // true when no stage data available
}

export interface SleepSession {
  id: string
  nightDate: string // YYYY-MM-DD format, the "night of" date
  startDate: Date
  endDate: Date
  stages: SleepStageInterval[]
  score: SleepScore
  sourceName: string
  sourceNames: string[] // all sources that contributed
  timeInBed: number // minutes
  totalSleepTime: number // minutes
  sleepEfficiency: number // percentage 0-100
  sleepLatency: number // minutes
  waso: number // minutes - wake after sleep onset
  deepMinutes: number
  remMinutes: number
  coreMinutes: number
  awakeMinutes: number
  deepPercent: number
  remPercent: number
  corePercent: number
  awakePercent: number
  // Biometrics summary (nullable - may not be available)
  avgHeartRate: number | null
  minHeartRate: number | null
  avgHrv: number | null
  avgSpo2: number | null
  avgRespiratoryRate: number | null
}

export interface SleepDataProvider {
  name: string
  import(file?: File): Promise<void>
  hasData(): Promise<boolean>
  clearData(): Promise<void>
}

export interface NightStats {
  nightDate: string
  session: SleepSession
}

export interface TrendData {
  dates: string[]
  scores: number[]
  durations: number[]
  efficiencies: number[]
  deepPercents: number[]
  remPercents: number[]
  corePercents: number[]
  avgBedtimes: number[] // minutes from midnight (can be negative for before midnight)
  avgWakeTimes: number[] // minutes from midnight
  sleepDebt: number // hours relative to 8hr target
  avgScore7d: number
  avgScore30d: number
  sri: number // sleep regularity index (lower = more regular)
  trendDirection: 'improving' | 'declining' | 'stable'
}

export type DateRange = '7d' | '30d' | '90d' | 'all'

export interface ImportState {
  status: 'idle' | 'reading' | 'parsing' | 'processing' | 'saving' | 'done' | 'error'
  progress: number // 0-100
  recordCount: number
  sessionCount: number
  error?: string
}
