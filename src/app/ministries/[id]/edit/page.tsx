'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { AppHeader } from '@/components/app-header';
import type { MinistryDocument, MinistryLeader } from '@/lib/ministries';
import { useToast } from '@/hooks/use-toast';

/** Templos (`churches.id`) para filtrar el buscador de líderes: principal del ministerio o los del creador. */
function ministryTempleIdsForMemberSearch(m: MinistryDocument): string[] {
  const primary = m.churchId?.trim();
  if (primary) return [primary];
  const fromCreator = (m.creatorChurchIds ?? [])
    .map((x) => String(x ?? '').trim())
    .filter(Boolean);
  return [...new Set(fromCreator)];
}

export default function EditMinistryPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id =
    typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ministry, setMinistry] = React.useState<MinistryDocument | null>(null);
  const [loadState, setLoadState] = React.useState<'loading' | 'error' | 'ready'>('loading');
  const [errMsg, setErrMsg] = React.useState<string | null>(null);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [leaders, setLeaders] = React.useState<MinistryLeader[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filteredLeaders, setFilteredLeaders] = React.useState<MinistryLeader[]>([]);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const [saving, setSaving] = React.useState(false);

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
        const res = await fetch(`/api/ministries/${encodeURIComponent(id)}`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const data = (await res.json().catch(() => ({}))) as {
          ministry?: MinistryDocument;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || 'No se pudo cargar el ministerio.');
        }
        if (cancelled) return;
        if (!data.ministry) {
          setLoadState('error');
          setErrMsg('No se recibieron datos.');
          return;
        }
        const m = data.ministry;
        setMinistry(m);
        setName(m.name);
        setDescription(m.description);
        setLeaders(m.leaders.map((l) => ({ ...l })));
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

  React.useEffect(() => {
    const q = searchTerm.trim();
    if (!q) {
      setFilteredLeaders([]);
      setHighlightedIndex(-1);
      return;
    }
    if (!ministry) {
      setFilteredLeaders([]);
      setHighlightedIndex(-1);
      return;
    }
    const templeIds = ministryTempleIdsForMemberSearch(ministry);
    if (templeIds.length === 0) {
      setFilteredLeaders([]);
      setHighlightedIndex(-1);
      return;
    }
    const added = new Set(leaders.map((l) => String(l.id)));
    let cancelled = false;
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams();
          params.set('q', q);
          params.set('limit', '8');
          if (templeIds.length === 1) {
            params.set('churchId', templeIds[0]!);
          } else {
            params.set('churchIds', templeIds.join(','));
          }
          const res = await fetch(`/api/members?${params.toString()}`, {
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          });
          const data = (await res.json().catch(() => ({}))) as {
            members?: Array<{
              id: string;
              firstName: string;
              lastName: string;
              email: string;
            }>;
            error?: string;
          };
          if (!res.ok) {
            throw new Error(data.error || 'No se pudo buscar miembros.');
          }
          if (cancelled) return;
          const suggestions = (data.members ?? [])
            .map((m) => ({
              id: m.id,
              name: `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || 'Sin nombre',
              email: m.email ?? '',
            }))
            .filter((m) => !added.has(String(m.id)));
          setFilteredLeaders(suggestions);
          setHighlightedIndex(-1);
        } catch {
          if (!cancelled) {
            setFilteredLeaders([]);
            setHighlightedIndex(-1);
          }
        }
      })();
    }, 250);
    return () => {
      cancelled = true;
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
    };
  }, [searchTerm, leaders, ministry]);

  const removeLeader = (leaderId: string) => {
    setLeaders((prev) => prev.filter((leader) => String(leader.id) !== leaderId));
  };

  const addLeader = (leader: MinistryLeader) => {
    setLeaders((prev) => [...prev, leader]);
    setSearchTerm('');
    setFilteredLeaders([]);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && searchTerm === '' && leaders.length > 0) {
      const lastLeader = leaders[leaders.length - 1];
      removeLeader(String(lastLeader.id));
    } else if (filteredLeaders.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % filteredLeaders.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(
          (prev) => (prev - 1 + filteredLeaders.length) % filteredLeaders.length
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredLeaders.length) {
          addLeader(filteredLeaders[highlightedIndex]);
        }
      }
    }
  };

  const handleSave = async () => {
    if (!id?.trim() || !ministry) return;
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Faltan datos',
        description: 'Complete el nombre del ministerio.',
      });
      return;
    }
    if (leaders.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Sin líderes',
        description: 'Debe haber al menos un líder.',
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/ministries/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          leaders: leaders.map((l) => ({
            id: l.id,
            name: l.name,
            email: l.email,
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar.');
      }
      toast({
        title: 'Cambios guardados',
        description: data.message || 'El ministerio se actualizó correctamente.',
      });
      router.push(`/ministries/${id}`);
      router.refresh();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: e instanceof Error ? e.message : 'No se pudo guardar.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loadState === 'loading') {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title="Editar ministerio" description="Cargando…" />
        <main className="flex-1 p-8">
          <p className="text-sm text-muted-foreground">Cargando…</p>
        </main>
      </div>
    );
  }

  if (loadState === 'error' || !ministry) {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader
          title="Ministerio no encontrado"
          description={errMsg ?? 'No existe este ministerio.'}
        />
        <main className="flex-1 p-8">
          <Button variant="outline" asChild>
            <Link href="/ministries">Volver a ministerios</Link>
          </Button>
        </main>
      </div>
    );
  }

  const leaderSearchTempleIds = ministryTempleIdsForMemberSearch(ministry);

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        title="Editar Ministerio"
        description={`Modifique los detalles del ministerio «${name}».`}
      >
        <div className="hidden w-full flex-col-reverse gap-2 min-[380px]:flex-row min-[380px]:justify-end sm:flex sm:w-auto sm:flex-none sm:items-center">
          <Button variant="outline" asChild>
            <Link href={`/ministries/${id}`}>Cancelar</Link>
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar Cambios'}
          </Button>
        </div>
      </AppHeader>
      <main className="flex-1 space-y-6 bg-muted/20 p-4 sm:p-8">
        <div className="pb-24 sm:pb-0">
        <Card className="mx-auto max-w-3xl">
          <CardHeader>
            <CardTitle>Detalles del Ministerio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="ministry-name">Nombre del Ministerio</Label>
              <Input
                id="ministry-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ministry-leaders">Líder(es) del Ministerio</Label>
              <p className="text-sm text-muted-foreground">
                Solo aparecen miembros de{' '}
                {leaderSearchTempleIds.length > 0
                  ? leaderSearchTempleIds.length > 1
                    ? 'los templos vinculados a este ministerio'
                    : 'el templo vinculado a este ministerio'
                  : 'un templo (este ministerio no tiene templo asociado en el registro)'}
                .
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="ministry-leaders"
                  placeholder={
                    leaderSearchTempleIds.length > 0
                      ? 'Buscar miembros de este templo…'
                      : 'Sin templo asociado — no hay búsqueda'
                  }
                  disabled={leaderSearchTempleIds.length === 0}
                  className="h-11 pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                {filteredLeaders.length > 0 ? (
                  <div className="absolute left-0 top-full z-10 mt-2 w-full rounded-md border bg-background shadow-lg">
                    {filteredLeaders.map((member, index) => (
                      <div
                        key={String(member.id)}
                        className={cn(
                          'cursor-pointer p-2 hover:bg-accent',
                          index === highlightedIndex && 'bg-accent'
                        )}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          addLeader(member);
                        }}
                      >
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="mt-2 space-y-2">
                {leaders.map((leader) => (
                  <div
                    key={String(leader.id)}
                    className="flex items-center justify-between rounded-lg border bg-secondary p-2"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={`https://picsum.photos/seed/${encodeURIComponent(String(leader.id))}/32/32`}
                          alt={leader.name}
                        />
                        <AvatarFallback>{leader.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{leader.name}</p>
                        <p className="text-xs text-muted-foreground">{leader.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      type="button"
                      onClick={() => removeLeader(String(leader.id))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        </div>

        <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:hidden">
          <div className="grid grid-cols-2 gap-2 pb-[max(env(safe-area-inset-bottom),0px)]">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/ministries/${id}`}>Cancelar</Link>
            </Button>
            <Button size="sm" type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
