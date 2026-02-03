import { eventApi } from '../services/api';

interface Event {
  _id: string;
  title: string;
  description: string;
  imageUrl?: string;
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

interface MetadataProps {
  params: { id: string };
}

export async function generateEventMetadata({ params }: MetadataProps) {
  const event = await getEvent(params.id);
  
  if (!event) {
    return {
      title: 'Event Not Found',
      description: 'The requested event could not be found',
    };
  }

  return {
    title: `${event.title} | Tiki-Taka Events`,
    description: `${event.description.substring(0, 160)}...`,
    openGraph: {
      title: event.title,
      description: event.description,
      type: 'event',
      url: `https://your-domain.com/events/${event.slug}`,
      images: event.imageUrl ? [event.imageUrl] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: event.title,
      description: event.description,
      images: event.imageUrl ? [event.imageUrl] : undefined,
    },
  };
}