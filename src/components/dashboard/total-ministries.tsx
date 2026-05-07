'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { DashboardStats } from '@/lib/dashboard-stats';
import { Church } from 'lucide-react';

interface TotalMinistriesProps {
  stats: DashboardStats | null;
  loading: boolean;
}

export function TotalMinistries({ stats, loading }: TotalMinistriesProps) {
  const total = stats?.ministries ?? 0;

  return (
    <Card className="border-border/70 shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 sm:pb-2">
        <CardTitle className="text-sm font-medium">Ministerios Totales</CardTitle>
        <Church className="h-3.5 w-3.5 text-muted-foreground sm:h-4 sm:w-4" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-[1.7rem] font-bold sm:text-2xl">{loading ? '…' : total}</div>
        <p className="text-xs text-muted-foreground">Ministerios activos de la iglesia</p>
      </CardContent>
    </Card>
  );
}
