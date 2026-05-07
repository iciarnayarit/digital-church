

'use client';

import * as React from 'react';
import {
  ArrowLeft,
  Trash2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { volunteersData } from '@/lib/data';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
  } from '@/components/ui/breadcrumb';
import { AppHeader } from '@/components/app-header';

export default function EditVolunteerPage({ params }: { params: any }) {
    const volunteer = volunteersData.find(v => v.id.toString() === params.id);

    if (!volunteer) {
        notFound();
    }

    const [skills, setSkills] = React.useState(volunteer.skills.join(', '));
    const [skillTags, setSkillTags] = React.useState(volunteer.skills);

    const handleSkillsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSkills(value);
        setSkillTags(value.split(',').map(s => s.trim()).filter(s => s));
    };


  return (
    <div className="flex flex-col flex-1">
      <AppHeader
        title="Editar Voluntario"
        description={`Modificar detalles para ${volunteer.name}.`}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/volunteers">Cancelar</Link>
          </Button>
          <Button>Guardar Cambios</Button>
        </div>
      </AppHeader>
    <main className="flex-1 space-y-6 p-4 sm:p-8 bg-muted/20">
      <div className="space-y-8 max-w-5xl mx-auto">
        <Card>
            <CardHeader>
                <CardTitle>Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                    <Avatar className="w-20 h-20">
                        <AvatarImage src={volunteer.avatarUrl} alt={volunteer.name} />
                        <AvatarFallback>{volunteer.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Button variant="link" className="p-0 h-auto">Cambiar Foto</Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="first-name">Nombre</Label>
                        <Input id="first-name" defaultValue={volunteer.name.split(' ')[0]} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="last-name">Apellido</Label>
                        <Input id="last-name" defaultValue={volunteer.name.split(' ').slice(1).join(' ')} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Dirección de Correo Electrónico</Label>
                    <Input id="email" type="email" defaultValue={volunteer.email} />
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="phone">Número de Teléfono</Label>
                        <Input id="phone" type="tel" defaultValue={volunteer.phone} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="background-check">Estado de Verificación de Antecedentes</Label>
                        <Select defaultValue={volunteer.backgroundCheck}>
                            <SelectTrigger id="background-check">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Aprobado">Aprobado</SelectItem>
                                <SelectItem value="Pendiente">Pendiente</SelectItem>
                                <SelectItem value="Fallido">Fallido</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Asignaciones de Ministerio y Rol</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                            <p className="font-semibold">Ministerio Juvenil</p>
                            <p className="text-sm text-muted-foreground">Líder de Grupo de Jóvenes</p>
                        </div>
                        <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                            <p className="font-semibold">Equipo de Bienvenida</p>
                            <p className="text-sm text-muted-foreground">Anfitrión (Sustituto)</p>
                        </div>
                        <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                    <Button variant="outline" className="w-full border-dashed">
                        <Plus className="h-4 w-4 mr-2" />
                        Asignar a Ministerio
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Habilidades e Intereses</CardTitle>
                </CardHeader>
                <CardContent>
                     <div className="space-y-2">
                        <Label htmlFor="skills">Habilidades (separadas por comas)</Label>
                        <Input 
                            id="skills" 
                            value={skills}
                            onChange={handleSkillsChange}
                        />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {skillTags.map(tag => (
                            <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </main>
    </div>
  );
}
