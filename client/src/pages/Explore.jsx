import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import LikeButton from '../components/LikeButton';
import Comments from '../components/Comments';
import SaveButton from '../components/SaveButton';

export default function Explore() {
  const [sort, setSort] = useState('newest');
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [following, setFollowing] = useState('');
  const [postsError, setPostsError] = useState('');
  const [suggestionsError, setSuggestionsError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const moreController = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    moreController.current?.abort();
    setLoading(true);
    setSuggestionsLoading(true);
    setPosts([]);
    setSuggestions([]);
    setPage(1);
    setPages(0);
    setPostsError('');
    setSuggestionsError('');

    api.explore(1, sort, { signal: controller.signal }).then(result => {
      if (controller.signal.aborted) return;
      setPosts(result.posts);
      setPage(result.pagination.page);
      setPages(result.pagination.pages);
    }).catch(err => {
      if (err.name !== 'AbortError') setPostsError(err.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    api.suggestions({ signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) setSuggestions(result.users);
    }).catch(err => {
      if (err.name !== 'AbortError') setSuggestionsError(err.message);
    }).finally(() => {
      if (!controller.signal.aborted) setSuggestionsLoading(false);
    });

    return () => {
      controller.abort();
      moreController.current?.abort();
    };
  }, [sort, refresh]);

  async function loadMore() {
    if (loadingMore || loading || page >= pages) return;
    const controller = new AbortController();
    moreController.current = controller;
    setLoadingMore(true);
    setPostsError('');
    try {
      const result = await api.explore(page + 1, sort, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setPosts(current => {
        const seen = new Set(current.map(post => String(post.id)));
        return [...current, ...result.posts.filter(post => !seen.has(String(post.id)))];
      });
      setPage(result.pagination.page);
      setPages(result.pagination.pages);
    } catch (err) {
      if (err.name !== 'AbortError') setPostsError(err.message);
    } finally {
      if (moreController.current === controller) {
        moreController.current = null;
        setLoadingMore(false);
      }
    }
  }

  async function follow(username) {
    if (following) return;
    setFollowing(username);
    setSuggestionsError('');
    try {
      await api.follow(username);
      setSuggestions(current => current.filter(user => user.username !== username));
      setRefresh(current => current + 1);
    } catch (err) {
      setSuggestionsError(err.message);
    } finally {
      setFollowing('');
    }
  }

  return <div className="page">
    <header className="page-header"><div><span className="kicker">Discover</span><h1>Explore.</h1><p className="muted">Posts and creators beyond your feed.</p></div></header>
    <section aria-label="Suggested users" style={{ marginBottom: 48 }}>
      <div className="section-heading"><h2>People to follow</h2></div>
      {suggestionsError && <div className="form-error" role="alert">{suggestionsError}</div>}
      {suggestionsLoading ? <div className="screen-state inner">Loading suggestions...</div> : suggestions.length
        ? <div className="post-grid suggestions-grid">{suggestions.map(person => <div className="post-card post-card-body" key={person.id}><Link className="inline-link" to={`/profile/${encodeURIComponent(person.username)}`}>@{person.username}</Link><div style={{ marginTop: 16 }}><button className="primary-button compact" disabled={Boolean(following)} onClick={() => follow(person.username)}>{following === person.username ? 'Following...' : 'Follow'}</button></div></div>)}</div>
        : !suggestionsError && <p className="muted">No new people to suggest right now.</p>}
    </section>
    <section aria-label="Explore posts">
      <div className="section-heading"><h2>Discover posts</h2><div style={{ display: 'flex', gap: 12 }}><button type="button" className={sort === 'newest' ? 'primary-button compact' : 'text-button'} aria-pressed={sort === 'newest'} onClick={() => setSort('newest')}>Newest</button><button type="button" className={sort === 'popular' ? 'primary-button compact' : 'text-button'} aria-pressed={sort === 'popular'} onClick={() => setSort('popular')}>Popular</button></div></div>
      {postsError && <div className="form-error" role="alert">{postsError}</div>}
      {loading ? <div className="screen-state inner">Loading explore posts...</div> : posts.length
        ? <><div className="post-grid">{posts.map(post => <article className="post-card" key={post.id}><Link className="post-image-wrap" to={`/posts/${post.id}`}><img src={post.imageUrl} alt={post.caption} /></Link><div className="post-card-body">{post.user?.username && <Link className="inline-link" to={`/profile/${encodeURIComponent(post.user.username)}`}>@{post.user.username}</Link>}<p className="post-caption">{post.caption}</p><div className="post-meta"><time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString()}</time><span className="card-actions"><LikeButton postId={post.id} likeCount={post.likeCount} isLiked={post.isLiked} /><SaveButton postId={post.id} isSaved={post.isSaved} /></span></div><Comments postId={post.id} initialCount={post.commentCount} /></div></article>)}</div>{page < pages && <div className="pagination"><button disabled={loadingMore} onClick={loadMore}>{loadingMore ? 'Loading...' : 'Load more'}</button></div>}</>
        : !postsError && <div className="empty-state"><h3>No new posts to explore.</h3><p>Check back when more creators share something.</p></div>}
    </section>
  </div>;
}
