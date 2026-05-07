
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { AppHeader } from '@/components/app-header';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  locationName: z
    .string()
    .min(1, { message: 'El nombre de la ubicación es requerido.' }),
  address: z.string().min(1, { message: 'La dirección es requerida.' }),
  city: z.string().min(1, { message: 'La ciudad es requerida.' }),
  state: z.string().min(1, { message: 'El estado es requerido.' }),
  zip: z.string().min(1, { message: 'El código postal es requerido.' }),
  country: z.string().min(1, { message: 'Seleccione un país.' }),
  phone: z.string(),
  campusPastor: z
    .string()
    .min(1, { message: 'El pastor del campus es requerido.' }),
  contactEmail: z.union([z.literal(''), z.string().email({ message: 'Correo no válido.' })]),
  description: z
    .string()
    .min(1, { message: 'La descripción del campus es requerida.' }),
});

type FormValues = z.infer<typeof formSchema>;

const NEW_LOCATION_FORM_ID = 'new-location-form';

export default function NewChurchPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      locationName: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      country: '',
      phone: '',
      campusPastor: '',
      contactEmail: '',
      description: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const res = await fetch('/api/churches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.locationName.trim(),
          address: values.address.trim(),
          city: values.city.trim(),
          state: values.state.trim(),
          zip: values.zip.trim(),
          country: values.country,
          phone: values.phone.trim(),
          campusPastor: values.campusPastor.trim(),
          contactEmail: values.contactEmail.trim(),
          description: values.description.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        id?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar la ubicación.');
      }
      toast({
        title: 'Ubicación guardada',
        description: data.message || `${values.locationName} se registró en la base de datos.`,
      });
      router.push('/churches');
      router.refresh();
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'No se pudo guardar',
        description: err instanceof Error ? err.message : 'Error al guardar en la base de datos.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <AppHeader
        title="Añadir Nueva Ubicación"
        description="Rellene los detalles a continuación para registrar un nuevo campus de la iglesia."
      >
        <div className="hidden w-full flex-col-reverse gap-2 min-[380px]:flex-row min-[380px]:justify-end sm:flex sm:w-auto sm:flex-none sm:items-center">
          <Button variant="ghost" asChild>
            <Link href="/churches">Cancelar</Link>
          </Button>
          <Button type="submit" form={NEW_LOCATION_FORM_ID} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar Ubicación'}
          </Button>
        </div>
      </AppHeader>
      <main className="flex-1 space-y-6 p-4 sm:p-8 bg-muted/20">
        <Form {...form}>
          <form
            id={NEW_LOCATION_FORM_ID}
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <div className="space-y-6 pb-24 sm:pb-0">
            <Card className="max-w-3xl mx-auto">
              <CardHeader>
                <CardTitle>Información de la Ubicación</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="locationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Ubicación</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej., Campus del Valle Norte"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Calle Principal" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ciudad</FormLabel>
                        <FormControl>
                          <Input placeholder="Los Ángeles" className="h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <FormControl>
                          <Input placeholder="CA" className="h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código Postal</FormLabel>
                        <FormControl>
                          <Input placeholder="90012" className="h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>País</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger id="country" className="h-11">
                            <SelectValue placeholder="Seleccione un país" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="usa">Estados Unidos</SelectItem>
                          <SelectItem value="canada">Canadá</SelectItem>
                          <SelectItem value="mexico">México</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Teléfono</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(123) 456-7890"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="max-w-3xl mx-auto">
              <CardHeader>
                <CardTitle>Detalles del Campus</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="campusPastor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pastor del Campus</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nombre del pastor principal del campus"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email de Contacto</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="campus.principal@ejemplo.com"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción del Campus</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Proporcione una breve descripción de este campus, sus servicios o su comunidad."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            </div>

            <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:hidden">
              <div className="grid grid-cols-2 gap-2 pb-[max(env(safe-area-inset-bottom),0px)]">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/churches">Cancelar</Link>
                </Button>
                <Button type="submit" form={NEW_LOCATION_FORM_ID} size="sm" disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar Ubicación'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}
