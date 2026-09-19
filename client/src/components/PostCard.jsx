import { Link } from 'react-router-dom';

export default function PostCard({ post, onDelete, deleting = false }) {
  const date = new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <article className="post-card">
      <Link to={`/posts/${post.id}`} className="post-image-wrap"><img src={post.imageUrl} alt={post.caption} /></Link>
      <div className="post-card-body">
        <span className="tag">{post.style || 'creative'}</span>
        <p className="post-caption">{post.caption}</p>
        <div className="post-meta"><time>{date}</time><div className="card-actions"><Link to={`/posts/${post.id}`}>Open</Link><button disabled={deleting} onClick={() => onDelete?.(post.id)}>{deleting ? 'Deleting...' : 'Delete'}</button></div></div>
      </div>
    </article>
  );
}
