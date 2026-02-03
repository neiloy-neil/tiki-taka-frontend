'use client';

import { useState, useEffect } from 'react';
import { eventApi, orderApi } from '../../services/api';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from '../../hooks/useAuth';

interface Event {
  _id: string;
  title: string;
  description: string;
  eventDate: string;
  venueId: {
    name: string;
    address: {
      street: string;
      city: string;
      state: string;
    };
  };
  pricingZones: Record<string, { 
    name: string; 
    price: number; 
    currency: string;
    available: number;
  }>;
}

interface TicketSelectionFormProps {
  eventId: string | undefined;
  ticketType: string | undefined;
}

export function TicketSelectionForm({ eventId, ticketType }: TicketSelectionFormProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
  const [customerInfo, setCustomerInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
  });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  useEffect(() => {
    if (ticketType && event) {
      // Pre-select the ticket type from URL
      setSelectedTickets({ [ticketType]: 1 });
    }
  }, [ticketType, event]);

  const loadEvent = async () => {
    if (!eventId) return;
    
    try {
      setLoading(true);
      const response = await eventApi.getEvent(eventId);
      setEvent(response.data);
    } catch (err) {
      setError('Failed to load event details');
      console.error('Error loading event:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTicketChange = (ticketType: string, quantity: number) => {
    setSelectedTickets(prev => ({
      ...prev,
      [ticketType]: Math.max(0, quantity)
    }));
  };

  const getTotalTickets = () => {
    return Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalPrice = () => {
    if (!event) return 0;
    
    return Object.entries(selectedTickets).reduce((total, [type, quantity]) => {
      const price = event.pricingZones[type]?.price || 0;
      return total + (price * quantity);
    }, 0);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !eventId) return;

    if (getTotalTickets() === 0) {
      setError('Please select at least one ticket');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // Prepare ticket data
      const ticketData = Object.entries(selectedTickets)
        .filter(([, quantity]) => quantity > 0)
        .map(([type, quantity]) => ({
          type,
          quantity
        }));

      // Create checkout session
      const response = await orderApi.createCheckoutIntent({
        eventId,
        tickets: ticketData,
        customerInfo
      });

      // Initialize Stripe
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      
      if (!stripe) {
        throw new Error('Failed to initialize Stripe');
      }

      // Redirect to Stripe checkout
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: response.data.paymentIntentClientSecret
      });

      if (stripeError) {
        throw new Error(stripeError.message || 'Stripe checkout failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Checkout failed';
      setError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (!event || !eventId) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Event Not Found</h3>
        <p className="text-gray-500">The requested event could not be found.</p>
      </div>
    );
  }

  const totalTickets = getTotalTickets();
  const totalPrice = getTotalPrice();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Ticket Selection Form */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Tickets</h2>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleCheckout} className="space-y-6">
            {/* Ticket Types */}
            <div className="space-y-4">
              {Object.entries(event.pricingZones).map(([type, zone]) => {
                const selectedQuantity = selectedTickets[type] || 0;
                const maxAvailable = zone.available;
                
                return (
                  <div key={type} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="mb-4 sm:mb-0">
                        <h3 className="text-lg font-semibold text-gray-900">{zone.name}</h3>
                        <div className="text-2xl font-bold text-primary-600 mt-1">
                          ${zone.price.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {maxAvailable} tickets available
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() => handleTicketChange(type, selectedQuantity - 1)}
                          disabled={selectedQuantity <= 0}
                          className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          -
                        </button>
                        
                        <span className="w-12 text-center font-medium">
                          {selectedQuantity}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => handleTicketChange(type, selectedQuantity + 1)}
                          disabled={selectedQuantity >= maxAvailable}
                          className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Customer Information */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    required
                    value={customerInfo.firstName}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    required
                    value={customerInfo.lastName}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    value={customerInfo.phoneNumber}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Checkout Button */}
            <div className="border-t border-gray-200 pt-6">
              <button
                type="submit"
                disabled={processing || totalTickets === 0}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  `Proceed to Payment ($${totalPrice.toFixed(2)})`
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Order Summary */}
      <div>
        <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900">{event.title}</h4>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(event.eventDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p className="text-sm text-gray-500">
                {event.venueId.name}, {event.venueId.address.city}
              </p>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Tickets:</span>
                <span className="font-medium">{totalTickets}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="text-xl font-bold text-primary-600">${totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <div className="text-sm text-gray-500">
              <p className="mb-2">🔒 Secure checkout powered by Stripe</p>
              <p>Your payment details are encrypted and securely processed.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}