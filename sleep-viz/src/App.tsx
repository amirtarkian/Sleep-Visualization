import { useState, useCallback } from 'react'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './components/dashboard/Dashboard'
import { NightDetail } from './components/detail/NightDetail'
import { TrendsView } from './components/trends/TrendsView'
import { StageDistribution } from './components/stages/StageDistribution'
import { SignIn } from './components/auth/SignIn'
import { useAuth } from './hooks/useAuth'
import { useSupabaseSessions } from './hooks/useSupabaseSessions'
import type { DateRange } from './providers/types'

function App() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [activeSection, setActiveSection] = useState('dashboard')
  const [selectedNight, setSelectedNight] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const { sessions, loading } = useSupabaseSessions(dateRange)

  if (authLoading) return <div className="min-h-screen bg-slate-950" />
  if (!user) return <SignIn />

  const handleSelectNight = (nightDate: string) => {
    setSelectedNight(nightDate)
    setActiveSection('detail')
  }

  return (
    <AppShell activeSection={activeSection} onNavigate={setActiveSection} onSignOut={signOut}>
      {activeSection === 'dashboard' && (
        <Dashboard
          sessions={sessions}
          loading={loading}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onSelectNight={handleSelectNight}
        />
      )}
      {activeSection === 'detail' && (
        <NightDetail
          nightDate={selectedNight}
          onSelectNight={setSelectedNight}
        />
      )}
      {activeSection === 'trends' && (
        <>
          <TrendsView sessions={sessions} />
          <StageDistribution sessions={sessions} />
        </>
      )}
    </AppShell>
  )
}

export default App
