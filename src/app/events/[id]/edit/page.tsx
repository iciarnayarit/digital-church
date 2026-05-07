
'use client';

import * as React from 'react';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { events } from '@/lib/data';
import { AppHeader } from '@/components/app-header';

export default function EditEventPage({ params }: { params: any }) {
    const event = events.find(e => e.id.toString() === params.id) || events.find(e => e.id === 3);

    if (!event) {
        return <div>Evento no encontrado</div>;
    }

    const [startDate, setStartDate] = React.useState<Date | undefined>(new Date(event.date));
    const [endDate, setEndDate] = React.useState<Date | undefined>(new Date(event.date));

  return (
    <div className="flex flex-col flex-1">
      <AppHeader
        title="Editar Evento"
        description={`Modifique los detalles de "${event.title}".`}
      >
        <Button variant="outline" asChild><Link href="/events">Cancelar</Link></Button>
        <Button>Guardar Cambios</Button>
      </AppHeader>
      <main className="flex-1 space-y-6 p-4 sm:p-8 bg-muted/20">
        <div className="grid grid-cols-1 max-w-4xl mx-auto">
          <Card>
              <CardHeader>
                  <CardTitle>Detalles del Evento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div className="space-y-2">
                      <Label htmlFor="event-title">Título del Evento</Label>
                      <Input id="event-title" defaultValue={event.title} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                          <Label>Fecha y Hora de Inicio</Label>
                          <div className="flex gap-2">
                              <Popover>
                                  <PopoverTrigger asChild>
                                  <Button
                                      variant={"outline"}
                                      className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !startDate && "text-muted-foreground"
                                      )}
                                  >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {startDate ? format(startDate, "MM/dd/yyyy") : <span>mm/dd/yyyy</span>}
                                  </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                  <Calendar
                                      mode="single"
                                      selected={startDate}
                                      onSelect={setStartDate}
                                      initialFocus
                                  />
                                  </PopoverContent>
                              </Popover>
                              <Input type="time" className="w-[140px]" defaultValue="19:00" />
                          </div>
                      </div>
                      <div className="space-y-2">
                          <Label>Fecha y Hora de Finalización</Label>
                          <div className="flex gap-2">
                              <Popover>
                                  <PopoverTrigger asChild>
                                  <Button
                                      variant={"outline"}
                                      className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !endDate && "text-muted-foreground"
                                      )}
                                  >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {endDate ? format(endDate, "MM/dd/yyyy") : <span>mm/dd/yyyy</span>}
                                  </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                  <Calendar
                                      mode="single"
                                      selected={endDate}
                                      onSelect={setEndDate}
                                      initialFocus
                                  />
                                  </PopoverContent>
                              </Popover>
                              <Input type="time" className="w-[140px]" defaultValue="20:30" />
                          </div>
                      </div>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="location">Ubicación</Label>
                      <Input id="location" defaultValue={event.location} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="description">Descripción</Label>
                      <Textarea id="description" defaultValue={event.description} rows={5} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                          <Label htmlFor="category">Categoría / Tipo</Label>
                          <Select defaultValue={event.category}>
                              <SelectTrigger id="category">
                                  <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="Estudio Bíblico">Estudio Bíblico</SelectItem>
                                  <SelectItem value="Servicio Dominical">Servicio Dominical</SelectItem>
                                  <SelectItem value="Grupo de Jóvenes">Grupo de Jóvenes</SelectItem>
                                  <SelectItem value="Alcance Comunitario">Alcance Comunitario</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="recurrence">Recurrencia</Label>
                          <Select defaultValue="weekly">
                              <SelectTrigger id="recurrence">
                                  <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="none">No se repite</SelectItem>
                                  <SelectItem value="daily">Diariamente</SelectItem>
                                  <SelectItem value="weekly">Semanalmente</SelectItem>
                                  <SelectItem value="monthly">Mensualmente</SelectItem>
                                  <SelectItem value="yearly">Anualmente</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="associated-ministries">Ministerios / Grupos Asociados</Label>
                      <div className='border rounded-md p-2 h-32 overflow-y-auto'>
                          <ul>
                              <li className='p-2 hover:bg-accent rounded-md cursor-pointer bg-accent'>Ministerio de Adultos</li>
                              <li className='p-2 hover:bg-accent rounded-md cursor-pointer'>Ministerio Juvenil</li>
                              <li className='p-2 hover:bg-accent rounded-md cursor-pointer'>Ministerio de Niños</li>
                              <li className='p-2 hover:bg-accent rounded-md cursor-pointer'>Comité de Misiones</li>
                          </ul>
                      </div>
                  </div>
              </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
