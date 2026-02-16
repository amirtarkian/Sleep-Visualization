import type { ReactNode } from 'react'

interface SectionProps {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}

export function Section({ title, subtitle, children, className = '' }: SectionProps) {
  return (
    <section className={`animate-fade-in ${className}`}>
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}
