import { type ReactNode, useState } from 'react'
import { Moon, BarChart3, Calendar, TrendingUp, Heart, FileText, Target, Menu, X, LogOut } from 'lucide-react'

interface AppShellProps {
  children: ReactNode
  activeSection: string
  onNavigate: (section: string) => void
  onSignOut: () => void
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'detail', label: 'Night Detail', icon: Calendar },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
  { id: 'readiness', label: 'Readiness', icon: Heart },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'goals', label: 'Goals', icon: Target },
]

export function AppShell({ children, activeSection, onNavigate, onSignOut }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 glass">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="h-6 w-6 text-violet-400" />
              <span className="text-lg font-semibold text-slate-100">SleepViz</span>
            </div>

            {/* Desktop nav */}
            <nav className="hidden sm:flex items-center gap-1">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    activeSection === item.id
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
              <button
                onClick={onSignOut}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors ml-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </nav>

            {/* Mobile menu button */}
            <button
              className="sm:hidden p-2 text-slate-400 hover:text-slate-200"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <nav className="sm:hidden border-t border-slate-800 px-4 py-2">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); setMobileMenuOpen(false) }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeSection === item.id
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
            <button
              onClick={() => { onSignOut(); setMobileMenuOpen(false) }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </nav>
        )}
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  )
}
