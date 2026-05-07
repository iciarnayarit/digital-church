'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const TABS = [
  {
    id: 'servicios',
    label: 'Servicios',
    value: '12',
    suffix: 'activos',
    detail: 'Directorio, templos y ministerios',
  },
  {
    id: 'ofrendas',
    label: 'Ofrendas',
    value: '+18%',
    suffix: 'vs. mes ant.',
    detail: 'Seguimiento y reportes en vivo',
  },
  {
    id: 'recursos',
    label: 'Recursos',
    value: '24',
    suffix: 'estudios',
    detail: 'Biblia, notas y multimedia',
  },
  {
    id: 'comunidad',
    label: 'Comunidad',
    value: '8',
    suffix: 'grupos',
    detail: 'Participación y pastoral',
  },
  {
    id: 'eventos',
    label: 'Eventos',
    value: '3',
    suffix: 'próximos',
    detail: 'Calendario unificado',
  },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function HeroPanelMock() {
  const [active, setActive] = React.useState<TabId>('servicios');
  const gradId = React.useId().replace(/:/g, '');
  const tab = TABS.find((t) => t.id === active) ?? TABS[0];

  return (
    <div className="relative mx-auto aspect-[5/6] w-full max-w-md sm:aspect-square lg:mx-0">
      <div
        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 p-[2px] shadow-2xl shadow-blue-500/25 ring-1 ring-white/10"
        aria-hidden
      >
        <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-slate-950">
          <div className="flex items-center justify-between border-b border-white/5 px-3 py-2.5 sm:px-4 sm:py-3">
            <span className="text-xs font-medium tracking-wide text-slate-400">Panel</span>
            <span className="flex items-center gap-1.5 rounded-full bg-slate-800/90 px-2.5 py-1 text-[10px] font-medium text-slate-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              En vivo
            </span>
          </div>

          <div
            className="relative min-h-0 flex-1 bg-[linear-gradient(rgba(59,130,246,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.04)_1px,transparent_1px)] bg-[size:16px_16px] p-3 sm:p-4"
            style={{
              backgroundPosition: '0 0, 0 0',
            }}
          >
            <div className="flex h-full flex-col rounded-xl border border-white/5 bg-slate-900/60 p-3.5 shadow-inner backdrop-blur-sm sm:p-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Resumen
              </p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold tabular-nums tracking-tight text-white">
                  {tab.value}
                </span>
                <span className="text-xs text-slate-500">{tab.suffix}</span>
              </div>
              <p className="mt-2 text-[11px] leading-snug text-slate-400">{tab.detail}</p>

              <div className="mt-auto pt-4">
                <div className="mb-2 flex items-center justify-between text-[9px] text-slate-500">
                  <span>Tendencia 6 meses</span>
                  <span className="text-emerald-400/90">↑ Estable</span>
                </div>
                <svg
                  viewBox="0 0 200 72"
                  className="h-20 w-full text-blue-500"
                  aria-hidden
                >
                  <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 52 L28 44 L48 48 L72 32 L96 40 L120 22 L142 28 L164 14 L200 8 L200 72 L0 72 Z"
                    fill={`url(#${gradId})`}
                  />
                  <path
                    d="M0 52 L28 44 L48 48 L72 32 L96 40 L120 22 L142 28 L164 14 L200 8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M0 58 L40 54 L80 56 L120 50 L160 46 L200 42"
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity="0.2"
                    strokeWidth="1"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 bg-slate-950/80 p-2">
            <div className="grid grid-cols-5 gap-1">
              {TABS.map((t) => {
                const isOn = active === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActive(t.id)}
                    className={cn(
                      'flex min-h-[44px] items-center justify-center rounded-md px-0.5 py-1 text-center text-[8px] font-semibold leading-tight transition-colors active:opacity-90 sm:min-h-[36px] sm:px-1 sm:py-2 sm:text-[9px]',
                      isOn
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                        : 'bg-slate-900/90 text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
