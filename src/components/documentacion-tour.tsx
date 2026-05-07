'use client';

import * as React from 'react';
import { Joyride, STATUS, type EventData, type Step } from 'react-joyride';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="doc-header"]',
    title: 'Bienvenido',
    content: 'Aquí tienes la documentación central de módulos y accesos rápidos del portal.',
    skipBeacon: true,
  },
  {
    target: '[data-tour="menu-library"]',
    title: 'Librería del menú',
    content:
      'Estas tarjetas representan los módulos principales del menú. Cada una te lleva directo a su pantalla.',
  },
  {
    target: '[data-tour="doc-sections"]',
    title: 'Guía por módulo',
    content:
      'Aquí encuentras la explicación de cada módulo con su propósito y enlaces útiles.',
  },
];

export function DocumentacionTour() {
  const [run, setRun] = React.useState(false);

  const onEvent = React.useCallback((data: EventData) => {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      setRun(false);
    }
  }, []);

  return (
    <>
      <Joyride
        onEvent={onEvent}
        run={run}
        continuous
        options={{
          buttons: ['back', 'close', 'primary', 'skip'],
          primaryColor: '#2563eb',
          showProgress: true,
          zIndex: 1200,
        }}
        locale={{
          back: 'Atrás',
          close: 'Cerrar',
          last: 'Finalizar',
          next: 'Siguiente',
          skip: 'Omitir',
        }}
        steps={TOUR_STEPS}
      />

      <Button
        type="button"
        variant="outline"
        className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
        onClick={() => setRun(true)}
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Iniciar tutorial guiado
      </Button>
    </>
  );
}

