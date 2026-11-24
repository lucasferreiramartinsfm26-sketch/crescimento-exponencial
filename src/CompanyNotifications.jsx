import { useCallback, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function CompanyNotifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const { data: userData, error: authError } = await supabase.auth.getUser();
    const user = userData?.user;
    if (authError || !user) {
      setItems([]);
      setError(authError ? 'Não foi possível confirmar sua sessão. Entre novamente.' : '');
      setLoading(false);
      return;
    }

    const { data, error: loadError } = await supabase.from('company_notifications')
      .select('id,title,message,read,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (loadError) setError('Não foi possível carregar as notificações. ' + loadError.message);
    else {
      setItems(data || []);
      setError('');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadNotifications();
    // Atualiza avisos automaticamente sem desmontar a lista enquanto o usuário lê.
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadNotifications(false);
    }, 60000);
    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') loadNotifications(false);
    };
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, [loadNotifications]);

  async function markAsRead(id) {
    const { error: updateError } = await supabase.from('company_notifications')
      .update({ read: true }).eq('id', id);
    if (updateError) setError('Não foi possível marcar como lida. ' + updateError.message);
    else setItems(current => current.map(item => item.id === id ? { ...item, read: true } : item));
  }

  async function markAllAsRead() {
    const unreadIds = items.filter(item => !item.read).map(item => item.id);
    if (!unreadIds.length) return;
    setUpdating(true);
    setError('');
    const { error: updateError } = await supabase.from('company_notifications')
      .update({ read: true }).in('id', unreadIds);
    if (updateError) setError('Não foi possível marcar todas como lidas. ' + updateError.message);
    else setItems(current => current.map(item => ({ ...item, read: true })));
    setUpdating(false);
  }

  const unread = items.filter(item => !item.read).length;
  return <section className="panel company-notifications">
    <div className="panel-heading">
      <div><h3>Central de notificações</h3><p>Acompanhe as decisões sobre sua empresa e suas oportunidades.</p></div>
      <div className="notification-actions">
        {unread > 0 && <button type="button" className="logout-button" onClick={markAllAsRead} disabled={updating}>{updating ? 'Atualizando...' : 'Marcar todas como lidas'}</button>}
        <button type="button" className="logout-button" onClick={() => loadNotifications()} disabled={loading}>Atualizar</button>
      </div>
    </div>
    <div className="notification-count">{unread} {unread === 1 ? 'aviso não lido' : 'avisos não lidos'}</div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {loading ? <p className="empty">Carregando notificações...</p> : items.length ? items.map(item => <article className={item.read ? 'company-notification read' : 'company-notification'} key={item.id}>
      <div className="company-notification-copy"><strong>{item.title}</strong><p>{item.message}</p><small>{new Date(item.created_at).toLocaleString('pt-BR')}</small></div>
      {!item.read && <button type="button" onClick={() => markAsRead(item.id)}>Marcar como lida</button>}
      {item.read && <span className="notification-read-label">Lida</span>}
    </article>) : <p className="empty">Você ainda não tem notificações. Os avisos aparecerão aqui quando houver uma atualização.</p>}
  </section>;
}
