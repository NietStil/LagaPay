// Screen 13 — Tickets kopen (Tickets.dc.html): choose how many of each ticket type, and buy them in one go.
// Until Mollie exists, Afrekenen is a test betaling: the tickets (and their munten) are yours straight away,
// and the app opens "Mijn tickets" with their QR codes. Per ticket type, some of the tickets can be "voor vrienden":
// those wait for a friend to take them through my link (also on Mijn tickets) and don't give me munten.
// It is also where an evenement link with tickets lands before you're a deelnemer: the status card on top
// says what's needed: buy a ticket, then have it scanned at the entrance (the scan makes you a deelnemer).

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  ErrorState,
  Icon,
  IconBox,
  InfoNote,
  ListRow,
  LoadingState,
  Pill,
  Screen,
  ScreenHeader,
  kleuren,
} from '@/components/lagapay';
import { useApiData } from '@/hooks/use-api-data';
import { deelnemen, foutmelding, getEvenementTickets, koopTickets } from '@/lib/api/lagapay';
import type { Deelname, EvenementBasis, EvenementTickets, TicketType } from '@/lib/api/types';
import { formatEuro, formatMunten } from '@/lib/format';
import { meld } from '@/lib/melding';

/** Per ticket type per order (the backend allows 1–10). */
const MAX_PER_SOORT = 10;

type TicketsResultaat = { soort: 'ok'; data: EvenementTickets } | { soort: 'geweigerd'; melding: string };

/** 403 (heeft_tickets off) is a normal outcome here, not a retryable error. */
async function laadTickets(evenementId: string): Promise<TicketsResultaat> {
  try {
    return { soort: 'ok', data: await getEvenementTickets(evenementId) };
  } catch (err: any) {
    if (err?.response?.status === 403) return { soort: 'geweigerd', melding: foutmelding(err) };
    throw err;
  }
}

export default function TicketsKopenScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, refreshing, reload, refresh, setData } = useApiData(() => laadTickets(id), [id]);
  // Chosen number per ticket id; null until the user changes something (then the default below applies).
  const [aantallen, setAantallen] = useState<Record<number, number> | null>(null);
  // Of those, how many per ticket id are for friends.
  const [voorVrienden, setVoorVrienden] = useState<Record<number, number>>({});
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const kop = (subtitle?: string) => <ScreenHeader title="Tickets" subtitle={subtitle} fallbackHref="/tickets" />;

  if (loading) {
    return (
      <Screen gap={20}>
        {kop()}
        <LoadingState />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen gap={20}>
        {kop()}
        <ErrorState message={error ?? ''} onRetry={reload} />
      </Screen>
    );
  }
  if (data.soort === 'geweigerd') {
    return (
      <Screen gap={20} onRefresh={refresh} refreshing={refreshing}>
        {kop()}
        <ErrorState title="Geen tickets te koop" message={data.melding} />
      </Screen>
    );
  }

  const { evenement, tickets, deelname } = data.data;

  if (tickets.length === 0) {
    return (
      <Screen gap={20} onRefresh={refresh} refreshing={refreshing}>
        {kop(evenement.naam)}
        <DeelnameStatus evenement={evenement} deelname={deelname} />
        <EmptyState icon="ticket" title="Nog geen tickets" text="Er zijn nog geen tickets voor dit evenement." />
      </Screen>
    );
  }

  // Default: one of the cheapest ticket (the list is prijs ascending) while I have none yet.
  const gekozen: Record<number, number> =
    aantallen ?? (deelname.heeft_ticket || !evenement.open ? {} : { [tickets[0].id]: 1 });
  const zetAantal = (ticketId: number, n: number) => {
    const nieuw = Math.max(0, Math.min(MAX_PER_SOORT, n));
    setAantallen({ ...gekozen, [ticketId]: nieuw });
    // Never more for friends than bought.
    if ((voorVrienden[ticketId] ?? 0) > nieuw) setVoorVrienden({ ...voorVrienden, [ticketId]: nieuw });
  };
  const zetVoorVrienden = (ticketId: number, n: number) =>
    setVoorVrienden({ ...voorVrienden, [ticketId]: Math.max(0, Math.min(gekozen[ticketId] ?? 0, n)) });

  const bestelling = tickets
    .filter((t) => (gekozen[t.id] ?? 0) > 0)
    .map((t) => ({ id: t.id, aantal: gekozen[t.id], voor_vrienden: voorVrienden[t.id] ?? 0 }));
  const aantalGekozen = bestelling.reduce((som, regel) => som + regel.aantal, 0);
  const aantalVoorVrienden = bestelling.reduce((som, regel) => som + regel.voor_vrienden, 0);
  // In cents, so 3 × € 12,10 doesn't become € 36,300000000000004.
  const totaalCenten = tickets.reduce((som, t) => som + Math.round(Number(t.prijs) * 100) * (gekozen[t.id] ?? 0), 0);
  const inBezit = tickets.reduce((som, t) => som + t.aantal_gekocht, 0);

  const afrekenen = async () => {
    if (aantalGekozen === 0) return;
    setBezig(true);
    setFout(null);
    try {
      setData({ soort: 'ok', data: await koopTickets(id, bestelling) });
      setAantallen({});
      setVoorVrienden({});
      meld(
        aantalGekozen === 1 ? 'Ticket gekocht' : `${aantalGekozen} tickets gekocht`,
        'Testmodus: er is nog niet echt betaald.',
      );
      // Straight to the QR codes (and, for tickets for friends, the link to hand them out).
      router.push(`/evenement/${id}/mijn-tickets`);
    } catch (err) {
      setFout(foutmelding(err, 'Afrekenen lukt niet. Probeer het opnieuw.'));
    } finally {
      setBezig(false);
    }
  };

  return (
    <Screen
      gap={20}
      onRefresh={refresh}
      refreshing={refreshing}
      footer={
        evenement.open ? (
          <View className="flex-row items-center justify-between gap-4">
            <View>
              <Text className="text-xs text-zinc-400">
                {aantalGekozen > 0
                  ? `Totaal · ${aantalGekozen} ${aantalGekozen === 1 ? 'ticket' : 'tickets'}` +
                    (aantalVoorVrienden > 0 ? ` (${aantalVoorVrienden} voor vrienden)` : '')
                  : 'Totaal'}
              </Text>
              <Text className="text-[22px] font-bold text-zinc-50">{formatEuro(totaalCenten / 100)}</Text>
            </View>
            <Button
              title="Afrekenen"
              size="lg"
              className="max-w-[220px] flex-1"
              disabled={aantalGekozen === 0}
              loading={bezig}
              onPress={() => void afrekenen()}
            />
          </View>
        ) : undefined
      }
    >
      {kop(evenement.naam)}

      <DeelnameStatus evenement={evenement} deelname={deelname} />

      {inBezit > 0 ? (
        <ListRow
          icon="qr"
          title="Mijn tickets"
          subtitle={`${inBezit} ${inBezit === 1 ? 'ticket' : 'tickets'} · bekijk de QR-codes`}
          onPress={() => router.push(`/evenement/${id}/mijn-tickets`)}
        />
      ) : null}

      {fout ? <ErrorBanner message={fout} /> : null}

      {evenement.open ? null : (
        <InfoNote>Dit evenement is gesloten. Je kunt geen tickets meer kopen.</InfoNote>
      )}

      <View className="gap-3">
        {tickets.map((ticket) => (
          <TicketKaart
            key={ticket.id}
            ticket={ticket}
            aantal={gekozen[ticket.id] ?? 0}
            onAantal={evenement.open ? (n) => zetAantal(ticket.id, n) : undefined}
            voorVrienden={voorVrienden[ticket.id] ?? 0}
            onVoorVrienden={evenement.open ? (n) => zetVoorVrienden(ticket.id, n) : undefined}
          />
        ))}
      </View>
    </Screen>
  );
}

/**
 * What stands between me and taking part: no ticket yet, or a ticket that wasn't scanned at the entrance yet.
 * The scan makes me a deelnemer; "Deelnemen" is only a fallback when that didn't happen.
 * Nothing for deelnemers, and nothing for a gesloten evenement (that has its own note).
 */
function DeelnameStatus({ evenement, deelname }: { evenement: EvenementBasis; deelname: Deelname }) {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  if (deelname.is_deelnemer || !evenement.open) return null;

  if (!deelname.heeft_ticket) {
    return (
      <InfoNote icon="ticket">
        Koop een ticket om mee te doen. Bij de ingang wordt je ticket gescand, daarna doe je mee en kun je munten kopen.
      </InfoNote>
    );
  }

  if (!deelname.kan_deelnemen) {
    return (
      <Card className="flex-row items-center gap-3 p-4">
        <IconBox icon="check" variant="accent" />
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-semibold text-zinc-50">Je hebt een ticket</Text>
          <Text className="mt-0.5 text-[13px] text-zinc-400">
            Laat je ticket scannen bij de ingang. Daarna doe je mee en kun je munten kopen.
          </Text>
        </View>
      </Card>
    );
  }

  const doeMee = async () => {
    setBezig(true);
    setFout(null);
    try {
      await deelnemen(evenement.id);
      router.replace(`/evenement/${evenement.id}`);
    } catch (err) {
      setFout(foutmelding(err, 'Deelnemen lukt niet. Probeer het opnieuw.'));
      setBezig(false);
    }
  };

  return (
    <Card className="gap-4 p-4">
      <View className="flex-row items-center gap-3">
        <IconBox icon="check" variant="accent" />
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-semibold text-zinc-50">Je ticket is gescand</Text>
          <Text className="mt-0.5 text-[13px] text-zinc-400">Doe mee om je munten en kaart te gebruiken.</Text>
        </View>
      </View>
      {fout ? <ErrorBanner message={fout} /> : null}
      <Button title="Deelnemen" icon="arrow-up-right" onPress={() => void doeMee()} loading={bezig} />
    </Card>
  );
}

interface TicketKaartProps {
  ticket: TicketType;
  /** How many I'm about to buy. */
  aantal: number;
  /** Undefined when nothing can be bought (gesloten evenement). */
  onAantal?: (aantal: number) => void;
  /** Of `aantal`, how many are for friends. */
  voorVrienden: number;
  onVoorVrienden?: (aantal: number) => void;
}

/** Ticket type card: naam + prijs, then a divider with the munten pill, how many I have, and the −/+ counter. */
function TicketKaart({ ticket, aantal, onAantal, voorVrienden, onVoorVrienden }: TicketKaartProps) {
  const gekozen = aantal > 0;

  return (
    <View
      className={`gap-3.5 rounded-[20px] bg-zinc-900 p-[18px] ${
        gekozen ? 'border-[1.5px] border-purple-700' : 'border border-zinc-800'
      }`}
    >
      {/* items-center instead of the design's flex-start: there is no description line under the naam. */}
      <View className="flex-row items-center justify-between gap-3">
        <Text className="min-w-0 flex-1 text-[17px] font-bold text-zinc-50">{ticket.naam}</Text>
        <Text className="text-xl font-bold text-zinc-50">{formatEuro(ticket.prijs)}</Text>
      </View>
      <View className="min-h-9 flex-row items-center justify-between gap-3 border-t border-zinc-800 pt-3">
        <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-x-3 gap-y-1.5">
          {ticket.munten ? (
            <Pill label={`Incl. ${formatMunten(ticket.munten)}`} tone={gekozen ? 'accent' : 'neutral'} />
          ) : null}
          {ticket.aantal_gekocht > 0 ? (
            <View className="flex-row items-center gap-1.5">
              <Icon name="check" size={16} color={kleuren.emerald300} />
              <Text className="text-[13px] font-semibold text-emerald-300">Je hebt er {ticket.aantal_gekocht}</Text>
            </View>
          ) : null}
        </View>
        {onAantal ? <Teller naam={ticket.naam} aantal={aantal} onAantal={onAantal} /> : null}
      </View>
      {/* Only once at least one is chosen: how many of those are for friends. */}
      {onVoorVrienden && aantal > 0 ? (
        <View className="flex-row items-center justify-between gap-3 border-t border-zinc-800 pt-3">
          <View className="min-w-0 flex-1">
            <Text className="text-[13px] font-semibold text-zinc-200">Waarvan voor vrienden</Text>
            <Text className="mt-0.5 text-xs text-zinc-500">Zij krijgen het ticket en de munten via jouw link.</Text>
          </View>
          <Teller naam={`${ticket.naam} voor vrienden`} aantal={voorVrienden} onAantal={onVoorVrienden} max={aantal} />
        </View>
      ) : null}
    </View>
  );
}

function Teller({
  naam,
  aantal,
  onAantal,
  max = MAX_PER_SOORT,
}: {
  naam: string;
  aantal: number;
  onAantal: (aantal: number) => void;
  max?: number;
}) {
  return (
    <View className="flex-row items-center gap-2.5">
      <TellerKnop icon="minus" label={`Eén ${naam} minder`} disabled={aantal <= 0} onPress={() => onAantal(aantal - 1)} />
      <Text
        accessibilityLabel={`${aantal} × ${naam}`}
        accessibilityLiveRegion="polite"
        className={`min-w-[22px] text-center text-[17px] font-bold ${aantal > 0 ? 'text-zinc-50' : 'text-zinc-500'}`}
      >
        {aantal}
      </Text>
      <TellerKnop
        icon="plus"
        label={`Eén ${naam} meer`}
        disabled={aantal >= max}
        onPress={() => onAantal(aantal + 1)}
      />
    </View>
  );
}

function TellerKnop({ icon, label, disabled, onPress }: { icon: 'minus' | 'plus'; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      className={`h-9 w-9 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 ${
        disabled ? 'opacity-30' : 'active:opacity-70'
      }`}
    >
      <Icon name={icon} size={18} color={kleuren.zinc50} />
    </Pressable>
  );
}
