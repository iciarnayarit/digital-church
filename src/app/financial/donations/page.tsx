
'use client';

import * as React from 'react';
import {
  Search,
  Download,
  FileText,
  Landmark,
  ListFilter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { donationReportsData, givingData } from '@/lib/data';
import { cn } from '@/lib/utils';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { AppHeader } from '@/components/app-header';


const chartConfig = {
  donations: {
    label: "Donaciones",
    color: "hsl(var(--primary))",
  },
};


export default function DonationReportsPage() {
  const { totalDonations, averageDonation, newDonors, recentDonations } = donationReportsData;
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = React.useState<string>((currentYear + 1).toString());
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 20;

  const totalPages = Math.ceil(recentDonations.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const paginatedData = recentDonations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const filteredGivingData = givingData.filter(d => d.year.toString() === selectedYear);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  return (
    <div className="flex flex-col flex-1">
      <AppHeader
        title="Reportes de Donaciones"
        description="Genere y vea la actividad de donaciones"
      >
        <div/>
      </AppHeader>
    <main className="flex-1 space-y-6 p-4 sm:p-8">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por donante..." className="pl-9" />
            </div>
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 sm:w-auto">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={(currentYear + 1).toString()}>Este Año</SelectItem>
                        <SelectItem value={currentYear.toString()}>Año Pasado</SelectItem>
                        <SelectItem value={(currentYear - 1).toString()}>Hace 2 Años</SelectItem>
                    </SelectContent>
                </Select>
                 <Select>
                    <SelectTrigger>
                        <SelectValue placeholder="Todos los Fondos" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los Fondos</SelectItem>
                        <SelectItem value="general">Fondo General</SelectItem>
                        <SelectItem value="building">Fondo de Construcción</SelectItem>
                    </SelectContent>
                </Select>
                 <Select>
                    <SelectTrigger>
                        <SelectValue placeholder="Todas las Campañas" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las Campañas</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:w-auto">
              <Button variant="outline" className='w-full'>
                <FileText className="mr-2 h-4 w-4" /> Estados de Cuenta
              </Button>
              <Button className='w-full'>
                <Download className="mr-2 h-4 w-4" /> Exportar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Donaciones Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totalDonations.amount)}</div>
            <p className="text-xs text-muted-foreground">{totalDonations.period}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Donación Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(averageDonation.amount)}</div>
            <p className="text-xs text-muted-foreground">{averageDonation.description}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Nuevos Donantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(newDonors.amount)}</div>
            <p className="text-xs text-muted-foreground">{newDonors.description}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tendencias de Donaciones</CardTitle>
            <CardDescription>Donaciones mensuales para el año {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
              <LineChart
                data={filteredGivingData}
                margin={{
                  top: 5,
                  right: 20,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value / 1000}k`} />
                <Tooltip
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      formatter={(value) =>
                        new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(value as number)
                      }
                    />
                  }
                />
                <Line
                  dataKey="total"
                  type="monotone"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{
                    fill: "hsl(var(--primary))",
                    r: 4,
                  }}
                  activeDot={{
                    r: 6,
                  }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Donante</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="hidden sm:table-cell">Fondo</TableHead>
                    <TableHead className="hidden sm:table-cell"></TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((donation) => (
                    <TableRow key={donation.id}>
                      <TableCell>
                        <div className="font-medium">{donation.donorName}</div>
                        <div className="text-sm text-muted-foreground">{donation.donorEmail}</div>
                        <div className="text-xs text-muted-foreground sm:hidden">
                          {donation.fund} · {donation.paymentMethod}
                        </div>
                      </TableCell>
                      <TableCell>{donation.date}</TableCell>
                      <TableCell className="hidden sm:table-cell">{donation.fund}</TableCell>
                      <TableCell className="hidden sm:table-cell">{donation.paymentMethod}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(donation.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
             <div className="flex flex-col sm:flex-row items-center justify-between pt-4 px-4 gap-4">
                <div className="text-sm text-muted-foreground">
                    Mostrando {paginatedData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} a {Math.min(currentPage * itemsPerPage, recentDonations.length)} de {recentDonations.length} resultados
                </div>
                <Pagination>
                    <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }} />
                    </PaginationItem>
                    {[...Array(totalPages)].map((_, i) => (
                        <PaginationItem key={i} className="hidden sm:block">
                        <PaginationLink href="#" isActive={i + 1 === currentPage} onClick={(e) => { e.preventDefault(); handlePageChange(i + 1); }}>
                            {i + 1}
                        </PaginationLink>
                        </PaginationItem>
                    ))}
                    <PaginationItem>
                        <PaginationNext href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }}/>
                    </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
    </div>
  );
}
