import { useCallback, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import ApplicationMessages from './ApplicationMessages';

const statusLabels = { pending: 'Nova', reviewing: 'Em análise', approved: 'Aprovada', rejected: 'Não selecionada' };

export default function MessageInbox() {
  const [items, setItems] = useState([]);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data: auth } = await supabase.auth.getUser();
    const currentUserId = auth?.user?.id || '';
    setUserId(currentUserId);
    if (!currentUserId) {
      setError('Entre na sua conta para acessar suas mensagens.');
      setLoading(false);
      return;
    }

    const { data: applications, error: applicationsError } = await supabase
      .from('opportunity_applications')
      .select('id,full_name,candidate_id,opportunity_id,created_at,status,opportunities(title,company_profiles(name,owner_id))')
      .order('created_at', { ascending: false });

    if (applicationsError) {
      setError('Não foi possível carregar suas conversas. ' + applicationsError.message);
      setLoading(false);
      return;
    }

    const rows = applications || [];
    if (!rows.length) {
      setItems([]);
      setLoading(false);
      return;
    }

    const ids = rows.map(item => item.id);
    const [{ data: messages, error: messagesError }, { data: reads, error: readsError }] = await Promise.all([
      supabase.from('application_messages')
        .select('id,application_id,sender_id,body,created_at')
        .in('application_id', ids)
        .order('created_at', { ascending: false }),
      supabase.from('application_message_reads')
        .select('application_id,last_read_at')
        .eq('user_id', currentUserId)
        .in('application_id', ids)
    ]);

    if (messagesError || readsError) {
      setError('Não foi possível carregar as mensagens. ' + (messagesError?.message || readsError?.message));
      setLoading(false);
      return;
    }

    const readMap = new Map((reads || []).map(item => [item.application_id, item.last_read_at]));
    const messageMap = new Map();
    for (const message of messages || []) {
      const current = messageMap.get(message.application_id) || { latest: null, unread: 0 };
      if (!current.latest) current.latest = message;
      const lastRead = readMap.get(message.application_id) || '1970-01-01T00:00:00.000Z';
      if (message.sender_id !== currentUserId && new Date(message.created_at) > new Date(lastRead)) current.unread += 1;
      messageMap.set(message.application_id, current);
    }

    setItems(rows.map(item => {
      const opportunity = item.opportunities || {};
      const company = opportunity.company_profiles || {};
      const isCandidate = item.candidate_id === currentUserId;
      return {
        ...item,
        title: opportunity.title || 'Oportunidade',
        counterpart: isCandidate ? (company.name || 'Empresa') : (item.full_name || 'Candidato'),
        latest: messageMap.get(item.id)?.latest || null,
        unread: messageMap.get(item.id)?.unread || 0
      };
    }).sort((a, b) => (b.latest?.created_at || b.created_at).localeCompare(a.latest?.created_at || a.created_at)));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalUnread = items.reduce((sum, item) => sum + item.unread, 0);

  return <section className="panel message-inbox-panel">
    <div className="panel-heading">
      <div><h3>Caixa de entrada</h3><p>Suas conversas com candidatos e empresas em um só lugar.</p></div>
      <button type="button" className="logout-button" onClick={load} disabled={loading}>Atualizar</button>
    </div>
    <div className="message-inbox-summary">
      <strong>{items.length}</strong><span>Conversas</span>
      <strong>{totalUnread}</strong><span>Mensagens não lidas</span>
    </div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {loading ? <p className="empty">Carregando caixa de entrada...</p> : items.length ? <div className="message-inbox-list">
      {items.map(item => <article className={'message-inbox-item' + (item.unread ? ' has-unread' : '')} key={item.id}>
        <div className="message-inbox-copy">
          <strong>{item.counterpart}</strong>
          <span>{item.title} • {statusLabels[item.status] || item.status}</span>
          <p>{item.latest ? item.latest.body : 'Ainda não há mensagens nesta conversa.'}</p>
          <small>{item.latest ? new Date(item.latest.created_at).toLocaleString('pt-BR') : 'Candidatura enviada em ' + new Date(item.created_at).toLocaleDateString('pt-BR')}</small>
        </div>
        <div className="message-inbox-actions">
          {item.unread > 0 && <span className="message-unread-badge">{item.unread} não lida{item.unread === 1 ? '' : 's'}</span>}
          <button type="button" className="logout-button" onClick={() => setOpenId(current => current === item.id ? '' : item.id)}>{openId === item.id ? 'Fechar' : 'Abrir conversa'}</button>
        </div>
        {openId === item.id && <ApplicationMessages applicationId={item.id} />}
      </article>)}
    </div> : <p className="empty">Suas conversas aparecerão aqui quando houver candidaturas.</p>}
  </section>;
}
