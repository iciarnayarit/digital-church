
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
  CardDescription,
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
import { ceremonyData } from '@/lib/data';
import { notFound } from 'next/navigation';
import { AppHeader } from '@/components/app-header';

export default function EditCeremonyPage({ params }: { params: any }) {
    const ceremony = ceremonyData.find(c => c.id.toString() === params.id);

    if (!ceremony) {
        notFound();
    }
    
    // Attempt to parse the date, but handle invalid formats gracefully.
    let initialDate;
    try {
        const parsedDate = new Date(ceremony.date.replace(/(\d+)(?:st|nd|rd|th)/, '$1'));
        if (!isNaN(parsedDate.getTime())) {
            initialDate = parsedDate;
        }
    } catch (e) {
        // Date parsing failed, leave initialDate undefined
    }

    const [date, setDate] = React.useState<Date | undefined>(initialDate);


    const getCeremonyTypeValue = (type: string) => {
        switch (type) {
            case 'Bautismo': return 'baptism';
            case 'Matrimonio': return 'marriage';
            case 'Dedicación de Niño': return 'child-dedication';
            default: return '';
        }
    }

    return (
        <div className="flex flex-col flex-1">
            <AppHeader
                title="Editar Registro de Ceremonia"
                description={`Modifique los detalles de "${ceremony.title}"`}
            >
                <div className="flex items-center gap-2">
                    <Button variant="ghost" asChild>
                        <Link href={`/ceremonies/${params.id}`}>Cancelar</Link>
                    </Button>
                    <Button>Guardar Cambios</Button>
                </div>
            </AppHeader>
            <main className="flex-1 space-y-6 p-4 sm:p-8 bg-muted/20">
                <Card className="max-w-3xl mx-auto">
                    <CardHeader>
                        <CardTitle>Detalles de la Ceremonia</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="ceremony-type">Tipo de Ceremonia</Label>
                                <Select defaultValue={getCeremonyTypeValue(ceremony.type)}>
                                    <SelectTrigger id="ceremony-type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="baptism">Bautismo</SelectItem>
                                        <SelectItem value="marriage">Matrimonio</SelectItem>
                                        <SelectItem value="child-dedication">Dedicación de Niño</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ceremony-date">Fecha</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "PPP") : <span>Seleccione una fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="participants">Persona(s) Involucrada(s)</Label>
                            <Input id="participants" defaultValue={ceremony.title.replace('Bautismo de ', '').replace('Matrimonio de ', '').replace('Dedicación de Niño para ', '')} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="officiant">Oficiante</Label>
                            <Input id="officiant" defaultValue={ceremony.details.includes('Oficiado por:') ? ceremony.details.split('Oficiado por: ')[1].split(',')[0] : ''} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Notas (Opcional)</Label>
                            <Textarea id="notes" placeholder="Añada detalles adicionales, como nombres de testigos, padres, etc." rows={4} />
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
