import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import LikeButton from '../components/LikeButton';

export default function PublicProfile() {
  const { username } = useParams();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const view = ['followers', 'following'].includes(params.get('view')) ? params.get('view') : 'posts';
  const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1);
  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const profilePath = `/profile/${encodeURIComponent(username)}`;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setProfile(null);
    setItems([]);
    setIsFollowing(false);
    const requests = [
      api.profile(username, view === 'posts' ? page : 1),
      view !== 'posts' ? api.connections(username, view, page) : Promise.resolve(null),
      user && user.username !== username ? api.followState(username) : Promise.resolve(null)
    ];

    Promise.all(requests).then(([result, connections, followState]) => {
      if (!active) return;
      setProfile(result.profile);
      setItems(view === 'posts' ? result.posts : connections.users);
      setPagination(view === 'posts' ? result.pagination : connections.pagination);
      setIsFollowing(Boolean(followState?.isFollowing));
    }).catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [username, view, page, user?.id, user?.username]);

  async function toggleFollow() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = isFollowing ? await api.unfollow(username) : await api.follow(username);
      setIsFollowing(result.isFollowing);
      const updated = await api.profile(username);
      setProfile(updated.profile);
      if (view === 'followers') {
        const connections = await api.connections(username, view, page);
        setItems(connections.users);
        setPagination(connections.pagination);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="screen-state inner">Loading profile...</div>;
  if (!profile) return <div className="page"><div className="empty-state"><h1>Profile unavailable.</h1><p>{error}</p></div></div>;

  const pageLink = next => `${profilePath}?${view === 'posts' ? '' : `view=${view}&`}page=${next}`;
  return <div className="page">
    <header className="page-header">
      <div><span className="kicker">Public profile</span><h1>@{profile.username}</h1><p className="muted">Posts and people connected to this creator.</p></div>
      {user && user.username !== profile.username
        ? <button className="primary-button compact" disabled={busy} onClick={toggleFollow}>{busy ? 'Updating...' : isFollowing ? 'Unfollow' : 'Follow'}</button>
        : !user && <Link className="primary-button compact" to="/login">Sign in to follow</Link>}
    </header>
    <nav aria-label="Profile sections" className="stat-grid profile-stats">
      <Link className="stat-block" to={profilePath}><span>Posts</span><strong>{profile.postCount}</strong></Link>
      <Link className="stat-block" to={`${profilePath}?view=followers`}><span>Followers</span><strong>{profile.followerCount}</strong></Link>
      <Link className="stat-block" to={`${profilePath}?view=following`}><span>Following</span><strong>{profile.followingCount}</strong></Link>
    </nav>
    {error && <div className="form-error" role="alert">{error}</div>}
    <h2>{view === 'posts' ? 'Posts' : view === 'followers' ? 'Followers' : 'Following'}</h2>
    {items.length ? view === 'posts'
      ? <div className="post-grid">{items.map(post => <article className="post-card" key={post.id}><Link to={`/posts/${post.id}`} className="post-image-wrap"><img src={post.imageUrl} alt={post.caption} /></Link><div className="post-card-body"><span className="tag">{post.style || 'creative'}</span><p className="post-caption">{post.caption}</p><div className="post-meta"><time>{new Date(post.createdAt).toLocaleDateString()}</time><span className="card-actions"><LikeButton postId={post.id} likeCount={post.likeCount} isLiked={post.isLiked} /></span></div></div></article>)}</div>
      : <ul className="post-grid" style={{ listStyle: 'none', padding: 0 }}>{items.map(person => <li className="post-card post-card-body" key={person.id}><Link className="inline-link" to={`/profile/${encodeURIComponent(person.username)}`}>@{person.username}</Link></li>)}</ul>
      : <div className="empty-state"><h3>{view === 'posts' ? 'No posts yet.' : `No ${view} yet.`}</h3></div>}
    {pagination.pages > 1 && <div className="pagination">{page > 1 ? <Link to={pageLink(page - 1)}>Previous</Link> : <span>Previous</span>}<span>Page {pagination.page} of {pagination.pages}</span>{page < pagination.pages ? <Link to={pageLink(page + 1)}>Next</Link> : <span>Next</span>}</div>}
  </div>;
}
