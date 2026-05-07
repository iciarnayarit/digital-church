'use client';

import Link from 'next/link';

export function PortalFooter() {
  return (
    <footer className="mt-auto border-t bg-background">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-10 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <section className="space-y-3">
          <h3 className="text-base font-bold tracking-wide text-foreground">ICIAR</h3>
          <p className="text-muted-foreground">
            Plataforma de gestion eclesiastica con integridad estructural.
          </p>
          <p className="text-muted-foreground">
            Magzn LLC, 800 Third Avenue Associates, New York, NY, 10022, United States
          </p>
          <p className="text-muted-foreground">© 2026 ICIAR. Todos los derechos reservados.</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Legal</h3>
          <div className="flex flex-col gap-2">
            <Link href="/privacy" className="text-muted-foreground transition-colors hover:text-foreground">
              Politica de privacidad
            </Link>
            <Link href="/terms" className="text-muted-foreground transition-colors hover:text-foreground">
              Terminos del servicio
            </Link>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Contacto</h3>
          <div className="flex flex-col gap-2">
            <Link href="/contact" className="text-muted-foreground transition-colors hover:text-foreground">
              Contactenos
            </Link>
            <Link href="/support" className="text-muted-foreground transition-colors hover:text-foreground">
              Soporte
            </Link>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Comunidad</h3>
          <div className="flex flex-col gap-2">
            <Link
              href="/documentacion"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Documentacion
            </Link>
          </div>
        </section>
      </div>
    </footer>
  );
}
