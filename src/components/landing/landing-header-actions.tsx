'use client';

import * as React from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { LANDING_NAV_LINKS } from '@/components/landing/landing-nav-sections';
import type { LandingScrollSectionId } from '@/components/landing/landing-nav-sections';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  activeSectionId?: LandingScrollSectionId | null;
};

export function LandingHeaderActions({ activeSectionId = null }: Props) {
  const { isSignedIn, isLoaded } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isMobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMobileMenuOpen]);

  if (!isLoaded) {
    return (
      <div
        className="flex h-9 w-28 animate-pulse items-center justify-end rounded-md bg-slate-100 sm:w-52"
        aria-hidden
      />
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {isSignedIn ? (
        <Button
          size="sm"
          className="rounded-lg border-blue-200 bg-white font-semibold text-blue-700 shadow-sm hover:bg-blue-50"
          asChild
        >
          <Link href="/dashboard">Ir al panel</Link>
        </Button>
      ) : (
        <>
          <Button variant="ghost" size="sm" className="hidden text-slate-600 sm:inline-flex" asChild>
            <Link href="/sign-in">Iniciar sesión</Link>
          </Button>
          <Button
            size="sm"
            className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 sm:px-4"
            asChild
          >
            <Link href="/sign-up">Comenzar</Link>
          </Button>
        </>
      )}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50',
            isMobileMenuOpen && 'border-blue-200 text-blue-700'
          )}
          aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {isMobileMenuOpen ? (
          <>
            <button
              type="button"
              aria-label="Cerrar menú"
              className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px]"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="fixed right-3 top-[calc(env(safe-area-inset-top,0px)+3.75rem)] z-50 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl shadow-slate-900/15">
              {LANDING_NAV_LINKS.map(({ id, label }) => {
                const active = activeSectionId === id;
                return (
                  <a
                    key={id}
                    href={`#${id}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      'block px-4 py-2.5 text-base font-medium hover:bg-slate-50',
                      active ? 'font-semibold text-blue-600' : 'text-slate-700'
                    )}
                  >
                    {label}
                  </a>
                );
              })}
              <div className="my-2 border-t border-slate-100" />
              {isSignedIn ? (
                <Link
                  href="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-2.5 text-base font-medium text-blue-600 hover:bg-slate-50"
                >
                  Ir al panel
                </Link>
              ) : (
                <Link
                  href="/sign-in"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-2.5 text-base font-medium text-blue-600 hover:bg-slate-50"
                >
                  Iniciar sesión
                </Link>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
