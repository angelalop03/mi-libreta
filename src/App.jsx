import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import './App.css'

const CATEGORIES = ['personal', 'trabajo', 'urgente']

const CAT_LABELS = {
  personal: 'Personal',
  trabajo: 'Trabajo',
  urgente: 'Urgente'
}

export default function App() {
  const [tasks, setTasks] = useState([])
  const [inputText, setInputText] = useState('')
  const [category, setCategory] = useState('personal')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

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

  const { data, error } = await supabase
    .from('tasks')
    .insert({ text, category, done: false })
    .select()  // ← añade esto

  if (!error) {
    setInputText('')
    fetchTasks()  // ← y esto
  }
  setAdding(false)
}

  async function toggleTask(task) {
    await supabase
      .from('tasks')
      .update({ done: !task.done })
      .eq('id', task.id)
  }

  async function deleteTask(id) {
    await supabase.from('tasks').delete().eq('id', id)
  }

  async function clearDone() {
    await supabase.from('tasks').delete().eq('done', true)
  }

  function handleKey(e) {
    if (e.key === 'Enter') addTask()
  }

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.category === filter)
  const pending = filtered.filter(t => !t.done)
  const done = filtered.filter(t => t.done)
  const totalDone = tasks.filter(t => t.done).length

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div className="notebook">
      <div className="spiral">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="spiral-ring" />
        ))}
      </div>

      <div className="content">
        <header className="header">
          <p className="header-date">{today}</p>
          <h1 className="header-title">TO · DO</h1>
          <p className="header-subtitle">mis tareas del día</p>
          <span className="sync-badge">● supabase sync</span>
        </header>

        <div className="input-area">
          <input
            type="text"
            className="task-input"
            placeholder="Añadir tarea..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKey}
            maxLength={80}
            autoComplete="off"
          />
          <select
            className="cat-select"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{CAT_LABELS[c]}</option>
            ))}
          </select>
          <button
            className={`add-btn ${adding ? 'loading' : ''}`}
            onClick={addTask}
            disabled={adding}
          >
            {adding ? '…' : '+'}
          </button>
        </div>

        <div className="filter-bar">
          {['all', ...CATEGORIES].map(f => (
            <button
              key={f}
              className={`filter-pill ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Todas' : CAT_LABELS[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="empty-state">Cargando...</p>
        ) : (
          <>
            {pending.length === 0 && done.length === 0 && (
              <p className="empty-state">No hay tareas aquí...<br />¡Añade la primera! ✎</p>
            )}

            {pending.length > 0 && (
              <>
                <p className="section-label">pendientes</p>
                <ul className="task-list">
                  {pending.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggle={toggleTask}
                      onDelete={deleteTask}
                    />
                  ))}
                </ul>
              </>
            )}

            {done.length > 0 && (
              <>
                <p className="section-label">completadas</p>
                <ul className="task-list">
                  {done.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggle={toggleTask}
                      onDelete={deleteTask}
                    />
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>

      <footer className="stats-bar">
        <span className="stats-text">
          {tasks.length === 0
            ? 'cuaderno vacío'
            : `${totalDone}/${tasks.length} completadas`}
        </span>
        {totalDone > 0 && (
          <button className="clear-done" onClick={clearDone}>
            Borrar hechas
          </button>
        )}
      </footer>
    </div>
  )
}

function TaskItem({ task, onToggle, onDelete }) {
  const time = new Date(task.created_at).toLocaleTimeString('es-ES', {
    hour: '2-digit', minute: '2-digit'
  })

  return (
    <li className="task-item">
      <button
        className={`task-check ${task.done ? 'done' : ''}`}
        onClick={() => onToggle(task)}
        aria-label={task.done ? 'Marcar como pendiente' : 'Marcar como hecha'}
      />
      <div className="task-text-wrap">
        <span className={`task-text ${task.done ? 'done' : ''}`}>{task.text}</span>
        <span className="task-meta">
          <span className={`task-cat cat-${task.category}`}>{task.category}</span>
          {time}
        </span>
      </div>
      <button className="task-delete" onClick={() => onDelete(task.id)} aria-label="Eliminar tarea">
        ×
      </button>
    </li>
  )
}
