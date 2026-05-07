
'use client';

import * as React from 'react';
import { MapPin, MoreHorizontal, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AppHeader } from '@/components/app-header';
import Link from 'next/link';
import { dedupeChurchesById, type ChurchLocation } from '@/lib/church-locations';
import { isPastorScopedRole } from '@/lib/pastor-church-access';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type TempleRow = {
  id: string;
  name: string;
  address: string;
  municipality: string;
};

function mapChurchToTemple(doc: ChurchLocation): TempleRow {
  return {
    id: doc.id,
    name: doc.name,
    address: doc.address,
    municipality: doc.city || doc.municipality || '',
  };
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function AttendancePage() {
  const [temples, setTemples] = React.useState<TempleRow[]>([]);
  const [loadState, setLoadState] = React.useState<'loading' | 'error' | 'ready'>('loading');
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadState('loading');
      setLoadError(null);
      try {
        const roleRes = await fetch('/api/members/me-role', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const roleData = (await roleRes.json().catch(() => ({}))) as {
          staffRole?: string | null;
        };
        const churchesUrl = isPastorScopedRole(roleData.staffRole)
          ? '/api/churches?sessionChurchScope=1'
          : '/api/churches';

        const res = await fetch(churchesUrl, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const data = (await res.json().catch(() => ({}))) as {
          churches?: ChurchLocation[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || 'No se pudieron cargar los templos.');
        }
        if (cancelled) return;
        const rows = dedupeChurchesById(data.churches ?? []).map(mapChurchToTemple);
        setTemples(rows);
        setLoadState('ready');
      } catch (e) {
        if (cancelled) return;
        setTemples([]);
        setLoadState('error');
        setLoadError(e instanceof Error ? e.message : 'Error al cargar.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredTemples = React.useMemo(() => {
    const q = normalizeSearchText(searchTerm);
    if (!q) return temples;
    return temples.filter((t) =>
      normalizeSearchText(`${t.name} ${t.address} ${t.municipality}`).includes(q)
    );
  }, [temples, searchTerm]);

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        title="Asistencia"
        description="Seleccione un templo para registrar servicio o evento."
      >
        <Button asChild>
          <Link href="/churches/new">
            <Plus className="mr-2 h-4 w-4" /> Añadir Templo
          </Link>
        </Button>
      </AppHeader>
      <main className="flex-1 bg-muted/20 p-4 sm:p-8">
        <Card>
          <CardContent className="space-y-6 p-4 sm:p-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar templo..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {loadState === 'loading' ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Cargando templos…</p>
            ) : null}
            {loadState === 'error' ? (
              <p className="py-8 text-center text-sm text-destructive">{loadError}</p>
            ) : null}
            {loadState === 'ready' && filteredTemples.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No hay templos que coincidan.
              </p>
            ) : null}

            {loadState === 'ready' && filteredTemples.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredTemples.map((temple) => (
                  <Card key={temple.id} className="border-border/70">
                    <CardContent className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-semibold">{temple.name}</h3>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Opciones de ${temple.name}`}>
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/attendance/${encodeURIComponent(temple.id)}`}>
                                Detalles
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div>
                        <p className="mt-1 text-sm text-muted-foreground">{temple.address}</p>
                        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {temple.municipality || 'Sin municipio'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
