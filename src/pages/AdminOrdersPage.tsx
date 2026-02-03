import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderApi } from '../services/api';

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const staffProfile = localStorage.getItem('staffProfile');
    if (!staffProfile) {
      setError('Please login as admin/staff to view orders.');
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await orderApi.listAllOrders();
        setOrders(res.data);
      } catch (err: any) {
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          setError('Please login as admin/staff to view orders.');
        } else {
          setError(err.response?.data?.message || 'Failed to load orders');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  return (
    <div className="page">
      <header className="hero" style={{ minHeight: '200px', marginBottom: '2rem' }}>
        <div>
          <p className="eyebrow">Admin</p>
          <h1>All Orders</h1>
          <p className="lede">Monitor purchases, seats, and payment status.</p>
        </div>
      </header>

      {loading && <p className="muted">Loading orders...</p>}
      {error && (
        <p className="muted" style={{ color: '#ff6666' }}>
          {error}
        </p>
      )}
      {error && (
        <button className="primary" style={{ marginBottom: '1rem' }} onClick={() => navigate('/admin/login')}>
          Go to Admin Login
        </button>
      )}

      <div className="summary-card">
        {orders.length === 0 && !loading ? (
          <p className="muted">No orders yet.</p>
        ) : (
          orders.map((order) => (
            <div
              key={order._id}
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                paddingBottom: '12px',
                marginBottom: '12px',
              }}
            >
              <div className="summary-row">
                <span>Order</span>
                <span>{order.orderNumber}</span>
              </div>
              <div className="summary-row">
                <span>Date</span>
                <span>{new Date(order.createdAt).toLocaleString()}</span>
              </div>
              <div className="summary-row">
                <span>Customer</span>
                <span>{order.customerInfo?.email || order.guestEmail || 'Guest'}</span>
              </div>
              <div className="summary-row">
                <span>Seats</span>
                <span>{order.seatIds.join(', ')}</span>
              </div>
              <div className="summary-row">
                <span>Total</span>
                <span>${order.breakdown?.total?.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Status</span>
                <span>{order.paymentStatus}</span>
              </div>
              {order.ticketIds?.length > 0 && (
                <div className="summary-row input">
                  <span>Tickets</span>
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {order.ticketIds.map((t: any) => (
                      <span key={t._id || t.ticketCode} className="muted small">
                        {t.seatId} · {t.ticketCode}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
