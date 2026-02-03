'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { eventApi, ticketApi, checkoutApi } from '@/services/api';
import { Event, TicketType } from '@/types';

export default function CheckoutPage() {
  const { eventId } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [eventRes, ticketsRes] = await Promise.all([
          eventApi.getEvent(eventId as string),
          ticketApi.getTickets(eventId as string)
        ]);
        
        setEvent(eventRes.data);
        setTicketTypes(ticketsRes.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load event data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId, user, router]);

  const handleTicketQuantityChange = (ticketTypeId: string, quantity: number) => {
    if (quantity < 0) return;
    
    const ticketType = ticketTypes.find(t => t._id === ticketTypeId);
    if (ticketType && quantity <= ticketType.availableQuantity) {
      setSelectedTickets(prev => ({
        ...prev,
        [ticketTypeId]: quantity
      }));
    }
  };

  const getTotalAmount = () => {
    return Object.entries(selectedTickets).reduce((total, [ticketTypeId, quantity]) => {
      const ticketType = ticketTypes.find(t => t._id === ticketTypeId);
      return total + (ticketType?.price || 0) * quantity;
    }, 0);
  };

  const getSelectedTicketCount = () => {
    return Object.values(selectedTickets).reduce((sum, count) => sum + count, 0);
  };

  const handleCheckout = async () => {
    if (getSelectedTicketCount() === 0) {
      setError('Please select at least one ticket');
      return;
    }

    try {
      setProcessing(true);
      setError('');

      // Prepare line items for checkout
      const lineItems = Object.entries(selectedTickets)
        .filter(([_, quantity]) => quantity > 0)
        .map(([ticketTypeId, quantity]) => {
          const ticketType = ticketTypes.find(t => t._id === ticketTypeId);
          return {
            ticketTypeId,
            quantity,
            price: ticketType?.price || 0,
            name: `${event?.title} - ${ticketType?.name}`
          };
        });

      const response = await checkoutApi.createSession({
        eventId: eventId as string,
        lineItems
      });

      // Redirect to Stripe checkout
      window.location.href = response.data.url;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create checkout session');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h1>
          <button
            onClick={() => router.push('/events')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Events
          </button>
        </div>
      </div>
    );
  }

  const totalAmount = getTotalAmount();
  const selectedCount = getSelectedTicketCount();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-600">Complete your purchase for {event.title}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Ticket Selection */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Select Tickets</h2>
            
            {ticketTypes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No tickets available for this event</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ticketTypes.map((ticketType) => {
                  const selectedQuantity = selectedTickets[ticketType._id] || 0;
                  const isSoldOut = ticketType.availableQuantity === 0;
                  
                  return (
                    <div key={ticketType._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{ticketType.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{ticketType.description}</p>
                          <div className="flex items-center mt-2 space-x-4">
                            <span className="text-lg font-bold text-blue-600">
                              ${ticketType.price.toFixed(2)}
                            </span>
                            <span className="text-sm text-gray-500">
                              {ticketType.availableQuantity} available
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleTicketQuantityChange(ticketType._id, selectedQuantity - 1)}
                            disabled={selectedQuantity === 0}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            -
                          </button>
                          
                          <span className="w-12 text-center font-medium">
                            {selectedQuantity}
                          </span>
                          
                          <button
                            onClick={() => handleTicketQuantityChange(ticketType._id, selectedQuantity + 1)}
                            disabled={isSoldOut || selectedQuantity >= ticketType.availableQuantity}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      {isSoldOut && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Sold Out
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-xl shadow-sm p-6 h-fit">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Event</span>
                <span className="font-medium text-gray-900">{event.title}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Date</span>
                <span className="font-medium text-gray-900">
                  {new Date(event.startDate).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Location</span>
                <span className="font-medium text-gray-900">{event.location.venue}</span>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span className="text-blue-600">${totalAmount.toFixed(2)}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedCount} ticket{selectedCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={processing || selectedCount === 0}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {processing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                `Pay $${totalAmount.toFixed(2)}`
              )}
            </button>
            
            <p className="text-xs text-gray-500 text-center mt-3">
              You'll be redirected to Stripe to complete your payment
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}