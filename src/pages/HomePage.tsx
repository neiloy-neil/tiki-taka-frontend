import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventApi, type Event as APIEvent } from '../services/api';

type Event = {
  id: string;
  title: string;
  date: string;
  venue: string;
  city: string;
  image: string;
};

const transformEvent = (apiEvent: APIEvent): Event => {
  return {
    id: apiEvent._id,
    title: apiEvent.title,
    date: new Date(apiEvent.eventDate).toISOString().split('T')[0],
    venue: apiEvent.venueId?.name || 'Unknown Venue',
    city: apiEvent.venueId ? `${apiEvent.venueId.address.city}, ${apiEvent.venueId.address.state}` : 'Unknown',
    image: apiEvent.imageUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1600&q=80',
  };
};

export function HomePage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await eventApi.getEvents();
        const transformedEvents = response.data.map(transformEvent);
        setEvents(transformedEvents);
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch events:', err);
        setError(err.message || 'Failed to load events');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Tiki-Taka · Modern Ticketing</p>
          <h1>Find seats, pay, and walk in with secure QR tickets.</h1>
          <p className="lede">
            Real-time availability, seat-level pricing, Stripe checkout, and staff QR validation—all in
            one MVP stack.
          </p>
          <div className="cta-row">
            <button className="primary">Browse Events</button>
            <button className="ghost" onClick={() => navigate('/admin')}>See Admin Tools</button>
          </div>
          <div className="pill-row">
            <span>Real seat selection</span>
            <span>Seat holds w/ expiry</span>
            <span>Stripe payments</span>
            <span>QR validation</span>
          </div>
        </div>
        <div className="glass">
          <p className="muted">Live occupancy</p>
          <div className="stat-grid">
            <div>
              <p className="stat-value">12,480</p>
              <p className="muted">Seats tracked</p>
            </div>
            <div>
              <p className="stat-value">98.2%</p>
              <p className="muted">Ticket scan pass</p>
            </div>
            <div>
              <p className="stat-value">0</p>
              <p className="muted">Double-book errors</p>
            </div>
          </div>
        </div>
      </header>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Events</p>
            <h2>Featured shows and matches</h2>
          </div>
          <div className="filters">
            <button>All</button>
            <button>Concerts</button>
            <button>Sports</button>
          </div>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p className="muted">Loading events...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p className="muted" style={{ color: '#ff4444' }}>Error: {error}</p>
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p className="muted">No events available</p>
          </div>
        ) : (
          <div className="card-grid">
            {events.map((evt) => (
              <button
                key={evt.id}
                className="event-card"
                onClick={() => navigate(`/event/${evt.id}`)}
              >
                <div className="event-image" style={{ backgroundImage: `url(${evt.image})` }} />
                <div className="event-body">
                  <p className="eyebrow">{evt.city}</p>
                  <h3>{evt.title}</h3>
                  <p className="muted">{evt.date} · {evt.venue}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="section admin">
        <div>
          <p className="eyebrow">Admin & scanning</p>
          <h2>Venue uploads, pricing zones, and secure QR validation</h2>
          <p className="muted">
            Upload SVG seat maps, parse seat IDs, set pricing zones, publish events, and manage holds in
            real time. Staff log in to the scanning app, pick an assigned event, and validate QR codes
            with millisecond feedback.
          </p>
          <div className="pill-row">
            <span>SVG parsing</span>
            <span>Seat-level pricing</span>
            <span>Redis seat holds</span>
            <span>Scan logs</span>
          </div>
        </div>
        <div className="glass">
          <p className="muted">Scanner statuses</p>
          <div className="scan-grid">
            <div className="scan-card success">
              <p className="muted">VALID</p>
              <p className="stat-value">TKT_7f3b...c2a8</p>
              <p className="muted">Seat SEC_A-R3-S12</p>
            </div>
            <div className="scan-card error">
              <p className="muted">ALREADY USED</p>
              <p className="stat-value">TKT_f12c...0aa1</p>
              <p className="muted">First scan wins</p>
            </div>
            <div className="scan-card warning">
              <p className="muted">WRONG EVENT</p>
              <p className="stat-value">TKT_9a8b...2f31</p>
              <p className="muted">Different door</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
