import { Suspense } from 'react';
import { TicketSelectionForm } from './ticket-selection-form';

export default function CheckoutPage({
  searchParams,
}: {
  searchParams: { event?: string; type?: string };
}) {
  const { event: eventId, type: ticketType } = searchParams;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
            <p className="text-gray-600 mt-2">Complete your ticket purchase</p>
          </div>

          <Suspense fallback={<CheckoutLoading />}>
            <TicketSelectionForm eventId={eventId} ticketType={ticketType} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function CheckoutLoading() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    </div>
  );
}