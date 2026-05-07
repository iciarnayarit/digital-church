
'use client';

import * as React from 'react';
import {
  MoreHorizontal,
  Plus,
  Search,
  Users,
  Trash2,
  Edit,
  UserPlus,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { groupData as initialGroupData, groupMembers as initialGroupMembers } from '@/lib/data';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { AppHeader } from '@/components/app-header';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

type Group = (typeof initialGroupData)[0];
type GroupMember = (typeof initialGroupMembers)[0];

const statusColors: { [key: string]: string } = {
  Activo: 'bg-green-100 text-green-800 border-green-200',
  'En Pausa': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Inactivo: 'bg-red-100 text-red-800 border-red-200',
};

const roleColors: { [key: string]: string } = {
    Líder: 'bg-blue-100 text-blue-800 border-blue-200',
    Miembro: 'bg-gray-100 text-gray-800 border-gray-200',
  };

export default function GroupsPage() {
  const [groupData, setGroupData] = React.useState<Group[]>(initialGroupData);
  const [selectedGroup, setSelectedGroup] = React.useState<Group | null>(
    groupData.length > 0 ? groupData[0] : null
  );
  const [groupMembers, setGroupMembers] = React.useState<GroupMember[]>(initialGroupMembers);
  const [selectedMembers, setSelectedMembers] = React.useState<number[]>([]);
  const [memberToRemove, setMemberToRemove] = React.useState<GroupMember | null>(null);
  const [groupToDelete, setGroupToDelete] = React.useState<Group | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 20;

  const totalPages = Math.ceil(groupMembers.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const paginatedMembers = groupMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMembers(paginatedMembers.map((m) => m.id));
    } else {
      setSelectedMembers([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedMembers([...selectedMembers, id]);
    } else {
      setSelectedMembers(selectedMembers.filter((i) => i !== id));
    }
  };

  const handleRemoveMember = () => {
    if (memberToRemove) {
      setGroupMembers(prev => prev.filter(m => m.id !== memberToRemove.id));
      setMemberToRemove(null);
    }
  };

  const handleRemoveGroup = () => {
    if (groupToDelete) {
      const newGroupData = groupData.filter(g => g.id !== groupToDelete.id);
      setGroupData(newGroupData);
      setSelectedGroup(newGroupData.length > 0 ? newGroupData[0] : null);
      setGroupToDelete(null);
    }
  };


  return (
    <AlertDialog>
      <div className="flex flex-col flex-1">
      <AppHeader
        title="Gestión de Grupos"
        description="Organice y gestione los grupos de su iglesia y sus miembros."
      >
        <Button asChild>
          <Link href="/groups/new"><Plus className="mr-2 h-4 w-4" /> Crear Nuevo Grupo</Link>
        </Button>
      </AppHeader>
      <main className="flex-1 bg-muted/20 p-4 sm:p-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column: Group List */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold">Todos los Grupos</h2>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar grupos..." className="pl-9" />
            </div>
            <div className="mt-4 space-y-3">
              {groupData.map((group) => (
                <Card
                  key={group.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedGroup?.id === group.id ? 'border-primary shadow-md' : ''}`}
                  onClick={() => setSelectedGroup(group)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                          <h3 className="font-semibold">{group.name}</h3>
                          <p className="text-sm text-muted-foreground">{group.members} Miembros</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`font-normal whitespace-nowrap ${statusColors[group.status]}`}
                      >
                        {group.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{group.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Right Column: Group Details & Members */}
          <div className="lg:col-span-2">
            {selectedGroup && (
              <>
                <Card>
                  <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-50 p-3 rounded-lg">
                          <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{selectedGroup.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {selectedGroup.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/groups/${selectedGroup.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="ghost" size="icon" onClick={() => setGroupToDelete(selectedGroup)}>
                              <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                         <AlertDialogContent>
                          <AlertDialogHeader>
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                                <Trash2 className="h-6 w-6 text-red-600" />
                            </div>
                            <AlertDialogTitle className="text-center text-xl">Eliminar Grupo</AlertDialogTitle>
                            <AlertDialogDescription className="text-center">
                                ¿Estás seguro de que quieres eliminar el <span className="font-bold">{groupToDelete?.name}</span>? Esta acción es permanente y no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="sm:justify-center">
                              <AlertDialogCancel onClick={() => setGroupToDelete(null)}>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={handleRemoveGroup} className="bg-destructive hover:bg-destructive/90">Confirmar Eliminación</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardHeader>
                </Card>
                
                <div className="mt-6">
                  <h2 className="text-xl font-semibold">Miembros del Grupo ({groupMembers.length})</h2>
                  <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="relative w-full max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar miembros..."
                        className="pl-9"
                      />
                    </div>
                    <Button asChild>
                      <Link href="/groups/add-members"><UserPlus className="mr-2 h-4 w-4" /> Añadir Miembro</Link>
                    </Button>
                  </div>
                </div>

                <Card className="mt-4">
                  <CardContent className="p-0">
                      <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={
                                selectedMembers.length > 0 &&
                                selectedMembers.length === paginatedMembers.length
                              }
                              onCheckedChange={(checked) => handleSelectAll(!!checked)}
                            />
                          </TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead className="hidden sm:table-cell">Contacto</TableHead>
                          <TableHead>Rol</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedMembers.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedMembers.includes(member.id)}
                                onCheckedChange={(checked) =>
                                  handleSelectOne(member.id, !!checked)
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage
                                    src={`https://picsum.photos/seed/${member.id + 10}/40/40`}
                                    alt={member.name}
                                  />
                                  <AvatarFallback>
                                    {member.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="truncate font-medium">{member.name}</div>
                                  <div className="truncate text-sm text-muted-foreground">
                                    {member.email}
                                  </div>
                                  <div className="truncate text-xs text-muted-foreground sm:hidden">
                                    {member.phone}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <div className="text-sm">{member.phone}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`font-medium ${roleColors[member.role]}`}>
                                  {member.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <AlertDialogTrigger asChild>
                                  <Button variant="link" className="text-destructive hover:text-destructive/80" onClick={() => setMemberToRemove(member)}>
                                      Eliminar
                                  </Button>
                              </AlertDialogTrigger>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>
                     <div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4">
                        <div className="text-sm text-muted-foreground">
                            Mostrando {paginatedMembers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} a {Math.min(currentPage * itemsPerPage, groupMembers.length)} de {groupMembers.length} miembros
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
              </>
            )}
          </div>
        </div>
      </main>
      </div>

      <AlertDialogContent>
          <AlertDialogHeader>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-center text-xl">Eliminar Miembro</AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                  ¿Estás seguro de que quieres eliminar a <span className="font-bold">{memberToRemove?.name}</span> del <span className="font-bold">{selectedGroup?.name}</span>? Esta acción no se puede deshacer.
              </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
              <AlertDialogCancel onClick={() => setMemberToRemove(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive hover:bg-destructive/90">Confirmar Eliminación</AlertDialogAction>
          </AlertDialogFooter>
      </AlertDialogContent>

    </AlertDialog>
  );
}
