import Link from 'next/link';
import Image from 'next/image';
import {
  BookOpen,
  Building2,
  Heart,
  LayoutDashboard,
  Settings,
  Users2,
  HandHelping,
  Activity,
  Boxes,
  ChevronRight,
} from 'lucide-react';
import { DocumentacionTour } from '@/components/documentacion-tour';
import { PortalFooter } from '@/components/portal-footer';

type DocSection = {
  id: string;
  title: string;
  description: string;
  bullets: string[];
  quickLinks: Array<{ label: string; href: string }>;
};

type MenuItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
};

const DOC_SECTIONS: DocSection[] = [
  {
    id: 'panel',
    title: 'Panel',
    description: 'Vista general de métricas y actividad reciente del ministerio.',
    bullets: [
      'Muestra indicadores clave de miembros, asistencia, ofrendas y eventos.',
      'Permite cambiar el rango de tiempo (semana, mes, trimestre y año).',
      'Resume tendencias para una lectura rápida de la salud de la congregación.',
    ],
    quickLinks: [],
  },
  {
    id: 'directorio',
    title: 'Directorio',
    description: 'Gestión de miembros, perfiles y búsqueda por filtros.',
    bullets: [
      'Administra altas, ediciones y consulta de perfiles de miembros.',
      'Filtra por nombre, estado, grupos y otros criterios de búsqueda.',
      'Facilita acciones sobre miembros y acceso al historial personal.',
    ],
    quickLinks: [
      { label: 'Directorio de miembros', href: '/members' },
      { label: 'Registrar miembro', href: '/members/new' },
    ],
  },
  {
    id: 'iglesias',
    title: 'Iglesias',
    description: 'Registro de sedes, ubicaciones y datos de cada templo.',
    bullets: [
      'Centraliza la información de cada templo o campus.',
      'Permite crear, editar y consultar fichas de ubicación.',
      'Mantiene ordenada la estructura territorial del ministerio.',
    ],
    quickLinks: [
      { label: 'Listado de iglesias', href: '/churches' },
      { label: 'Nueva ubicación', href: '/churches/new' },
    ],
  },
  {
    id: 'ministerios',
    title: 'Ministerios',
    description: 'Organización de ministerios, líderes y asignaciones.',
    bullets: [
      'Crea ministerios con descripción y templo relacionado.',
      'Asigna líderes y miembros a cada ministerio.',
      'Da seguimiento al equipo activo por ministerio.',
    ],
    quickLinks: [
      { label: 'Listado de ministerios', href: '/ministries' },
      { label: 'Crear ministerio', href: '/ministries/new' },
    ],
  },
  {
    id: 'asistencia',
    title: 'Asistencia',
    description: 'Control de registros, consolidado y reportes de asistencia.',
    bullets: [
      'Registra asistencia por evento, servicio y fecha.',
      'Consolida estadísticas por periodos para análisis.',
      'Genera reportes para supervisión pastoral y administrativa.',
    ],
    quickLinks: [
      { label: 'Asistencia general', href: '/attendance' },
      { label: 'Registro consolidado', href: '/attendance/registro' },
    ],
  },
  {
    id: 'ofrendas',
    title: 'Ofrendas',
    description: 'Gestión de donaciones, campañas y estados de cuenta.',
    bullets: [
      'Registra donaciones por método, fondo y templo.',
      'Permite seguimiento de campañas de recaudación.',
      'Incluye reportes y estados de cuenta para miembros.',
    ],
    quickLinks: [
      { label: 'Listado de ofrendas', href: '/donations' },
      { label: 'Nueva ofrenda', href: '/donations/new' },
      { label: 'Campañas', href: '/donations/fundraising' },
    ],
  },
  {
    id: 'inventario',
    title: 'Inventario',
    description: 'Control de recursos, estados y clasificación de activos.',
    bullets: [
      'Registra recursos por categoría, estado y ubicación.',
      'Facilita el seguimiento de cantidad y condición.',
      'Ayuda a planear mantenimiento y reposición de activos.',
    ],
    quickLinks: [
      { label: 'Inventario', href: '/inventario' },
      { label: 'Nuevo recurso', href: '/inventario/nuevo' },
    ],
  },
  {
    id: 'configuracion',
    title: 'Configuración',
    description: 'Administración de usuarios, roles y permisos del portal.',
    bullets: [
      'Gestiona usuarios y acceso a módulos del sistema.',
      'Define roles con permisos por área de trabajo.',
      'Centraliza parámetros clave de operación.',
    ],
    quickLinks: [
      { label: 'Usuarios', href: '/settings/users' },
      { label: 'Roles', href: '/settings/roles' },
    ],
  },
];

const MENU_LIBRARY: MenuItem[] = [
  {
    label: 'Panel',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Resumen de métricas y actividad reciente.',
  },
  {
    label: 'Directorio',
    href: '/members',
    icon: Users2,
    description: 'Gestión de miembros y perfiles.',
  },
  {
    label: 'Iglesias',
    href: '/churches',
    icon: Building2,
    description: 'Sedes, ubicaciones y detalles por templo.',
  },
  {
    label: 'Ministerios',
    href: '/ministries',
    icon: HandHelping,
    description: 'Equipos, líderes y asignaciones.',
  },
  {
    label: 'Asistencia',
    href: '/attendance',
    icon: Activity,
    description: 'Registros y consolidado de asistencia.',
  },
  {
    label: 'Ofrendas',
    href: '/donations',
    icon: Heart,
    description: 'Donaciones, campañas y reportes.',
  },
  {
    label: 'Inventario',
    href: '/inventario',
    icon: Boxes,
    description: 'Recursos, estado y control de activos.',
  },
  {
    label: 'Configuración',
    href: '/settings/users',
    icon: Settings,
    description: 'Usuarios, roles y permisos del portal.',
  },
];

export default function DocumentacionPage() {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <p className="text-lg font-bold">Documentación ICIAR</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Inicio
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Ir al portal
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
        <section
          data-tour="doc-header"
          className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-5 sm:p-7"
        >
          <h1 className="text-2xl font-bold sm:text-3xl">Guía rápida de módulos</h1>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">
            Esta página resume el propósito de cada módulo principal de la plataforma para facilitar
            la adopción del equipo ministerial.
          </p>
          <div className="mt-4">
            <DocumentacionTour />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 text-xs sm:flex sm:flex-wrap sm:gap-3 sm:text-sm">
            <a href="#panel" className="rounded-md border bg-slate-50 px-3 py-2 text-center">Panel</a>
            <a href="#directorio" className="rounded-md border bg-slate-50 px-3 py-2 text-center">Directorio</a>
            <a href="#iglesias" className="rounded-md border bg-slate-50 px-3 py-2 text-center">Iglesias</a>
            <a href="#ministerios" className="rounded-md border bg-slate-50 px-3 py-2 text-center">Ministerios</a>
            <a href="#asistencia" className="rounded-md border bg-slate-50 px-3 py-2 text-center">Asistencia</a>
            <a href="#ofrendas" className="rounded-md border bg-slate-50 px-3 py-2 text-center">Ofrendas</a>
            <a href="#inventario" className="rounded-md border bg-slate-50 px-3 py-2 text-center">Inventario</a>
            <a href="#configuracion" className="rounded-md border bg-slate-50 px-3 py-2 text-center">Configuración</a>
          </div>
        </section>

        <section data-tour="menu-library" className="rounded-2xl border bg-white p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Librería del menú</h2>
              <p className="mt-1 text-sm text-slate-600">
                Pantallas rápidas de cada módulo del menú principal del portal.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MENU_LIBRARY.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="group rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                      <Icon className="h-5 w-5" />
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-3 font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-600">{item.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section data-tour="doc-sections" className="grid gap-4 sm:gap-5">
          {DOC_SECTIONS.map((section) => (
            <article id={section.id} key={section.id} className="rounded-xl border bg-white p-5 sm:p-6">
              <div className="flex items-start gap-3">
                {section.id === 'panel' ? (
                  <LayoutDashboard className="mt-0.5 h-5 w-5 text-blue-600" />
                ) : section.id === 'directorio' ? (
                  <Users2 className="mt-0.5 h-5 w-5 text-blue-600" />
                ) : section.id === 'iglesias' ? (
                  <Building2 className="mt-0.5 h-5 w-5 text-blue-600" />
                ) : section.id === 'configuracion' ? (
                  <Settings className="mt-0.5 h-5 w-5 text-blue-600" />
                ) : (
                  <Heart className="mt-0.5 h-5 w-5 text-blue-600" />
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-semibold">{section.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{section.description}</p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                  {section.id === 'panel' ? (
                    <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white p-2">
                      <Image
                        src="/documentacion/screenshots/dashboard-panel-area.png"
                        alt="Screenshot del módulo Panel en documentación"
                        width={1600}
                        height={900}
                        className="h-auto w-full rounded-md border"
                      />
                    </div>
                  ) : null}
                  {section.id === 'directorio' ? (
                    <div className="mt-4 space-y-3 overflow-hidden rounded-lg border border-slate-200 bg-white p-2">
                      <Image
                        src="/documentacion/screenshots/1-screencapture-churches-iciarnayarit-members-new-2026-05-07-00_48_40.png"
                        alt="Screenshot del módulo Directorio en documentación"
                        width={1200}
                        height={2600}
                        className="h-auto w-full rounded-md border"
                      />
                      <Image
                        src="/documentacion/screenshots/2-screencapture-churches-iciarnayarit-members-add-2026-05-07-00_49_49.png"
                        alt="Screenshot adicional del módulo Directorio en documentación"
                        width={1200}
                        height={2600}
                        className="h-auto w-full rounded-md border"
                      />
                      <Image
                        src="/documentacion/screenshots/3-screencapture-churches-iciarnayarit-members-2026-05-07-00_50_06.png"
                        alt="Tercer screenshot del módulo Directorio en documentación"
                        width={1600}
                        height={3000}
                        className="h-auto w-full rounded-md border"
                      />
                      <Image
                        src="/documentacion/screenshots/4-screencapture-churches-iciarnayarit-members-staff-2026-05-07-00_50_16.png"
                        alt="Cuarto screenshot del módulo Directorio en documentación"
                        width={1600}
                        height={3200}
                        className="h-auto w-full rounded-md border"
                      />
                    </div>
                  ) : null}
                  {section.id !== 'directorio' ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {section.quickLinks.map((quickLink) => (
                        <Link
                          key={quickLink.href + quickLink.label}
                          href={quickLink.href}
                          className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 sm:text-sm"
                        >
                          {quickLink.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
      <PortalFooter />
    </div>
  );
}

