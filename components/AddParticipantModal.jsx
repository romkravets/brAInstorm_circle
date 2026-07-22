'use client';
import { useEffect, useState } from 'react';
import { useOllama } from '../hooks/useOllama.js';
import { AI_PRESETS, ROLES, isSafeUrl } from '../lib/participants.js';

const CLOUD_PRESETS  = AI_PRESETS.filter(p => p.respondMode === 'manual');
const OLLAMA_PRESETS = AI_PRESETS.filter(p => p.respondMode === 'ollama');

export default function AddParticipantModal({ onAdd, onClose }) {
  const [tab,         setTab]         = useState('cloud'); // 'cloud' | 'ollama' | 'custom'
  const [customName,  setCustomName]  = useState('');
  const [customUrl,   setCustomUrl]   = useState('https://');
  const [customModel, setCustomModel] = useState('');
  const [customRole,  setCustomRole]  = useState('Аналітик');
  const [urlError,    setUrlError]    = useState('');

  const { ollamaStatus, checkOllama } = useOllama();

  useEffect(() => {
    if (tab === 'ollama') checkOllama();
  }, [tab, checkOllama]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  function selectPreset(preset) {
    onAdd(preset);
    onClose();
  }

  function addCustom() {
    if (tab === 'custom') {
      if (!customName.trim()) return;
      if (!isSafeUrl(customUrl)) { setUrlError('URL має починатись з https://'); return; }
      onAdd({ name: customName.trim(), respondMode: 'manual', url: customUrl, ollamaModel: '', role: customRole });
    } else if (tab === 'custom-ollama') {
      if (!customName.trim() || !customModel.trim()) return;
      onAdd({ name: customName.trim(), respondMode: 'ollama', url: '', ollamaModel: customModel.trim(), role: customRole });
    }
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 rounded-2xl shadow-2xl max-w-lg mx-auto"
        style={{ background: 'var(--bc-surface)', border: '1px solid var(--bc-border)', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--bc-border)' }}>
          <h2 className="font-medium" style={{ color: 'var(--bc-text)' }}>Додати учасника</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100" style={{ color: 'var(--bc-text-muted)' }}>✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b flex-shrink-0" style={{ borderColor: 'var(--bc-border)' }}>
          {[['cloud', '☁️ Cloud AI'], ['ollama', '⚡ Ollama'], ['custom', '✏️ Свій']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex-1 py-2.5 text-sm font-medium transition-colors"
              style={tab === id
                ? { color: 'var(--bc-accent)', borderBottom: '2px solid var(--bc-accent)' }
                : { color: 'var(--bc-text-muted)' }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'cloud' && (
            <div className="grid grid-cols-2 gap-2">
              {CLOUD_PRESETS.map(p => (
                <button
                  key={p.name}
                  onClick={() => selectPreset(p)}
                  className="flex items-center gap-3 p-3 rounded-xl border text-left transition-colors hover:border-[var(--bc-accent)]"
                  style={{ borderColor: 'var(--bc-border)' }}
                >
                  <span className="text-lg">🤖</span>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--bc-text)' }}>{p.name}</div>
                    <div className="text-xs" style={{ color: 'var(--bc-text-hint)' }}>Мануально</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {tab === 'ollama' && (
            <div>
              {ollamaStatus === null && (
                <p className="text-sm text-center py-4" style={{ color: 'var(--bc-text-muted)' }}>Перевірка Ollama...</p>
              )}
              {ollamaStatus?.running === false && (
                <div className="rounded-xl p-4 mb-4 text-sm" style={{ background: '#fdeaea', color: 'var(--bc-danger)' }}>
                  Ollama не запущений.<br />
                  <code className="text-xs">OLLAMA_ORIGINS=* ollama serve</code>
                </div>
              )}
              {ollamaStatus?.running && (
                <p className="text-xs mb-3" style={{ color: 'var(--bc-success)' }}>
                  ✓ Ollama запущений · {ollamaStatus.models.length} {ollamaStatus.models.length === 1 ? 'модель' : 'моделей'}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                {OLLAMA_PRESETS.map(p => {
                  const installed = ollamaStatus?.models?.some(m => m.startsWith(p.ollamaModel));
                  return (
                    <button
                      key={p.name}
                      onClick={() => selectPreset(p)}
                      className="flex items-center gap-3 p-3 rounded-xl border text-left transition-colors hover:border-[var(--bc-accent)]"
                      style={{ borderColor: 'var(--bc-border)', opacity: ollamaStatus && !installed ? 0.5 : 1 }}
                    >
                      <span className="text-lg">⚡</span>
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--bc-text)' }}>{p.name}</div>
                        <div className="text-xs" style={{ color: installed ? 'var(--bc-success)' : 'var(--bc-text-hint)' }}>
                          {installed ? '✓ встановлена' : p.ollamaModel}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setTab('custom-ollama')}
                className="mt-3 w-full py-2 rounded-xl text-sm border transition-colors"
                style={{ color: 'var(--bc-accent)', borderColor: 'var(--bc-accent)', background: 'var(--bc-accent-light)' }}
              >
                + Своя модель Ollama
              </button>
            </div>
          )}

          {(tab === 'custom' || tab === 'custom-ollama') && (
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--bc-text-muted)' }}>Ім’я</label>
                <input
                  className="w-full px-3 py-2 rounded-xl border outline-none text-sm"
                  style={{ borderColor: 'var(--bc-border)', color: 'var(--bc-text)', background: 'var(--bc-surface)' }}
                  placeholder={tab === 'custom' ? 'Мій AI' : 'Моя модель'}
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                />
              </div>
              {tab === 'custom' && (
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--bc-text-muted)' }}>URL</label>
                  <input
                    className="w-full px-3 py-2 rounded-xl border outline-none text-sm"
                    style={{ borderColor: urlError ? 'var(--bc-danger)' : 'var(--bc-border)', color: 'var(--bc-text)', background: 'var(--bc-surface)' }}
                    placeholder="https://..."
                    value={customUrl}
                    onChange={e => { setCustomUrl(e.target.value); setUrlError(''); }}
                  />
                  {urlError && <p className="text-xs mt-1" style={{ color: 'var(--bc-danger)' }}>{urlError}</p>}
                </div>
              )}
              {tab === 'custom-ollama' && (
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--bc-text-muted)' }}>Назва моделі Ollama</label>
                  <input
                    className="w-full px-3 py-2 rounded-xl border outline-none text-sm"
                    style={{ borderColor: 'var(--bc-border)', color: 'var(--bc-text)', background: 'var(--bc-surface)' }}
                    placeholder="llama3.1, mistral, gemma2..."
                    value={customModel}
                    onChange={e => setCustomModel(e.target.value)}
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--bc-text-muted)' }}>Роль</label>
                <select
                  className="w-full px-3 py-2 rounded-xl border outline-none text-sm"
                  style={{ borderColor: 'var(--bc-border)', color: 'var(--bc-text)', background: 'var(--bc-surface)' }}
                  value={customRole}
                  onChange={e => setCustomRole(e.target.value)}
                >
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <button
                onClick={addCustom}
                className="py-2.5 rounded-xl font-medium text-sm transition-colors"
                style={{ background: 'var(--bc-accent)', color: '#fff' }}
              >
                Додати
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
