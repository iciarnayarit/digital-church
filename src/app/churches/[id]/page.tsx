'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Edit,
  Trash2,
  MapPin,
  ExternalLink,
  Clock,
  Mail,
  User,
  Phone,
} from 'lucide-react';
import Link from 'next/link';
import { AppHeader } from '@/components/app-header';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { ChurchLocation } from '@/lib/church-locations';

export default function ChurchDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  const [church, setChurch] = React.useState<ChurchLocation | null>(null);
  const [loadState, setLoadState] = React.useState<'loading' | 'error' | 'ready'>('loading');
  const [message, setMessage] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [accessCtx, setAccessCtx] = React.useState<{
    ready: boolean;
    staffRoleNorm: string;
    isAdmin: boolean;
    churchIds: string[];
  } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/members/me-role', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const data = (await res.json().catch(() => ({}))) as {
          staffRole?: string | null;
          isAdmin?: boolean;
          churchIds?: string[];
        };
        if (cancelled) return;
        setAccessCtx({
          ready: true,
          staffRoleNorm: String(data.staffRole ?? '').trim().toLowerCase(),
          isAdmin: Boolean(data.isAdmin),
          churchIds: Array.isArray(data.churchIds) ? data.churchIds.map(String).filter(Boolean) : [],
        });
      } catch {
        if (!cancelled) {
          setAccessCtx({ ready: true, staffRoleNorm: '', isAdmin: false, churchIds: [] });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canEditOrDeleteThisTemple = React.useMemo(() => {
    if (!id?.trim() || !accessCtx?.ready) return false;
    if (accessCtx.staffRoleNorm === 'congregante') return false;
    if (accessCtx.isAdmin) return true;
    return accessCtx.churchIds.includes(id.trim());
  }, [id, accessCtx]);

  React.useEffect(() => {
    if (!id?.trim()) {
      setLoadState('error');
      setMessage('Identificador no válido.');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadState('loading');
      setMessage(null);
      try {
        const res = await fetch(`/api/churches/${encodeURIComponent(id)}`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const data = (await res.json().catch(() => ({}))) as {
          church?: ChurchLocation;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || 'No se pudo cargar la ubicación.');
        }
        if (cancelled) return;
        if (!data.church) {
          setLoadState('error');
          setMessage('No se recibieron datos.');
          return;
        }
        setChurch(data.church);
        setLoadState('ready');
      } catch (e) {
        if (!cancelled) {
          setLoadState('error');
          setMessage(e instanceof Error ? e.message : 'Error al cargar.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDelete() {
    if (!id?.trim()) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/churches/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo eliminar.');
      }
      router.push('/churches');
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error al eliminar.');
    } finally {
      setDeleting(false);
    }
  }

  if (loadState === 'loading') {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title="Ubicación" description="Cargando…" />
        <main className="flex-1 p-8">
          <p className="text-sm text-muted-foreground">Cargando ubicación…</p>
        </main>
      </div>
    );
  }

  if (loadState === 'error' || !church) {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title="Ubicación no encontrada" description={message ?? 'No hay una ubicación con este identificador.'} />
        <main className="flex-1 p-8">
          <Button asChild variant="outline">
            <Link href="/churches">Volver a ubicaciones</Link>
          </Button>
        </main>
      </div>
    );
  }

  const postalLine =
    church.city && church.state
      ? [church.address, church.city, church.state, church.zip].filter(Boolean).join(', ')
      : null;

  return (
    <AlertDialog>
      <div className="flex flex-1 flex-col">
        <AppHeader title={church.name} description={church.address}>
          {canEditOrDeleteThisTemple ? (
            <div className="flex gap-2">
              <AlertDialogTrigger asChild>
                <Button variant="destructive" type="button" disabled={deleting}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </Button>
              </AlertDialogTrigger>
              <Button asChild>
                <Link href={`/churches/${id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar Ubicación
                </Link>
              </Button>
            </div>
          ) : null}
        </AppHeader>
        <main className="flex-1 bg-muted/20 p-4 sm:p-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <Card className="overflow-hidden">
              <div className="relative h-64 w-full md:h-80">
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder={0}
                  style={{ border: 0 }}
                  title={`Mapa: ${church.name}`}
                  src={church.embedUrl}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                  <div className="space-y-4 md:col-span-2">
                    <h2 className="text-2xl font-bold">Acerca de este templo</h2>
                    {church.description ? (
                      <p className="whitespace-pre-wrap text-muted-foreground">{church.description}</p>
                    ) : (
                      <p className="text-muted-foreground">
                        Ubicación de ICIAR Nayarit en {church.municipality}. Horarios y detalles actualizados
                        también en el sitio oficial.
                      </p>
                    )}
                    {postalLine ? (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Dirección postal:</span> {postalLine}
                      </p>
                    ) : null}
                    {!church.description ? (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href="https://iciarnayarit.com/templos"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2"
                        >
                          Ver en iciarnayarit.com
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                  <div>
                    <h3 className="mb-4 text-lg font-semibold">Información</h3>
                    <div className="space-y-4 text-sm">
                      {church.phone ? (
                        <div className="flex items-start gap-3">
                          <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Teléfono</p>
                            <p className="font-medium">{church.phone}</p>
                          </div>
                        </div>
                      ) : null}
                      {church.campusPastor ? (
                        <div className="flex items-start gap-3">
                          <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Pastor del campus</p>
                            <p className="font-medium">{church.campusPastor}</p>
                          </div>
                        </div>
                      ) : null}
                      {church.contactEmail ? (
                        <div className="flex items-start gap-3">
                          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Correo</p>
                            <a
                              href={`mailto:${church.contactEmail}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {church.contactEmail}
                            </a>
                          </div>
                        </div>
                      ) : null}
                      <div className="flex items-start gap-3">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Municipio</p>
                          <p className="font-medium">{church.municipality}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div>
                          <p className="mb-2 text-muted-foreground">Horarios publicados</p>
                          {church.schedule.length === 0 ? (
                            <p className="font-medium text-muted-foreground">Sin horarios en el registro.</p>
                          ) : (
                            <ul className="space-y-2 font-medium">
                              {church.schedule.map((row, i) => (
                                <li key={i}>
                                  <span className="text-foreground">{row.day}</span>{' '}
                                  <span className="text-muted-foreground">{row.time}</span>
                                  <span className="text-muted-foreground"> — {row.label}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                      <Button variant="link" className="h-auto p-0" asChild>
                        <a
                          href={church.shareMapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1"
                        >
                          Abrir en Google Maps
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      {canEditOrDeleteThisTemple ? (
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center">¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Esta acción no se puede deshacer. Esto eliminará permanentemente la ubicación de la base
              de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              {deleting ? 'Eliminando…' : 'Confirmar eliminación'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      ) : null}
    </AlertDialog>
  );
}
