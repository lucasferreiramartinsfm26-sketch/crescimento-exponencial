import { useEffect, useMemo, useState } from 'react';
import { supabase, supabaseReady } from './lib/supabase';

const starter = [
  { id: 1, title: 'Definir minha principal meta', category: 'Pessoal', done: true },
  { id: 2, title: 'Planejar os próximos 7 dias', category: 'Planejamento', done: false },
  { id: 3, title: 'Aprender algo novo por 20 minutos', category: 'Aprendizado', done: false }
];

export default function App() {
  const [name, setName] = useState(() => localStorage.getItem('ce-name') || '');
  const [tasks, setTasks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ce-tasks')) || starter; } catch { return starter; }
  });
  const [newTask, setNewTask] = useState('');
  const [tab, setTab] = useState('Visão geral');
  const [saving, setSaving] = useState(false);
  useEffect(() => { localStorage.setItem('ce-tasks', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem('ce-name', name); }, [name]);
  const completed = tasks.filter(t => t.done).length;
  const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const addTask = (e) => {
    e.preventDefault();
    const title = newTask.trim();
    if (!title) return;
    setTasks(current => [...current, { id: Date.now(), title, category: 'Pessoal', done: false }]);
    setNewTask('');
  };
  const toggleTask = id => setTasks(current => current.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const greeting = name.trim() ? name.trim().split(' ')[0] : 'Vamos começar';
  const menu = ['Visão geral', 'Minhas metas'];
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">↗</div><div><strong>Crescimento</strong><span>EXPONENCIAL</span></div></div>
      <div className="side-label">MENU PRINCIPAL</div>
      <nav>{menu.map(item => <button key={item} className={tab === item ? 'nav-item active' : 'nav-item'} onClick={() => setTab(item)}><span>{item === 'Visão geral' ? '▦' : '◎'}</span>{item}</button>)}</nav>
      <div className="sidebar-bottom"><div className="status-dot"></div><div><b>Seu espaço de evolução</b><small>Um passo de cada vez.</small></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="mobile-brand">↗ Crescimento Exponencial</div><div className="date">{today}</div><div className="avatar">{greeting.slice(0,1).toUpperCase()}</div></header>
      <section className="welcome"><div><p className="eyebrow">SEU PROGRESSO COMEÇA AQUI</p><h1>Olá, {greeting}! <span>✦</span></h1><p>Pequenas ações consistentes constroem grandes resultados.</p></div><div className="welcome-symbol">↗</div></section>
      {tab === 'Visão geral' ? <>
        <div className="section-heading"><div><h2>Visão geral</h2><p>Acompanhe sua evolução de hoje.</p></div></div>
        <div className="stats">
          <article className="stat-card"><div className="stat-icon green">✓</div><span>Tarefas concluídas</span><strong>{completed}<small> / {tasks.length}</small></strong><div className="mini-track"><i style={{width: progress + '%'}}/></div></article>
          <article className="stat-card"><div className="stat-icon blue">↗</div><span>Progresso geral</span><strong>{progress}<small>%</small></strong><div className="mini-track"><i style={{width: progress + '%'}}/></div></article>
          <article className="stat-card"><div className="stat-icon violet">◎</div><span>Foco do dia</span><strong>{tasks.length - completed}<small> pendentes</small></strong><div className="stat-note">Continue no seu ritmo.</div></article>
        </div>
        <div className="content-grid"><section className="panel tasks-panel"><div className="panel-heading"><div><h3>Minhas tarefas</h3><p>Transforme planos em atitudes.</p></div><span className="count">{completed}/{tasks.length}</span></div>
          <form className="add-form" onSubmit={addTask}><input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Adicione uma nova tarefa..." aria-label="Nova tarefa"/><button type="submit">Adicionar</button></form>
          <div className="task-list">{tasks.map(task => <label className={task.done ? 'task done' : 'task'} key={task.id}><input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)}/><span className="checkmark"></span><span className="task-title">{task.title}<small>{task.category}</small></span><span className="task-state">{task.done ? 'Concluída' : 'Em andamento'}</span></label>)}
          {tasks.length === 0 && <p className="empty">Nenhuma tarefa ainda. Adicione sua primeira tarefa acima.</p>}</div>
        </section><aside className="panel progress-panel"><div className="panel-heading"><div><h3>Seu ritmo</h3><p>O progresso de hoje</p></div></div><div className="ring" style={{'--progress': progress + '%'}}><div><strong>{progress}%</strong><small>concluído</small></div></div><p className="motivation">{progress === 100 ? 'Excelente! Você concluiu tudo.' : 'A constância é mais importante que a velocidade.'}</p></aside></div>
      </> : <section className="panel goals-panel"><div className="panel-heading"><div><h3>Minhas metas</h3><p>Organize suas ações e acompanhe cada conquista.</p></div></div><p className="goal-message">Suas metas são construídas com tarefas simples. Adicione tarefas na Visão geral e marque cada etapa quando concluir.</p><button className="primary-button" onClick={() => setTab('Visão geral')}>Voltar para visão geral</button></section>}
      <footer>© {new Date().getFullYear()} Crescimento Exponencial <span>•</span> Evolua um dia de cada vez.</footer>
    </main>
  </div>;
}
