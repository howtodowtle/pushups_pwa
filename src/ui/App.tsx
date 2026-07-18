import { useEffect, useState } from 'preact/hooks'
import { todayISO } from '../core/dates'
import { db } from '../core/store'
import { ExerciseTab } from './ExerciseTab'
import { Settings } from './Settings'

/** Re-render on app foregrounding so "today" stays correct across midnight. */
function useToday(): string {
  const [today, setToday] = useState(todayISO())
  useEffect(() => {
    const refresh = () => setToday(todayISO())
    document.addEventListener('visibilitychange', refresh)
    const timer = setInterval(refresh, 60_000)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      clearInterval(timer)
    }
  }, [])
  return today
}

export function App() {
  const data = db.value
  const today = useToday()
  const exercises = [...data.exercises].sort((a, b) => a.sortOrder - b.sortOrder)

  const [tab, setTab] = useState<string>(
    () => localStorage.getItem('ui.tab') ?? exercises[0]?.id ?? 'settings',
  )
  const activeTab = tab === 'settings' || exercises.some((e) => e.id === tab)
    ? tab
    : (exercises[0]?.id ?? 'settings')

  const selectTab = (id: string) => {
    setTab(id)
    localStorage.setItem('ui.tab', id)
  }

  const exercise = exercises.find((e) => e.id === activeTab)

  return (
    <>
      {exercise ? (
        <ExerciseTab key={exercise.id} exercise={exercise} today={today} onOpenSettings={() => selectTab('settings')} />
      ) : (
        <Settings onSelectExercise={selectTab} />
      )}
      <nav class="tabbar">
        {exercises.map((e) => (
          <button
            key={e.id}
            class={activeTab === e.id ? 'active' : ''}
            onClick={() => selectTab(e.id)}
          >
            <span class="icon">{e.emoji}</span>
            {e.name}
          </button>
        ))}
        <button class={activeTab === 'settings' ? 'active' : ''} onClick={() => selectTab('settings')}>
          <span class="icon">⚙️</span>
          Settings
        </button>
      </nav>
    </>
  )
}
