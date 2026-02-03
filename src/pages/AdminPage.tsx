import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminVenueCreator } from './AdminVenueCreator';

export function AdminPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const staffProfile = localStorage.getItem('staffProfile');

    if (!token || !staffProfile) {
      navigate('/admin/login');
    }
  }, [navigate]);

  return (
    <div className="page">
      <header className="hero" style={{ minHeight: '200px', marginBottom: '2rem' }}>
        <div>
          <button
            className="ghost"
            onClick={() => navigate('/')}
            style={{ marginBottom: '1rem', padding: '0.5rem 1rem' }}
          >
            ← Back to Events
          </button>
          <button
            className="ghost"
            onClick={() => navigate('/admin/orders')}
            style={{ marginLeft: '0.5rem', padding: '0.5rem 1rem' }}
          >
            View Orders
          </button>
          <p className="eyebrow">Admin Tools</p>
          <h1>Venue & Event Management</h1>
          <p className="lede">
            Create venues from templates, manage seat maps, and configure pricing zones
          </p>
          <button
            className="ghost"
            onClick={() => {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('staffProfile');
              navigate('/admin/login');
            }}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}
          >
            Logout
          </button>
        </div>
      </header>

      <section className="section">
        <AdminVenueCreator />
      </section>
    </div>
  );
}
