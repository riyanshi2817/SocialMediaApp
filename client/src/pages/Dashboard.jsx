import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';

export default function Dashboard() {
  const { user } = useAuth(); const [summary, setSummary] = useState(null); const [posts, setPosts] = useState([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [deletingId, setDeletingId] = useState('');
  async function loadDashboard() { setLoading(true); setError(''); try { const [s, p] = await Promise.all([api.summary(), api.posts({ limit: 3 })]); setSummary(s.summary); setPosts(p.posts); } catch (err) { setError(err.message); } finally { setLoading(false); } }
  useEffect(() => { loadDashboard(); }, []);
  const latest = summary?.latestPostDate ? new Date(summary.latestPostDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) : 'No posts yet';
  async function remove(id) { if (!window.confirm('Delete this caption and its post?')) return; setDeletingId(id); try { await api.deletePost(id); await loadDashboard(); } catch (err) { setError(err.message); } finally { setDeletingId(''); } }
  return <div className="page"><header className="page-header"><div><span className="kicker">Your creative desk</span><h1>Good to see you, {user?.username}.</h1><p className="muted">A quick read on what you’ve been making.</p></div><Link className="primary-button compact" to="/create">Create caption <span>↗</span></Link></header>{error && <div className="form-error">{error}</div>}{loading ? <div className="screen-state inner">Loading your studio...</div> : <><section className="stat-grid"><div className="stat-block accent"><span>Total posts</span><strong>{summary?.totalPosts ?? 0}</strong><small>pieces in your archive</small></div><div className="stat-block"><span>Latest activity</span><strong>{latest}</strong><small>most recent creation</small></div><div className="stat-block"><span>Caption engine</span><strong>Gemini</strong><small>short, social-ready copy</small></div></section><section className="section-heading"><div><span className="kicker">Recent work</span><h2>Your latest captions</h2></div><Link to="/history" className="inline-link">View all →</Link></section>{posts.length ? <div className="post-grid">{posts.map(post => <PostCard key={post.id} post={post} deleting={deletingId === post.id} onDelete={remove} />)}</div> : <div className="empty-state"><span className="empty-icon">＋</span><h3>Your archive starts here.</h3><p>Upload a photo and let the studio find the words.</p><Link className="primary-button compact" to="/create">Make your first caption</Link></div>}</>}</div>;
}
