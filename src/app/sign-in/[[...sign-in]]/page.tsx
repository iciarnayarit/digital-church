import { SignIn } from '@clerk/nextjs';

/** Destino tras iniciar sesión cuando no hay `redirect_url` en la petición (p. ej. acceso directo a /sign-in). */
const AFTER_AUTH_PATH = '/dashboard';

/**
 * Pantalla de acceso con el componente oficial `<SignIn />` de Clerk.
 * El middleware impide usar el resto de la app sin sesión válida.
 */
export default function SignInPage() {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white px-4 pb-6 pt-[max(env(safe-area-inset-top),1rem)] sm:grid sm:min-h-screen sm:place-items-center sm:p-6">
      <div className="mx-auto w-full max-w-[26rem]">
        <div className="mb-4 text-center sm:mb-5">
          <p className="text-lg font-bold tracking-tight text-slate-900">ICIAR</p>
          <p className="mt-1 text-sm text-slate-600">Inicie sesión para acceder al portal ministerial.</p>
        </div>

        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl={AFTER_AUTH_PATH}
          signUpFallbackRedirectUrl={AFTER_AUTH_PATH}
          appearance={{
            elements: {
              rootBox: 'mx-auto w-full',
              card: 'border border-slate-200 bg-card shadow-lg rounded-2xl',
              headerTitle: 'text-slate-900',
              headerSubtitle: 'text-slate-600',
              socialButtonsBlockButton: 'min-h-11',
              formButtonPrimary: 'min-h-11',
              formFieldInput: 'min-h-11',
              footerActionText: 'text-slate-600',
            },
          }}
        />
      </div>
    </div>
  );
}
