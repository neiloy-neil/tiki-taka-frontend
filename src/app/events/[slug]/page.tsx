import { eventApi } from '../../../services/api';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { generateEventMetadata } from '../../../lib/event-metadata';

interface Event {
  _id: string;
  title: string;
  description: string;
  eventDate: string;
  eventEndDate?: string;
  doorOpenTime?: string;
  eventType: string;
  imageUrl?: string;
  status: string;
  totalCapacity: number;
  soldCount: number;
  venueId: {
    _id: string;
    name: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };
  pricingZones: Record<string, { 
    name: string; 
    price: number; 
    currency: string;
    available: number;
  }>;
  slug: string;
}

async function getEvent(slug: string) {
  try {
    const response = await eventApi.getEvent(slug);
    return response.data as Event;
  } catch (error) {
    console.error('Error fetching event:', error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  return generateEventMetadata({ params: { id: params.slug } });
}

export default async function EventDetailsPage({ params }: { params: { slug: string } }) {
  const event = await getEvent(params.slug);

  if (!event) {
    notFound();
  }

  const startDate = new Date(event.eventDate);
  const endDate = event.eventEndDate ? new Date(event.eventEndDate) : null;
  const doorOpenTime = event.doorOpenTime ? new Date(event.doorOpenTime) : null;
  const availableTickets = event.totalCapacity - event.soldCount;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        {event.imageUrl ? (
          <div className="absolute inset-0">
            <img 
              src={event.imageUrl} 
              alt={event.title}
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 to-gray-800/80"></div>
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-primary-900 to-primary-800"></div>
        )}
        
        <div className="relative container mx-auto px-4 py-16">
          <div className="max-w-4xl">
            <Link 
              href="/events" 
              className="inline-flex items-center text-primary-200 hover:text-white mb-6 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Events
            </Link>
            
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-primary-600 text-white rounded-full text-sm font-medium">
                {event.eventType}
              </span>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                event.status === 'published' 
                  ? 'bg-green-500/20 text-green-300' 
                  : 'bg-yellow-500/20 text-yellow-300'
              }`}>
                {event.status}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{event.title}</h1>
            <p className="text-xl text-gray-200 mb-6 max-w-2xl">{event.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/20">
              <div className="flex items-center">
                <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <div className="font-semibold">
                    {startDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                  {endDate && (
                    <div className="text-sm text-gray-300">
                      to {endDate.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </div>
                  )}
                  {doorOpenTime && (
                    <div className="text-sm text-primary-200">
                      Doors open: {doorOpenTime.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center">
                <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <div className="font-semibold">{event.venueId.name}</div>
                  <div className="text-sm text-gray-300">
                    {event.venueId.address.street}<br />
                    {event.venueId.address.city}, {event.venueId.address.state} {event.venueId.address.zipCode}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center">
                <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <div>
                  <div className="font-semibold">
                    {availableTickets} tickets available
                  </div>
                  <div className="text-sm text-gray-300">
                    {Math.round((event.soldCount / event.totalCapacity) * 100)}% sold
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Ticket Selection */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Your Tickets</h2>
                
                <div className="space-y-4">
                  {Object.entries(event.pricingZones).map(([key, zone]) => (
                    <TicketTypeCard 
                      key={key}
                      name={zone.name}
                      price={zone.price}
                      currency={zone.currency}
                      available={zone.available}
                      eventId={event._id}
                      eventSlug={params.slug}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Event Information Sidebar */}
            <div className="space-y-8">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Event Type</div>
                    <div className="text-gray-900 capitalize">{event.eventType}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Venue</div>
                    <div className="text-gray-900">{event.venueId.name}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Address</div>
                    <div className="text-gray-900">
                      {event.venueId.address.street}<br />
                      {event.venueId.address.city}, {event.venueId.address.state} {event.venueId.address.zipCode}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ticket Information</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Total Capacity</div>
                    <div className="text-gray-900">{event.totalCapacity} people</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Available</div>
                    <div className="text-gray-900">{availableTickets} tickets</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Status</div>
                    <div className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      event.status === 'published' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {event.status}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TicketTypeCardProps {
  name: string;
  price: number;
  currency: string;
  available: number;
  eventId: string;
  eventSlug: string;
}

function TicketTypeCard({ 
  name, 
  price, 
  currency, 
  available, 
  eventSlug 
}: TicketTypeCardProps) {
  const isSoldOut = available <= 0;

  return (
    <div className="border border-gray-200 rounded-lg p-6 hover:border-primary-300 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="mb-4 sm:mb-0">
          <h3 className="text-xl font-semibold text-gray-900 mb-1">{name}</h3>
          <div className="text-2xl font-bold text-primary-600">
            {currency} {price.toFixed(2)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {available} tickets available
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {isSoldOut ? (
            <button 
              disabled
              className="px-6 py-3 bg-gray-100 text-gray-400 rounded-lg font-medium cursor-not-allowed"
            >
              Sold Out
            </button>
          ) : (
            <Link
              href={`/checkout/${eventSlug}`}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
            >
              Buy Tickets
            </Link>
          )}
        </div>
      </div>
      
      {isSoldOut && (
        <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
          <div className="flex items-center text-red-700">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm">This ticket type is currently sold out</span>
          </div>
        </div>
      )}
    </div>
  );
}