// Screen 13 — Tickets kopen (Tickets.dc.html): pick a ticket type of one evenement.
// Until Mollie exists, Afrekenen is a test betaling: the ticket (and its munten) is yours straight away.
// It is also where an evenement link with tickets lands before you're a deelnemer: the status card on top
// says what's needed, and shows "Deelnemen" once you have a ticket and the evenement has started.

import { useState, type ReactNode } from 'react';
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
  LoadingState,
  Pill,
  Screen,
  ScreenHeader,
  kleuren,
} from '@/components/lagapay';
import { useApiData } from '@/hooks/use-api-data';
import { deelnemen, foutmelding, getEvenementTickets, koopTicket } from '@/lib/api/lagapay';
import type { Deelname, EvenementBasis, EvenementTickets, TicketType } from '@/lib/api/types';
import { formatDatum, formatEuro, formatMunten, formatTijd } from '@/lib/format';
import { meld } from '@/lib/melding';

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
  const [gekozenId, setGekozenId] = useState<number | null>(null);
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

  const kiesbaar = evenement.open ? tickets.filter((t) => !t.gekocht) : [];
  // Keep the user's choice while it's still valid, otherwise preselect the cheapest ticket not bought yet.
  const gekozen =
    kiesbaar.find((t) => t.id === gekozenId) ??
    kiesbaar.reduce<TicketType | undefined>(
      (goedkoopste, t) => (!goedkoopste || Number(t.prijs) < Number(goedkoopste.prijs) ? t : goedkoopste),
      undefined,
    );

  const afrekenen = async () => {
    if (!gekozen) return;
    setBezig(true);
    setFout(null);
    try {
      setData({ soort: 'ok', data: await koopTicket(id, gekozen.id) });
      meld('Ticket gekocht', `${gekozen.naam} is van jou. Testmodus: er is nog niet echt betaald.`);
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
        <View className="flex-row items-center justify-between gap-4">
          <View>
            <Text className="text-xs text-zinc-400">Totaal</Text>
            <Text className="text-[22px] font-bold text-zinc-50">{formatEuro(gekozen?.prijs ?? 0)}</Text>
          </View>
          <Button
            title="Afrekenen"
            size="lg"
            className="max-w-[220px] flex-1"
            disabled={!gekozen}
            loading={bezig}
            onPress={() => void afrekenen()}
          />
        </View>
      }
    >
      {kop(evenement.naam)}

      <DeelnameStatus evenement={evenement} deelname={deelname} />

      {fout ? <ErrorBanner message={fout} /> : null}

      {evenement.open ? null : (
        <InfoNote>Dit evenement is gesloten. Je kunt geen tickets meer kopen.</InfoNote>
      )}

      <View className="gap-3">
        {tickets.map((ticket) => (
          <TicketKaart
            key={ticket.id}
            ticket={ticket}
            geselecteerd={ticket.id === gekozen?.id}
            onPress={kiesbaar.includes(ticket) ? () => setGekozenId(ticket.id) : undefined}
          />
        ))}
      </View>
    </Screen>
  );
}

/** "18 jul om 14:00" */
function beginMoment(evenement: EvenementBasis): string {
  return `${formatDatum(evenement.start_datum)} om ${formatTijd(evenement.start_datum)}`;
}

/**
 * What stands between me and taking part: no ticket yet, waiting for the start, or ready to join.
 * Nothing for deelnemers, and nothing for a gesloten evenement (that has its own note).
 */
function DeelnameStatus({ evenement, deelname }: { evenement: EvenementBasis; deelname: Deelname }) {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  if (deelname.is_deelnemer || !evenement.open) return null;

  if (!deelname.heeft_ticket) {
    return (
      <InfoNote icon="ticket">
        {deelname.gestart
          ? 'Koop een ticket om mee te doen met dit evenement.'
          : `Koop een ticket om mee te doen. Vanaf ${beginMoment(evenement)} kun je deelnemen.`}
      </InfoNote>
    );
  }

  if (!deelname.kan_deelnemen) {
    return (
      <Card className="flex-row items-center gap-3 p-4">
        <IconBox icon="check" variant="accent" />
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-semibold text-zinc-50">Je hebt een ticket</Text>
          <Text className="mt-0.5 text-[13px] text-zinc-400">Je kunt meedoen vanaf {beginMoment(evenement)}.</Text>
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
          <Text className="text-[15px] font-semibold text-zinc-50">Het evenement is begonnen</Text>
          <Text className="mt-0.5 text-[13px] text-zinc-400">Je hebt een ticket. Doe mee om je munten en kaart te gebruiken.</Text>
        </View>
      </View>
      {fout ? <ErrorBanner message={fout} /> : null}
      <Button title="Deelnemen" icon="arrow-up-right" onPress={() => void doeMee()} loading={bezig} />
    </Card>
  );
}

interface TicketKaartProps {
  ticket: TicketType;
  geselecteerd: boolean;
  /** Undefined when the ticket can't be chosen (already bought, gesloten evenement). */
  onPress?: () => void;
}

/** Ticket type card: naam + prijs, then a divider with the "Incl. N munten" pill and the selection state. */
function TicketKaart({ ticket, geselecteerd, onPress }: TicketKaartProps) {
  let status: ReactNode;
  if (ticket.gekocht) {
    status = <TicketStatus label="Gekocht" kleur={kleuren.emerald300} tekstKlasse="text-emerald-300" />;
  } else if (geselecteerd) {
    status = <TicketStatus label="Geselecteerd" kleur={kleuren.purple300} tekstKlasse="text-purple-300" />;
  } else if (onPress) {
    status = <Text className="text-[13px] font-semibold text-zinc-400">Kies</Text>;
  } else {
    status = null;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="radio"
      accessibilityLabel={`${ticket.naam}, ${formatEuro(ticket.prijs)}${ticket.gekocht ? ', gekocht' : ''}`}
      accessibilityState={{ checked: geselecteerd, disabled: !onPress }}
      className={`gap-3.5 rounded-[20px] bg-zinc-900 p-[18px] ${
        geselecteerd ? 'border-[1.5px] border-purple-700' : 'border border-zinc-800'
      } ${ticket.gekocht ? 'opacity-60' : onPress ? 'active:opacity-80' : ''}`}
    >
      {/* items-center instead of the design's flex-start: there is no description line under the naam. */}
      <View className="flex-row items-center justify-between gap-3">
        <Text className="min-w-0 flex-1 text-[17px] font-bold text-zinc-50">{ticket.naam}</Text>
        <Text className="text-xl font-bold text-zinc-50">{formatEuro(ticket.prijs)}</Text>
      </View>
      <View className="flex-row items-center justify-between gap-3 border-t border-zinc-800 pt-3">
        <View>
          {ticket.munten ? (
            <Pill label={`Incl. ${formatMunten(ticket.munten)}`} tone={geselecteerd ? 'accent' : 'neutral'} />
          ) : null}
        </View>
        {status}
      </View>
    </Pressable>
  );
}

function TicketStatus({ label, kleur, tekstKlasse }: { label: string; kleur: string; tekstKlasse: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <Icon name="check" size={16} color={kleur} />
      <Text className={`text-[13px] font-semibold ${tekstKlasse}`}>{label}</Text>
    </View>
  );
}
