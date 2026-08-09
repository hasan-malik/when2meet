import { useEffect, useState } from 'react';

export default function ShareBar() {
  const [copied, setCopied] = useState(false);
  const url = typeof window === 'undefined' ? '' : window.location.href;

  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard API needs a secure context; fall back to selection.
      const input = document.getElementById('share-url');
      input?.select();
      document.execCommand?.('copy');
      setCopied(true);
    }
  }

  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="sharebar">
      <span className="sharebar-label">Share this link</span>
      <div className="sharebar-row">
        <input id="share-url" className="input input-sm share-input" value={url} readOnly />
        <button type="button" className="btn btn-primary btn-sm" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
        {canShare && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => navigator.share({ url, title: document.title }).catch(() => {})}
          >
            Share
          </button>
        )}
      </div>
    </div>
  );
}
