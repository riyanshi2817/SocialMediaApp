import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import LikeButton from '../components/LikeButton';
import SaveButton from '../components/SaveButton';
import Comments from '../components/Comments';

export default function PostDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setPost(null);
    setError('');
    api.post(id).then(result => { if (active) setPost(result.post); })
      .catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [id]);

  if (error) return <div className="page"><Link to="/feed" className="quiet-link">Back to feed</Link><div className="empty-state"><h3>Couldn’t open this post.</h3><p>{error}</p></div></div>;
  if (!post) return <div className="screen-state">Loading post...</div>;

  const isOwner = String(post.user?.id) === String(user?.id);
  return <div className="page">
    <Link to={isOwner ? '/history' : '/feed'} className="quiet-link">{isOwner ? 'Back to archive' : 'Back to feed'}</Link>
    <div className="detail-layout">
      <img className="detail-image" src={post.imageUrl} alt={post.caption} />
      <div className="detail-copy">
        <span className="tag">{post.style || 'creative'}</span>
        <h1>{post.caption}</h1>
        {post.user?.username && <p><Link className="inline-link" to={`/profile/${encodeURIComponent(post.user.username)}`}>@{post.user.username}</Link></p>}
        <p className="muted">Created {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        <div className="card-actions"><LikeButton postId={post.id} likeCount={post.likeCount} isLiked={post.isLiked} /><SaveButton postId={post.id} isSaved={post.isSaved} /></div>
        <Comments postId={post.id} initialCount={post.commentCount} initiallyOpen />
        {isOwner && <Link className="primary-button compact" to={`/posts/${id}/edit`}>Edit caption →</Link>}
      </div>
    </div>
  </div>;
}

export function EditPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setBusy(true);
    setCaption('');
    setError('');
    api.post(id).then(result => { if (active) setCaption(result.post.caption); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [id]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.updatePost(id, { caption });
      navigate(`/posts/${id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (busy && !caption) return <div className="screen-state">Loading editor...</div>;
  if (error && !caption) return <div className="page"><Link to="/history" className="quiet-link">Back to archive</Link><div className="empty-state"><h3>Couldn’t open the editor.</h3><p>{error}</p></div></div>;
  return <div className="page narrow-page"><Link to={`/posts/${id}`} className="quiet-link">← Back to post</Link><div className="editor-panel"><span className="kicker">Refine the words</span><h1>Edit caption.</h1><p className="muted">The image stays exactly as it is.</p><form onSubmit={submit} className="form-stack"><label>Caption<textarea maxLength="500" rows="5" value={caption} onChange={e => setCaption(e.target.value)} /></label>{error && <div className="form-error">{error}</div>}<button className="primary-button" disabled={busy || !caption.trim()}>{busy ? 'Saving...' : 'Save caption →'}</button></form></div></div>;
}
