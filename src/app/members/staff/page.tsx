'use client';

import * as React from 'react';
import { MembersDirectoryClient } from '../members-directory-client';

export default function MembersStaffPage() {
  const extraMembersSearchParams = React.useMemo(
    () => ({ staffDirectoryAllChurches: '1' }),
    []
  );

  return (
    <MembersDirectoryClient
      title="Personal y cargos"
      description="Personal con cargo asignado en todas las iglesias."
      extraMembersSearchParams={extraMembersSearchParams}
      showAddMemberButton={false}
      emptyDirectoryMessage="No hay personal que coincida con estos criterios o el listado está vacío."
    />
  );
}
