import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

function destination(item) {
  if (item.type === 'follow' && item.actor?.username) {
    return `/profile/${encodeURIComponent(item.actor.username)}`;
  }
  return item.postId ? `/posts/${item.postId}` : null;
}

function description(item) {
  const actor = item.actor?.username ? `@${item.actor.username}` : 'Someone';
  if (item.type === 'follow') return `${actor} followed you`;
  if (item.type === 'like') return `${actor} liked your post`;
  return `${actor} commented on your post`;
}

export default function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    api.notifications(1, { signal: controller.signal }).then(result => {
      if (controller.signal.aborted) return;
      setItems(result.notifications);
      setPage(result.pagination.page);
      setPages(result.pagination.pages);
      setUnreadCount(result.unreadCount);
    }).catch(err => {
      if (err.name !== 'AbortError') setError(err.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);

  async function markOne(item) {
    if (busy || item.readAt) return;
    setBusy(true);
    setError('');
    try {
      await api.markNotificationRead(item.id);
      setItems(current => current.map(entry => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
      setUnreadCount(current => Math.max(0, current - 1));
      window.dispatchEvent(new Event('notifications:updated'));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function open(item) {
    if (busy) return;
    const path = destination(item);
    if (!path) return;
    if (!item.readAt) await markOne(item);
    navigate(path);
  }

  async function markAll() {
    if (busy || !unreadCount) return;
    setBusy(true);
    setError('');
    try {
      await api.markAllNotificationsRead();
      const readAt = new Date().toISOString();
      setItems(current => current.map(item => ({ ...item, readAt: item.readAt || readAt })));
      setUnreadCount(0);
      window.dispatchEvent(new Event('notifications:updated'));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadMore() {
    if (loadingMore || page >= pages) return;
    setLoadingMore(true);
    setError('');
    try {
      const result = await api.notifications(page + 1);
      setItems(current => {
        const seen = new Set(current.map(item => item.id));
        return [...current, ...result.notifications.filter(item => !seen.has(item.id))];
      });
      setPage(result.pagination.page);
      setPages(result.pagination.pages);
      setUnreadCount(result.unreadCount);
      window.dispatchEvent(new Event('notifications:updated'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  }

  return <div className="page narrow-page">
    <header className="page-header"><div><span className="kicker">Activity</span><h1>Notifications.</h1><p className="muted">{unreadCount} unread</p></div>{unreadCount > 0 && <button type="button" className="primary-button compact" disabled={busy} onClick={markAll}>Mark all as read</button>}</header>
    {error && <div className="form-error" role="alert">{error}</div>}
    {loading ? <div className="screen-state inner">Loading notifications...</div> : items.length
      ? <><ul style={{ listStyle: 'none', padding: 0 }}>{items.map(item => {
          const path = destination(item);
          return <li className="post-card post-card-body" style={{ marginBottom: 12, borderLeft: item.readAt ? undefined : '4px solid #73844a' }} key={item.id}>
            {path ? <Link className="inline-link" to={path} onClick={event => { event.preventDefault(); open(item); }}>{description(item)}</Link> : <span>{description(item)}</span>}
            <p className="muted"><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>{!item.readAt && ' · Unread'}</p>
            {!item.readAt && <button type="button" className="text-button" disabled={busy} onClick={() => markOne(item)}>Mark as read</button>}
          </li>;
        })}</ul>{page < pages && <div className="pagination"><button type="button" disabled={loadingMore} onClick={loadMore}>{loadingMore ? 'Loading...' : 'Load more'}</button></div>}</>
      : !error && <div className="empty-state"><h3>No notifications yet.</h3><p>Follows, likes, and comments will appear here.</p></div>}
  </div>;
}
