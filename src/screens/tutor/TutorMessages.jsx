import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FONTS } from '../../tokens.js';
import { Btn, Avatar } from '../../components/primitives/index.jsx';
import { supabase } from '../../supabase.js';
import { useAuth } from '../../AuthContext.jsx';
import { TutorDashboardNav } from './TutorDashboard.jsx';
const TutorMessages = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const tutorName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Tutor';

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(location.state?.convId || null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('conversations')
      .select('*')
      .eq('tutor_demo_id', user.id)
      .order('last_message_at', { ascending: false })
      .then(({ data }) => {
        setConversations(data || []);
        // Don't override a deep-linked convId from location.state
        if (data?.length > 0) setActiveConvId(prev => prev ?? data[0].id);
        // If deep-linked conv isn't in list yet (just created), add a placeholder
        const deepId = location.state?.convId;
        if (deepId && !(data || []).find(c => c.id === deepId)) {
          supabase.from('conversations').select('*').eq('id', deepId).maybeSingle()
            .then(({ data: c }) => { if (c) setConversations(prev => [c, ...prev]); });
        }
      });

    // Real-time: sidebar preview updates when student sends, and new conversations appear
    const convChannel = supabase
      .channel(`tutor-convs:${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'conversations',
        filter: `tutor_demo_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setConversations(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setConversations(prev =>
            [...prev.map(c => c.id === payload.new.id ? payload.new : c)]
              .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at))
          );
        }
      })
      .subscribe();

    return () => supabase.removeChannel(convChannel);
  }, [user]);

  useEffect(() => {
    if (!activeConvId) return;
    supabase.from('messages').select('*').eq('conversation_id', activeConvId).order('created_at')
      .then(({ data }) => setMessages(data || []));

    const channel = supabase.channel(`tutor-msgs:${activeConvId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConvId}` },
        (payload) => setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new]))
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [activeConvId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeConv = conversations.find(c => c.id === activeConvId);

  const sendMessage = async () => {
    if (!input.trim() || !activeConvId || !user) return;
    setSending(true);
    setSendError('');
    const text = input.trim();
    setInput('');
    const { data: newMsg, error: sendErr } = await supabase.from('messages')
      .insert({ conversation_id: activeConvId, sender_id: user.id, sender_name: tutorName, text })
      .select().single();
    if (sendErr) {
      setSendError('Message failed to send. Please try again.');
      setInput(text);
      setSending(false);
      return;
    }
    if (newMsg) setMessages(prev => [...prev, newMsg]);
    const now = new Date().toISOString();
    await supabase.from('conversations').update({ last_message: text, last_message_at: now }).eq('id', activeConvId);
    setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, last_message: text, last_message_at: now } : c));
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const studentInitials = (name) => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div style={{ height: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <TutorDashboardNav />

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: 0 }}>
        <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontFamily: FONTS.serif, fontSize: 22, fontWeight: 400, margin: 0, letterSpacing: -0.3 }}>Messages</h2>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {conversations.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                <div style={{ marginBottom: 8, opacity: 0.4, fontSize: 28 }}>💬</div>
                No messages yet.
              </div>
            ) : conversations.map(c => (
              <div key={c.id} onClick={() => setActiveConvId(c.id)} style={{
                padding: '14px 20px', display: 'flex', gap: 12, cursor: 'pointer',
                background: c.id === activeConvId ? 'var(--surface-2)' : 'transparent',
                borderLeft: c.id === activeConvId ? '2px solid var(--accent)' : '2px solid transparent',
              }}>
                <Avatar initials={studentInitials(c.student_name)} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{c.student_name}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                      {c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.last_message || 'No messages yet'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {activeConv ? (
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <Avatar initials={studentInitials(activeConv.student_name)} size={38} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{activeConv.student_name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Student</div>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, marginTop: 40 }}>
                  No messages yet with {activeConv.student_name?.split(' ')[0]}.
                </div>
              )}
              {messages.map((m) => {
                const isSystem = m.sender_name === 'Study Buddy' && String(m.text).startsWith('✅');
                const isMe = m.sender_id === user?.id && !isSystem;
                if (isSystem) {
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                      <div style={{
                        maxWidth: '86%', padding: '12px 16px', borderRadius: 12,
                        background: 'oklch(0.97 0.04 65)', border: '1px solid oklch(0.88 0.1 65)',
                        fontSize: 13, lineHeight: 1.5, color: 'var(--ink-2)', whiteSpace: 'pre-wrap',
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'oklch(0.5 0.14 60)', marginBottom: 6 }}>STUDY BUDDY</div>
                        {m.text}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                    <div style={{
                      maxWidth: '72%', padding: '10px 14px', borderRadius: 14,
                      background: isMe ? 'var(--ink)' : 'var(--surface)',
                      color: isMe ? 'var(--surface)' : 'var(--ink)',
                      border: isMe ? 'none' : '1px solid var(--border)',
                      fontSize: 14, lineHeight: 1.45,
                      borderBottomRightRadius: isMe ? 4 : 14,
                      borderBottomLeftRadius: isMe ? 14 : 4,
                    }}>
                      {m.text}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div style={{ padding: '14px 24px 20px', flexShrink: 0 }}>
              {sendError && (
                <div style={{ fontSize: 12, color: 'oklch(0.55 0.18 25)', background: 'oklch(0.97 0.02 25)', border: '1px solid oklch(0.88 0.12 25)', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
                  {sendError}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, padding: '8px 8px 8px 18px' }}>
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder={`Reply to ${activeConv.student_name?.split(' ')[0]}…`}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: FONTS.sans, fontSize: 14, color: 'var(--ink)' }} />
                <Btn size="sm" icon="send" onClick={sendMessage} style={{ borderRadius: 20, opacity: input.trim() ? 1 : 0.4 }}>
                  {sending ? '…' : 'Send'}
                </Btn>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.2 }}>💬</div>
              <div style={{ fontSize: 15 }}>Select a conversation</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TutorMessages;
