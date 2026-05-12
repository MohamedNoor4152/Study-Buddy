import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FONTS } from '../../tokens.js';
import { Logo, Btn, Avatar, Icon } from '../../components/primitives/index.jsx';
import { SBUserMenu, SBFooter } from '../basics/BasicScreens.jsx';
import { supabase } from '../../supabase.js';
import { useAuth } from '../../AuthContext.jsx';

const MessagesDesktop = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(location.state?.convId || null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const bottomRef = useRef(null);

  // Load all conversations for this user + real-time sidebar updates
  useEffect(() => {
    if (!user) return;
    supabase
      .from('conversations')
      .select('*')
      .eq('student_id', user.id)
      .order('last_message_at', { ascending: false })
      .then(({ data }) => {
        setConversations(data || []);
        setLoadingConvs(false);
        if (location.state?.convId) setActiveConvId(location.state.convId);
        else if (data?.length > 0 && !activeConvId) setActiveConvId(data[0].id);
      });

    // Real-time: when tutor replies, update sidebar last_message preview immediately
    const convChannel = supabase
      .channel(`student-convs:${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'conversations',
        filter: `student_id=eq.${user.id}`,
      }, (payload) => {
        setConversations(prev =>
          [...prev.map(c => c.id === payload.new.id ? payload.new : c)]
            .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at))
        );
      })
      .subscribe();

    return () => supabase.removeChannel(convChannel);
  }, [user]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConvId) return;
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', activeConvId)
      .order('created_at')
      .then(({ data }) => setMessages(data || []));

    // Subscribe to new messages in real time
    const channel = supabase
      .channel(`messages:${activeConvId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConvId}`,
      }, (payload) => {
        setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [activeConvId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeConv = conversations.find(c => c.id === activeConvId);

  const sendMessage = async () => {
    if (!input.trim() || !activeConvId || !user) return;
    setSending(true);
    setSendError('');
    const senderName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You';
    const text = input.trim();
    setInput('');

    const { data: newMsg, error: sendErr } = await supabase
      .from('messages')
      .insert({ conversation_id: activeConvId, sender_id: user.id, sender_name: senderName, text })
      .select()
      .single();

    if (sendErr) {
      setSendError('Message failed to send. Please try again.');
      setInput(text);
      setSending(false);
      return;
    }

    if (newMsg) setMessages(prev => [...prev, newMsg]);

    const now = new Date().toISOString();
    await supabase.from('conversations').update({ last_message: text, last_message_at: now }).eq('id', activeConvId);
    // Update sidebar locally — real-time will also fire, but this makes it instant
    setConversations(prev =>
      [...prev.map(c => c.id === activeConvId ? { ...c, last_message: text, last_message_at: now } : c)]
        .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at))
    );

    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const tutorInitials = (name) => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 56px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <div onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}><Logo size={22} /></div>
          <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
            <span style={{ color: 'var(--ink-3)', cursor: 'pointer' }} onClick={() => navigate('/home')}>Home</span>
            <span style={{ color: 'var(--ink)', fontWeight: 500, borderBottom: '2px solid var(--ink)', paddingBottom: 2 }}>Messages</span>
            <span style={{ color: 'var(--ink-3)', cursor: 'pointer' }} onClick={() => navigate('/browse')}>Browse</span>
            <span style={{ color: 'var(--ink-3)', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>Sessions</span>
            <span style={{ color: 'var(--ink-3)', cursor: 'pointer' }} onClick={() => navigate('/settings')}>Settings</span>
          </div>
        </div>
        <SBUserMenu />
      </nav>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: 0 }}>
        {/* Sidebar */}
        <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontFamily: FONTS.serif, fontSize: 22, fontWeight: 400, margin: 0, letterSpacing: -0.3 }}>Messages</h2>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {loadingConvs ? (
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, opacity: 0.5 }}>
                {[1,2,3].map(i => <div key={i} style={{ height: 56, background: 'var(--border)', borderRadius: 10 }} />)}
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                <div style={{ marginBottom: 8, opacity: 0.4, fontSize: 28 }}>💬</div>
                No conversations yet.
                <div style={{ marginTop: 6, fontSize: 12 }}>Click Message on a tutor's profile to start one.</div>
              </div>
            ) : conversations.map(c => (
              <div key={c.id} onClick={() => setActiveConvId(c.id)} style={{
                padding: '14px 20px', display: 'flex', gap: 12, cursor: 'pointer',
                background: c.id === activeConvId ? 'var(--surface-2)' : 'transparent',
                borderLeft: c.id === activeConvId ? '2px solid var(--accent)' : '2px solid transparent',
              }}>
                <Avatar initials={tutorInitials(c.tutor_name)} color="oklch(0.72 0.1 100)" size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{c.tutor_name}</span>
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

        {/* Thread */}
        {activeConv ? (
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <Avatar initials={tutorInitials(activeConv.tutor_name)} color="oklch(0.72 0.1 100)" size={38} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{activeConv.tutor_name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Tutor</div>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, marginTop: 40 }}>
                  Say hi to {activeConv.tutor_name?.split(' ')[0]}!
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
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 24, padding: '8px 8px 8px 18px',
              }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${activeConv.tutor_name?.split(' ')[0]}…`}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: FONTS.sans, fontSize: 14, color: 'var(--ink)' }}
                />
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
      <SBFooter slim />
    </div>
  );
};

export default MessagesDesktop;
