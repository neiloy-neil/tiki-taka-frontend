import axios from 'axios';

// API base URL - using Next.js environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6868/api/v1';

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor to add auth token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response.data, // Return just the data
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      // Could trigger a logout or redirect here
    }
    return Promise.reject(error);
  }
);

// API Types
export interface Event {
  _id: string;
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
  title: string;
  description: string;
  eventDate: string;
  eventEndDate?: string;
  doorOpenTime?: string;
  eventType: 'concert' | 'sports' | 'theater' | 'conference' | 'other';
  imageUrl?: string;
  pricingZones: Record<string, { name: string; price: number; currency: 'USD'; available: number }>;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  totalCapacity: number;
  soldCount: number;
}

export interface SeatAvailability {
  seatId: string;
  status: 'available' | 'held' | 'sold';
  lastUpdated: string;
}

export interface SeatPlanSeat extends SeatAvailability {
  id: string;
  section: string;
  row: string;
  seat: string;
  coordinates?: { x: number; y: number };
}

export interface SeatPlanResponse {
  eventId: string;
  venueName: string;
  seatMapSvg: string;
  sections: string[];
  seats: SeatPlanSeat[];
}

export interface SeatHold {
  holdId: string;
  seatIds: string[];
  expiresAt: string;
  sessionId: string;
}

// Venue API Methods (admin)
export const venueApi = {
  async generatePreview(config: any): Promise<{ data: { seatMapSvg: string; totalSeats: number; sections: string[] } }> {
    return apiClient.post('/admin/venues/preview', {
      templateConfig: config,
    });
  },

  async createVenueFromTemplate(data: {
    name: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country?: string;
    };
    templateConfig: any;
  }): Promise<{ data: any }> {
    return apiClient.post('/admin/venues/from-template', data);
  },

  async listVenues(): Promise<{ data: any[] }> {
    return apiClient.get('/admin/venues');
  },
};

// Event API Methods
export const eventApi = {
  /**
   * Get all published events
   */
  async getEvents(filters?: {
    eventType?: string;
    city?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ data: Event[] }> {
    return apiClient.get('/events', { params: filters });
  },

  /**
   * Get single event by ID
   */
  async getEvent(eventId: string): Promise<{ data: Event }> {
    return apiClient.get(`/events/${eventId}`);
  },

  /**
   * Get seat availability for an event
   */
  async getSeatAvailability(eventId: string): Promise<{ data: SeatAvailability[] }> {
    return apiClient.get(`/seats/event/${eventId}/status`);
  },

  /**
   * Get full seat plan (seat index + statuses + SVG)
   */
  async getSeatPlan(eventId: string): Promise<{ data: SeatPlanResponse }> {
    return apiClient.get(`/seats/event/${eventId}/plan`);
  },
};

// Seat API Methods
export const seatApi = {
  /**
   * Hold seats for checkout
   */
  async holdSeats(
    eventId: string,
    seatIds: string[],
    sessionId?: string
  ): Promise<{ data: SeatHold }> {
    return apiClient.post('/seats/hold', {
      eventId,
      seatIds,
      sessionId,
    });
  },

  /**
   * Release held seats
   */
  async releaseSeats(holdId: string, sessionId: string): Promise<void> {
    return apiClient.delete('/seats/release', {
      data: {
        holdId,
        sessionId,
      },
    });
  },

  /**
   * Get full seat plan (seat index + statuses + SVG)
   */
  async getSeatPlan(eventId: string): Promise<{ data: SeatPlanResponse }> {
    return apiClient.get(`/seats/event/${eventId}/plan`);
  },
};

// Order API Methods
export const orderApi = {
  /**
   * Create checkout intent (initiate order and payment)
   */
  async createCheckoutIntent(data: {
    eventId: string;
    tickets: { type: string; quantity: number }[];
    customerInfo: {
      email: string;
      firstName: string;
      lastName: string;
      phoneNumber?: string;
    };
  }): Promise<{
    data: {
      orderId: string;
      orderNumber: string;
      paymentStatus: string;
      paymentIntentClientSecret: string;
      breakdown: {
        subtotal: number;
        fees: number;
        tax: number;
        total: number;
      };
    };
  }> {
    return apiClient.post('/orders/checkout-intent', data);
  },

  /**
   * Get order details by ID
   */
  async getOrder(orderId: string): Promise<{ data: any }> {
    return apiClient.get(`/orders/${orderId}`);
  },

  async finalizeOrder(orderId: string): Promise<{ data: any }> {
    return apiClient.post(`/orders/${orderId}/finalize`);
  },

  /**
   * List current user's orders
   */
  async listMyOrders(): Promise<{ data: any[] }> {
    return apiClient.get('/orders');
  },

  /**
   * Admin/staff: list all orders
   */
  async listAllOrders(): Promise<{ data: any[] }> {
    return apiClient.get('/orders/admin/all');
  },
};

// Auth API Methods
export const authApi = {
  /**
   * Login as customer
   */
  async login(email: string, password: string): Promise<{
    data: {
      accessToken: string;
      refreshToken: string;
      user: { email: string; firstName: string; lastName: string };
    };
  }> {
    return apiClient.post('/auth/login', { email, password });
  },

  /**
   * Register new customer
   */
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<{ data: { accessToken: string; refreshToken: string } }> {
    return apiClient.post('/auth/register', data);
  },

  /**
   * Guest checkout (no account required)
   */
  async guestCheckout(email: string): Promise<{ data: { sessionId: string } }> {
    return apiClient.post('/auth/guest-checkout', { email });
  },
};

// Staff/Admin Auth
export const staffAuthApi = {
  async login(email: string, password: string): Promise<{
    data: {
      accessToken: string;
      refreshToken: string;
      staff: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        assignedEvents?: string[];
      };
    };
  }> {
    return apiClient.post('/staff/auth/login', { email, password });
  },
  async me(): Promise<{ data: any }> {
    return apiClient.get('/staff/me');
  },
};

export default apiClient;