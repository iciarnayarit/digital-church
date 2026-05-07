# Digital Church (ICIAR)

Aplicación web para gestión ministerial construida con Next.js (App Router), Clerk y MongoDB.

## Estructura del proyecto

```txt
digital-church/
├── public/                     # Assets públicos (imágenes, screenshots, favicon)
├── docs/                       # Documentación interna del proyecto
├── src/
│   ├── app/                    # Rutas de páginas y API (Next.js App Router)
│   │   ├── api/                # Endpoints backend (/api/*)
│   │   ├── dashboard/          # Módulo Panel
│   │   ├── members/            # Módulo Directorio
│   │   ├── churches/           # Módulo Iglesias
│   │   ├── ministries/         # Módulo Ministerios
│   │   ├── attendance/         # Módulo Asistencia
│   │   ├── donations/          # Módulo Ofrendas
│   │   ├── inventario/         # Módulo Inventario
│   │   ├── settings/           # Módulo Configuración
│   │   └── ...                 # Otros módulos (eventos, ceremonias, reportes, etc.)
│   ├── components/             # Componentes UI y de negocio
│   ├── contexts/               # Context providers (navegación, estado global)
│   ├── lib/                    # Utilidades, permisos, helpers y schemas
│   └── ai/                     # Flujos de IA (Genkit)
├── package.json
├── next.config.ts
└── tailwind.config.ts
```

## APIs disponibles (`/api`)

### Dashboard y sesión
- `GET /api/dashboard`
- `GET /api/members/me`
- `GET /api/members/me-role`
- `GET /api/members/me-nav`
- `GET /api/mongo/ping`

### Miembros, staff y pastoral
- `GET|POST /api/members`
- `GET|PUT|DELETE /api/members/[id]`
- `GET /api/members/[id]/attendance`
- `GET /api/members/[id]/donations`
- `GET /api/staff/pastors`

### Iglesias
- `GET|POST /api/churches`
- `GET|PUT|DELETE /api/churches/[id]`
- `GET|POST|DELETE /api/churches/[id]/attendance`
- `GET /api/churches/created-by-me`

### Ministerios
- `GET|POST /api/ministries`
- `GET|PUT|DELETE /api/ministries/[id]`
- `POST /api/ministries/[id]/assign-members`
- `POST /api/ministries/[id]/roster`
- `GET /api/ministries/catalog`

### Asistencia
- `GET|POST /api/attendance/registro`
- `GET /api/attendance/registro/event-names`

### Ofrendas y recaudación
- `GET|POST /api/donations`
- `GET|PUT|DELETE /api/donations/[id]`
- `GET /api/donations/donors`
- `POST /api/donations/statement`
- `POST /api/donations/giving-statement/send-email`
- `GET|POST /api/fundraising`
- `GET|PATCH|DELETE /api/fundraising/[id]`

### Inventario y recursos
- `GET|POST /api/inventory`
- `GET|POST /api/inventory/categories`
- `GET|POST /api/inventory/church-areas`
- `GET /api/inventory/taxonomy`
- `GET|POST /api/resource`
- `POST /api/resource/seed-default-categories`

### Configuración y usuarios portal
- `GET|POST /api/settings/portal-users`
- `GET|PATCH|DELETE /api/settings/portal-users/[id]`
- `POST /api/settings/portal-users/invite`
- `GET|POST /api/staff-roles`
- `GET|PATCH|DELETE /api/staff-roles/[id]`

### Utilidades
- `POST /api/member-photo-uploads`

## Ligas de páginas por menú

Basado en la configuración del menú lateral (`src/lib/portal-nav-data.tsx`) y rutas existentes.

### Panel
- `/dashboard`

### Directorio
- `/members/new`
- `/members/add`
- `/members`
- `/members/staff`

Relacionadas:
- `/members/[id]`
- `/members/[id]/edit`
- `/members/[id]/attendance`
- `/members/[id]/donations`
- `/members/send-email`
- `/members/bulk-actions`

### Iglesias
- `/churches/new`
- `/churches`

Relacionadas:
- `/churches/[id]`
- `/churches/[id]/edit`

### Ministerios
- `/ministries/new`
- `/ministries`
- `/ministries/assign-members`

Relacionadas:
- `/ministries/[id]`
- `/ministries/[id]/edit`

### Asistencia
- `/attendance`
- `/attendance/registro`
- `/attendance/report`

Relacionadas:
- `/attendance/[id]`

### Ofrendas
- `/donations/new`
- `/donations/fundraising/new`
- `/donations`
- `/donations/giving-statement`
- `/donations/fundraising`

Relacionadas:
- `/donations/[id]`
- `/donations/[id]/edit`
- `/donations/pledges`
- `/donations/fundraising/[id]/edit`
- `/donations/fundraising/[id]/report`

### Inventario
- `/inventario`
- `/inventario/nuevo`

Relacionadas:
- `/inventario/categorias/nueva`
- `/inventario/estados/nueva`
- `/inventario/condiciones/nueva`
- `/inventario/areas/[churchId]`

### Configuración
- `/settings/new`
- `/settings/roles`
- `/settings/users`

Relacionadas:
- `/settings`
- `/settings/users/[id]/edit`

## Otras páginas existentes (fuera del menú principal)

- `/`
- `/documentacion`
- `/sign-in/[[...sign-in]]`
- `/sign-up/[[...sign-up]]`
- `/events`, `/events/new`, `/events/[id]`, `/events/[id]/edit`, `/events/activities`
- `/ceremonies`, `/ceremonies/new`, `/ceremonies/[id]`, `/ceremonies/[id]/edit`, `/ceremonies/export`
- `/groups`, `/groups/new`, `/groups/[id]/edit`, `/groups/add-members`
- `/volunteers`, `/volunteers/new`, `/volunteers/[id]/edit`, `/volunteers/planning`, `/volunteers/tasks`
- `/financial`, `/financial/budget`, `/financial/funds`, `/financial/income-expense`, `/financial/new-transaction`, `/financial/donations`
- `/reports`, `/reports/volunteers`
- `/facilities`, `/facilities/new`
- `/prayer`, `/prayer/new`
- `/sermons`, `/sermons/new`, `/sermons/list`, `/sermons/audio`, `/sermons/images`, `/sermons/videos`
