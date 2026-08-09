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
    } catch {
      // Clipboard needs a secure context; fall back to selecting the text.
      document.getElementById('share-url')?.select();
      document.execCommand?.('copy');
    }
    setCopied(true);
  }

  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="sharebar">
      <span className="sharebar-label">Share this link</span>
      <input
        id="share-url"
        className="share-url"
        value={url}
        readOnly
        onFocus={(e) => e.target.select()}
      />
      <button type="button" className="btn btn-filled btn-sm" onClick={copy}>
        {copied ? 'Copied' : 'Copy'}
      </button>
      {canShare && (
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => navigator.share({ url, title: document.title }).catch(() => {})}
        >
          Share
        </button>
      )}
    </div>
  );
}
