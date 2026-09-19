import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { Login, Register } from './pages/AuthPages';
import Dashboard from './pages/Dashboard';
import CreatePost from './pages/CreatePost';
import History from './pages/History';
import PostDetails, { EditPost } from './pages/PostPages';

function NotFound() {
  return <div className="page not-found"><span className="kicker">404 / Lost frame</span><h1>That page went<br /><em>out of focus.</em></h1><p className="muted">The address does not point to anything in your studio.</p><a className="primary-button compact" href="/">Back to overview →</a></div>;
}

export default function App() {
  return <BrowserRouter><Routes><Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} /><Route element={<ProtectedRoute />}><Route element={<Layout />}><Route path="/" element={<Dashboard />} /><Route path="/create" element={<CreatePost />} /><Route path="/history" element={<History />} /><Route path="/posts/:id" element={<PostDetails />} /><Route path="/posts/:id/edit" element={<EditPost />} /></Route></Route><Route path="*" element={<NotFound />} /></Routes></BrowserRouter>;
}
