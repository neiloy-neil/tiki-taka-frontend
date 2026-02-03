import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { staffAuthApi } from '../services/api';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await staffAuthApi.login(email, password);
      const { accessToken, refreshToken, staff } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('staffProfile', JSON.stringify(staff));

      navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <form className="card" style={{ maxWidth: 420, width: '100%', padding: '2rem' }} onSubmit={handleSubmit}>
        <button
          type="button"
          className="ghost"
          onClick={() => navigate('/')}
          style={{ marginBottom: '1rem', padding: '0.5rem 1rem' }}
        >
          ← Back to Events
        </button>
        <p className="eyebrow">Admin</p>
        <h1 style={{ margin: '0 0 0.5rem' }}>Sign in</h1>
        <p className="lede" style={{ marginBottom: '1.5rem' }}>
          Use your staff or admin credentials to access venue and event management tools.
        </p>

        {error && (
          <div className="error" style={{ marginBottom: '1rem', color: '#b00020' }}>
            {error}
          </div>
        )}

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            required
          />
        </label>

        <label className="field" style={{ marginTop: '1rem' }}>
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </label>

        <button className="primary" type="submit" disabled={loading} style={{ marginTop: '1.5rem' }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
