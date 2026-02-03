import { useMemo, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { eventApi, seatApi, orderApi, authApi, type Event as APIEvent, type SeatPlanSeat } from '../services/api';
import { useEventWebSocket } from '../hooks/useEventWebSocket';
import { initializeWebSocket, getSessionId } from '../services/websocket';
import type { SeatAvailabilityUpdate, HoldExpired } from '../services/websocket';

type SeatState = 'available' | 'held' | 'sold';
type Seat = SeatPlanSeat;

type Event = {
  id: string;
  title: string;
  date: string;
  venue: string;
  city: string;
  image: string;
  pricing: Record<string, { name: string; price: number }>;
  seatMap: SeatPlanSeat[];
  seatMapSvg?: string;
};

const transformEvent = (apiEvent: APIEvent): Event => {
  return {
    id: apiEvent._id,
    title: apiEvent.title,
    date: new Date(apiEvent.eventDate).toISOString().split('T')[0],
    venue: apiEvent.venueId?.name || 'Unknown Venue',
    city: apiEvent.venueId ? `${apiEvent.venueId.address.city}, ${apiEvent.venueId.address.state}` : 'Unknown',
    image: apiEvent.imageUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1600&q=80',
    pricing: apiEvent.pricingZones,
    seatMap: [],
  };
};

const formatCurrency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export function EventDetailsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [currentHoldId, setCurrentHoldId] = useState<string | null>(null);
  const [currentHoldSeats, setCurrentHoldSeats] = useState<string[]>([]);
  const [holdExpiresAt, setHoldExpiresAt] = useState<Date | null>(null);
  const [holdLoading, setHoldLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [seatPlanLoading, setSeatPlanLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{
    orderNumber: string;
    orderId: string;
    tickets?: Array<{ ticketCode: string; qrCodeUrl: string; seatId: string }>;
  } | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerFirstName, setCustomerFirstName] = useState('');
  const [customerLastName, setCustomerLastName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authFirstName, setAuthFirstName] = useState('');
  const [authLastName, setAuthLastName] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('accessToken'));
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [pendingOrderNumber, setPendingOrderNumber] = useState<string | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    initializeWebSocket();
  }, []);

  // Prefill customer info from saved profile
  useEffect(() => {
    const raw = localStorage.getItem('userProfile');
    if (!raw) return;
    try {
      const profile = JSON.parse(raw);
      setCustomerEmail(profile.email || '');
      setCustomerFirstName(profile.firstName || '');
      setCustomerLastName(profile.lastName || '');
      if (localStorage.getItem('accessToken')) {
        setIsAuthenticated(true);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // Handle real-time seat availability updates
  const handleSeatUpdate = useCallback((update: SeatAvailabilityUpdate) => {
    console.log('🔄 Seat update received:', update);

    setEvent((prevEvent) => {
      if (!prevEvent || prevEvent.id !== update.eventId) return prevEvent;

      const updatedSeatMap = prevEvent.seatMap.map((seat) => {
        const seatUpdate = update.updates.find((u) => u.seatId === seat.id);
        if (seatUpdate) {
          return { ...seat, status: seatUpdate.status };
        }
        return seat;
      });

      return { ...prevEvent, seatMap: updatedSeatMap };
    });
  }, []);

  // Handle hold expiration
  const handleHoldExpired = useCallback((data: HoldExpired) => {
    console.log('⏰ Hold expired:', data);

    setEvent((prevEvent) => {
      if (!prevEvent || prevEvent.id !== data.eventId) return prevEvent;

      const updatedSeatMap = prevEvent.seatMap.map((seat) => {
        if (data.seatIds.includes(seat.id) && seat.status === 'held') {
          return { ...seat, status: 'available' as SeatState };
        }
        return seat;
      });

      return { ...prevEvent, seatMap: updatedSeatMap };
    });

    // Clear selection if any of the expired seats were selected
    setSelected((prev) => {
      const newSelected = new Set(prev);
      data.seatIds.forEach((seatId) => newSelected.delete(seatId));
      return newSelected;
    });

    if (data.eventId === eventId) {
      setCurrentHoldSeats([]);
      setCurrentHoldId(null);
      setHoldExpiresAt(null);
    }
  }, [eventId]);

  // WebSocket hook for real-time updates
  const { connected, viewerCount } = useEventWebSocket({
    eventId: eventId || null,
    autoJoin: true,
    onSeatUpdate: handleSeatUpdate,
    onHoldExpired: handleHoldExpired,
    onHoldExpiringSoon: (data) => {
      console.log('⚠️ Hold expiring soon:', data);
    },
    onViewersUpdate: (data) => {
      console.log('👥 Viewers update:', data.count);
    },
  });

  // Fetch event details
  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      try {
        setLoading(true);
        const response = await eventApi.getEvents();
        const foundEvent = response.data.find((e: APIEvent) => e._id === eventId);

        if (foundEvent) {
          setEvent(transformEvent(foundEvent));
          setError(null);
        } else {
          setError('Event not found');
        }
      } catch (err: any) {
        console.error('Failed to fetch event:', err);
        setError(err.message || 'Failed to load event');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  // Load seat plan when event loads
  useEffect(() => {
    if (!eventId || !event) return;

    let cancelled = false;
    const loadSeatPlan = async () => {
      setSeatPlanLoading(true);
      try {
        const response = await seatApi.getSeatPlan(eventId);
        if (cancelled) return;

        setEvent((prev) =>
          prev
            ? { ...prev, seatMap: response.data.seats, seatMapSvg: response.data.seatMapSvg }
            : null
        );
      } catch (err: any) {
        if (cancelled) return;
        console.error('Failed to load seat plan:', err);
        setError(err.message || 'Failed to load seat map');
      } finally {
        if (!cancelled) setSeatPlanLoading(false);
      }
    };

    loadSeatPlan();

    return () => {
      cancelled = true;
    };
  }, [eventId, event?.id]);

  // Hold seats when user selects them
  const holdSeatsForUser = useCallback(async (seatIds: string[]) => {
    if (!eventId || seatIds.length === 0) return;

    setHoldLoading(true);
    try {
      const sessionId = getSessionId();
      const response = await seatApi.holdSeats(eventId, seatIds, sessionId);

      setCurrentHoldId(response.data.holdId);
      setCurrentHoldSeats(seatIds);
      setHoldExpiresAt(new Date(response.data.expiresAt));

      // Reflect held status locally for immediate UI feedback
      setEvent((prev) =>
        prev
          ? {
              ...prev,
              seatMap: prev.seatMap.map((seat) =>
                seatIds.includes(seat.id) ? { ...seat, status: 'held' as SeatState } : seat
              ),
            }
          : null
      );

      console.log('✅ Seats held:', response.data);
    } catch (error: any) {
      console.error('❌ Failed to hold seats:', error);
      alert(error.response?.data?.message || 'Failed to hold seats. Please try again.');
      // Revert selection on error
      setSelected(new Set());
      setCurrentHoldSeats([]);
      setCurrentHoldId(null);
    } finally {
      setHoldLoading(false);
    }
  }, [eventId]);

  // Release held seats when user deselects
  const releaseHeldSeats = useCallback(async () => {
    if (!currentHoldId) return;

    try {
      const sessionId = getSessionId();
      await seatApi.releaseSeats(currentHoldId, sessionId);

      setEvent((prev) =>
        prev
          ? {
              ...prev,
              seatMap: prev.seatMap.map((seat) =>
                currentHoldSeats.includes(seat.id) ? { ...seat, status: 'available' as SeatState } : seat
              ),
            }
          : null
      );

      setCurrentHoldId(null);
      setCurrentHoldSeats([]);
      setHoldExpiresAt(null);

      console.log('✅ Seats released');
    } catch (error: any) {
      console.error('❌ Failed to release seats:', error);
    }
  }, [currentHoldId, currentHoldSeats]);

  // Toggle seat selection
  const toggleSeat = useCallback(async (seat: Seat) => {
    if (seat.status === 'sold' || seat.status === 'held') return;
    if (holdLoading) return;

    const next = new Set(selected);
    const isAdding = !next.has(seat.id);

    if (isAdding) {
      next.add(seat.id);
    } else {
      next.delete(seat.id);
    }

    setSelected(next);

    // If releasing all seats, call release API
    if (next.size === 0 && currentHoldId) {
      await releaseHeldSeats();
    }
    // If adding new seats, call hold API
    else if (next.size > 0) {
      await holdSeatsForUser(Array.from(next));
    }
  }, [selected, holdLoading, currentHoldId, releaseHeldSeats, holdSeatsForUser]);

  const priceBreakdown = useMemo(() => {
    if (!event) return { subtotal: 0, seats: [] as Array<{ id: string; price: number }> };

    const seatLookup = new Map(event.seatMap.map((s) => [s.id, s]));
    const seats = Array.from(selected).map((seatId) => {
      const seatMeta = seatLookup.get(seatId);
      const zone = seatMeta ? event.pricing[seatMeta.section] : undefined;
      return { id: seatId, price: zone?.price || 0 };
    });

    const subtotal = seats.reduce((sum, seat) => sum + seat.price, 0);
    return { subtotal, seats };
  }, [event, selected]);

  const fees = Math.round(priceBreakdown.subtotal * 0.05);
  const tax = Math.round(priceBreakdown.subtotal * 0.08);
  const total = priceBreakdown.subtotal + fees + tax;

  const ensureAuthenticatedCustomer = useCallback(async (): Promise<boolean> => {
    if (isAuthenticated || localStorage.getItem('accessToken')) return true;
    alert('Please sign in or create an account before checkout.');
    return false;
  }, [isAuthenticated]);

  const handleAuthSubmit = useCallback(async () => {
    setAuthLoading(true);
    try {
      if (authMode === 'login') {
        const res = await authApi.login(authEmail, authPassword);
        const { accessToken, refreshToken, user } = res.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('userProfile', JSON.stringify(user));
        setCustomerEmail(user.email || '');
        setCustomerFirstName(user.firstName || '');
        setCustomerLastName(user.lastName || '');
        setIsAuthenticated(true);
        alert('Logged in successfully');
      } else {
        const firstName = authFirstName || customerFirstName || authEmail.split('@')[0];
        const lastName = authLastName || customerLastName || '';
        const res = await authApi.register({
          email: authEmail,
          password: authPassword,
          firstName,
          lastName,
        });
        const { accessToken, refreshToken } = res.data;
        const profile = {
          email: authEmail,
          firstName,
          lastName,
        };
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('userProfile', JSON.stringify(profile));
        setCustomerEmail(profile.email);
        setCustomerFirstName(profile.firstName);
        setCustomerLastName(profile.lastName);
        setIsAuthenticated(true);
        alert('Account created and logged in');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  }, [authMode, authEmail, authPassword]);

  // Checkout handler
  const handleCheckout = useCallback(async () => {
    if (!eventId || selected.size === 0) return;

    const authed = await ensureAuthenticatedCustomer();
    if (!authed) return;

    // If logged in and fields empty, auto-fill from profile
    const profileRaw = localStorage.getItem('userProfile');
    if (isAuthenticated && profileRaw) {
      try {
        const profile = JSON.parse(profileRaw);
        if (!customerEmail) setCustomerEmail(profile.email || '');
        if (!customerFirstName) setCustomerFirstName(profile.firstName || '');
        if (!customerLastName) setCustomerLastName(profile.lastName || '');
      } catch {
        // ignore parse errors
      }
    }

    setCheckoutLoading(true);
    try {
      const sessionId = getSessionId();

      const response = await orderApi.createCheckoutIntent({
        eventId: eventId,
        seatIds: Array.from(selected),
        customerInfo: {
          email: customerEmail || localStorage.getItem('userProfile') ? JSON.parse(localStorage.getItem('userProfile') || '{}').email : '',
          firstName: customerFirstName || JSON.parse(localStorage.getItem('userProfile') || '{}').firstName || '',
          lastName: customerLastName || JSON.parse(localStorage.getItem('userProfile') || '{}').lastName || '',
        },
        sessionId,
      });

      console.log('✅ Order created:', response.data);

      if (response.data.paymentIntentClientSecret) {
        setPaymentClientSecret(response.data.paymentIntentClientSecret);
        setPendingOrderId(response.data.orderId);
        setPendingOrderNumber(response.data.orderNumber);
      } else {
        // Fallback: finalize immediately if no client secret returned
        await orderApi.finalizeOrder(response.data.orderId);
        const orderDetails = await orderApi.getOrder(response.data.orderId);
        setOrderSuccess({
          orderNumber: response.data.orderNumber,
          orderId: response.data.orderId,
          tickets: orderDetails.data.ticketIds?.map((ticket: any) => ({
            ticketCode: ticket.ticketCode,
            qrCodeUrl: ticket.qrCodeUrl,
            seatId: ticket.seatId,
          })),
        });
        setSelected(new Set());
        setCurrentHoldId(null);
        setHoldExpiresAt(null);
      }
    } catch (error: any) {
      console.error('❌ Checkout failed:', error);
      alert(error.response?.data?.message || 'Checkout failed. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  }, [eventId, selected]);

  const stripePromise = useMemo(() => {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
    return key ? loadStripe(key) : null;
  }, []);

  // Timer for hold expiration
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (!holdExpiresAt) {
      setTimeRemaining('');
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const diff = holdExpiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expired');

        if (currentHoldSeats.length > 0) {
          setEvent((prev) =>
            prev
              ? {
                  ...prev,
                  seatMap: prev.seatMap.map((seat) =>
                    currentHoldSeats.includes(seat.id) ? { ...seat, status: 'available' as SeatState } : seat
                  ),
                }
              : null
          );
        }

        setSelected(new Set());
        setCurrentHoldSeats([]);
        setCurrentHoldId(null);
        setHoldExpiresAt(null);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [holdExpiresAt, currentHoldSeats]);

  if (loading) {
    return (
      <div className="page" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <p className="muted">Loading event...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="page" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <p className="muted" style={{ color: '#ff4444', marginBottom: '1rem' }}>
          {error || 'Event not found'}
        </p>
        <button className="primary" onClick={() => navigate('/')}>
          Back to Events
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Event Header */}
      <header className="hero" style={{ minHeight: '300px', marginBottom: '2rem' }}>
        <div>
          <button
            className="ghost"
            onClick={() => navigate('/')}
            style={{ marginBottom: '1rem', padding: '0.5rem 1rem' }}
          >
            ← Back to Events
          </button>
          <p className="eyebrow">{event.city}</p>
          <h1>{event.title}</h1>
          <p className="lede">{event.date} · {event.venue}</p>
        </div>
      </header>

      <section className="section two-col">
        <div>
          <div className="section-head">
            <div>
              <p className="eyebrow">Seat map</p>
              <h2>Select seats</h2>
              <p className="muted small" style={{ marginTop: '0.5rem' }}>
                <span style={{ color: connected ? '#4ade80' : '#ef4444' }}>●</span>{' '}
                {connected ? 'Live updates active' : 'Connecting...'}
                {connected && viewerCount > 0 && ` · ${viewerCount} viewing`}
              </p>
            </div>
            <div className="legend">
              <span>
                <span className="dot available" /> Available
              </span>
              <span>
                <span className="dot held" /> Held
              </span>
              <span>
                <span className="dot sold" /> Sold
              </span>
              <span>
                <span className="dot selected" /> Yours
              </span>
            </div>
          </div>
          <div className="seat-grid">
            {seatPlanLoading ? (
              <p className="muted" style={{ textAlign: 'center', width: '100%' }}>
                Loading seat map...
              </p>
            ) : event.seatMap && event.seatMap.length > 0 ? (
              event.seatMap.map((seat) => {
                const isSelected = selected.has(seat.id);
                return (
                  <button
                    key={seat.id}
                    className={`seat ${seat.status} ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleSeat(seat)}
                    aria-label={seat.id}
                  >
                    {seat.seat || seat.id.split('-').at(-1)}
                  </button>
                );
              })
            ) : (
              <p className="muted" style={{ textAlign: 'center', width: '100%' }}>
                No seat map available for this event.
              </p>
            )}
          </div>
          {event.seatMapSvg && (
            <div className="svg-panel" dangerouslySetInnerHTML={{ __html: event.seatMapSvg }} />
          )}
        </div>

        <div>
          <div className="section-head">
            <div>
              <p className="eyebrow">Checkout</p>
              <h2>Order summary</h2>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-row">
              <span>Seats</span>
              <span>{selected.size}</span>
            </div>
            <div className="summary-row input">
              <span>Your email</span>
              <input
                className="summary-input"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="summary-row input">
              <span>First name</span>
              <input
                className="summary-input"
                type="text"
                value={customerFirstName}
                onChange={(e) => setCustomerFirstName(e.target.value)}
                placeholder="Jane"
              />
            </div>
            <div className="summary-row input">
              <span>Last name</span>
              <input
                className="summary-input"
                type="text"
                value={customerLastName}
                onChange={(e) => setCustomerLastName(e.target.value)}
                placeholder="Doe"
              />
            </div>
            <div className="summary-list">
              {priceBreakdown.seats.map((seat) => (
                <div key={seat.id} className="summary-row">
                  <span>{seat.id}</span>
                  <span>{formatCurrency(seat.price)}</span>
                </div>
              ))}
            </div>
            <div className="summary-row">
              <span>Fees</span>
              <span>{formatCurrency(fees)}</span>
            </div>
            <div className="summary-row">
              <span>Tax</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
            {timeRemaining && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  background: '#fef3c7',
                  borderRadius: '8px',
                  color: '#92400e',
                  fontWeight: 500,
                }}
              >
                ⏰ Seats held for {timeRemaining}
              </div>
            )}
            <button
              className="primary full"
              type="button"
              disabled={selected.size === 0 || holdLoading || checkoutLoading}
              onClick={handleCheckout}
            >
              {checkoutLoading ? 'Processing...' : holdLoading ? 'Holding seats...' : 'Continue to payment'}
            </button>
          <p className="muted small">
            Stripe card payment • Holds expire after 10 minutes • QR delivered instantly after success.
          </p>
          {isAuthenticated && (
            <button
              className="ghost"
              style={{ width: '100%' }}
              onClick={() => {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('userProfile');
                setIsAuthenticated(false);
              }}
            >
              Logout
            </button>
          )}
          {isAuthenticated && (
            <button
              className="ghost"
              style={{ width: '100%', marginTop: '0.5rem' }}
              onClick={() => navigate('/orders')}
            >
              View my orders
            </button>
          )}
          {!isAuthenticated && (
            <div className="auth-card" style={{ marginTop: '1rem' }}>
              <p className="eyebrow" style={{ marginBottom: '0.5rem' }}>
                Sign in to continue
              </p>
                <div className="summary-row input">
                  <span>Email</span>
                  <input
                    className="summary-input"
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="summary-row input">
                  <span>Password</span>
                  <input
                    className="summary-input"
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                {authMode === 'register' && (
                  <>
                    <div className="summary-row input">
                      <span>First name</span>
                      <input
                        className="summary-input"
                        type="text"
                        value={authFirstName}
                        onChange={(e) => setAuthFirstName(e.target.value)}
                        placeholder="First name"
                      />
                    </div>
                    <div className="summary-row input">
                      <span>Last name</span>
                      <input
                        className="summary-input"
                        type="text"
                        value={authLastName}
                        onChange={(e) => setAuthLastName(e.target.value)}
                        placeholder="Last name"
                      />
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    className={authMode === 'login' ? 'primary' : 'ghost'}
                    type="button"
                    onClick={() => setAuthMode('login')}
                  >
                    Login
                  </button>
                  <button
                    className={authMode === 'register' ? 'primary' : 'ghost'}
                    type="button"
                    onClick={() => setAuthMode('register')}
                  >
                    Sign up
                  </button>
                  <button
                    className="primary"
                    type="button"
                    disabled={authLoading}
                    onClick={() => {
                      if (authMode !== 'register') setAuthMode('register');
                      handleAuthSubmit();
                    }}
                  >
                    {authLoading ? 'Saving...' : authMode === 'login' ? 'Login' : 'Create account'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stripe Payment Modal */}
      {paymentClientSecret && stripePromise && (
        <Elements
          stripe={stripePromise}
          options={{ clientSecret: paymentClientSecret }}
          key={paymentClientSecret}
        >
          <PaymentModal
            onClose={() => {
              setPaymentClientSecret(null);
              setPendingOrderId(null);
              setPendingOrderNumber(null);
            }}
            orderId={pendingOrderId}
            orderNumber={pendingOrderNumber}
            onSuccess={async (orderDetails) => {
              setOrderSuccess({
                orderNumber: orderDetails.orderNumber || pendingOrderNumber || '',
                orderId: orderDetails._id || pendingOrderId || '',
                tickets: orderDetails.ticketIds?.map((ticket: any) => ({
                  ticketCode: ticket.ticketCode,
                  qrCodeUrl: ticket.qrCodeUrl,
                  seatId: ticket.seatId,
                })),
              });
              setSelected(new Set());
              setCurrentHoldId(null);
              setHoldExpiresAt(null);
              setPaymentClientSecret(null);
              setPendingOrderId(null);
              setPendingOrderNumber(null);
            }}
          />
        </Elements>
      )}

      {/* Success Modal */}
      {orderSuccess && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setOrderSuccess(null)}
        >
          <div
            style={{
              background: '#0d1118',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '520px',
              textAlign: 'center',
              color: '#e8ecf3',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '64px', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ marginBottom: '1rem', color: '#f6f8fc' }}>Order Successful!</h2>
            <p className="muted" style={{ marginBottom: '1.5rem' }}>
              Your tickets have been generated and are ready for the event.
            </p>
            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                padding: '1rem',
                borderRadius: '12px',
                marginBottom: '1.5rem',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <p className="muted small">Order Number</p>
              <p
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  marginTop: '0.35rem',
                  color: '#bff0ff',
                }}
              >
                {orderSuccess.orderNumber}
              </p>
            </div>

            {orderSuccess.tickets && orderSuccess.tickets.length > 0 && (
              <div style={{ marginBottom: '1.5rem', maxHeight: '400px', overflowY: 'auto' }}>
                <p className="muted small" style={{ marginBottom: '1rem', textAlign: 'left' }}>
                  Your Tickets ({orderSuccess.tickets.length})
                </p>
                {orderSuccess.tickets.map((ticket) => (
                  <div
                    key={ticket.ticketCode}
                    style={{
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px',
                      padding: '1rem',
                      marginBottom: '0.75rem',
                      textAlign: 'center',
                      background: 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <p className="muted small">Seat: {ticket.seatId}</p>
                    {ticket.qrCodeUrl && (
                      <img
                        src={ticket.qrCodeUrl}
                        alt={`QR Code for ${ticket.seatId}`}
                        style={{
                          width: '200px',
                          height: '200px',
                          margin: '0.5rem auto',
                          display: 'block',
                        }}
                      />
                    )}
                    <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#6b7280' }}>
                      {ticket.ticketCode}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <p className="muted small" style={{ marginBottom: '1.5rem' }}>
              {orderSuccess.tickets && orderSuccess.tickets.length > 0
                ? 'Save these QR codes or check your email. Show them at the venue entrance for scanning.'
                : 'Check your email for ticket QR codes. Show them at the venue entrance for scanning.'}
            </p>
            <button className="primary full" onClick={() => navigate('/')}>
              Back to Events
            </button>
            {isAuthenticated && (
              <button
                className="ghost"
                style={{ marginTop: '0.75rem', width: '100%' }}
                onClick={() => navigate('/orders')}
              >
                View my orders
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Stripe Payment modal component
const PaymentModal = ({
  orderId,
  orderNumber,
  onSuccess,
  onClose,
}: {
  orderId: string | null;
  orderNumber: string | null;
  onSuccess: (orderDetails: any) => void;
  onClose: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const confirmPayment = async () => {
    if (!stripe || !elements || !orderId) return;
    setLoading(true);
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (result.error) {
        alert(result.error.message || 'Payment failed. Please try again.');
        setLoading(false);
        return;
      }

      const finalize = await orderApi.finalizeOrder(orderId);
      const orderDetails = await orderApi.getOrder(orderId);
      onSuccess(orderDetails.data || finalize.data);
    } catch (err: any) {
      alert(err.message || 'Payment confirmation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0d1118',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px',
          padding: '1.25rem',
          width: 'min(480px, 100%)',
          color: '#e8ecf3',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#f6f8fc' }}>
          Enter payment details
        </h3>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '10px' }}>
          <PaymentElement />
        </div>
        <div className="summary-row" style={{ marginTop: '0.5rem' }}>
          <span>Order</span>
          <span>{orderNumber || orderId}</span>
        </div>
        <button
          className="primary full"
          type="button"
          style={{ marginTop: '1rem' }}
          disabled={loading}
          onClick={confirmPayment}
        >
          {loading ? 'Processing payment...' : 'Confirm and pay'}
        </button>
        <button
          className="ghost"
          type="button"
          style={{ marginTop: '0.5rem', width: '100%' }}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
