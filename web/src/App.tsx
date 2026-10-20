import Logo from './components/Logo'
import ThemeMenu from './components/ThemeMenu'

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Logo />
          <ThemeMenu />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-4xl font-bold text-brand-deep">Experience the exam before you take it.</h1>
        <p className="mt-3 max-w-xl text-muted">सबसे उपयुक्त विलोम शब्द चुनिए. Practise, review and improve.</p>
        <div className="mt-6 flex gap-3">
          <button className="rounded-md bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-hover">Start free</button>
          <button className="rounded-md border border-border bg-surface px-6 py-3 text-text hover:bg-brand-soft">See how it works</button>
        </div>
        <div className="mt-8 flex flex-wrap gap-2 text-sm text-white">
          <span className="rounded-full bg-ok px-3 py-1">Answered</span>
          <span className="rounded-full bg-bad px-3 py-1">Not answered</span>
          <span className="rounded-full bg-mark px-3 py-1">Marked</span>
          <span className="rounded-full bg-warn px-3 py-1">Warning</span>
        </div>
      </main>
    </div>
  )
}