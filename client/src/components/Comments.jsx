import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function Comments({ postId, initialCount = 0, initiallyOpen = false }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(initiallyOpen);
  const [count, setCount] = useState(initialCount);
  const [comments, setComments] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setCount(initialCount), [postId, initialCount]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api.comments(postId, 1, { signal: controller.signal }).then(result => {
      if (controller.signal.aborted) return;
      setComments(result.comments);
      setCount(result.pagination.total);
      setPage(result.pagination.page);
      setPages(result.pagination.pages);
    }).catch(err => {
      if (err.name !== 'AbortError') setError(err.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [open, postId]);

  async function add(event) {
    event.preventDefault();
    const value = text.trim();
    if (busy || loading) return;
    if (!value || value.length > 500) {
      setError('Comment must be 1 to 500 characters.');
      return;
    }

    const pendingId = `pending-${Date.now()}`;
    const previousCount = count;
    setComments(current => [{ id: pendingId, text: value, createdAt: new Date().toISOString(),
      user: { username: user.username }, isOwn: true }, ...current]);
    setCount(previousCount + 1);
    setText('');
    setError('');
    setBusy(true);
    try {
      const result = await api.addComment(postId, value);
      setComments(current => current.map(comment => comment.id === pendingId ? result.comment : comment));
      setCount(result.commentCount);
      setPages(Math.ceil(result.commentCount / 20));
    } catch (err) {
      setComments(current => current.filter(comment => comment.id !== pendingId));
      setCount(previousCount);
      setText(value);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(comment) {
    if (busy || !comment.isOwn) return;
    const previousCount = count;
    const index = comments.findIndex(item => item.id === comment.id);
    setComments(current => current.filter(item => item.id !== comment.id));
    setCount(Math.max(0, previousCount - 1));
    setError('');
    setBusy(true);
    try {
      const result = await api.deleteComment(postId, comment.id);
      setCount(result.commentCount);
      setPages(Math.ceil(result.commentCount / 20));
    } catch (err) {
      setComments(current => {
        const restored = [...current];
        restored.splice(index, 0, comment);
        return restored;
      });
      setCount(previousCount);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadMore() {
    if (loadingMore || busy || page >= pages) return;
    setLoadingMore(true);
    setError('');
    try {
      const result = await api.comments(postId, page + 1);
      setComments(current => {
        const seen = new Set(current.map(comment => comment.id));
        return [...current, ...result.comments.filter(comment => !seen.has(comment.id))];
      });
      setPage(result.pagination.page);
      setPages(result.pagination.pages);
      setCount(result.pagination.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  }

  return <section style={{ marginTop: 20 }}>
    <button type="button" className="text-button comments-toggle" aria-expanded={open} onClick={() => setOpen(value => !value)}>Comments ({count})</button>
    {open && <div style={{ marginTop: 14 }}>
      {error && <div className="form-error" role="alert">{error}</div>}
      <form onSubmit={add} className="form-stack">
        <label>Write a comment<textarea value={text} maxLength="500" rows="2" onChange={event => setText(event.target.value)} /></label>
        <button className="primary-button compact" disabled={busy || loading || !text.trim()}>Comment</button>
      </form>
      {loading ? <p className="muted">Loading comments...</p> : comments.length
        ? <ul style={{ listStyle: 'none', padding: 0 }}>
            {comments.map(comment => <li key={comment.id} className="post-meta" style={{ display: 'block', padding: '12px 0' }}>
              {comment.user ? <Link className="inline-link" to={`/profile/${encodeURIComponent(comment.user.username)}`}>@{comment.user.username}</Link> : <span>Deleted user</span>}
              <p style={{ whiteSpace: 'pre-wrap', margin: '6px 0' }}>{comment.text}</p>
              <time className="muted" dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString()}</time>
              {comment.isOwn && <button type="button" className="text-button" disabled={busy} style={{ marginLeft: 12 }} onClick={() => remove(comment)}>Delete</button>}
            </li>)}
          </ul>
        : <p className="muted">No comments yet.</p>}
      {page < pages && <button type="button" className="text-button" disabled={loadingMore || busy} onClick={loadMore}>{loadingMore ? 'Loading...' : 'Load more comments'}</button>}
    </div>}
  </section>;
}
