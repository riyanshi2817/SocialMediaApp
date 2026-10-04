import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function SaveButton({ postId, isSaved = false, onChange }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [saved, setSaved] = useState(isSaved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setSaved(isSaved); }, [postId, isSaved]);

  async function toggle() {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    if (busy) return;

    setBusy(true);
    setError('');
    try {
      const result = await (saved ? api.unsavePost(postId) : api.savePost(postId));
      setSaved(result.isSaved);
      onChange?.(result.isSaved);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button type="button" className="save-button" aria-label={saved ? 'Unsave post' : 'Save post'} aria-pressed={saved} disabled={busy} onClick={toggle}>{saved ? 'Saved' : 'Save'}</button>
    {error && <span className="form-error" role="alert">{error}</span>}
  </>;
}
