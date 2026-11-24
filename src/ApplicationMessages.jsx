import { useCallback, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function ApplicationMessages({ applicationId }) {
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const expanded = true;
  const [unread, setUnread] = useState(0);

  const loadUnread = useCallback(async currentUserId => {
    if (!currentUserId) return;
    const { data: readRow } = await supabase.from('application_message_reads')
      .select('last_read_at')
      .eq('application_id', applicationId)
      .eq('user_id', currentUserId)
      .maybeSingle();
    const lastRead = readRow?.last_read_at || '1970-01-01T00:00:00.000Z';
    const { count, error: queryError } = await supabase.from('application_messages')
      .select('id', { count: 'exact', head: true })
      .eq('application_id', applicationId)
      .neq('sender_id', currentUserId)
      .gt('created_at', lastRead);
    if (!queryError) setUnread(count || 0);
  }, [applicationId]);

  const load = useCallback(async (markAsRead = false) => {
    setLoading(true);
    setError('');
    const { data: auth } = await supabase.auth.getUser();
    const currentUserId = auth?.user?.id || '';
    setUserId(currentUserId);
    if (!currentUserId) {
      setError('Entre na sua conta para acessar as mensagens.');
      setLoading(false);
      return;
    }
    const { data, error: queryError } = await supabase.from('application_messages')
      .select('id,sender_id,body,created_at')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true });
    if (queryError) {
      setError('Não foi possível carregar as mensagens. ' + queryError.message);
    } else {
      const rows = data || [];
      setMessages(rows);
      if (markAsRead) {
        const lastVisible = rows.length ? rows[rows.length - 1].created_at : new Date().toISOString();
        const { error: readError } = await supabase.from('application_message_reads').upsert({
          application_id: applicationId,
          user_id: currentUserId,
          last_read_at: lastVisible
        }, { onConflict: 'application_id,user_id' });
        if (readError) setError('Não foi possível registrar a leitura. ' + readError.message);
      }
      await loadUnread(currentUserId);
    }
    setLoading(false);
  }, [applicationId, loadUnread]);

  useEffect(() => {
    load(true);
  }, [load]);

  useEffect(() => {
    if (!userId) return undefined;
    const channel = supabase.channel('application-messages-' + applicationId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'application_messages',
        filter: 'application_id=eq.' + applicationId
      }, () => {
        load(expanded);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'application_message_reads',
        filter: 'application_id=eq.' + applicationId
      }, () => {
        loadUnread(userId);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [applicationId, userId, expanded, load, loadUnread]);

  async function send(event) {
    event.preventDefault();
    const message = body.trim();
    if (!message || !userId) return;
    setSending(true);
    setError('');
    const { error: insertError } = await supabase.from('application_messages').insert({
      application_id: applicationId,
      sender_id: userId,
      body: message
    });
    if (insertError) setError('Não foi possível enviar a mensagem. ' + insertError.message);
    else {
      setBody('');
      await load(true);
    }
    setSending(false);
  }

  return <div className="application-chat">
    <div className="application-chat-heading">
      <strong>Mensagens {unread > 0 && <span className="message-unread-badge">{unread} nova{unread === 1 ? '' : 's'}</span>}</strong>
    </div>
    <>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <div className="application-chat-list">
        {loading ? <p className="empty">Carregando mensagens...</p> : messages.length ? messages.map(message => <article key={message.id} className={'application-chat-message' + (message.sender_id === userId ? ' mine' : '')}>
          <small>{message.sender_id === userId ? 'Você' : 'Participante'} • {new Date(message.created_at).toLocaleString('pt-BR')}</small>
          <p>{message.body}</p>
        </article>) : <p className="empty">Nenhuma mensagem ainda. Inicie a conversa.</p>}
      </div>
      <div className="application-chat-tools"><button type="button" className="logout-button" onClick={() => load(true)} disabled={loading}>Atualizar mensagens</button></div>
      <form className="application-chat-form" onSubmit={send}>
        <textarea value={body} onChange={event => setBody(event.target.value)} rows="2" maxLength="3000" placeholder="Escreva sua mensagem..." required />
        <button type="submit" disabled={sending || !body.trim()}>{sending ? 'Enviando...' : 'Enviar mensagem'}</button>
      </form>
    </>
  </div>;
}
