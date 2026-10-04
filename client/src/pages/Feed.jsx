import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import LikeButton from '../components/LikeButton';
import SaveButton from '../components/SaveButton';
import Comments from '../components/Comments';

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    api.feed(1, { signal: controller.signal }).then(result => {
      if (controller.signal.aborted) return;
      setPosts(result.posts);
      setPage(result.pagination.page);
      setPages(result.pagination.pages);
    }).catch(err => {
      if (err.name !== 'AbortError') setError(err.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);

  async function loadMore() {
    if (loadingMore || page >= pages) return;
    setLoadingMore(true);
    setError('');
    try {
      const result = await api.feed(page + 1);
      setPosts(current => {
        const seen = new Set(current.map(post => post.id));
        return [...current, ...result.posts.filter(post => !seen.has(post.id))];
      });
      setPage(result.pagination.page);
      setPages(result.pagination.pages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  }

  return <div className="page">
    <header className="page-header"><div><span className="kicker">Home</span><h1>Your feed.</h1><p className="muted">The newest posts from people you follow.</p></div><Link className="quiet-link" to={`/profile/${encodeURIComponent(user.username)}?view=following`}>Following →</Link></header>
    {error && <div className="form-error" role="alert">{error}</div>}
    {loading ? <div className="screen-state inner">Loading your feed...</div> : posts.length
      ? <><div className="post-grid">{posts.map(post => <article className="post-card" key={post.id}><Link to={`/posts/${post.id}`} className="post-image-wrap"><img src={post.imageUrl} alt={post.caption} /></Link><div className="post-card-body">{post.author?.username && <Link className="inline-link" to={`/profile/${encodeURIComponent(post.author.username)}`}>@{post.author.username}</Link>}<p className="post-caption">{post.caption}</p><div className="post-meta"><span>{post.style || 'creative'}</span><time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString()}</time><span className="card-actions"><LikeButton postId={post.id} likeCount={post.likeCount} isLiked={post.isLiked} /><SaveButton postId={post.id} isSaved={post.isSaved} /></span></div><Comments postId={post.id} initialCount={post.commentCount} /></div></article>)}</div>{page < pages && <div className="pagination"><button disabled={loadingMore} onClick={loadMore}>{loadingMore ? 'Loading...' : 'Load more'}</button></div>}</>
      : !error && <div className="empty-state"><h3>Your feed is quiet.</h3><p>Follow creators from their public profiles to see their posts here.</p><Link className="primary-button compact" to={`/profile/${encodeURIComponent(user.username)}?view=following`}>See who you follow</Link></div>}
  </div>;
}
