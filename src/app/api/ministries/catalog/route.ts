import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { MINISTRIES_COLLECTION } from '@/lib/ministries';

/**
 * Listado completo de ministerios para selects / checkboxes (sin filtro por iglesia ni rol).
 */
export async function GET() {
  try {
    const db = await getDb();
    const docs = await db
      .collection(MINISTRIES_COLLECTION)
      .find({}, { projection: { _id: 1, id: 1, name: 1 } })
      .sort({ name: 1 })
      .toArray();

    const ministries = docs
      .map((d) => {
        const raw = d as Record<string, unknown>;
        const id =
          typeof raw.id === 'string' && raw.id.trim()
            ? raw.id.trim()
            : String(raw._id ?? '');
        const name = typeof raw.name === 'string' ? raw.name : '';
        return { id, name };
      })
      .filter((m) => Boolean(m.id));

    return NextResponse.json({ ministries });
  } catch (e) {
    console.error('[api/ministries/catalog GET]', e);
    const message =
      e instanceof Error ? e.message : 'Error al leer la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
