import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function LikeButton({ postId, likeCount = 0, isLiked = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [count, setCount] = useState(likeCount);
  const [liked, setLiked] = useState(isLiked);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setCount(likeCount);
    setLiked(isLiked);
  }, [postId, likeCount, isLiked]);

  async function toggle() {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    if (busy) return;

    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount(Math.max(0, count + (nextLiked ? 1 : -1)));
    setError('');
    setBusy(true);
    try {
      const result = await (nextLiked ? api.likePost(postId) : api.unlikePost(postId));
      setCount(result.likeCount);
      setLiked(result.isLiked);
    } catch (err) {
      setCount(count);
      setLiked(liked);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button type="button" className="like-button" aria-label={liked ? 'Unlike post' : 'Like post'} aria-pressed={liked} disabled={busy} onClick={toggle}>{liked ? '♥' : '♡'} {count}</button>
    {error && <span className="form-error" role="alert">{error}</span>}
  </>;
}
