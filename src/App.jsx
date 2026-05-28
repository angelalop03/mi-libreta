import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import './App.css'

const CATEGORIES = ['personal', 'trabajo', 'urgente']

const CAT_CONFIG = {
  personal: { label: 'Personal', emoji: '🍎' },
  trabajo:  { label: 'Trabajo',  emoji: '🍀' },
  urgente:  { label: 'Urgente',  emoji: '🍓' },
}

const FILTER_CONFIG = {
  all:      { label: 'Todas',    emoji: '🌸' },
  personal: { label: 'Personal', emoji: '🍎' },
  trabajo:  { label: 'Trabajo',  emoji: '🍀' },
  urgente:  { label: 'Urgente',  emoji: '🍓' },
}

export default function App() {
  const [tasks, setTasks]       = useState([])
  const [inputText, setInputText] = useState('')
  const [category, setCategory] = useState('personal')
  const [filter, setFilter]     = useState('all')
  const [loading, setLoading]   = useState(true)
  const [adding, setAdding]     = useState(false)

  useEffect(() => {
    fetchTasks()
    const channel = supabase
      .channel('tasks-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setTasks(data)
    setLoading(false)
  }

  async function addTask() {
    const text = inputText.trim()
    if (!text || adding) return
    setAdding(true)
    const { error } = await supabase
      .from('tasks')
      .insert({ text, category, done: false })
      .select()
    if (!error) {
      setInputText('')
      fetchTasks()
    }
    setAdding(false)
  }

  async function toggleTask(task) {
    await supabase.from('tasks').update({ done: !task.done }).eq('id', task.id)
    fetchTasks()
  }

  async function deleteTask(id) {
    await supabase.from('tasks').delete().eq('id', id)
    fetchTasks()
  }

  async function clearDone() {
    await supabase.from('tasks').delete().eq('done', true)
    fetchTasks()
  }

  function handleKey(e) {
    if (e.key === 'Enter') addTask()
  }

  const filtered  = filter === 'all' ? tasks : tasks.filter(t => t.category === filter)
  const pending   = filtered.filter(t => !t.done)
  const done      = filtered.filter(t => t.done)
  const totalDone = tasks.filter(t => t.done).length

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div className="page-bg">
      <div className="notebook">

        {/* ── decoración esquinas ── */}
        <span className="corner tl">✿</span>
        <span className="corner tr">✿</span>
        <span className="corner bl">✿</span>
        <span className="corner br">✿</span>

        {/* ── cabecera ── */}
        <header className="header">
          <div className="hearts-row">
            {'♡ '.repeat(8)}
          </div>
          <p className="header-date">✦ {today} ✦</p>
          <h1 className="header-title">
            <span className="title-icon">✿</span>
            {' '}TO · DO{' '}
            <span className="title-icon">✿</span>
          </h1>
          <p className="header-subtitle">˚₊· ͟͟͞͞➳ mis tareas del día ♡</p>
          <div className="sync-badge">● supabase sync</div>
          <div className="hearts-row small">
            {'· ✦ · '.repeat(5)}
          </div>
        </header>

        {/* ── input ── */}
        <div className="input-section">
          <div className="input-wrapper">
            <span className="input-icon">✎</span>
            <input
              type="text"
              className="task-input"
              placeholder="escribe una tarea... ♡"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKey}
              maxLength={80}
              autoComplete="off"
            />
          </div>
          <div className="input-bottom-row">
            <div className="cat-pills-select">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  className={`cat-select-pill ${category === c ? 'active cat-' + c : ''}`}
                  onClick={() => setCategory(c)}
                >
                  {CAT_CONFIG[c].emoji} {CAT_CONFIG[c].label}
                </button>
              ))}
            </div>
            <button
              className={`add-btn ${adding ? 'loading' : ''}`}
              onClick={addTask}
              disabled={adding}
            >
              {adding ? '...' : '+ añadir'}
            </button>
          </div>
        </div>

        {/* ── filtros ── */}
        <div className="filter-bar">
          {Object.entries(FILTER_CONFIG).map(([key, val]) => (
            <button
              key={key}
              className={`filter-pill ${filter === key ? 'active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {val.emoji} {val.label}
            </button>
          ))}
        </div>

        {/* ── lista ── */}
        <div className="task-area">
          {loading ? (
            <p className="empty-state">cargando... ✦</p>
          ) : (
            <>
              {pending.length === 0 && done.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">🐰</div>
                  <p>¡sin tareas aquí!</p>
                  <p className="empty-sub">añade la primera ✎</p>
                </div>
              )}

              {pending.length > 0 && (
                <>
                  <p className="section-label">✦ pendientes</p>
                  <ul className="task-list">
                    {pending.map(task => (
                      <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
                    ))}
                  </ul>
                </>
              )}

              {done.length > 0 && (
                <>
                  <p className="section-label done-label">✓ completadas</p>
                  <ul className="task-list">
                    {done.map(task => (
                      <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>

        {/* ── footer ── */}
        <footer className="stats-bar">
          <span className="stats-text">
            {tasks.length === 0
              ? '♡ cuaderno vacío'
              : `${totalDone}/${tasks.length} hechas ✦`}
          </span>
          {totalDone > 0 && (
            <button className="clear-done" onClick={clearDone}>
              🗑 borrar hechas
            </button>
          )}
        </footer>

      </div>
    </div>
  )
}

function TaskItem({ task, onToggle, onDelete }) {
  const { emoji } = CAT_CONFIG[task.category] || { emoji: '✦' }
  const time = new Date(task.created_at).toLocaleTimeString('es-ES', {
    hour: '2-digit', minute: '2-digit'
  })

  return (
    <li className={`task-item ${task.done ? 'done' : ''}`}>
      <button
        className={`task-check ${task.done ? 'done' : ''}`}
        onClick={() => onToggle(task)}
        aria-label="toggle"
      >
        {task.done ? '✓' : ''}
      </button>
      <div className="task-body">
        <span className={`task-text ${task.done ? 'done' : ''}`}>
          {emoji} {task.text}
        </span>
        <span className="task-meta">
          <span className={`task-cat-badge cat-${task.category}`}>
            {task.category}
          </span>
          {time}
        </span>
      </div>
      <button className="task-delete" onClick={() => onDelete(task.id)} aria-label="eliminar">
        ✕
      </button>
    </li>
  )
}
