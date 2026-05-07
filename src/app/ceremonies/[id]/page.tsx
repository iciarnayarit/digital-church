
'use client';

import * as React from 'react';
import {
  Calendar as CalendarIcon,
  MapPin,
  Edit,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';
import { ceremonyData } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { notFound } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const ceremonyCategoryColors: { [key: string]: string } = {
    'Bautismo': 'bg-blue-100 text-blue-800 border-blue-200',
    'Matrimonio': 'bg-pink-100 text-pink-800 border-pink-200',
    'Dedicación de Niño': 'bg-green-100 text-green-800 border-green-200',
};

export default function CeremonyDetailsPage({ params }: { params: any }) {
    const ceremony = ceremonyData.find(c => c.id.toString() === params.id);

    if (!ceremony) {
        notFound();
    }

  return (
    <AlertDialog>
        <div className="flex flex-col flex-1">
        <AppHeader
            title="Detalles de la Ceremonia"
            description={<Link href="/ceremonies" className="text-sm text-muted-foreground hover:underline">Ver todas las ceremonias</Link>}
        >
            <div className="flex w-full flex-col gap-2 min-[380px]:flex-row min-[380px]:justify-end sm:w-auto">
                <Button className="w-full min-[380px]:w-auto" asChild>
                  <Link href={`/ceremonies/${ceremony.id}/edit`}><Edit className="mr-2 h-4 w-4"/>Editar</Link>
                </Button>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full min-[380px]:w-auto">
                      <Trash2 className="mr-2 h-4 w-4"/>Eliminar
                    </Button>
                </AlertDialogTrigger>
            </div>
        </AppHeader>
        <main className="flex-1 space-y-6 p-4 sm:p-8 bg-muted/20">
        <div className="max-w-4xl mx-auto">
            <Card>
                <CardContent className="p-6">
                    <Image
                        src={PlaceHolderImages.find(p => p.id === 'event-bible-study')?.imageUrl || ''}
                        alt={ceremony.title}
                        width={800}
                        height={400}
                        className="rounded-lg object-cover w-full mb-6"
                        data-ai-hint="people celebrating"
                    />
                    <Badge variant="outline" className={`mt-4 ${ceremonyCategoryColors[ceremony.type]}`}>
                        {ceremony.type}
                    </Badge>
                    <h2 className="mt-2 text-3xl font-bold">{ceremony.title}</h2>
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex items-start gap-4">
                            <CalendarIcon className="h-6 w-6 text-primary mt-1" />
                            <div>
                                <p className="font-semibold text-lg">Fecha y Hora</p>
                                <p className="text-muted-foreground">{ceremony.date}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <MapPin className="h-6 w-6 text-primary mt-1" />
                            <div>
                                <p className="font-semibold text-lg">Oficiante</p>
                                <p className="text-muted-foreground">{ceremony.details.replace('Oficiado por: ', '')}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        </main>
        </div>
        <AlertDialogContent>
            <AlertDialogHeader>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <AlertDialogTitle className='text-center'>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription className='text-center'>
                    Esta acción no se puede deshacer. Esto eliminará permanentemente el registro de la ceremonia.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-center">
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive hover:bg-destructive/90">Confirmar Eliminación</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
  );
}
