import { NavLink } from 'react-router-dom'

const link = ({ isActive }: { isActive: boolean }) =>
  'rounded-md px-3 py-1.5 text-sm font-semibold ' + (isActive ? 'bg-brand-soft text-link' : 'text-text hover:bg-brand-soft')

export default function AdminNav() {
  return (
    <nav aria-label="Admin" className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2">
        <span className="mr-2 text-xs font-bold uppercase text-text/70">Admin</span>
        <NavLink to="/admin/questions" className={link}>
          Questions
        </NavLink>
        <NavLink to="/admin/import" className={link}>
          Import
        </NavLink>
      </div>
    </nav>
  )
}