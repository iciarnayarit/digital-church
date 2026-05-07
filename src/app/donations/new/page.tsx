
'use client';

import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Card,
    CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { FundraisingCampaignDoc } from '@/lib/fundraising-seed';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    Calendar as CalendarIcon,
    Search,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

type ChurchItem = {
    id: string;
    name: string;
};

type ChurchAttendanceEventItem = {
    id: string;
    eventName: string;
    eventType: 'service' | 'event';
    createdAt: string;
};

type MemberItem = {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
};

type RecordCategory = 'donations' | 'offering' | 'pledges' | 'campaigns';
type DonationEntryMode = 'offering' | 'fundraising';

export default function NewDonationPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    const [allChurches, setAllChurches] = React.useState<ChurchItem[]>([]);
    const [scopedChurches, setScopedChurches] = React.useState<ChurchItem[]>([]);
    const [selectedChurchId, setSelectedChurchId] = React.useState('');
    const [churchesState, setChurchesState] = React.useState<'loading' | 'ready' | 'error'>('loading');
    const [churchEvents, setChurchEvents] = React.useState<ChurchAttendanceEventItem[]>([]);
    const [selectedChurchEventId, setSelectedChurchEventId] = React.useState('');
    const [churchEventsState, setChurchEventsState] = React.useState<'idle' | 'loading' | 'ready' | 'error'>(
        'idle'
    );
    const [donorSearch, setDonorSearch] = React.useState('');
    const [memberResults, setMemberResults] = React.useState<MemberItem[]>([]);
    const [memberSearchState, setMemberSearchState] = React.useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    /** Donante confirmado al hacer clic en un resultado (persiste en el componente hasta que el usuario lo cambie). */
    const [selectedDonor, setSelectedDonor] = React.useState<MemberItem | null>(null);
    const [lockedDonor, setLockedDonor] = React.useState<MemberItem | null>(null);
    const [isMemberListOpen, setIsMemberListOpen] = React.useState(false);
    /** Evita que, al rellenar el nombre tras elegir, se dispare otra búsqueda y se vuelva a abrir la lista. */
    const suppressMemberSearchRef = React.useRef(false);
    const [paymentMethod, setPaymentMethod] = React.useState('credit-card');
    const [transferNumber, setTransferNumber] = React.useState('');
    const [donationFrequency, setDonationFrequency] = React.useState('once');
    const [amount, setAmount] = React.useState('');
    const [fundCampaign, setFundCampaign] = React.useState('general-fund');
    const [recordCategory, setRecordCategory] = React.useState<RecordCategory>('donations');
    const [donationEntryMode, setDonationEntryMode] = React.useState<DonationEntryMode>('offering');
    const [fundraisingCampaigns, setFundraisingCampaigns] = React.useState<FundraisingCampaignDoc[]>([]);
    const [fundraisingState, setFundraisingState] = React.useState<'loading' | 'ready' | 'error'>('loading');
    const [selectedFundraisingId, setSelectedFundraisingId] = React.useState('');
    const [notes, setNotes] = React.useState('');
    const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
    const [saving, setSaving] = React.useState(false);
    const isOffering = recordCategory === 'offering';
    const isFundraisingMode = donationEntryMode === 'fundraising';
    const isDonorLocked = lockedDonor != null && !isOffering;
    /** Tipo principal Ofrenda + tipo de registro Ofrenda: solo templos del usuario (API con alcance de sesión). */
    const restrictTemplesToUser =
        donationEntryMode === 'offering' && recordCategory === 'offering';
    const churches = React.useMemo(
        () => (restrictTemplesToUser ? scopedChurches : allChurches),
        [restrictTemplesToUser, scopedChurches, allChurches]
    );

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/members/me', {
                    cache: 'no-store',
                    headers: { Accept: 'application/json' },
                });
                const data = (await res.json().catch(() => ({}))) as {
                    member?: {
                        id?: string;
                        firstName?: string;
                        lastName?: string;
                        email?: string;
                        phone?: string;
                        staffRole?: string | null;
                    } | null;
                };
                if (!res.ok || cancelled) return;
                const m = data.member;
                if (!m?.id) return;
                const role = String(m.staffRole ?? '').trim().toLowerCase();
                if (role !== 'congregante') return;
                const donor: MemberItem = {
                    id: String(m.id),
                    firstName: String(m.firstName ?? '').trim(),
                    lastName: String(m.lastName ?? '').trim(),
                    email: String(m.email ?? '').trim(),
                    phone: String(m.phone ?? '').trim(),
                };
                if (!cancelled) {
                    setLockedDonor(donor);
                }
            } catch {
                // Si falla, mantiene flujo normal de búsqueda de donante.
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    React.useEffect(() => {
        let cancelled = false;
        const loadChurches = async () => {
            setChurchesState('loading');
            try {
                const [allRes, scopedRes] = await Promise.all([
                    fetch('/api/churches', {
                        cache: 'no-store',
                        headers: { Accept: 'application/json' },
                    }),
                    fetch('/api/churches?sessionChurchScope=1', {
                        cache: 'no-store',
                        headers: { Accept: 'application/json' },
                    }),
                ]);
                const allJson = (await allRes.json().catch(() => ({}))) as { churches?: ChurchItem[] };
                const scopedJson = (await scopedRes.json().catch(() => ({}))) as { churches?: ChurchItem[] };
                if (!allRes.ok || !scopedRes.ok) {
                    throw new Error('No se pudieron cargar los templos.');
                }
                if (cancelled) return;
                const sortEs = (a: ChurchItem, b: ChurchItem) => a.name.localeCompare(b.name, 'es');
                setAllChurches((allJson.churches ?? []).sort(sortEs));
                setScopedChurches((scopedJson.churches ?? []).sort(sortEs));
                setChurchesState('ready');
            } catch (_error) {
                if (cancelled) return;
                setAllChurches([]);
                setScopedChurches([]);
                setChurchesState('error');
            }
        };
        void loadChurches();
        return () => {
            cancelled = true;
        };
    }, []);

    React.useEffect(() => {
        if (churchesState !== 'ready') return;
        setSelectedChurchId((prev) => {
            if (prev && churches.some((c) => c.id === prev)) return prev;
            return churches[0]?.id ?? '';
        });
    }, [churchesState, churches]);

    React.useEffect(() => {
        let cancelled = false;
        const loadFundraising = async () => {
            setFundraisingState('loading');
            try {
                const response = await fetch('/api/fundraising', {
                    cache: 'no-store',
                    headers: { Accept: 'application/json' },
                });
                const json = (await response.json().catch(() => ({}))) as {
                    campaigns?: FundraisingCampaignDoc[];
                    error?: string;
                };
                if (!response.ok) {
                    throw new Error(json.error || 'No se pudieron cargar las recaudaciones.');
                }
                if (cancelled) return;
                const rows = (json.campaigns ?? []).sort((a, b) => {
                    const ao = Number(a.sortOrder ?? 0);
                    const bo = Number(b.sortOrder ?? 0);
                    return ao - bo;
                });
                setFundraisingCampaigns(rows);
                setSelectedFundraisingId((prev) => prev || rows[0]?.id || '');
                setFundraisingState('ready');
            } catch {
                if (cancelled) return;
                setFundraisingCampaigns([]);
                setSelectedFundraisingId('');
                setFundraisingState('error');
            }
        };
        void loadFundraising();
        return () => {
            cancelled = true;
        };
    }, []);

    React.useEffect(() => {
        if (isOffering) {
            suppressMemberSearchRef.current = true;
            if (lockedDonor) {
                const fullName = `${lockedDonor.firstName} ${lockedDonor.lastName}`.trim();
                setSelectedDonor(lockedDonor);
                setDonorSearch(fullName || lockedDonor.email || '');
            } else {
                setSelectedDonor({
                    id: 'church-offering',
                    firstName: 'Iglesia',
                    lastName: 'Iglesia',
                    email: '',
                    phone: '',
                });
                setDonorSearch('Iglesia');
            }
            setMemberResults([]);
            setMemberSearchState('idle');
            setIsMemberListOpen(false);
            if (fieldErrors.donor) {
                setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.donor;
                    return next;
                });
            }
            return;
        }
        if (selectedDonor?.id === 'church-offering') {
            setSelectedDonor(null);
            setDonorSearch('');
        }
    }, [isOffering, fieldErrors.donor, lockedDonor, selectedDonor?.id]);

    React.useEffect(() => {
        if (!lockedDonor || isOffering) return;
        suppressMemberSearchRef.current = true;
        const fullName = `${lockedDonor.firstName} ${lockedDonor.lastName}`.trim();
        setSelectedDonor(lockedDonor);
        setDonorSearch(fullName || lockedDonor.email || '');
        setMemberResults([]);
        setMemberSearchState('idle');
        setIsMemberListOpen(false);
        if (fieldErrors.donor) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.donor;
                return next;
            });
        }
    }, [lockedDonor, isOffering, fieldErrors.donor]);

    React.useEffect(() => {
        if (isOffering) {
            setMemberResults([]);
            setMemberSearchState('idle');
            setIsMemberListOpen(false);
            return;
        }
        if (suppressMemberSearchRef.current) {
            suppressMemberSearchRef.current = false;
            setMemberResults([]);
            setMemberSearchState('idle');
            return;
        }

        const churchId = selectedChurchId.trim();
        if (!churchId) {
            setMemberResults([]);
            setMemberSearchState('idle');
            setIsMemberListOpen(false);
            return;
        }

        const q = donorSearch.trim();
        if (q.length < 2) {
            setMemberResults([]);
            setMemberSearchState('idle');
            return;
        }

        let cancelled = false;
        const timeout = window.setTimeout(async () => {
            setMemberSearchState('loading');
            try {
                const params = new URLSearchParams();
                params.set('q', q);
                params.set('limit', '8');
                params.set('churchId', churchId);
                params.set('pastoralStaffRoles', '1');
                const response = await fetch(`/api/members?${params.toString()}`, {
                    cache: 'no-store',
                    headers: { Accept: 'application/json' },
                });
                const json = (await response.json().catch(() => ({}))) as { members?: MemberItem[] };
                if (!response.ok) {
                    throw new Error('No se pudieron cargar los miembros.');
                }
                if (cancelled) return;
                setMemberResults(json.members ?? []);
                setMemberSearchState('ready');
                setIsMemberListOpen(true);
            } catch (_error) {
                if (cancelled) return;
                setMemberResults([]);
                setMemberSearchState('error');
                setIsMemberListOpen(true);
            }
        }, 300);

        return () => {
            cancelled = true;
            window.clearTimeout(timeout);
        };
    }, [donorSearch, isOffering, selectedChurchId]);

    React.useEffect(() => {
        if (!selectedChurchId) {
            setChurchEvents([]);
            setSelectedChurchEventId('');
            setChurchEventsState('idle');
            return;
        }

        let cancelled = false;
        const loadChurchEvents = async () => {
            setChurchEventsState('loading');
            setSelectedChurchEventId('');
            try {
                const response = await fetch(`/api/churches/${encodeURIComponent(selectedChurchId)}/attendance`, {
                    cache: 'no-store',
                    headers: { Accept: 'application/json' },
                });
                const json = (await response.json().catch(() => ({}))) as {
                    records?: ChurchAttendanceEventItem[];
                    error?: string;
                };
                if (!response.ok) {
                    throw new Error(json.error || 'No se pudieron cargar los eventos del templo.');
                }
                if (cancelled) return;

                // Evita duplicados por nombre, mostrando primero los más recientes.
                const seenNames = new Set<string>();
                const uniqueByName = (json.records ?? []).filter((record) => {
                    const normalizedName = record.eventName.trim().toLowerCase();
                    if (!normalizedName || seenNames.has(normalizedName)) return false;
                    seenNames.add(normalizedName);
                    return true;
                });

                setChurchEvents(uniqueByName);
                setChurchEventsState('ready');
            } catch (_error) {
                if (cancelled) return;
                setChurchEvents([]);
                setChurchEventsState('error');
            }
        };

        void loadChurchEvents();
        return () => {
            cancelled = true;
        };
    }, [selectedChurchId]);

    const handleSelectMember = (member: MemberItem) => {
        suppressMemberSearchRef.current = true;
        const fullName = `${member.firstName} ${member.lastName}`.trim();
        setSelectedDonor(member);
        setDonorSearch(fullName);
        setMemberResults([]);
        setMemberSearchState('idle');
        setIsMemberListOpen(false);
        if (fieldErrors.donor) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.donor;
                return next;
            });
        }
    };

    const handleClearDonor = () => {
        if (isDonorLocked) return;
        setSelectedDonor(null);
        setDonorSearch('');
        setMemberResults([]);
        setMemberSearchState('idle');
        setIsMemberListOpen(false);
    };

    const parseAmount = (raw: string): number => {
        const normalized = raw.trim().replace(',', '.');
        return Number.parseFloat(normalized);
    };

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!isOffering && !selectedDonor) {
            errors.donor = 'Seleccione un donante de los resultados de búsqueda.';
        }

        if (churchesState !== 'ready' || !selectedChurchId.trim()) {
            errors.church =
                churchesState === 'error'
                    ? 'No se pudieron cargar los templos. Actualice la página.'
                    : 'Seleccione un templo.';
        }

        if (selectedChurchId.trim() && churchesState === 'ready') {
            if (churchEventsState === 'error') {
                errors.event =
                    'No se pudieron cargar los eventos. Intente de nuevo o compruebe la conexión.';
            } else if (churchEventsState === 'loading' || churchEventsState === 'idle') {
                errors.event = 'Espere a que se carguen los eventos del templo.';
            } else if (churchEventsState === 'ready') {
                if (churchEvents.length === 0) {
                    errors.event = 'Este templo no tiene eventos registrados en asistencia.';
                } else if (!selectedChurchEventId) {
                    errors.event = 'Seleccione el evento del templo.';
                }
            }
        }

        const amountValue = parseAmount(amount);
        if (!amount.trim() || Number.isNaN(amountValue) || amountValue <= 0) {
            errors.amount = 'Ingrese un monto válido mayor que 0.';
        }

        if (!date) {
            errors.date = 'Seleccione la fecha de la donación.';
        }

        if (!isFundraisingMode && !fundCampaign.trim()) {
            errors.fund = 'Seleccione un fondo o campaña.';
        }

        if (isFundraisingMode) {
            if (!selectedFundraisingId.trim()) {
                errors.fundraising = 'Seleccione una recaudación.';
            }
            if (fundraisingState === 'error') {
                errors.fundraising =
                    'No se pudieron cargar las recaudaciones. Actualice la página.';
            }
        }

        if (!paymentMethod.trim()) {
            errors.payment = 'Seleccione un método de pago.';
        }

        if (paymentMethod === 'online' && !transferNumber.trim()) {
            errors.transfer = 'Ingrese el número o referencia de la transferencia.';
        }

        if (!donationFrequency.trim()) {
            errors.frequency = 'Seleccione la frecuencia.';
        }

        setFieldErrors(errors);

        if (Object.keys(errors).length > 0) {
            toast({
                variant: 'destructive',
                title: 'Formulario incompleto',
                description:
                    'Revise los campos obligatorios (las notas son opcionales).',
            });
            return false;
        }

        return true;
    };

    const handleSaveDonation = async () => {
        if (!validateForm()) return;

        const church = churches.find((c) => c.id === selectedChurchId);
        const selectedEvent = churchEvents.find((e) => e.id === selectedChurchEventId);
        if (!church || !selectedEvent || !date || (!isOffering && !selectedDonor)) {
            toast({
                variant: 'destructive',
                title: 'No se pudo guardar',
                description: 'Faltan datos del formulario. Revise templo, evento y donante.',
            });
            return;
        }

        const donorPayload = isOffering
            ? {
                memberId: 'church-offering',
                firstName: 'Iglesia',
                lastName: 'Iglesia',
                email: '',
                phone: '',
            }
            : {
                memberId: selectedDonor!.id,
                firstName: selectedDonor!.firstName,
                lastName: selectedDonor!.lastName,
                email: selectedDonor!.email ?? '',
                phone: selectedDonor!.phone ?? '',
            };

        const amountValue = parseAmount(amount);
        const selectedFundraising = isFundraisingMode
            ? fundraisingCampaigns.find((row) => row.id === selectedFundraisingId)
            : null;
        const body = {
            recordCategory: isFundraisingMode ? ('campaigns' as const) : recordCategory,
            donor: donorPayload,
            churchId: selectedChurchId,
            churchName: church.name,
            attendanceEvent: {
                id: selectedChurchEventId,
                name: selectedEvent.eventName,
            },
            amount: amountValue,
            donationDate: date.toISOString(),
            fundCampaign: isFundraisingMode ? ('other-fund' as const) : fundCampaign,
            paymentMethod,
            transferReference: paymentMethod === 'online' ? transferNumber.trim() : '',
            donationFrequency,
            notes: notes.trim(),
            ...(isFundraisingMode
                ? {
                    fundraisingCampaignId: selectedFundraising?.id ?? '',
                    fundraisingCampaignName: selectedFundraising?.name ?? '',
                }
                : {}),
        };

        setSaving(true);
        try {
            const response = await fetch('/api/donations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const json = (await response.json().catch(() => ({}))) as {
                error?: string;
                message?: string;
            };
            if (!response.ok) {
                throw new Error(json.error || 'No se pudo guardar la donación.');
            }
            toast({
                title: 'Donación guardada',
                description: json.message || 'El registro se guardó en la base de datos.',
            });
            router.push('/donations');
        } catch (e) {
            toast({
                variant: 'destructive',
                title: 'Error al guardar',
                description: e instanceof Error ? e.message : 'Inténtelo de nuevo.',
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col flex-1">
            <AppHeader
                title="Añadir Ofrenda ó Donación"
                description="Ingrese los detalles para el nuevo registro de donación."
            >
                <Button variant="ghost" asChild>
                    <Link href="/donations">Cancelar</Link>
                </Button>
                <Button type="button" onClick={() => void handleSaveDonation()} disabled={saving}>
                    {saving ? 'Guardando…' : 'Guardar Donación'}
                </Button>
            </AppHeader>
            <main className="flex-1 space-y-6 p-4 sm:p-8 bg-muted/20">
                <Card className="max-w-3xl mx-auto">
                    <CardContent className="p-6 sm:p-8">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="entry-mode">Tipo principal</Label>
                                <Select
                                    value={donationEntryMode}
                                    onValueChange={(v) => {
                                        const mode = v as DonationEntryMode;
                                        setDonationEntryMode(mode);
                                        if (mode === 'fundraising') {
                                            setRecordCategory('campaigns');
                                        } else if (recordCategory === 'campaigns') {
                                            setRecordCategory('donations');
                                        }
                                    }}
                                >
                                    <SelectTrigger id="entry-mode">
                                        <SelectValue placeholder="Seleccione tipo principal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="offering">Ofrenda</SelectItem>
                                        <SelectItem value="fundraising">Recaudación</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {isFundraisingMode ? (
                                <div className="space-y-2">
                                    <Label htmlFor="fundraising-campaign">Recaudación</Label>
                                    <Select
                                        value={selectedFundraisingId}
                                        onValueChange={(v) => {
                                            setSelectedFundraisingId(v);
                                            if (fieldErrors.fundraising) {
                                                setFieldErrors((prev) => {
                                                    const next = { ...prev };
                                                    delete next.fundraising;
                                                    return next;
                                                });
                                            }
                                        }}
                                        disabled={fundraisingState !== 'ready' || fundraisingCampaigns.length === 0}
                                    >
                                        <SelectTrigger id="fundraising-campaign">
                                            <SelectValue
                                                placeholder={
                                                    fundraisingState === 'loading'
                                                        ? 'Cargando recaudaciones...'
                                                        : fundraisingState === 'error'
                                                            ? 'Error al cargar recaudaciones'
                                                            : 'Seleccione una recaudación'
                                                }
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {fundraisingCampaigns.map((campaign) => (
                                                <SelectItem key={campaign.id} value={campaign.id}>
                                                    {campaign.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {fieldErrors.fundraising ? (
                                        <p className="text-xs text-destructive" role="alert">
                                            {fieldErrors.fundraising}
                                        </p>
                                    ) : null}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label htmlFor="record-category">Tipo de registro</Label>
                                    <Select
                                        value={recordCategory}
                                        onValueChange={(v) => setRecordCategory(v as RecordCategory)}
                                    >
                                        <SelectTrigger id="record-category">
                                            <SelectValue placeholder="Seleccione tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="donations">Donación</SelectItem>
                                            <SelectItem value="offering">Ofrenda</SelectItem>
                                            <SelectItem value="pledges">Promesa</SelectItem>
                                            <SelectItem value="campaigns">Campaña</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-sm text-muted-foreground">
                                        Clasifique si este movimiento es donación, promesa o campaña.
                                    </p>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="church">Templo</Label>
                                <Select
                                    value={selectedChurchId}
                                    onValueChange={(v) => {
                                        setSelectedChurchId(v);
                                        setSelectedDonor(null);
                                        setDonorSearch('');
                                        setMemberResults([]);
                                        setMemberSearchState('idle');
                                        setIsMemberListOpen(false);
                                        setFieldErrors((prev) => {
                                            const next = { ...prev };
                                            delete next.church;
                                            delete next.event;
                                            delete next.donor;
                                            return next;
                                        });
                                    }}
                                    disabled={churchesState !== 'ready' || churches.length === 0}
                                >
                                    <SelectTrigger id="church">
                                        <SelectValue
                                            placeholder={
                                                churchesState === 'loading'
                                                    ? 'Cargando templos...'
                                                    : churchesState === 'error'
                                                        ? 'Error al cargar templos'
                                                        : 'Selecciona un templo'
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {churches.map((church) => (
                                            <SelectItem key={church.id} value={church.id}>
                                                {church.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-sm text-muted-foreground">
                                    La búsqueda de donante solo incluye cargos pastorales (Pastor, Ayuda Pastoral,
                                    Pastor Regional, etc.) en el directorio y
                                    vinculados a este templo.
                                </p>
                                {fieldErrors.church ? (
                                    <p className="text-xs text-destructive" role="alert">
                                        {fieldErrors.church}
                                    </p>
                                ) : null}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="donor-search">Donante</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="donor-search"
                                        placeholder={
                                            isOffering
                                                ? 'Iglesia'
                                                : !selectedChurchId.trim()
                                                  ? 'Seleccione primero el templo'
                                                  : 'Buscar miembro donante de este templo…'
                                        }
                                        className="pl-9"
                                        value={donorSearch}
                                        disabled={
                                            isOffering || isDonorLocked || !selectedChurchId.trim()
                                        }
                                        onChange={(e) => {
                                            if (isOffering || isDonorLocked || !selectedChurchId.trim()) return;
                                            setDonorSearch(e.target.value);
                                            setSelectedDonor(null);
                                            setIsMemberListOpen(true);
                                        }}
                                        onFocus={() => {
                                            if (isOffering || isDonorLocked || !selectedChurchId.trim()) return;
                                            if (memberResults.length > 0 || memberSearchState !== 'idle') {
                                                setIsMemberListOpen(true);
                                            }
                                        }}
                                        onBlur={() => {
                                            if (isOffering || isDonorLocked) return;
                                            window.setTimeout(() => setIsMemberListOpen(false), 200);
                                        }}
                                    />
                                </div>
                                {!isOffering &&
                                !isDonorLocked &&
                                selectedChurchId.trim() &&
                                isMemberListOpen &&
                                !selectedDonor &&
                                donorSearch.trim().length >= 2 ? (
                                    <div className="rounded-md border bg-background shadow-sm" role="listbox">
                                        {memberSearchState === 'loading' ? (
                                            <p className="px-3 py-2 text-sm text-muted-foreground">Buscando pastores...</p>
                                        ) : null}
                                        {memberSearchState === 'error' ? (
                                            <p className="px-3 py-2 text-sm text-destructive">Error al buscar miembros.</p>
                                        ) : null}
                                        {memberSearchState === 'ready' && memberResults.length === 0 ? (
                                            <p className="px-3 py-2 text-sm text-muted-foreground">
                                                No hay pastores en este templo que coincidan con la búsqueda.
                                            </p>
                                        ) : null}
                                        {memberResults.map((member) => (
                                            <button
                                                key={member.id}
                                                type="button"
                                                role="option"
                                                className="flex w-full items-start justify-between gap-3 border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted/50"
                                                onMouseDown={(event) => {
                                                    event.preventDefault();
                                                    handleSelectMember(member);
                                                }}
                                            >
                                                <span className="text-sm font-medium">
                                                    {member.firstName} {member.lastName}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {member.email || member.phone || ''}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                                {selectedDonor && (!isOffering || isDonorLocked) ? (
                                    <div
                                        className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 dark:border-emerald-900 dark:bg-emerald-950/30"
                                        role="status"
                                        aria-live="polite"
                                    >
                                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                                            Donante guardado en el formulario
                                        </p>
                                        <p className="mt-1 text-sm font-medium text-foreground">
                                            {selectedDonor.firstName} {selectedDonor.lastName}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {selectedDonor.email || selectedDonor.phone || 'Sin contacto'}
                                        </p>
                                        {!isDonorLocked ? (
                                            <Button
                                                type="button"
                                                variant="link"
                                                className="h-auto p-0 text-xs text-primary"
                                                onClick={handleClearDonor}
                                            >
                                                Cambiar donante
                                            </Button>
                                        ) : null}
                                    </div>
                                ) : null}
                                {isOffering ? (
                                    <p className="text-sm text-muted-foreground">
                                        En tipo <span className="font-medium">Ofrenda</span>, el donante se fija
                                        automáticamente en{' '}
                                        <span className="font-medium">
                                          {isDonorLocked
                                            ? `${lockedDonor?.firstName ?? ''} ${lockedDonor?.lastName ?? ''}`.trim() ||
                                              'su usuario'
                                            : 'Iglesia'}
                                        </span>.
                                    </p>
                                ) : !isDonorLocked ? (
                                    <p className="text-sm text-muted-foreground">
                                        ¿No encuentra al pastor?{' '}
                                        <Link href="/members/new" className="text-primary underline">
                                            Añada un nuevo perfil
                                        </Link>{' '}
                                        con cargo pastoral equivalente y templos correctos.
                                    </p>
                                ) : null}
                                {fieldErrors.donor ? (
                                    <p className="text-xs text-destructive" role="alert">
                                        {fieldErrors.donor}
                                    </p>
                                ) : null}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="church-event">Evento del templo</Label>
                                <Select
                                    value={selectedChurchEventId}
                                    onValueChange={(v) => {
                                        setSelectedChurchEventId(v);
                                        if (fieldErrors.event) {
                                            setFieldErrors((prev) => {
                                                const next = { ...prev };
                                                delete next.event;
                                                return next;
                                            });
                                        }
                                    }}
                                    disabled={!selectedChurchId || churchEventsState === 'loading'}
                                >
                                    <SelectTrigger id="church-event">
                                        <SelectValue
                                            placeholder={
                                                !selectedChurchId
                                                    ? 'Selecciona primero un templo'
                                                    : churchEventsState === 'loading'
                                                        ? 'Cargando eventos...'
                                                        : churchEventsState === 'error'
                                                            ? 'Error al cargar eventos'
                                                            : churchEvents.length === 0
                                                                ? 'Este templo no tiene eventos'
                                                                : 'Selecciona un evento'
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {churchEvents.map((event) => (
                                            <SelectItem key={event.id} value={event.id}>
                                                {event.eventName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {fieldErrors.event ? (
                                    <p className="text-xs text-destructive" role="alert">
                                        {fieldErrors.event}
                                    </p>
                                ) : null}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="amount">Monto</Label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                                        <Input
                                            id="amount"
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            placeholder="0.00"
                                            className="pl-7"
                                            value={amount}
                                            onChange={(e) => {
                                                setAmount(e.target.value);
                                                if (fieldErrors.amount) {
                                                    setFieldErrors((prev) => {
                                                        const next = { ...prev };
                                                        delete next.amount;
                                                        return next;
                                                    });
                                                }
                                            }}
                                        />
                                    </div>
                                    {fieldErrors.amount ? (
                                        <p className="text-xs text-destructive" role="alert">
                                            {fieldErrors.amount}
                                        </p>
                                    ) : null}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="donation-date">Fecha de Donación</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "MM/dd/yyyy") : <span>mm/dd/yyyy</span>}
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={(d) => {
                                                setDate(d);
                                                if (fieldErrors.date && d) {
                                                    setFieldErrors((prev) => {
                                                        const next = { ...prev };
                                                        delete next.date;
                                                        return next;
                                                    });
                                                }
                                            }}
                                            initialFocus
                                        />
                                        </PopoverContent>
                                    </Popover>
                                    {fieldErrors.date ? (
                                        <p className="text-xs text-destructive" role="alert">
                                            {fieldErrors.date}
                                        </p>
                                    ) : null}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {isFundraisingMode ? (
                                    <div className="space-y-2">
                                        <Label>Campaña seleccionada</Label>
                                        <Input
                                            readOnly
                                            value={
                                                fundraisingCampaigns.find((row) => row.id === selectedFundraisingId)
                                                    ?.name ?? 'Sin selección'
                                            }
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label htmlFor="fund-campaign">Fondo / Campaña</Label>
                                        <Select
                                            value={fundCampaign}
                                            onValueChange={(v) => {
                                                setFundCampaign(v);
                                                if (fieldErrors.fund) {
                                                    setFieldErrors((prev) => {
                                                        const next = { ...prev };
                                                        delete next.fund;
                                                        return next;
                                                    });
                                                }
                                            }}
                                        >
                                            <SelectTrigger id="fund-campaign">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="general-fund">Fondo Regional</SelectItem>
                                                <SelectItem value="local-fund">Fondo Local</SelectItem>
                                                <SelectItem value="building-fund">Fondo de Construcción</SelectItem>
                                                <SelectItem value="missions-fund">Fondo de Misiones</SelectItem>
                                                <SelectItem value="youth-fund">Fondo del Ministerio Juvenil</SelectItem>
                                                <SelectItem value="benevolence-fund">Fondo de Benevolencia</SelectItem>
                                                <SelectItem value="pastor-fund">Fondo Discrecional del Pastor</SelectItem>
                                                <SelectItem value="other-fund">Otro Fondo</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {fieldErrors.fund ? (
                                            <p className="text-xs text-destructive" role="alert">
                                                {fieldErrors.fund}
                                            </p>
                                        ) : null}
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="payment-method">Método de Pago</Label>
                                    <Select
                                        value={paymentMethod}
                                        onValueChange={(value) => {
                                            setPaymentMethod(value);
                                            if (value !== 'online') {
                                                setTransferNumber('');
                                            }
                                            if (fieldErrors.payment || fieldErrors.transfer) {
                                                setFieldErrors((prev) => {
                                                    const next = { ...prev };
                                                    delete next.payment;
                                                    delete next.transfer;
                                                    return next;
                                                });
                                            }
                                        }}
                                    >
                                        <SelectTrigger id="payment-method">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                        <SelectItem value="credit-card">Tarjeta de Crédito</SelectItem>
                                        <SelectItem value="check">Cheque</SelectItem>
                                        <SelectItem value="cash">Efectivo</SelectItem>
                                        <SelectItem value="online">Transferencia</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {fieldErrors.payment ? (
                                        <p className="text-xs text-destructive" role="alert">
                                            {fieldErrors.payment}
                                        </p>
                                    ) : null}
                                </div>
                            </div>

                            {paymentMethod === 'online' ? (
                                <div className="space-y-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
                                    <p className="text-sm text-foreground">
                                        Por favor escribe abajo el <strong>número de transferencia</strong> o la referencia
                                        bancaria de tu depósito para poder conciliar el pago.
                                    </p>
                                    <Label htmlFor="transfer-number">Número de transferencia</Label>
                                    <Input
                                        id="transfer-number"
                                        value={transferNumber}
                                        onChange={(e) => {
                                            setTransferNumber(e.target.value);
                                            if (fieldErrors.transfer) {
                                                setFieldErrors((prev) => {
                                                    const next = { ...prev };
                                                    delete next.transfer;
                                                    return next;
                                                });
                                            }
                                        }}
                                        placeholder="Referencia o número de operación"
                                        autoComplete="off"
                                    />
                                    {fieldErrors.transfer ? (
                                        <p className="text-xs text-destructive" role="alert">
                                            {fieldErrors.transfer}
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}

                            <div className="space-y-2">
                                <Label htmlFor="donation-frequency">Frecuencia de la donación</Label>
                                <Select
                                    value={donationFrequency}
                                    onValueChange={(v) => {
                                        setDonationFrequency(v);
                                        if (fieldErrors.frequency) {
                                            setFieldErrors((prev) => {
                                                const next = { ...prev };
                                                delete next.frequency;
                                                return next;
                                            });
                                        }
                                    }}
                                >
                                    <SelectTrigger id="donation-frequency">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="once">Solo una vez</SelectItem>
                                        <SelectItem value="weekly">Semanalmente</SelectItem>
                                        <SelectItem value="biweekly">Quincenalmente</SelectItem>
                                        <SelectItem value="monthly">Mensualmente</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-sm text-muted-foreground">
                                    Selecciona cada cuánto se registrará este donativo.
                                </p>
                                {fieldErrors.frequency ? (
                                    <p className="text-xs text-destructive" role="alert">
                                        {fieldErrors.frequency}
                                    </p>
                                ) : null}
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="notes">
                                    Notas <span className="font-normal text-muted-foreground">(opcional)</span>
                                </Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Añada cualquier nota relevante, como el número de cheque o detalles de donación anónima."
                                    rows={3}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>

                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
