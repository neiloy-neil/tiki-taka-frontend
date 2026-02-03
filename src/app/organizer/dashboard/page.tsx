'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OrganizerDashboard() {
  const router = useRouter();
  
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'events' | 'create' | 'sales'>('events');

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    // Get user data
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (userData.role !== 'organizer') {
      router.push('/');
      return;
    }
    
    setUser(userData);
    
    // Mock events data
    const mockEvents = [
      {
        _id: '1',
        title: 'Summer Music Festival',
        slug: 'summer-music-festival',
        startDate: '2026-06-15T19:00:00Z',
        location: { venue: 'Central Park' },
        status: 'published',
        soldCount: 150,
        totalCapacity: 500
      },
      {
        _id: '2',
        title: 'Tech Conference 2026',
        slug: 'tech-conference-2026',
        startDate: '2026-03-20T09:00:00Z',
        location: { venue: 'Convention Center' },
        status: 'draft',
        soldCount: 0,
        totalCapacity: 300
      }
    ];
    
    setEvents(mockEvents);
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Organizer Dashboard</h1>
              <p className="mt-1 text-gray-600">Manage your events and track performance</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.name || 'Organizer'}</span>
              <button
                onClick={() => {
                  localStorage.removeItem('accessToken');
                  localStorage.removeItem('user');
                  router.push('/');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-center py-12">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Organizer Dashboard</h3>
            <p className="mt-2 text-gray-500">Your event management dashboard is ready.</p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/organizer/create-event')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create New Event
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}