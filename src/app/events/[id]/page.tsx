
'use client';

import * as React from 'react';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  MapPin,
  Edit,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';
import { events as allEvents } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { notFound } from 'next/navigation';
import { AppHeader } from '@/components/app-header';

const eventCategoryColors: { [key: string]: string } = {
  'Estudio Bíblico': 'bg-purple-100 text-purple-800 border-purple-200',
  'Servicio Dominical': 'bg-blue-100 text-blue-800 border-blue-200',
  'Grupo de Jóvenes': 'bg-green-100 text-green-800 border-green-200',
  'Alcance Comunitario': 'bg-orange-100 text-orange-800 border-orange-200',
};

export default function EventDetailsPage({ params }: { params: any }) {
    const event = allEvents.find(e => e.id.toString() === params.id);

    if (!event) {
        notFound();
    }

  return (
    <div className="flex flex-col flex-1">
      <AppHeader
        title="Detalles del Evento"
        description={<Link href="/events/activities" className="text-sm text-muted-foreground hover:underline">Ver todas las actividades</Link>}
      >
          <div className="flex w-full flex-col gap-2 min-[380px]:flex-row min-[380px]:justify-end sm:w-auto">
            <Button className="w-full min-[380px]:w-auto" asChild>
              <Link href={`/events/${event.id}/edit`}><Edit className="mr-2 h-4 w-4"/>Editar</Link>
            </Button>
            <Button variant="destructive" className="w-full min-[380px]:w-auto">
              <Trash2 className="mr-2 h-4 w-4"/>Eliminar
            </Button>
          </div>
      </AppHeader>
    <main className="flex-1 space-y-6 p-4 sm:p-8 bg-muted/20">
      <div className="max-w-4xl mx-auto">
        <Card>
            <CardContent className="p-6">
                 <Image
                    src={PlaceHolderImages.find(p => p.id === 'event-bible-study')?.imageUrl || ''}
                    alt={event.title}
                    width={800}
                    height={400}
                    className="rounded-lg object-cover w-full mb-6"
                    data-ai-hint="people studying"
                />
                <Badge variant="outline" className={`mt-4 ${eventCategoryColors[event.category]}`}>
                    {event.category}
                </Badge>
                <h2 className="mt-2 text-3xl font-bold">{event.title}</h2>
                <p className="mt-4 text-lg text-muted-foreground">
                    {event.description}
                </p>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex items-start gap-4">
                        <CalendarIcon className="h-6 w-6 text-primary mt-1" />
                        <div>
                            <p className="font-semibold text-lg">Fecha y Hora</p>
                            <p className="text-muted-foreground">{new Date(event.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p className="text-muted-foreground">{event.time}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <MapPin className="h-6 w-6 text-primary mt-1" />
                        <div>
                            <p className="font-semibold text-lg">Ubicación</p>
                            <p className="text-muted-foreground">{event.location}</p>
                            <p className="text-muted-foreground">{event.address}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>

    </main>
    </div>
  );
}
