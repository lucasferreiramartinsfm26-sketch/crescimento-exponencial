import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './lib/supabase';
import AdminPanel from './AdminPanel';
import CompanyPortal from './CompanyPortal';
import Opportunities from './Opportunities';
import MessageInbox from './MessageInbox';

function toLocalISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
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
  const [newTaskReminderDays, setNewTaskReminderDays] = useState(3);
  const [newGoalReminderDays, setNewGoalReminderDays] = useState(3);
  const [tab, setTab] = useState('Visão geral');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(() => toLocalISODate(new Date()));
  const [taskFilter, setTaskFilter] = useState('Todas');
  const [sortMode, setSortMode] = useState('recentes');
  const [searchTerm, setSearchTerm] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => typeof Notification !== 'undefined' && Notification.permission === 'granted');
  const backupInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      setSession(data?.session ?? null);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
      setSession(nextSession);
      setAuthMessage('');
      setError('');
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let active = true;
    setIsPlatformAdmin(false);
    if (!session?.user?.id) return () => { active = false; };
    supabase.rpc('is_platform_admin').then(({ data, error: adminError }) => {
      if (!active) return;
      setIsPlatformAdmin(!adminError && data === true);
    });
    return () => { active = false; };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user) { setTasks([]); setTasksLoading(false); return; }
    let active = true;
    setTasksLoading(true);
    supabase.from('tasks').select('id,title,category,done,priority,due_date,progress,reminder_days,created_at').eq('user_id', session.user.id).order('created_at', { ascending: true })
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
  const alertTasks = tasks.filter(task => !task.done && task.due_date && daysUntilDue(task) <= (task.reminder_days ?? 3)).sort((a, b) => a.due_date.localeCompare(b.due_date));
  const calendarMonthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(calendarMonth);
  const calendarCells = useMemo(() => {
    const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const iso = toLocalISODate(date);
      return { iso, day: date.getDate(), inMonth: date.getMonth() === calendarMonth.getMonth(), items: tasks.filter(task => task.due_date === iso) };
    });
  }, [calendarMonth, tasks]);
  const selectedCalendarTasks = tasks.filter(task => task.due_date === calendarSelectedDate).sort((a, b) => Number(a.done) - Number(b.done));
  const reportMonths = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - (5 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthTasks = tasks.filter(task => (task.created_at || '').slice(0, 7) === key);
    return { key, label: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', ''), total: monthTasks.length };
  }), [tasks]);
  const reportMax = Math.max(1, ...reportMonths.map(month => month.total));
  const reportCompleted = tasks.filter(task => task.done).length;
  const reportPending = tasks.length - reportCompleted;
  const reportGoals = tasks.filter(task => task.category === 'Meta');
  const reportActions = tasks.filter(task => task.category !== 'Meta');
  const reportPercent = tasks.length ? Math.round(reportCompleted / tasks.length * 100) : 0;
  const goalAverage = goals.length
    ? Math.round(goals.reduce((sum, goal) => sum + (goal.done ? 100 : (goal.progress || 0)), 0) / goals.length)
    : 0;
  const weeklyActivity = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = toLocalISODate(date);
    const total = tasks.filter(task => (task.created_at || '').slice(0, 10) === key).length;
    return { key, label: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', ''), total };
  }), [tasks]);
  const weeklyMax = Math.max(1, ...weeklyActivity.map(day => day.total));
  const currentAchievements = tasks.filter(task => task.done).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));


  async function enableNotifications() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setError('Este navegador não oferece suporte a notificações. Atualize o Chrome e tente novamente.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('Permissão de notificações não concedida. Você pode ativá-la nas configurações do navegador.');
        return;
      }
      await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
      setNotificationsEnabled(true);
      setError('');
    } catch (err) {
      setError('Não foi possível ativar as notificações. ' + (err.message || 'Tente novamente.'));
    }
  }

  useEffect(() => {
    if (!session?.user?.id || !notificationsEnabled || !tasks.length) return;
    let active = true;
    const checkReminders = async () => {
      if (!active || document.visibilityState !== 'visible' || Notification.permission !== 'granted') return;
      const pending = tasks.filter(task => !task.done && task.due_date && daysUntilDue(task) <= (task.reminder_days ?? 3));
      if (!pending.length) return;
      const todayKey = toLocalISODate(new Date());
      const storageKey = `ce-reminder-${session.user.id}-${todayKey}`;
      if (localStorage.getItem(storageKey)) return;
      const title = pending.length === 1 ? 'Você tem 1 prazo para acompanhar' : `Você tem ${pending.length} prazos para acompanhar`;
      const body = pending.slice(0, 3).map(task => task.title).join(' • ');
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body: body + (pending.length > 3 ? ' • e outros' : ''),
          icon: `${import.meta.env.BASE_URL}favicon.ico`,
          badge: `${import.meta.env.BASE_URL}favicon.ico`,
          tag: `ce-reminders-${todayKey}`,
          data: { url: import.meta.env.BASE_URL }
        });
        localStorage.setItem(storageKey, '1');
      } catch (err) {
        console.error('Falha ao exibir lembrete:', err);
      }
    };
    checkReminders();
    const interval = window.setInterval(checkReminders, 60 * 60 * 1000);
    return () => { active = false; window.clearInterval(interval); };
  }, [session?.user?.id, tasks, notificationsEnabled]);

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

  async function sendPasswordRecovery() {
    if (!email.trim()) { setError('Digite seu e-mail para receber o link de recuperação.'); return; }
    setError(''); setAuthMessage(''); setSaving(true);
    try {
      const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (recoveryError) throw recoveryError;
      setAuthMessage('Se esse e-mail estiver cadastrado, você receberá um link para redefinir sua senha. Confira também o spam.');
    } catch (err) {
      setError(err.message || 'Não foi possível enviar o link. Tente novamente.');
    } finally { setSaving(false); }
  }

  async function updateRecoveredPassword(event) {
    event.preventDefault();
    if (recoveryPassword.length < 6) { setError('A nova senha precisa ter pelo menos 6 caracteres.'); return; }
    setError(''); setAuthMessage(''); setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: recoveryPassword });
      if (updateError) throw updateError;
      setRecoveryMode(false); setRecoveryPassword(''); setPassword('');
      setAuthMessage('Senha alterada com sucesso. Você já pode continuar usando o aplicativo.');
    } catch (err) {
      setError(err.message || 'Não foi possível alterar a senha. Solicite um novo link.');
    } finally { setSaving(false); }
  }

  async function addTask(event) {
    event.preventDefault();
    const title = newTask.trim();
    if (!title || !session?.user) return;
    setError('');
    setSaving(true);
    const { data, error: insertError } = await supabase.from('tasks')
      .insert({ title, category: 'Pessoal', priority: newTaskPriority, due_date: newTaskDueDate || null, reminder_days: Number(newTaskReminderDays), user_id: session.user.id })
      .select('id,title,category,done,priority,due_date,progress,created_at').single();
    if (insertError) setError('Não foi possível salvar a tarefa. ' + insertError.message);
    else { setTasks(current => [...current, data]); setNewTask(''); setNewTaskPriority('Média'); setNewTaskDueDate(''); setNewTaskReminderDays(3); }
    setSaving(false);
  }

  async function addGoal(event) {
    event.preventDefault();
    const title = newGoal.trim();
    if (!title || !session?.user) return;
    setError('');
    setSaving(true);
    const { data, error: insertError } = await supabase.from('tasks')
      .insert({ title, category: 'Meta', priority: newGoalPriority, due_date: newGoalDueDate || null, reminder_days: Number(newGoalReminderDays), progress: 0, user_id: session.user.id })
      .select('id,title,category,done,priority,due_date,progress,created_at').single();
    if (insertError) setError('Não foi possível salvar a meta. ' + insertError.message);
    else { setTasks(current => [...current, data]); setNewGoal(''); setNewGoalPriority('Média'); setNewGoalDueDate(''); setNewGoalReminderDays(3); }
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
      .select('id,title,category,done,priority,due_date,progress,created_at').single();
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

  function sortItems(items) {
    const priorityRank = { 'Alta': 0, 'Média': 1, 'Baixa': 2 };
    return [...items].sort((a, b) => {
      if (sortMode === 'prazo') {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      }
      if (sortMode === 'prioridade') {
        return (priorityRank[a.priority || 'Média'] ?? 1) - (priorityRank[b.priority || 'Média'] ?? 1);
      }
      if (sortMode === 'nome') return a.title.localeCompare(b.title, 'pt-BR');
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
  }

  function daysUntilDue(task) {
    if (!task.due_date) return null;
    const [year, month, day] = task.due_date.split('-').map(Number);
    const due = Date.UTC(year, month - 1, day);
    const now = new Date();
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((due - today) / 86400000);
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

  async function updateGoalProgress(task, progress) {
    const nextProgress = Math.max(0, Math.min(100, Number(progress) || 0));
    const previousProgress = task.progress || 0;
    setTasks(current => current.map(item => item.id === task.id ? { ...item, progress: nextProgress } : item));
    const { error: progressError } = await supabase.from('tasks').update({ progress: nextProgress }).eq('id', task.id).eq('user_id', session.user.id);
    if (progressError) {
      setTasks(current => current.map(item => item.id === task.id ? { ...item, progress: previousProgress } : item));
      setError('Não foi possível atualizar o progresso. ' + progressError.message);
    }
  }

  async function updateReminderDays(task, reminder_days) {
    const nextDays = Number(reminder_days);
    const previousDays = task.reminder_days ?? 3;
    setTasks(current => current.map(item => item.id === task.id ? { ...item, reminder_days: nextDays } : item));
    const { error: reminderError } = await supabase.from('tasks').update({ reminder_days: nextDays }).eq('id', task.id).eq('user_id', session.user.id);
    if (reminderError) {
      setTasks(current => current.map(item => item.id === task.id ? { ...item, reminder_days: previousDays } : item));
      setError('Não foi possível atualizar o lembrete. ' + reminderError.message);
    }
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

  function exportBackup() {
    const backup = {
      app: 'Crescimento Exponencial',
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks: tasks.map(({ title, category, done, priority, due_date, progress, reminder_days, created_at }) => ({ title, category, done, priority, due_date, progress, reminder_days, created_at }))
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'crescimento-exponencial-backup.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function importBackup(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !session?.user?.id) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || parsed.app !== 'Crescimento Exponencial' || !Array.isArray(parsed.tasks) || parsed.tasks.length > 500) {
        throw new Error('Arquivo de backup inválido ou com mais de 500 itens.');
      }
      const validPriorities = ['Baixa', 'Média', 'Alta'];
      const rows = parsed.tasks.map(item => {
        if (!item || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 500) {
          throw new Error('O backup contém uma tarefa sem título válido.');
        }
        const dueDate = item.due_date || null;
        if (dueDate && !/^\\d{4}-\\d{2}-\\d{2}$/.test(dueDate)) {
          throw new Error('O backup contém uma data inválida.');
        }
        return {
          title: item.title.trim(),
          category: item.category === 'Meta' ? 'Meta' : 'Pessoal',
          done: item.done === true,
          priority: validPriorities.includes(item.priority) ? item.priority : 'Média',
          due_date: dueDate,
          progress: Number.isInteger(item.progress) ? Math.max(0, Math.min(100, item.progress)) : 0,
          reminder_days: [1, 3, 7, 15].includes(Number(item.reminder_days)) ? Number(item.reminder_days) : 3,
          user_id: session.user.id
        };
      });
      if (!rows.length) {
        setAuthMessage('O backup está vazio. Nenhum item foi importado.');
        return;
      }
      const makeKey = item => [
        item.title.trim().toLocaleLowerCase('pt-BR'),
        item.category,
        item.due_date || ''
      ].join('|');
      const knownKeys = new Set(tasks.map(makeKey));
      const uniqueRows = [];
      let duplicates = 0;
      rows.forEach(item => {
        const key = makeKey(item);
        if (knownKeys.has(key)) duplicates += 1;
        else {
          knownKeys.add(key);
          uniqueRows.push(item);
        }
      });
      if (!uniqueRows.length) {
        setAuthMessage('Nenhum item novo encontrado. ' + duplicates + ' duplicado(s) foram ignorados.');
        return;
      }
      const confirmText = 'Importar ' + uniqueRows.length + ' item(ns) novo(s)?' +
        (duplicates ? ' ' + duplicates + ' duplicado(s) serão ignorados.' : '') +
        ' Seus itens atuais não serão apagados.';
      if (!window.confirm(confirmText)) return;
      setSaving(true);
      setError('');
      const { data, error: importError } = await supabase.from('tasks')
        .insert(uniqueRows).select('id,title,category,done,priority,due_date,progress,created_at');
      if (importError) throw importError;
      setTasks(current => [...current, ...(data || [])]);
      setAuthMessage((data || []).length + ' item(ns) importado(s).' +
        (duplicates ? ' ' + duplicates + ' duplicado(s) ignorado(s).' : ''));
    } catch (err) {
      setError('Não foi possível importar o backup. ' + (err.message || 'Verifique o arquivo.'));
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) setError(logoutError.message);
  }

  if (authLoading) return <div className="auth-page"><div className="auth-card"><div className="brand-mark auth-mark">↗</div><h1>Crescimento Exponencial</h1><p>Carregando seu espaço...</p></div></div>;

  if (recoveryMode) return <div className="auth-page">
    <div className="auth-card">
      <div className="brand-mark auth-mark">↗</div>
      <p className="auth-eyebrow">SEGURANÇA DA SUA CONTA</p>
      <h1>Crie uma nova senha</h1>
      <p className="auth-subtitle">Escolha uma senha com pelo menos 6 caracteres.</p>
      <form className="auth-form" onSubmit={updateRecoveredPassword}>
        <label>Nova senha<input type="password" value={recoveryPassword} onChange={e => setRecoveryPassword(e.target.value)} placeholder="Digite sua nova senha" minLength={6} autoComplete="new-password" required /></label>
        <button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Alterar minha senha'}</button>
      </form>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {authMessage && <p className="auth-success" role="status">{authMessage}</p>}
    </div>
    <p className="auth-footer">© {new Date().getFullYear()} Crescimento Exponencial</p>
  </div>;

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
      {authMode === 'login' && <p className="auth-switch"><button type="button" onClick={sendPasswordRecovery} disabled={saving}>Esqueci minha senha</button></p>}
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
      <nav>{['Visão geral', 'Minhas metas', 'Calendário', 'Relatórios', 'Minha evolução', 'Oportunidades', 'Mensagens', 'Área da empresa', ...(isPlatformAdmin ? ['Administração'] : [])].map(item => <button key={item} className={tab === item ? 'nav-item active' : 'nav-item'} onClick={() => setTab(item)}><span>{item === 'Visão geral' ? '▦' : item === 'Minhas metas' ? '◎' : item === 'Calendário' ? '▣' : item === 'Relatórios' ? '▤' : item === 'Administração' ? '⚙' : item === 'Área da empresa' ? '▣' : item === 'Oportunidades' ? '⌕' : item === 'Mensagens' ? '✉' : '↗'}</span>{item}</button>)}</nav>
      <div className="sidebar-bottom"><div className="status-dot"></div><div><b>Seu espaço de evolução</b><small>Um passo de cada vez.</small></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="mobile-brand">↗ Crescimento Exponencial</div><div className="date">{today}</div><button type="button" className="logout-button" onClick={enableNotifications}>{notificationsEnabled ? "Alertas ativados ✓" : "Ativar alertas"}</button><div className="avatar">{greeting.slice(0,1).toUpperCase()}</div><button className="logout-button" onClick={logout}>Sair</button></header>
      <nav className="mobile-nav">{['Visão geral', 'Minhas metas', 'Calendário', 'Relatórios', 'Minha evolução', 'Oportunidades', 'Mensagens', 'Área da empresa', ...(isPlatformAdmin ? ['Administração'] : [])].map(item => <button key={item} className={tab === item ? 'mobile-nav-item active' : 'mobile-nav-item'} onClick={() => setTab(item)}>{item === 'Visão geral' ? '▦ Visão geral' : item === 'Minhas metas' ? '◎ Metas' : item === 'Calendário' ? '▣ Calendário' : item === 'Relatórios' ? '▤ Relatórios' : item === 'Administração' ? '⚙ Admin' : item === 'Área da empresa' ? '▣ Empresa' : item === 'Oportunidades' ? '⌕ Oportunidades' : item === 'Mensagens' ? '✉ Mensagens' : '↗ Evolução'}</button>)}</nav>
      <section className="welcome"><div><p className="eyebrow">SEU PROGRESSO COMEÇA AQUI</p><h1>Olá, {greeting}! <span>✦</span></h1><p>Pequenas ações consistentes constroem grandes resultados.</p></div><div className="welcome-symbol">↗</div></section>\n      <section className="backup-tools"><div><strong>Backup dos seus dados</strong><small>Salve uma cópia ou restaure itens de um arquivo anterior.</small></div><div className="backup-actions"><button type="button" className="logout-button" onClick={exportBackup} disabled={!tasks.length}>Exportar backup</button><button type="button" className="logout-button" onClick={() => backupInputRef.current?.click()}>Importar backup</button><input ref={backupInputRef} type="file" accept="application/json,.json" onChange={importBackup} hidden/></div></section>
      {error && <div className="app-error" role="alert">{error}</div>}
      {alertTasks.length > 0 && <section className="panel alerts-panel">
        <div className="panel-heading"><div><h3>Central de alertas</h3><p>Prazos que precisam da sua atenção.</p></div><span className="count">{alertTasks.length} alertas</span></div>
        <div className="alerts-list">{alertTasks.map(task => {
          const days = daysUntilDue(task);
          const label = days < 0 ? 'Atrasada há ' + Math.abs(days) + ' dia(s)' : days === 0 ? 'Vence hoje' : days === 1 ? 'Vence amanhã' : 'Vence em ' + days + ' dias';
          return <div className={days < 0 ? "alert-item overdue" : days === 0 ? "alert-item due-today" : "alert-item"} key={task.id}>
            <span className="alert-symbol">{days < 0 ? "!" : "◷"}</span>
            <span className="alert-title">{task.title}<small>{task.category === "Meta" ? "Meta" : "Tarefa"} • {task.due_date.split("-").reverse().join("/")}</small></span>
            <strong>{label}</strong>
          </div>;
        })}</div>
      </section>}
      {tab === 'Área da empresa' ? <CompanyPortal /> : tab === 'Oportunidades' ? <Opportunities /> : tab === 'Mensagens' ? <MessageInbox /> : tab === 'Administração' && isPlatformAdmin ? <AdminPanel /> : tab === 'Calendário' ? <section className="panel calendar-panel">
        <div className="panel-heading"><div><h3>Calendário</h3><p>Visualize os prazos das suas tarefas e metas.</p></div><span className="count">{tasks.filter(task => task.due_date).length} com prazo</span></div>
        <div className="calendar-toolbar"><button type="button" onClick={() => setCalendarMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))} aria-label="Mês anterior">‹</button><strong>{calendarMonthLabel}</strong><button type="button" onClick={() => setCalendarMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))} aria-label="Próximo mês">›</button><button type="button" className="calendar-today" onClick={() => { const now = new Date(); setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1)); setCalendarSelectedDate(toLocalISODate(now)); }}>Hoje</button></div>
        <div className="calendar-grid calendar-weekdays">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid calendar-days">{calendarCells.map(cell => <button type="button" key={cell.iso} className={'calendar-day' + (!cell.inMonth ? ' outside' : '') + (cell.iso === calendarSelectedDate ? ' selected' : '') + (cell.iso === toLocalISODate(new Date()) ? ' today' : '')} onClick={() => setCalendarSelectedDate(cell.iso)}><span>{cell.day}</span>{cell.items.length > 0 && <i className="calendar-dot"/>}<small>{cell.items.length > 0 ? cell.items.length : ''}</small></button>)}</div>
        <div className="calendar-agenda"><div className="panel-heading"><div><h3>Compromissos do dia</h3><p>{calendarSelectedDate.split('-').reverse().join('/')}</p></div><span className="count">{selectedCalendarTasks.length} itens</span></div>
          {selectedCalendarTasks.length ? <div className="task-list">{selectedCalendarTasks.map(task => <div className={task.done ? 'task done' : 'task'} key={task.id}><span className="calendar-task-category">{task.category === 'Meta' ? '◎' : '▦'}</span><span className="task-title">{task.title}<small>{task.category} • {task.done ? 'Concluída' : 'Pendente'} • Prioridade {task.priority || 'Média'}</small></span><span className="task-state">{task.done ? 'Concluída' : 'Em andamento'}</span></div>)}</div> : <p className="empty">Nenhuma tarefa ou meta com vencimento nesta data.</p>}
        </div>
      </section> : tab === 'Relatórios' ? <section className="reports-page">
        <div className="section-heading"><div><h2>Relatórios de desempenho</h2><p>Acompanhe seus resultados e sua consistência.</p></div></div>
        <div className="stats reports-stats">
          <article className="stat-card"><div className="stat-icon green">✓</div><span>Itens concluídos</span><strong>{reportCompleted}</strong><div className="stat-note">Tarefas e metas finalizadas</div></article>
          <article className="stat-card"><div className="stat-icon blue">◷</div><span>Em andamento</span><strong>{reportPending}</strong><div className="stat-note">Itens ainda pendentes</div></article>
          <article className="stat-card"><div className="stat-icon violet">↗</div><span>Conclusão geral</span><strong>{reportPercent}<small>%</small></strong><div className="mini-track"><i style={{width: reportPercent + '%'}}/></div></article>
        </div>
        <div className="reports-grid">
          <section className="panel report-panel"><div className="panel-heading"><div><h3>Atividade dos últimos 6 meses</h3><p>Itens criados em cada mês.</p></div></div>
            {tasks.length ? <div className="report-bars">{reportMonths.map(month => <div className="report-bar-row" key={month.key}><span>{month.label}</span><div className="report-bar-track"><i style={{width: (month.total / reportMax * 100) + '%'}}/></div><strong>{month.total}</strong></div>)}</div> : <p className="empty">Adicione tarefas ou metas para começar a acompanhar sua atividade.</p>}
          </section>
          <section className="panel report-panel"><div className="panel-heading"><div><h3>Seu planejamento</h3><p>Distribuição atual dos seus itens.</p></div></div>
            <div className="report-breakdown"><div><span>Tarefas</span><strong>{reportActions.length}</strong></div><div><span>Metas</span><strong>{reportGoals.length}</strong></div><div><span>Concluídas</span><strong>{reportCompleted}</strong></div><div><span>Pendentes</span><strong>{reportPending}</strong></div></div>
            <p className="report-note">O gráfico usa a data de criação. O percentual mostra o estado atual dos itens; o aplicativo ainda não registra a data exata da conclusão.</p>
          </section>
        </div>
      </section> : tab === 'Minha evolução' ? <section className="evolution-page">
        <div className="section-heading"><div><h2>Minha evolução</h2><p>Veja seus avanços e mantenha o ritmo.</p></div></div>
        <div className="stats evolution-stats">
          <article className="stat-card"><div className="stat-icon green">✓</div><span>Conquistas atuais</span><strong>{currentAchievements.length}</strong><div className="stat-note">Tarefas e metas marcadas como concluídas</div></article>
          <article className="stat-card"><div className="stat-icon blue">◎</div><span>Progresso médio das metas</span><strong>{goalAverage}<small>%</small></strong><div className="mini-track"><i style={{width: goalAverage + '%'}}/></div></article>
          <article className="stat-card"><div className="stat-icon violet">↗</div><span>Itens cadastrados em 7 dias</span><strong>{weeklyActivity.reduce((sum, day) => sum + day.total, 0)}</strong><div className="stat-note">Novas tarefas e metas adicionadas</div></article>
        </div>
        <div className="evolution-grid">
          <section className="panel report-panel"><div className="panel-heading"><div><h3>Atividade da semana</h3><p>Novos itens cadastrados em cada dia.</p></div></div>
            <div className="evolution-week">{weeklyActivity.map(day => <div className="evolution-day" key={day.key}><strong>{day.total}</strong><div className="evolution-track"><i style={{height: (day.total / weeklyMax * 100) + '%'}}/></div><span>{day.label}</span></div>)}</div>
          </section>
          <section className="panel report-panel"><div className="panel-heading"><div><h3>Suas conquistas</h3><p>Itens que você já marcou como concluídos.</p></div><span className="count">{currentAchievements.length}</span></div>
            {currentAchievements.length ? <div className="task-list">{currentAchievements.slice(0, 8).map(item => <div className="task done" key={item.id}><span className="task-complete-button checked" aria-hidden="true">✓</span><span className="task-title">{item.title}<small>{item.category === 'Meta' ? 'Meta' : 'Tarefa'} • Concluída</small></span></div>)}</div> : <p className="empty">Suas conquistas aparecerão aqui quando você concluir uma tarefa ou meta.</p>}
          </section>
        </div>
      </section> : tab === 'Visão geral' ? <>
        <div className="section-heading"><div><h2>Visão geral</h2><p>Acompanhe sua evolução de hoje.</p></div></div>
        <div className="stats">
          <article className="stat-card"><div className="stat-icon green">✓</div><span>Tarefas concluídas</span><strong>{completed}<small> / {actionTasks.length}</small></strong><div className="mini-track"><i style={{width: progress + '%'}}/></div></article>
          <article className="stat-card"><div className="stat-icon blue">↗</div><span>Progresso geral</span><strong>{progress}<small>%</small></strong><div className="mini-track"><i style={{width: progress + '%'}}/></div></article>
          <article className="stat-card"><div className="stat-icon violet">◎</div><span>Foco do dia</span><strong>{actionTasks.length - completed}<small> pendentes</small></strong><div className="stat-note">Continue no seu ritmo.</div></article>
        </div>
        <div className="content-grid"><section className="panel tasks-panel"><div className="panel-heading"><div><h3>Minhas tarefas</h3><p>Transforme planos em atitudes.</p></div><span className="count">{completed}/{actionTasks.length}</span></div>
          <form className="add-form" onSubmit={addTask}><input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Adicione uma nova tarefa..." aria-label="Nova tarefa"/><select className="priority-select" value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value)} aria-label="Prioridade da tarefa"><option>Baixa</option><option>Média</option><option>Alta</option></select><input className="due-date-input" type="date" value={newTaskDueDate} onChange={e => setNewTaskDueDate(e.target.value)} aria-label="Data de vencimento da tarefa"/><select className="priority-select" value={newTaskReminderDays} onChange={e => setNewTaskReminderDays(Number(e.target.value))} aria-label="Antecedência do lembrete"><option value={1}>Lembrar 1 dia antes</option><option value={3}>Lembrar 3 dias antes</option><option value={7}>Lembrar 7 dias antes</option><option value={15}>Lembrar 15 dias antes</option></select><button type="submit" disabled={saving || !newTask.trim()}>{saving ? 'Salvando...' : 'Adicionar'}</button></form>
          <div className="task-search"><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar pelo nome..." aria-label="Buscar tarefas"/></div>
          <div className="task-filters" aria-label="Filtrar tarefas">{['Todas', 'Pendentes', 'Concluídas'].map(filter => <button type="button" key={filter} className={taskFilter === filter ? 'task-filter active' : 'task-filter'} onClick={() => setTaskFilter(filter)}>{filter}</button>)}</div>
          <div className="sort-control"><label htmlFor="task-sort">Ordenar por</label><select id="task-sort" className="sort-select" value={sortMode} onChange={e => setSortMode(e.target.value)}><option value="recentes">Mais recentes</option><option value="prazo">Prazo mais próximo</option><option value="prioridade">Maior prioridade</option><option value="nome">Nome (A–Z)</option></select></div>
          {tasksLoading ? <p className="empty">Carregando suas tarefas...</p> : <div className="task-list">{sortItems(visibleActionTasks).map(task => <div className={task.done ? 'task done' : 'task'} key={task.id}>
            <button type="button" className={task.done ? "task-complete-button checked" : "task-complete-button"} onClick={() => toggleTask(task)} aria-pressed={task.done} aria-label={task.done ? "Reabrir tarefa" : "Concluir tarefa"}>{task.done ? "✓" : ""}</button>
            <span className="task-title">{task.title}<small>{task.category}{dueDateLabel(task) ? ` • ${dueDateLabel(task)}` : ''}</small></span><input className="due-date-input item-due-date" type="date" value={task.due_date || ''} onChange={e => updateDueDate(task, e.target.value)} aria-label="Alterar vencimento da tarefa"/><select className="priority-badge" value={task.reminder_days ?? 3} onChange={e => updateReminderDays(task, e.target.value)} aria-label="Antecedência do lembrete"><option value={1}>1 dia</option><option value={3}>3 dias</option><option value={7}>7 dias</option><option value={15}>15 dias</option></select><span className="task-state">{task.done ? 'Concluída' : 'Em andamento'}</span><select className={'priority-badge priority-' + (task.priority || 'Média').toLocaleLowerCase('pt-BR')} value={task.priority || 'Média'} onChange={e => updatePriority(task, e.target.value)} aria-label="Alterar prioridade"><option>Baixa</option><option>Média</option><option>Alta</option></select><button type="button" className="task-edit-button" onClick={() => startEditing(task)} aria-label="Editar tarefa">✎</button><button type="button" onClick={() => deleteTask(task)} disabled={saving} aria-label="Excluir tarefa" title="Excluir tarefa" style={{marginLeft:8,border:0,background:"transparent",color:"#d14b4b",fontSize:18,cursor:"pointer",padding:"6px"}}>🗑</button>
          </div>)}
          {actionTasks.length === 0 ? <p className="empty">Nenhuma tarefa ainda. Adicione sua primeira tarefa acima.</p> : visibleActionTasks.length === 0 && <p className="empty">Nenhuma tarefa encontrada neste filtro.</p>}</div>}
        </section><aside className="panel progress-panel"><div className="panel-heading"><div><h3>Seu ritmo</h3><p>O progresso de hoje</p></div></div><div className="ring" style={{'--progress': progress + '%'}}><div><strong>{progress}%</strong><small>concluído</small></div></div><p className="motivation">{progress === 100 ? 'Excelente! Você concluiu tudo.' : 'A constância é mais importante que a velocidade.'}</p></aside></div>
      </> : <section className="panel goals-panel"><div className="panel-heading"><div><h3>Minhas metas</h3><p>Defina objetivos e acompanhe suas conquistas.</p></div><span className="count">{completedGoals}/{goals.length} concluídas</span></div><form className="add-form" onSubmit={addGoal}><input value={newGoal} onChange={e => setNewGoal(e.target.value)} placeholder="Ex.: Ler 12 livros este ano..." aria-label="Nova meta"/><select className="priority-select" value={newGoalPriority} onChange={e => setNewGoalPriority(e.target.value)} aria-label="Prioridade da meta"><option>Baixa</option><option>Média</option><option>Alta</option></select><input className="due-date-input" type="date" value={newGoalDueDate} onChange={e => setNewGoalDueDate(e.target.value)} aria-label="Data de vencimento da meta"/><select className="priority-select" value={newGoalReminderDays} onChange={e => setNewGoalReminderDays(Number(e.target.value))} aria-label="Antecedência do lembrete"><option value={1}>Lembrar 1 dia antes</option><option value={3}>Lembrar 3 dias antes</option><option value={7}>Lembrar 7 dias antes</option><option value={15}>Lembrar 15 dias antes</option></select><button type="submit" disabled={saving || !newGoal.trim()}>{saving ? 'Salvando...' : 'Criar meta'}</button></form><div className="task-search"><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar pelo nome..." aria-label="Buscar tarefas"/></div><div className="task-filters" aria-label="Filtrar metas">{['Todas', 'Pendentes', 'Concluídas'].map(filter => <button type="button" key={filter} className={taskFilter === filter ? 'task-filter active' : 'task-filter'} onClick={() => setTaskFilter(filter)}>{filter}</button>)}</div><div className="sort-control"><label htmlFor="goal-sort">Ordenar por</label><select id="goal-sort" className="sort-select" value={sortMode} onChange={e => setSortMode(e.target.value)}><option value="recentes">Mais recentes</option><option value="prazo">Prazo mais próximo</option><option value="prioridade">Maior prioridade</option><option value="nome">Nome (A–Z)</option></select></div><p className="goal-message">Cada meta fica salva na sua conta. Marque quando concluir ou edite e exclua quando precisar.</p><div className="task-list">{sortItems(visibleGoals).map(goal => <div className={goal.done ? 'task done' : 'task'} key={goal.id}><button type="button" className={goal.done ? "task-complete-button checked" : "task-complete-button"} onClick={() => toggleTask(goal)} aria-pressed={goal.done} aria-label={goal.done ? "Reabrir meta" : "Concluir meta"}>{goal.done ? "✓" : ""}</button><span className="task-title">{goal.title}<small>Meta pessoal • {goal.done ? 100 : (goal.progress || 0)}% concluído{dueDateLabel(goal) ? ` • ${dueDateLabel(goal)}` : ''}</small><span className="goal-progress-track"><i style={{width: (goal.done ? 100 : (goal.progress || 0)) + '%'}}/></span></span><input className="goal-progress-input" type="range" min="0" max="100" step="5" value={goal.done ? 100 : (goal.progress || 0)} onChange={e => updateGoalProgress(goal, e.target.value)} aria-label="Progresso da meta em porcentagem" disabled={goal.done}/><input className="due-date-input item-due-date" type="date" value={goal.due_date || ''} onChange={e => updateDueDate(goal, e.target.value)} aria-label="Alterar vencimento da meta"/><select className="priority-badge" value={goal.reminder_days ?? 3} onChange={e => updateReminderDays(goal, e.target.value)} aria-label="Antecedência do lembrete"><option value={1}>1 dia</option><option value={3}>3 dias</option><option value={7}>7 dias</option><option value={15}>15 dias</option></select><span className="task-state">{goal.done ? 'Concluída' : 'Em andamento'}</span><select className={'priority-badge priority-' + (goal.priority || 'Média').toLocaleLowerCase('pt-BR')} value={goal.priority || 'Média'} onChange={e => updatePriority(goal, e.target.value)} aria-label="Alterar prioridade"><option>Baixa</option><option>Média</option><option>Alta</option></select><button type="button" className="task-edit-button" onClick={() => startEditing(goal)} aria-label="Editar meta">✎</button><button type="button" onClick={() => deleteTask(goal)} disabled={saving} aria-label="Excluir meta" title="Excluir meta" style={{marginLeft:8,border:0,background:"transparent",color:"#d14b4b",fontSize:18,cursor:"pointer",padding:"6px"}}>🗑</button></div>)}{goals.length === 0 ? <p className="empty">Você ainda não criou metas. Comece adicionando sua primeira meta acima.</p> : visibleGoals.length === 0 && <p className="empty">Nenhuma meta encontrada neste filtro.</p>}</div></section>}
      <footer>© {new Date().getFullYear()} Crescimento Exponencial <span>•</span> Evolua um dia de cada vez. Seus dados ficam vinculados à sua conta.</footer>
    </main>
  </div>;
}
