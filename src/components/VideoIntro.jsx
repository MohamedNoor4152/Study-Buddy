import { useState } from 'react';
import { FONTS } from '../tokens.js';

const VideoIntro = ({ tutor, size = 'lg' }) => {
  const [playing, setPlaying] = useState(false);
  const h = size === 'lg' ? 280 : size === 'md' ? 200 : 160;

  return (
    <div style={{
      position: 'relative', width: '100%', height: h,
      borderRadius: 14, overflow: 'hidden',
      background: `linear-gradient(135deg, ${tutor.color || 'oklch(0.75 0.1 30)'} 0%, var(--ink) 140%)`,
      cursor: 'pointer',
    }} onClick={() => setPlaying(p => !p)}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `repeating-linear-gradient(135deg, rgba(255,255,255,.03), rgba(255,255,255,.03) 8px, transparent 8px, transparent 16px)`,
      }} />

      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -60%)',
        fontFamily: FONTS.serif, fontSize: h * 0.55, fontWeight: 400,
        color: 'rgba(255,255,255,.18)', letterSpacing: -3,
        pointerEvents: 'none',
      }}>{tutor.initials}</div>

      <div style={{
        position: 'absolute', top: 14, left: 14,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 10px', borderRadius: 100,
        background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(8px)',
        color: '#fff', fontSize: 11, fontWeight: 500, letterSpacing: '0.04em',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: 3, background: 'oklch(0.7 0.18 25)' }} />
        Intro video · 48 sec
      </div>

      <div style={{
        position: 'absolute', bottom: 14, left: 14, right: 14,
        color: 'rgba(255,255,255,.95)', fontSize: 13, lineHeight: 1.4,
        textShadow: '0 1px 8px rgba(0,0,0,.6)',
      }}>
        <div style={{ fontFamily: FONTS.serif, fontSize: 18, marginBottom: 2, letterSpacing: -0.2 }}>
          "Hey! I'm {tutor.name.split(' ')[0]} — here's how I tutor."
        </div>
      </div>

      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 64, height: 64, borderRadius: 32,
        background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,.3)',
        transition: 'transform .15s',
      }}>
        {playing ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--ink)"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--ink)" style={{ marginLeft: 3 }}><path d="M6 4l14 8-14 8z"/></svg>
        )}
      </div>

      {playing && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, height: 3,
          background: 'oklch(0.7 0.18 25)',
          animation: 'sb-video-progress 48s linear forwards',
        }} />
      )}
      <style>{`@keyframes sb-video-progress { from {width:0} to {width:100%} }`}</style>
    </div>
  );
};

export default VideoIntro;
