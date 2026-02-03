import { eventApi } from '../../services/api';
import Link from 'next/link';

interface Event {
  _id: string;
  title: string;
  description: string;
  eventDate: string;
  venueId: {
    name: string;
    address: {
      city: string;
      state: string;
    };
  };
  totalCapacity: number;
  soldCount: number;
  pricingZones: Record<string, { price: number }>;
  eventType: string;
  status: string;
  imageUrl?: string;
}

async function getEvents() {
  try {
    const response = await eventApi.getEvents();
    return response.data as Event[];
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Discover Events</h1>
          <p className="text-gray-600">Find amazing experiences happening near you</p>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-lg shadow-sm p-8 max-w-md mx-auto">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No events available</h3>
              <p className="text-gray-500">Check back later for new events</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  const startDate = new Date(event.eventDate);
  const isSoldOut = event.soldCount >= event.totalCapacity;
  const availableTickets = event.totalCapacity - event.soldCount;
  const price = Object.values(event.pricingZones)[0]?.price || 0;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
      {event.imageUrl ? (
        <div className="h-48 bg-gray-200 relative overflow-hidden">
          <img 
            src={event.imageUrl} 
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        </div>
      ) : (
        <div className="h-48 bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center">
          <svg className="w-16 h-16 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
            {event.eventType}
          </span>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            event.status === 'published' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {event.status}
          </span>
        </div>
        
        <h2 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{event.title}</h2>
        <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>
        
        <div className="space-y-2 text-sm text-gray-500 mb-4">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{startDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</span>
          </div>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{event.venueId.address.city}, {event.venueId.address.state}</span>
          </div>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            <span>From ${price.toFixed(2)}</span>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500">
              {availableTickets} tickets available
            </span>
            <span className="text-primary-600 font-medium">
              {Math.round((event.soldCount / event.totalCapacity) * 100)}% sold
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${(event.soldCount / event.totalCapacity) * 100}%` }}
            ></div>
          </div>
        </div>

        <Link 
          href={`/events/${event._id}`}
          className={`w-full text-center font-medium py-3 px-4 rounded-lg transition-colors ${
            isSoldOut
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700 text-white hover:shadow-md'
          }`}
          aria-disabled={isSoldOut}
        >
          {isSoldOut ? 'Sold Out' : 'View Details & Tickets'}
        </Link>
      </div>
    </div>
  );
}