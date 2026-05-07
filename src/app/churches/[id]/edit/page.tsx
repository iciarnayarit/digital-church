
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { AppHeader } from '@/components/app-header';
import type { IciarTempleSchedule } from '@/lib/iciar-temples';
import type { ChurchLocation } from '@/lib/church-locations';
import { useParams } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function EditTempleForm({
  templeId,
  initial,
}: {
  templeId: string;
  initial: {
    name: string;
    address: string;
    municipality: string;
    lat: number;
    lng: number;
    embedUrl: string;
    shareMapUrl: string;
    schedule: IciarTempleSchedule[];
  };
}) {
  const { toast } = useToast();
  const [name, setName] = React.useState(initial.name);
  const [address, setAddress] = React.useState(initial.address);
  const [municipality, setMunicipality] = React.useState(initial.municipality);
  const [lat, setLat] = React.useState(String(initial.lat));
  const [lng, setLng] = React.useState(String(initial.lng));
  const [embedUrl, setEmbedUrl] = React.useState(initial.embedUrl);
  const [shareMapUrl, setShareMapUrl] = React.useState(initial.shareMapUrl);
  const [schedule, setSchedule] = React.useState<IciarTempleSchedule[]>(() =>
    initial.schedule.map((s) => ({ ...s }))
  );

  const updateScheduleRow = (
    index: number,
    field: keyof IciarTempleSchedule,
    value: string
  ) => {
    setSchedule((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const addScheduleRow = () => {
    setSchedule((rows) => [
      ...rows,
      { day: '', time: '', label: '' },
    ]);
  };

  const removeScheduleRow = (index: number) => {
    setSchedule((rows) => rows.filter((_, i) => i !== index));
  };

  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Faltan datos',
        description: 'Indique el nombre del templo.',
      });
      return;
    }
    const latNum = Number(lat.trim().replace(',', '.'));
    const lngNum = Number(lng.trim().replace(',', '.'));
    if (!Number.isFinite(latNum)) {
      toast({
        variant: 'destructive',
        title: 'Latitud inválida',
        description: 'Use un número válido para la latitud.',
      });
      return;
    }
    if (!Number.isFinite(lngNum)) {
      toast({
        variant: 'destructive',
        title: 'Longitud inválida',
        description: 'Use un número válido para la longitud.',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/churches/${encodeURIComponent(templeId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim(),
          municipality: municipality.trim(),
          lat: latNum,
          lng: lngNum,
          embedUrl,
          shareMapUrl,
          schedule: schedule.map((s) => ({ ...s })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        church?: ChurchLocation;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar la ubicación.');
      }
      if (data.church) {
        const c = data.church;
        setName(c.name);
        setAddress(c.address);
        setMunicipality(c.municipality);
        setLat(String(c.lat));
        setLng(String(c.lng));
        setEmbedUrl(c.embedUrl);
        setShareMapUrl(c.shareMapUrl);
        setSchedule(c.schedule.map((s) => ({ ...s })));
      }
      toast({
        title: 'Cambios guardados',
        description: 'La información del templo se actualizó correctamente.',
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: e instanceof Error ? e.message : 'Inténtelo de nuevo.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <AppHeader
        title="Editar Ubicación"
        description={`Modificando los detalles de «${name}»`}
      >
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href={`/churches/${templeId}`}>Cancelar</Link>
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar Cambios'}
          </Button>
        </div>
      </AppHeader>
      <main className="flex-1 space-y-6 p-4 sm:p-8 bg-muted/20">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Información del templo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="temple-name">Nombre del templo</Label>
              <Input
                id="temple-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="temple-address">Dirección</Label>
              <Input
                id="temple-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="municipality">Municipio</Label>
              <Input
                id="municipality"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="lat">Latitud</Label>
                <Input
                  id="lat"
                  type="text"
                  inputMode="decimal"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng">Longitud</Label>
                <Input
                  id="lng"
                  type="text"
                  inputMode="decimal"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Mapa y enlaces</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="embed-url">URL embebida (Google Maps)</Label>
              <Textarea
                id="embed-url"
                className="min-h-[100px] font-mono text-xs"
                value={embedUrl}
                onChange={(e) => setEmbedUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="share-url">Enlace para compartir (Google Maps)</Label>
              <Input
                id="share-url"
                className="font-mono text-xs"
                value={shareMapUrl}
                onChange={(e) => setShareMapUrl(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="max-w-3xl mx-auto">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Horarios publicados</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addScheduleRow}>
              <Plus className="mr-1 h-4 w-4" />
              Añadir
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {schedule.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay horarios. Pulse «Añadir» para crear uno.
              </p>
            ) : (
              schedule.map((row, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-end"
                >
                  <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Día</Label>
                      <Input
                        value={row.day}
                        onChange={(e) =>
                          updateScheduleRow(index, 'day', e.target.value)
                        }
                        placeholder="Ej. Domingo"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Hora</Label>
                      <Input
                        value={row.time}
                        onChange={(e) =>
                          updateScheduleRow(index, 'time', e.target.value)
                        }
                        placeholder="Ej. 10:00 AM"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-1">
                      <Label className="text-xs">Actividad</Label>
                      <Input
                        value={row.label}
                        onChange={(e) =>
                          updateScheduleRow(index, 'label', e.target.value)
                        }
                        placeholder="Ej. Culto general"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => removeScheduleRow(index)}
                    aria-label="Eliminar horario"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function EditChurchPage() {
  const params = useParams();
  const id =
    typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  const [church, setChurch] = React.useState<ChurchLocation | null>(null);
  const [loadState, setLoadState] = React.useState<'loading' | 'error' | 'ready'>('loading');
  const [errMsg, setErrMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!id?.trim()) {
      setLoadState('error');
      setErrMsg('Identificador no válido.');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadState('loading');
      setErrMsg(null);
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
          setErrMsg('No se recibieron datos.');
          return;
        }
        setChurch(data.church);
        setLoadState('ready');
      } catch (e) {
        if (!cancelled) {
          setLoadState('error');
          setErrMsg(e instanceof Error ? e.message : 'Error al cargar.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loadState === 'loading') {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title="Editar ubicación" description="Cargando…" />
        <main className="flex-1 p-8">
          <p className="text-sm text-muted-foreground">Cargando…</p>
        </main>
      </div>
    );
  }

  if (loadState === 'error' || !church) {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader
          title="Ubicación no encontrada"
          description={errMsg ?? 'No hay una ubicación con este identificador.'}
        />
        <main className="flex-1 p-8">
          <Button asChild variant="outline">
            <Link href="/churches">Volver a ubicaciones</Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <EditTempleForm
      key={church.id}
      templeId={church.id}
      initial={{
        name: church.name,
        address: church.address,
        municipality: church.municipality,
        lat: church.lat,
        lng: church.lng,
        embedUrl: church.embedUrl,
        shareMapUrl: church.shareMapUrl,
        schedule: church.schedule,
      }}
    />
  );
}
