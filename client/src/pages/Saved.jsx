import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import SaveButton from '../components/SaveButton';

export default function Saved() {
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 0 });
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api.savedPosts(page, { signal: controller.signal }).then(result => {
      if (controller.signal.aborted) return;
      if (page > 1 && result.pagination.pages < page) {
        setPage(Math.max(1, result.pagination.pages));
        return;
      }
      setPosts(result.posts);
      setPagination(result.pagination);
    }).catch(err => {
      if (err.name !== 'AbortError') setError(err.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [page, revision]);

  return <div className="page">
    <header className="page-header"><div><span className="kicker">Your collection</span><h1>Saved posts.</h1><p className="muted">Posts you bookmarked, newest save first.</p></div></header>
    {error && <div className="form-error" role="alert">{error}</div>}
    {loading ? <div className="screen-state inner">Loading saved posts...</div> : posts.length
      ? <><div className="post-grid">{posts.map(post => <article className="post-card" key={post.id}><Link className="post-image-wrap" to={`/posts/${post.id}`}><img src={post.imageUrl} alt={post.caption} /></Link><div className="post-card-body">{post.user?.username && <Link className="inline-link" to={`/profile/${encodeURIComponent(post.user.username)}`}>@{post.user.username}</Link>}<p className="post-caption">{post.caption}</p><div className="post-meta"><time dateTime={post.savedAt}>Saved {new Date(post.savedAt).toLocaleDateString()}</time><span className="card-actions"><Link to={`/posts/${post.id}`}>Open</Link><SaveButton postId={post.id} isSaved={post.isSaved} onChange={() => setRevision(current => current + 1)} /></span></div></div></article>)}</div>{pagination.pages > 1 && <div className="pagination"><button disabled={page <= 1} onClick={() => setPage(current => current - 1)}>Previous</button><span>Page {pagination.page} of {pagination.pages}</span><button disabled={page >= pagination.pages} onClick={() => setPage(current => current + 1)}>Next</button></div>}</>
      : !error && <div className="empty-state"><h3>No saved posts yet.</h3><p>Bookmark posts from your feed to find them here.</p><Link className="primary-button compact" to="/feed">Browse your feed</Link></div>}
  </div>;
}
