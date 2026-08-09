import { useState } from 'react';

/** Name + optional password. That's the whole account system. */
export default function SignInForm({ onSubmit }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await onSubmit(name.trim(), password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="group" style={{ marginBottom: 16 }}>
        <div className="group-body inset">
          <div className="row">
            <span className="row-label">Name</span>
            <input
              className="row-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="Your name"
              autoFocus
            />
          </div>
          <div className="row">
            <span className="row-label">Password</span>
            <input
              className="row-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="error-text" style={{ padding: '0 0 12px' }}>
          {error}
        </p>
      )}

      <button className="btn btn-filled btn-block" disabled={!name.trim() || busy}>
        {busy ? 'Signing in…' : 'Continue'}
      </button>
    </form>
  );
}
