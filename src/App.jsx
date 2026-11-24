import { useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabase';

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [name, setName] = useState('');
  const [newTask, setNewTask] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('Média');
  const [newGoalPriority, setNewGoalPriority] = useState('Média');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newGoalDueDate, setNewGoalDueDate] = useState('');
  const [tab, setTab] = useState('Visão geral');
  const [taskFilter, setTaskFilter] = useState('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      setSession(data?.session ?? null);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthMessage('');
      setError('');
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session?.user) { setTasks([]); setTasksLoading(false); return; }
    let active = true;
    setTasksLoading(true);
    supabase.from('tasks').select('id,title,category,done,priority,due_date,created_at').eq('user_id', session.user.id).order('created_at', { ascending: true })
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) setError('Não foi possível carregar suas tarefas. ' + loadError.message);
        else setTasks(data || []);
        setTasksLoading(false);
      });
    return () => { active = false; };
  }, [session?.user?.id]);

  const actionTasks = tasks.filter(task => task.category !== 'Meta');
  const goals = tasks.filter(task => task.category === 'Meta');
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('pt-BR');
  const visibleActionTasks = actionTasks.filter(task => (taskFilter === 'Todas' || (taskFilter === 'Pendentes' ? !task.done : task.done)) && task.title.toLocaleLowerCase('pt-BR').includes(normalizedSearch));
  const visibleGoals = goals.filter(goal => (taskFilter === 'Todas' || (taskFilter === 'Pendentes' ? !goal.done : goal.done)) && goal.title.toLocaleLowerCase('pt-BR').includes(normalizedSearch));
  const completed = actionTasks.filter(task => task.done).length;
  const progress = actionTasks.length ? Math.round(completed / actionTasks.length * 100) : 0;
  const completedGoals = goals.filter(goal => goal.done).length;
  const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const displayName = session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || 'Vamos começar';
  const greeting = displayName.trim().split(' ')[0];

  async function handleAuth(event) {
    event.preventDefault();
    setError('');
    setAuthMessage('');
    setSaving(true);
    try {
      if (authMode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } }
        });
        if (authError) throw authError;
        if (data.session) setAuthMessage('Conta criada! Você já pode começar.');
        else setAuthMessage('Cadastro iniciado! Confira seu e-mail e confirme o endereço para entrar.');
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
      }
    } catch (err) {
      setError(err.message || 'Não foi possível concluir. Tente novamente.');
    } finally { setSaving(false); }
  }

  async function addTask(event) {
    event.preventDefault();
    const title = newTask.trim();
    if (!title || !session?.user) return;
    setError('');
    setSaving(true);
    const { data, error: insertError } = await supabase.from('tasks')
      .insert({ title, category: 'Pessoal', priority: newTaskPriority, due_date: newTaskDueDate || null, user_id: session.user.id })
      .select('id,title,category,done,priority,due_date,created_at').single();
    if (insertError) setError('Não foi possível salvar a tarefa. ' + insertError.message);
    else { setTasks(current => [...current, data]); setNewTask(''); setNewTaskPriority('Média'); setNewTaskDueDate(''); }
    setSaving(false);
  }

  async function addGoal(event) {
    event.preventDefault();
    const title = newGoal.trim();
    if (!title || !session?.user) return;
    setError('');
    setSaving(true);
    const { data, error: insertError } = await supabase.from('tasks')
      .insert({ title, category: 'Meta', priority: newGoalPriority, due_date: newGoalDueDate || null, user_id: session.user.id })
      .select('id,title,category,done,priority,due_date,created_at').single();
    if (insertError) setError('Não foi possível salvar a meta. ' + insertError.message);
    else { setTasks(current => [...current, data]); setNewGoal(''); setNewGoalPriority('Média'); setNewGoalDueDate(''); }
    setSaving(false);
  }

  function startEditing(task) {
    const updatedTitle = window.prompt('Editar tarefa:', task.title);
    if (updatedTitle === null) return;
    saveTaskEdit(task, updatedTitle);
  }

  async function saveTaskEdit(task, updatedTitle) {
    const title = updatedTitle.trim();
    if (!title) { setError('Digite um nome para a tarefa.'); return; }
    setSaving(true);
    setError('');
    const { data, error: editError } = await supabase.from('tasks')
      .update({ title }).eq('id', task.id).eq('user_id', session.user.id)
      .select('id,title,category,done,priority,due_date,created_at').single();
    if (editError) setError('Não foi possível editar a tarefa. ' + editError.message);
    else {
      setTasks(current => current.map(item => item.id === task.id ? data : item));
    }
    setSaving(false);
  }

  async function updatePriority(task, priority) {
    const previousPriority = task.priority || 'Média';
    setTasks(current => current.map(item => item.id === task.id ? { ...item, priority } : item));
    const { error: priorityError } = await supabase.from('tasks').update({ priority }).eq('id', task.id).eq('user_id', session.user.id);
    if (priorityError) {
      setTasks(current => current.map(item => item.id === task.id ? { ...item, priority: previousPriority } : item));
      setError('Não foi possível atualizar a prioridade. ' + priorityError.message);
    }
  }

  function dueDateLabel(task) {
    if (!task.due_date || task.done) return '';
    const todayISO = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const [year, month, day] = task.due_date.split('-');
    const formatted = `${day}/${month}/${year}`;
    if (task.due_date < todayISO) return `Atrasada • ${formatted}`;
    if (task.due_date === todayISO) return 'Vence hoje';
    return `Vence em ${formatted}`;
  }

  async function updateDueDate(task, due_date) {
    const previousDate = task.due_date || null;
    setTasks(current => current.map(item => item.id === task.id ? { ...item, due_date: due_date || null } : item));
    const { error: dateError } = await supabase.from('tasks').update({ due_date: due_date || null }).eq('id', task.id).eq('user_id', session.user.id);
    if (dateError) {
      setTasks(current => current.map(item => item.id === task.id ? { ...item, due_date: previousDate } : item));
      setError('Não foi possível atualizar o vencimento. ' + dateError.message);
    }
  }

  async function toggleTask(task) {
    setError('');
    const nextDone = !task.done;
    setTasks(current => current.map(item => item.id === task.id ? { ...item, done: nextDone } : item));
    const { error: updateError } = await supabase.from('tasks').update({ done: nextDone }).eq('id', task.id).eq('user_id', session.user.id);
    if (updateError) {
      setTasks(current => current.map(item => item.id === task.id ? { ...item, done: task.done } : item));
      setError('Não foi possível atualizar a tarefa. ' + updateError.message);
    }
  }

  async function deleteTask(task) {
    if (!window.confirm('Tem certeza que deseja excluir esta tarefa?')) return;
    setSaving(true);
    setError('');
    const { error: deleteError } = await supabase.from('tasks').delete()
      .eq('id', task.id).eq('user_id', session.user.id);
    if (deleteError) setError('Não foi possível excluir a tarefa. ' + deleteError.message);
    else setTasks(current => current.filter(item => item.id !== task.id));
    setSaving(false);
  }

  async function logout() {
    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) setError(logoutError.message);
  }

  if (authLoading) return <div className="auth-page"><div className="auth-card"><div className="brand-mark auth-mark">↗</div><h1>Crescimento Exponencial</h1><p>Carregando seu espaço...</p></div></div>;

  if (!session) return <div className="auth-page">
    <div className="auth-card">
      <div className="brand-mark auth-mark">↗</div>
      <p className="auth-eyebrow">SEU PRÓXIMO PASSO COMEÇA AQUI</p>
      <h1>{authMode === 'login' ? 'Bem-vindo de volta!' : 'Crie sua conta'}</h1>
      <p className="auth-subtitle">Organize suas metas, acompanhe tarefas e evolua todos os dias.</p>
      <form className="auth-form" onSubmit={handleAuth}>
        {authMode === 'signup' && <label>Seu nome<input value={name} onChange={e => setName(e.target.value)} placeholder="Como podemos chamar você?" required /></label>}
        <label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@exemplo.com" autoComplete="email" required /></label>
        <label>Senha<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" minLength={6} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} required /></label>
        <button type="submit" disabled={saving}>{saving ? 'Aguarde...' : authMode === 'login' ? 'Entrar na minha conta' : 'Criar conta gratuita'}</button>
      </form>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {authMessage && <p className="auth-success" role="status">{authMessage}</p>}
      <p className="auth-switch">{authMode === 'login' ? 'Ainda não tem uma conta?' : 'Já possui uma conta?'} <button type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(''); setAuthMessage(''); }}> {authMode === 'login' ? 'Cadastre-se' : 'Fazer login'}</button></p>
    </div>
    <p className="auth-footer">© {new Date().getFullYear()} Crescimento Exponencial</p>
  </div>;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">↗</div><div><strong>Crescimento</strong><span>EXPONENCIAL</span></div></div>
      <div className="side-label">MENU PRINCIPAL</div>
      <nav>{['Visão geral', 'Minhas metas'].map(item => <button key={item} className={tab === item ? 'nav-item active' : 'nav-item'} onClick={() => setTab(item)}><span>{item === 'Visão geral' ? '▦' : '◎'}</span>{item}</button>)}</nav>
      <div className="sidebar-bottom"><div className="status-dot"></div><div><b>Seu espaço de evolução</b><small>Um passo de cada vez.</small></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="mobile-brand">↗ Crescimento Exponencial</div><div className="date">{today}</div><div className="avatar">{greeting.slice(0,1).toUpperCase()}</div><button className="logout-button" onClick={logout}>Sair</button></header>
      <nav className="mobile-nav">{['Visão geral', 'Minhas metas'].map(item => <button key={item} className={tab === item ? 'mobile-nav-item active' : 'mobile-nav-item'} onClick={() => setTab(item)}>{item === 'Visão geral' ? '▦ Visão geral' : '◎ Minhas metas'}</button>)}</nav>
      <section className="welcome"><div><p className="eyebrow">SEU PROGRESSO COMEÇA AQUI</p><h1>Olá, {greeting}! <span>✦</span></h1><p>Pequenas ações consistentes constroem grandes resultados.</p></div><div className="welcome-symbol">↗</div></section>
      {error && <div className="app-error" role="alert">{error}</div>}
      {tab === 'Visão geral' ? <>
        <div className="section-heading"><div><h2>Visão geral</h2><p>Acompanhe sua evolução de hoje.</p></div></div>
        <div className="stats">
          <article className="stat-card"><div className="stat-icon green">✓</div><span>Tarefas concluídas</span><strong>{completed}<small> / {actionTasks.length}</small></strong><div className="mini-track"><i style={{width: progress + '%'}}/></div></article>
          <article className="stat-card"><div className="stat-icon blue">↗</div><span>Progresso geral</span><strong>{progress}<small>%</small></strong><div className="mini-track"><i style={{width: progress + '%'}}/></div></article>
          <article className="stat-card"><div className="stat-icon violet">◎</div><span>Foco do dia</span><strong>{actionTasks.length - completed}<small> pendentes</small></strong><div className="stat-note">Continue no seu ritmo.</div></article>
        </div>
        <div className="content-grid"><section className="panel tasks-panel"><div className="panel-heading"><div><h3>Minhas tarefas</h3><p>Transforme planos em atitudes.</p></div><span className="count">{completed}/{actionTasks.length}</span></div>
          <form className="add-form" onSubmit={addTask}><input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Adicione uma nova tarefa..." aria-label="Nova tarefa"/><select className="priority-select" value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value)} aria-label="Prioridade da tarefa"><option>Baixa</option><option>Média</option><option>Alta</option></select><input className="due-date-input" type="date" value={newTaskDueDate} onChange={e => setNewTaskDueDate(e.target.value)} aria-label="Data de vencimento da tarefa"/><button type="submit" disabled={saving || !newTask.trim()}>{saving ? 'Salvando...' : 'Adicionar'}</button></form>
          <div className="task-search"><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar pelo nome..." aria-label="Buscar tarefas"/></div>
          <div className="task-filters" aria-label="Filtrar tarefas">{['Todas', 'Pendentes', 'Concluídas'].map(filter => <button type="button" key={filter} className={taskFilter === filter ? 'task-filter active' : 'task-filter'} onClick={() => setTaskFilter(filter)}>{filter}</button>)}</div>
          {tasksLoading ? <p className="empty">Carregando suas tarefas...</p> : <div className="task-list">{visibleActionTasks.map(task => <div className={task.done ? 'task done' : 'task'} key={task.id}>
            <input type="checkbox" checked={task.done} onChange={() => toggleTask(task)} aria-label={task.done ? 'Reabrir tarefa' : 'Concluir tarefa'}/>
            <span className="checkmark"></span>
            <span className="task-title">{task.title}<small>{task.category}{dueDateLabel(task) ? ` • ${dueDateLabel(task)}` : ''}</small></span><input className="due-date-input item-due-date" type="date" value={task.due_date || ''} onChange={e => updateDueDate(task, e.target.value)} aria-label="Alterar vencimento da tarefa"/><span className="task-state">{task.done ? 'Concluída' : 'Em andamento'}</span><select className={'priority-badge priority-' + (task.priority || 'Média').toLocaleLowerCase('pt-BR')} value={task.priority || 'Média'} onChange={e => updatePriority(task, e.target.value)} aria-label="Alterar prioridade"><option>Baixa</option><option>Média</option><option>Alta</option></select><button type="button" className="task-edit-button" onClick={() => startEditing(task)} aria-label="Editar tarefa">✎</button><button type="button" onClick={() => deleteTask(task)} disabled={saving} aria-label="Excluir tarefa" title="Excluir tarefa" style={{marginLeft:8,border:0,background:"transparent",color:"#d14b4b",fontSize:18,cursor:"pointer",padding:"6px"}}>🗑</button>
          </div>)}
          {actionTasks.length === 0 ? <p className="empty">Nenhuma tarefa ainda. Adicione sua primeira tarefa acima.</p> : visibleActionTasks.length === 0 && <p className="empty">Nenhuma tarefa encontrada neste filtro.</p>}</div>}
        </section><aside className="panel progress-panel"><div className="panel-heading"><div><h3>Seu ritmo</h3><p>O progresso de hoje</p></div></div><div className="ring" style={{'--progress': progress + '%'}}><div><strong>{progress}%</strong><small>concluído</small></div></div><p className="motivation">{progress === 100 ? 'Excelente! Você concluiu tudo.' : 'A constância é mais importante que a velocidade.'}</p></aside></div>
      </> : <section className="panel goals-panel"><div className="panel-heading"><div><h3>Minhas metas</h3><p>Defina objetivos e acompanhe suas conquistas.</p></div><span className="count">{completedGoals}/{goals.length} concluídas</span></div><form className="add-form" onSubmit={addGoal}><input value={newGoal} onChange={e => setNewGoal(e.target.value)} placeholder="Ex.: Ler 12 livros este ano..." aria-label="Nova meta"/><select className="priority-select" value={newGoalPriority} onChange={e => setNewGoalPriority(e.target.value)} aria-label="Prioridade da meta"><option>Baixa</option><option>Média</option><option>Alta</option></select><input className="due-date-input" type="date" value={newGoalDueDate} onChange={e => setNewGoalDueDate(e.target.value)} aria-label="Data de vencimento da meta"/><button type="submit" disabled={saving || !newGoal.trim()}>{saving ? 'Salvando...' : 'Criar meta'}</button></form><div className="task-search"><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar pelo nome..." aria-label="Buscar tarefas"/></div><div className="task-filters" aria-label="Filtrar metas">{['Todas', 'Pendentes', 'Concluídas'].map(filter => <button type="button" key={filter} className={taskFilter === filter ? 'task-filter active' : 'task-filter'} onClick={() => setTaskFilter(filter)}>{filter}</button>)}</div><p className="goal-message">Cada meta fica salva na sua conta. Marque quando concluir ou edite e exclua quando precisar.</p><div className="task-list">{visibleGoals.map(goal => <div className={goal.done ? 'task done' : 'task'} key={goal.id}><input type="checkbox" checked={goal.done} onChange={() => toggleTask(goal)} aria-label={goal.done ? 'Reabrir meta' : 'Concluir meta'}/><span className="checkmark"></span><span className="task-title">{goal.title}<small>Meta pessoal{dueDateLabel(goal) ? ` • ${dueDateLabel(goal)}` : ''}</small></span><input className="due-date-input item-due-date" type="date" value={goal.due_date || ''} onChange={e => updateDueDate(goal, e.target.value)} aria-label="Alterar vencimento da meta"/><span className="task-state">{goal.done ? 'Concluída' : 'Em andamento'}</span><select className={'priority-badge priority-' + (goal.priority || 'Média').toLocaleLowerCase('pt-BR')} value={goal.priority || 'Média'} onChange={e => updatePriority(goal, e.target.value)} aria-label="Alterar prioridade"><option>Baixa</option><option>Média</option><option>Alta</option></select><button type="button" className="task-edit-button" onClick={() => startEditing(goal)} aria-label="Editar meta">✎</button><button type="button" onClick={() => deleteTask(goal)} disabled={saving} aria-label="Excluir meta" title="Excluir meta" style={{marginLeft:8,border:0,background:"transparent",color:"#d14b4b",fontSize:18,cursor:"pointer",padding:"6px"}}>🗑</button></div>)}{goals.length === 0 ? <p className="empty">Você ainda não criou metas. Comece adicionando sua primeira meta acima.</p> : visibleGoals.length === 0 && <p className="empty">Nenhuma meta encontrada neste filtro.</p>}</div></section>}
      <footer>© {new Date().getFullYear()} Crescimento Exponencial <span>•</span> Evolua um dia de cada vez. Seus dados ficam vinculados à sua conta.</footer>
    </main>
  </div>;
}
