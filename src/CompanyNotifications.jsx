import { useCallback, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function CompanyNotifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) { setItems([]); setLoading(false); return; }
    const { data, error: loadError } = await supabase.from('company_notifications')
      .select('id,title,message,read,created_at').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(30);
    if (loadError) setError('Não foi possível carregar as notificações. ' + loadError.message);
    else { setItems(data || []); setError(''); }
    setLoading(false);
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  async function markAsRead(id) {
    const { error: updateError } = await supabase.from('company_notifications')
      .update({ read: true }).eq('id', id);
    if (updateError) setError('Não foi possível marcar como lida. ' + updateError.message);
    else setItems(current => current.map(item => item.id === id ? { ...item, read: true } : item));
  }

  const unread = items.filter(item => !item.read).length;
  return <section className="panel company-notifications">
    <div className="panel-heading"><div><h3>Central de notificações</h3><p>Acompanhe as decisões sobre sua empresa e suas oportunidades.</p></div>
      <button type="button" className="logout-button" onClick={loadNotifications} disabled={loading}>Atualizar</button></div>
    <div className="notification-count">{unread} {unread === 1 ? 'aviso não lido' : 'avisos não lidos'}</div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {loading ? <p className="empty">Carregando notificações...</p> : items.length ? items.map(item => <article className={item.read ? 'company-notification read' : 'company-notification'} key={item.id}>
      <div className="company-notification-copy"><strong>{item.title}</strong><p>{item.message}</p><small>{new Date(item.created_at).toLocaleString('pt-BR')}</small></div>
      {!item.read && <button type="button" onClick={() => markAsRead(item.id)}>Marcar como lida</button>}
      {item.read && <span className="notification-read-label">Lida</span>}
    </article>) : <p className="empty">Você ainda não tem notificações. Os avisos aparecerão aqui quando houver uma atualização.</p>}
  </section>;
}
