import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  BarChart3,
  BookOpen,
  Calendar,
  Check,
  Clock,
  FileText,
  Headphones,
  MapPin,
  PlaySquare,
  Sparkles,
  TrendingUp,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeroPanelMock } from '@/components/landing/hero-panel-mock';
import { LandingHeader } from '@/components/landing/landing-header';
import { ICIAR_TEMPLES } from '@/lib/iciar-temples';
import { cn } from '@/lib/utils';

/** Vista de ejemplo en la tarjeta «Templo y directorio» (Templo La Nueva Jerusalén, Tepic). */
const LANDING_MAP_EMBED = ICIAR_TEMPLES[0]!;

const BRAND = 'ICIAR';

const LEGAL_ENTITY_ADDRESS =
  'Magzin LLC, 800 Third Avenue Associates, New York, NY, 10022, United States';

const CLERK_PRIVACY_URL = 'https://clerk.com/legal/privacy';
const CLERK_TERMS_URL = 'https://clerk.com/legal/terms';

const ICIAR_TEMPLE_COUNT = ICIAR_TEMPLES.length;

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-white text-slate-900 antialiased">
      <LandingHeader />

      <main>
        <section className="border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-24">
            <div>
              <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                Portal ministerial
              </span>
              <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:mt-6 sm:text-5xl lg:text-[2.75rem] lg:leading-tight">
                Gestión{' '}
                <span className="text-blue-600">ministerial</span>
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:mt-6 sm:text-lg">
                Transforme la administración de su congregación con una plataforma diseñada para la
                integridad estructural y la eficiencia en el servicio.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:gap-4">
                <Button
                  size="lg"
                  className="w-full rounded-lg bg-blue-600 px-6 font-semibold text-white shadow-md hover:bg-blue-700 sm:w-auto"
                  asChild
                >
                  <Link href="/sign-in">Explorar el portal ministerial</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full rounded-lg border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
                  asChild
                >
                  <Link href="/sign-up">Solicitar demo</Link>
                </Button>
              </div>
            </div>
            <div className="mx-auto mt-1 w-full max-w-sm sm:max-w-md lg:mx-0 lg:mt-0">
              <HeroPanelMock />
            </div>
          </div>
        </section>

        <section id="servicios" className="scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Estructura para el crecimiento
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Herramientas precisas diseñadas para cada faceta de su ministerio.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:mt-12 lg:mt-14 lg:grid-cols-4 lg:grid-rows-2">
              <article
                id="ofrendas"
                className={cn(
                  'flex flex-col scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6',
                  'lg:col-span-2 lg:row-span-2 lg:row-start-1 lg:col-start-1'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Miembros y finanzas</h3>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Directorio, pastoral, reportes y seguimiento de donaciones en un solo entorno.
                </p>
                <div className="mt-6 flex flex-1 flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { label: 'Miembros activos', value: '1 248', delta: '+32 mes' },
                      { label: 'Donación del mes', value: '$142k', delta: 'Meta 92%' },
                      { label: 'Asistencia prom.', value: '78%', delta: '+4% vs. ant.' },
                    ].map((k) => (
                      <div
                        key={k.label}
                        className="rounded-lg bg-white p-2.5 shadow-sm ring-1 ring-slate-100 sm:p-3"
                      >
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 sm:text-[10px]">
                          {k.label}
                        </p>
                        <p className="mt-1 text-[1.65rem] font-bold leading-none tabular-nums text-slate-900 sm:text-lg">
                          {k.value}
                        </p>
                        <p className="mt-1 text-[10px] text-emerald-600 sm:text-[10px]">{k.delta}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-100">
                    <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Vista previa del directorio
                    </p>
                    <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 gap-y-2 text-[11px] sm:gap-x-3 sm:text-xs">
                      <span className="border-b border-slate-100 pb-1.5 font-medium text-slate-400">
                        Miembro
                      </span>
                      <span className="border-b border-slate-100 pb-1.5 font-medium text-slate-400">
                        Estado
                      </span>
                      <span className="border-b border-slate-100 pb-1.5 font-medium text-slate-400">
                        Última visita
                      </span>
                      {[
                        ['Ana G.', 'Activo', 'Hace 2 d'],
                        ['Luis M.', 'Visitante', '1 sem.'],
                        ['Rosa T.', 'Activo', 'Ayer'],
                      ].map(([name, state, when]) => (
                        <React.Fragment key={name}>
                          <span className="truncate font-medium text-slate-800">{name}</span>
                          <span
                            className={cn(
                              'whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-[10px]',
                              state === 'Activo'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-800'
                            )}
                          >
                            {state}
                          </span>
                          <span className="whitespace-nowrap text-slate-500">{when}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Asistencia por semana
                    </p>
                    <div className="flex items-end justify-between gap-1.5 border-b border-slate-200/80 pb-0.5">
                      {[
                        { h: 42, m: 'S1' },
                        { h: 68, m: 'S2' },
                        { h: 48, m: 'S3' },
                        { h: 82, m: 'S4' },
                        { h: 58, m: 'S5' },
                        { h: 92, m: 'S6' },
                        { h: 72, m: 'S7' },
                      ].map(({ h, m }) => (
                        <div key={m} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                          <div
                            className="w-full max-w-[28px] rounded-t-sm bg-gradient-to-t from-blue-600 to-blue-400 shadow-sm"
                            style={{ height: `${h}px` }}
                          />
                          <span className="text-[10px] font-medium text-slate-500">{m}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </article>

              <article
                className={cn(
                  'flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6',
                  'lg:col-start-3 lg:row-start-1'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Templo y directorio</h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {ICIAR_TEMPLE_COUNT} sedes en la red ICIAR Nayarit
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                    Ejemplo
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Ubicaciones, templos y asignación por congregación.
                </p>
                <div className="relative mt-4 min-h-[180px] flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-inner sm:min-h-0 sm:aspect-[4/3]">
                  <iframe
                    title={`Mapa: ${LANDING_MAP_EMBED.name}`}
                    src={LANDING_MAP_EMBED.embedUrl}
                    className="absolute inset-0 h-full w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
                <a
                  href={LANDING_MAP_EMBED.shareMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 text-center text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 hover:text-blue-800 sm:min-h-0 sm:justify-start sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:text-left sm:font-medium sm:hover:bg-transparent"
                >
                  Abrir ubicación en Google Maps
                </a>
              </article>

              <article
                className={cn(
                  'flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm',
                  'lg:col-start-4 lg:row-start-1'
                )}
              >
                <div className="p-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Biblia y estudio</h3>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">
                        Palabra, luz y dirección
                      </p>
                    </div>
                  </div>
                  <blockquote className="mt-4 border-l-4 border-amber-400/80 bg-amber-50/60 py-2 pl-4 pr-2">
                    <p className="text-sm italic leading-relaxed text-slate-700">
                      «Lámpara es a mis pies tu palabra, y lumbrera a mi camino.»
                    </p>
                    <footer className="mt-2 text-xs font-medium not-italic text-amber-900/80">
                      Salmo 119:105
                    </footer>
                  </blockquote>
                </div>

                <div className="relative aspect-[5/4] min-h-[140px] w-full sm:aspect-[4/3]">
                  <Image
                    src="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=900&q=80"
                    alt="Biblia abierta con luz cálida, ambiente de estudio y reflexión"
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 1024px) 100vw, 25vw"
                    loading="lazy"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/35 to-amber-900/15"
                    aria-hidden
                  />
                  <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2 p-4">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-white drop-shadow-md sm:text-sm">
                      Luz en cada paso del ministerio
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/90 px-4 py-3">
                  {['Lectura guiada', 'Notas y marcadores', 'Planes de lectura'].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-slate-200/80 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 shadow-sm sm:text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </article>

              <article
                className={cn(
                  'flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6',
                  'lg:col-span-2 lg:col-start-3 lg:row-start-2'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                      <PlaySquare className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Librería multimedia</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Sermones, audio y documentos organizados para su equipo.
                      </p>
                    </div>
                  </div>
                  <span className="hidden shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600 sm:inline-block">
                    128 recursos
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    { label: 'Vídeo', count: 48, active: true },
                    { label: 'Audio', count: 62, active: false },
                    { label: 'PDF', count: 18, active: false },
                  ].map((chip) => (
                    <span
                      key={chip.label}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                        chip.active
                          ? 'border-blue-200 bg-blue-50 text-blue-800 ring-1 ring-blue-100'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      )}
                    >
                      {chip.label}
                      <span
                        className={cn(
                          'tabular-nums',
                          chip.active ? 'text-blue-600' : 'text-slate-400'
                        )}
                      >
                        {chip.count}
                      </span>
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex min-h-0 flex-1 flex-col rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50/90 to-slate-100/80 p-3 sm:p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Recientes en la biblioteca
                  </p>
                  <ul className="mt-3 space-y-2">
                    {[
                      {
                        title: 'Culto dominical — Esperanza viva',
                        meta: 'Vídeo · 42 min',
                        icon: Video,
                        tone: 'text-rose-600 bg-rose-50',
                      },
                      {
                        title: 'Serie: Efesios (notas de estudio)',
                        meta: 'PDF · 18 págs.',
                        icon: FileText,
                        tone: 'text-amber-700 bg-amber-50',
                      },
                      {
                        title: 'Noche de alabanza (audio)',
                        meta: 'Audio · 1 h 04 min',
                        icon: Headphones,
                        tone: 'text-violet-600 bg-violet-50',
                      },
                    ].map((item) => {
                      const ItemIcon = item.icon;
                      return (
                      <li
                        key={item.title}
                        className="flex items-center gap-3 rounded-lg border border-white/80 bg-white/90 p-2.5 shadow-sm ring-1 ring-slate-100/80"
                      >
                        <span
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                            item.tone
                          )}
                        >
                          <ItemIcon className="h-4 w-4" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-slate-900 sm:text-sm">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-slate-500 sm:text-xs">{item.meta}</p>
                        </div>
                      </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <p className="text-xs text-slate-500 sm:text-xs">
                    Comparta enlaces seguros con líderes y grupos.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 shrink-0 rounded-lg border-blue-200 px-4 font-semibold text-blue-700 hover:bg-blue-50"
                    asChild
                  >
                    <Link href="/sign-in">Explorar biblioteca</Link>
                  </Button>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section
          id="recursos"
          className="scroll-mt-20 border-y border-slate-100 bg-slate-50/50 py-20 sm:py-24"
        >
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-900 shadow-xl">
              <Image
                src="https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=900&q=80"
                alt="Biblia abierta sobre una mesa de madera"
                fill
                className="object-cover opacity-90"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Estudio profundo y claridad exegética
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Nuestra suite de herramientas de estudio permite a los líderes profundizar en la
                Palabra con una interfaz libre de distracciones.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  {
                    title: 'Lectura inmersiva',
                    desc: 'Diseño optimizado para la concentración prolongada.',
                  },
                  {
                    title: 'Sincronización multi-dispositivo',
                    desc: 'Notas y estudios disponibles dondequiera que sirva.',
                  },
                  {
                    title: 'Recursos interconectados',
                    desc: 'Acceso a concordancias y comentarios en contexto.',
                  },
                ].map((item) => (
                  <li key={item.title} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="text-sm text-slate-600">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section
          id="comunidad"
          className="relative scroll-mt-20 overflow-hidden py-16 text-center sm:py-24"
        >
          <Image
            src="https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=1920&q=80"
            alt=""
            fill
            className="object-cover object-center"
            sizes="100vw"
            priority={false}
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-slate-950/92 via-slate-900/88 to-slate-950/93"
            aria-hidden
          />
          <div className="relative z-10 mx-auto max-w-3xl px-5 sm:px-6">
            <TrendingUp className="mx-auto h-10 w-10 text-blue-300 drop-shadow-sm" aria-hidden />
            <h2 className="mt-6 text-4xl font-bold text-white drop-shadow-md sm:text-4xl">
              ¿Listo para transformar su ministerio?
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-blue-100 drop-shadow-sm sm:text-lg">
              Únase a congregaciones que ya operan con claridad y eficiencia en la administración
              diaria.
            </p>
            <Button
              size="lg"
              className="mt-8 h-12 w-full rounded-lg bg-blue-600 px-8 text-base font-semibold text-white shadow-lg shadow-blue-950/40 hover:bg-blue-500 sm:mt-10 sm:h-11 sm:w-auto sm:text-sm"
              asChild
            >
              <Link href="/sign-up">Comenzar gratis hoy</Link>
            </Button>
          </div>
        </section>

        <section
          id="eventos"
          className="scroll-mt-20 border-t border-slate-100 bg-white py-16 sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Eventos
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Encuentros, conferencias y actividades para fortalecer a su congregación. Manténgase
                al día con el calendario ministerial.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: 'Conferencia de liderazgo',
                  date: '15 de mayo, 2026',
                  time: '9:00 – 14:00 h',
                  place: 'Auditorio central',
                  tag: 'Presencial',
                },
                {
                  title: 'Noche de alabanza',
                  date: '22 de mayo, 2026',
                  time: '19:00 h',
                  place: 'Templo principal',
                  tag: 'Abierto a todos',
                },
                {
                  title: 'Capacitación de voluntarios',
                  date: '5 de junio, 2026',
                  time: '10:00 – 12:30 h',
                  place: 'Salón de formación',
                  tag: 'Inscripción',
                },
              ].map((ev) => (
                <article
                  key={ev.title}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6"
                >
                  <span className="inline-flex w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    {ev.tag}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">{ev.title}</h3>
                  <ul className="mt-4 space-y-3 text-sm text-slate-600">
                    <li className="flex items-start gap-2">
                      <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                      <span>{ev.date}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                      <span>{ev.time}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                      <span>{ev.place}</span>
                    </li>
                  </ul>
                  <div className="mt-6">
                    <Button
                      variant="outline"
                      className="w-full rounded-lg border-slate-300 font-semibold text-slate-800 hover:bg-white"
                      asChild
                    >
                      <Link href="/sign-up">Más información</Link>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <footer className="border-t border-slate-200 bg-white py-12 sm:py-14">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-2 sm:gap-10 sm:px-6 lg:grid-cols-4">
            <div>
              <p className="text-lg font-bold text-slate-900">{BRAND}</p>
              <p className="mt-3 text-sm text-slate-600">
                Plataforma de gestión eclesiástica con integridad estructural.
              </p>
              <address className="mt-6 not-italic">
                <p className="text-xs leading-relaxed text-slate-500">{LEGAL_ENTITY_ADDRESS}</p>
              </address>
              <p className="mt-3 text-xs text-slate-400">
                © {new Date().getFullYear()} {BRAND}. Todos los derechos reservados.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Legal</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>
                  <a
                    href={CLERK_PRIVACY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600"
                  >
                    Política de privacidad
                  </a>
                </li>
                <li>
                  <a
                    href={CLERK_TERMS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600"
                  >
                    Términos del servicio
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Contacto</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>
                  <a href="#" className="hover:text-blue-600">
                    Contáctenos
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600">
                    Soporte
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Comunidad</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>
                  <a href="#" className="hover:text-blue-600">
                    Documentación
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
