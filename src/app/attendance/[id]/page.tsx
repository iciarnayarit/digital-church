'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Trash2 } from 'lucide-react';
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
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type ChurchDoc = {
  id: string;
  name: string;
  address: string;
};

type AttendanceRecord = {
  id: string;
  eventType: 'service' | 'event';
  eventName: string;
  attendanceMode?: 'presencial' | 'online';
  eventWeekday?: string;
  eventTime?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  eventDate?: string;
  notes: string;
  createdAt: string;
};

function canDeleteAttendanceRow(r: AttendanceRecord): boolean {
  return Boolean(r.id && !r.id.startsWith('attendance-') && !r.id.startsWith('registry-'));
}

export default function AttendanceChurchDetailPage() {
  const params = useParams();
  const id =
    typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const { toast } = useToast();

  const [church, setChurch] = React.useState<ChurchDoc | null>(null);
  const [records, setRecords] = React.useState<AttendanceRecord[]>([]);
  const [loadState, setLoadState] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const [loadMessage, setLoadMessage] = React.useState<string | null>(null);

  const [eventType, setEventType] = React.useState<'service' | 'event'>('service');
  const [eventName, setEventName] = React.useState('');
  const [attendanceMode, setAttendanceMode] = React.useState<'presencial' | 'online'>(
    'presencial'
  );
  const [eventWeekday, setEventWeekday] = React.useState('');
  const [eventTime, setEventTime] = React.useState('');
  const [eventStartDate, setEventStartDate] = React.useState('');
  const [eventEndDate, setEventEndDate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = React.useState<AttendanceRecord | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    if (!id?.trim()) return;
    setLoadState('loading');
    setLoadMessage(null);
    try {
      const [churchRes, recordsRes] = await Promise.all([
        fetch(`/api/churches/${encodeURIComponent(id)}`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        }),
        fetch(`/api/churches/${encodeURIComponent(id)}/attendance`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        }),
      ]);
      const churchJson = (await churchRes.json().catch(() => ({}))) as {
        church?: ChurchDoc;
        error?: string;
      };
      const recordsJson = (await recordsRes.json().catch(() => ({}))) as {
        records?: AttendanceRecord[];
        error?: string;
      };
      if (!churchRes.ok) {
        throw new Error(churchJson.error || 'No se pudo cargar el templo.');
      }
      if (!recordsRes.ok) {
        throw new Error(recordsJson.error || 'No se pudieron cargar los registros.');
      }
      setChurch(churchJson.church ?? null);
      setRecords(recordsJson.records ?? []);
      setLoadState('ready');
    } catch (e) {
      setLoadState('error');
      setLoadMessage(e instanceof Error ? e.message : 'Error al cargar.');
    }
  }, [id]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!id?.trim()) return;
    const nextErrors: Record<string, string> = {};
    if (!eventName.trim()) {
      nextErrors.eventName = 'Ingrese el nombre del servicio/evento.';
    }
    if (!eventTime.trim()) {
      nextErrors.eventTime = 'Seleccione un horario.';
    }
    if (eventType === 'service' && !eventWeekday.trim()) {
      nextErrors.eventWeekday = 'Seleccione el día de la semana.';
    }
    if (eventType === 'event' && !eventStartDate.trim()) {
      nextErrors.eventStartDate = 'Seleccione la fecha de inicio.';
    }
    if (
      eventType === 'event' &&
      eventStartDate.trim() &&
      eventEndDate.trim() &&
      eventEndDate < eventStartDate
    ) {
      nextErrors.eventEndDate = 'La fecha de fin no puede ser anterior a la de inicio.';
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast({
        variant: 'destructive',
        title: 'Faltan datos',
        description: 'Revise los campos marcados e inténtelo de nuevo.',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/churches/${encodeURIComponent(id)}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          eventName: eventName.trim(),
          attendanceMode,
          eventWeekday: eventType === 'service' ? eventWeekday.trim() : '',
          eventTime: eventTime.trim(),
          eventStartDate: eventType === 'event' ? eventStartDate.trim() : '',
          eventEndDate: eventType === 'event' ? eventEndDate.trim() : '',
          notes: notes.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo registrar.');
      }
      toast({
        title: 'Registro guardado',
        description: data.message || 'Servicio/evento registrado correctamente.',
      });
      setEventName('');
      setAttendanceMode('presencial');
      setEventWeekday('');
      setEventTime('');
      setEventStartDate('');
      setEventEndDate('');
      setNotes('');
      setFieldErrors({});
      await fetchData();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'No se pudo guardar',
        description: e instanceof Error ? e.message : 'Inténtelo de nuevo.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!id?.trim() || !deleteTarget) return;
    setDeleting(true);
    try {
      const url = new URL(
        `/api/churches/${encodeURIComponent(id)}/attendance`,
        window.location.origin
      );
      url.searchParams.set('recordId', deleteTarget.id);
      const res = await fetch(url.toString(), { method: 'DELETE' });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo eliminar el registro.');
      }
      toast({
        title: 'Registro eliminado',
        description: data.message || 'El servicio o evento se eliminó correctamente.',
      });
      setDeleteTarget(null);
      await fetchData();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'No se pudo eliminar',
        description: e instanceof Error ? e.message : 'Inténtelo de nuevo.',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        title={church ? `Asistencia - ${church.name}` : 'Asistencia por templo'}
        description="Registre servicio o evento del templo seleccionado."
      >
        <Button variant="outline" asChild>
          <Link href="/attendance">Volver a templos</Link>
        </Button>
      </AppHeader>
      <main className="flex-1 space-y-6 bg-muted/20 p-4 sm:p-8">
        {loadState === 'error' ? (
          <p className="text-sm text-destructive">{loadMessage ?? 'No se pudo cargar.'}</p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Registrar servicio o evento</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={eventType} onValueChange={(v) => setEventType(v as 'service' | 'event')}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Servicio</SelectItem>
                  <SelectItem value="event">Evento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {eventType === 'service' ? (
              <div className="space-y-2">
                <Label>Día de la semana</Label>
                <Select value={eventWeekday} onValueChange={setEventWeekday}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione día" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lunes">Lunes</SelectItem>
                    <SelectItem value="Martes">Martes</SelectItem>
                    <SelectItem value="Miércoles">Miércoles</SelectItem>
                    <SelectItem value="Jueves">Jueves</SelectItem>
                    <SelectItem value="Viernes">Viernes</SelectItem>
                    <SelectItem value="Sábado">Sábado</SelectItem>
                    <SelectItem value="Domingo">Domingo</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.eventWeekday ? (
                  <p className="text-xs text-destructive">{fieldErrors.eventWeekday}</p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Fecha de inicio</Label>
                <Input
                  type="date"
                  value={eventStartDate}
                  onChange={(e) => setEventStartDate(e.target.value)}
                />
                {fieldErrors.eventStartDate ? (
                  <p className="text-xs text-destructive">{fieldErrors.eventStartDate}</p>
                ) : null}
              </div>
            )}
            <div className="space-y-2">
              <Label>Horario</Label>
              <Input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
              />
              {fieldErrors.eventTime ? (
                <p className="text-xs text-destructive">{fieldErrors.eventTime}</p>
              ) : null}
            </div>
            {eventType === 'event' ? (
              <div className="space-y-2 md:col-span-2">
                <Label>Fecha de fin (opcional)</Label>
                <Input
                  type="date"
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                />
                {fieldErrors.eventEndDate ? (
                  <p className="text-xs text-destructive">{fieldErrors.eventEndDate}</p>
                ) : null}
              </div>
            ) : null}
            <div className="space-y-2 md:col-span-2">
              <Label>Nombre del servicio/evento</Label>
              <Input
                placeholder="Ej. Servicio Dominical"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
              />
              {fieldErrors.eventName ? (
                <p className="text-xs text-destructive">{fieldErrors.eventName}</p>
              ) : null}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Actividad</Label>
              <Select
                value={attendanceMode}
                onValueChange={(v) => setAttendanceMode(v as 'presencial' | 'online')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione actividad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notas</Label>
              <Textarea
                placeholder="Notas opcionales..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Button type="button" onClick={() => void handleSave()} disabled={saving || loadState === 'loading'}>
                {saving ? 'Guardando…' : 'Guardar registro'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registros recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Día</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Actividad</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="w-[72px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow key="empty-row">
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      No hay registros aún para este templo.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((r, index) => (
                    <TableRow key={`${r.id || 'no-id'}-${r.createdAt || 'no-date'}-${index}`}>
                      <TableCell>
                        {r.eventType === 'service'
                          ? r.eventWeekday || '—'
                          : r.eventStartDate
                            ? r.eventEndDate
                              ? `${r.eventStartDate} a ${r.eventEndDate}`
                              : r.eventStartDate
                            : '—'}
                      </TableCell>
                      <TableCell>{r.eventTime || '—'}</TableCell>
                      <TableCell>{r.eventType === 'service' ? 'Servicio' : 'Evento'}</TableCell>
                      <TableCell>{r.attendanceMode === 'online' ? 'Online' : 'Presencial'}</TableCell>
                      <TableCell>{r.eventName}</TableCell>
                      <TableCell>{r.notes || '—'}</TableCell>
                      <TableCell className="text-right">
                        {canDeleteAttendanceRow(r) ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Eliminar ${r.eventName}`}
                            disabled={deleting || loadState === 'loading'}
                            onClick={() => setDeleteTarget(r)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <AlertDialog
              open={deleteTarget !== null}
              onOpenChange={(open) => {
                if (!open && !deleting) setDeleteTarget(null);
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar este registro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se borrará «{deleteTarget?.eventName ?? ''}» de los registros recientes. Esta
                    acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleting}
                    onClick={(ev) => {
                      ev.preventDefault();
                      void handleConfirmDelete();
                    }}
                  >
                    {deleting ? 'Eliminando…' : 'Eliminar'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
