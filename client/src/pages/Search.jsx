import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export default function Search() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [followError, setFollowError] = useState('');
  const [pendingUser, setPendingUser] = useState('');
  const term = query.trim();

  useEffect(() => {
    if (!term) {
      setUsers([]);
      setPagination({ page: 1, pages: 0, total: 0 });
      setLoading(false);
      setError('');
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');
    const timer = window.setTimeout(() => {
      api.searchUsers(term, page, { signal: controller.signal }).then(result => {
        if (controller.signal.aborted) return;
        setUsers(result.users);
        setPagination(result.pagination);
      }).catch(err => {
        if (err.name !== 'AbortError' && !controller.signal.aborted) {
          setUsers([]);
          setError(err.message);
        }
      }).finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [term, page]);

  async function toggleFollow(person) {
    if (pendingUser) return;
    setPendingUser(person.id);
    setFollowError('');
    try {
      const result = person.isFollowing ? await api.unfollow(person.username) : await api.follow(person.username);
      setUsers(current => current.map(item => item.id === person.id ? { ...item, isFollowing: result.isFollowing } : item));
    } catch (err) {
      setFollowError(err.message);
    } finally {
      setPendingUser('');
    }
  }

  return <div className="page">
    <header className="page-header"><div><span className="kicker">People</span><h1>Search people.</h1><p className="muted">Find creators by username or name.</p></div></header>
    <div className="search-bar"><span aria-hidden="true">⌕</span><label className="sr-only" htmlFor="people-search">Search people</label><input id="people-search" type="search" autoComplete="off" value={query} onChange={event => { setQuery(event.target.value); setPage(1); setFollowError(''); }} placeholder="Search by username or name..." /></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {followError && <div className="form-error" role="alert">{followError}</div>}
    {!term ? <div className="empty-state"><span className="empty-icon">⌕</span><h3>Find someone to follow.</h3><p>Enter a name or username to start searching.</p></div>
      : loading ? <div className="screen-state inner">Searching people...</div>
        : users.length ? <><div className="people-results">{users.map(person => <div className="post-card person-result" key={person.id}><Link className="person-info" to={`/profile/${encodeURIComponent(person.username)}`}><span className="avatar" aria-hidden="true">{person.username[0]?.toUpperCase()}</span><span><strong>{person.name || person.username}</strong><small>@{person.username}</small></span></Link><button type="button" className="primary-button compact" disabled={Boolean(pendingUser)} onClick={() => toggleFollow(person)}>{pendingUser === person.id ? 'Updating...' : person.isFollowing ? 'Unfollow' : 'Follow'}</button></div>)}</div>{pagination.pages > 1 && <div className="pagination"><button type="button" disabled={page <= 1} onClick={() => setPage(current => current - 1)}>← Previous</button><span>Page {pagination.page} of {pagination.pages}</span><button type="button" disabled={page >= pagination.pages} onClick={() => setPage(current => current + 1)}>Next →</button></div>}</>
          : !error && <div className="empty-state"><span className="empty-icon">⌕</span><h3>No people found.</h3><p>Try a different name or username.</p></div>}
  </div>;
}
