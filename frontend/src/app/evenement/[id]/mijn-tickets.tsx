// Mijn tickets: my bought tickets of one evenement as QR codes, one per page; swipe through them.
// A ticket that was scanned at the entrance turns grey with a "Gebruikt" tag. While the screen is open it refetches
// every few seconds, so that happens right after the scan.
// Tickets can be put on offer for a friend ("Geef aan een vriend"); one link hands them out (below the tickets).
// The scan makes the holder a deelnemer. In development builds "Scan (dev)" scans a ticket without a scanner.

import { useEffect, useRef, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';

import { Uitnodigingslink } from '@/components/evenement/uitnodigingslink';
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  ErrorState,
  Icon,
  LoadingState,
  Pill,
  QrCode,
  Screen,
  ScreenHeader,
  SectionLabel,
  StatusPill,
  kleuren,
} from '@/components/lagapay';
import { useApiData } from '@/hooks/use-api-data';
import { devScanTicket, foutmelding, getMijnEvenementTickets, zetTicketTeGeven } from '@/lib/api/lagapay';
import type { TicketQr, TicketUitnodiging } from '@/lib/api/types';
import { formatDatum, formatMunten, formatTijd } from '@/lib/format';

/** How often the tickets are refetched while the screen is open, to show a scan at the entrance. */
const VERVERS_MS = 5000;
const MAX_QR = 260;

export default function MijnTicketsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, refreshing, reload, refresh, setData } = useApiData(() => getMijnEvenementTickets(id), [id]);
  const isFocused = useIsFocused();
  const [bezigId, setBezigId] = useState<number | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  // Poll while visible. The ref always holds the latest reload (useApiData returns new functions every render).
  const herlaadRef = useRef(reload);
  useEffect(() => {
    herlaadRef.current = reload;
  });
  useEffect(() => {
    if (!isFocused) return;
    const timer = setInterval(() => herlaadRef.current(), VERVERS_MS);
    return () => clearInterval(timer);
  }, [isFocused]);

  const kop = <ScreenHeader title="Mijn tickets" subtitle={data?.evenement.naam} fallbackHref="/tickets" />;

  if (loading) {
    return (
      <Screen>
        {kop}
        <LoadingState />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen>
        {kop}
        <ErrorState message={error ?? ''} onRetry={reload} />
      </Screen>
    );
  }

  const { evenement, tickets, uitnodiging, deelname } = data;

  // Puts a ticket on offer for a friend, or takes it back.
  const zetTeGeven = async (ticket: TicketQr, teGeven: boolean) => {
    setBezigId(ticket.id);
    setFout(null);
    try {
      setData(await zetTicketTeGeven(id, ticket.id, teGeven));
    } catch (err) {
      setFout(foutmelding(err, 'Aanpassen lukt niet. Probeer het opnieuw.'));
    } finally {
      setBezigId(null);
    }
  };

  // Development only: scans the ticket as if at the entrance (backend lagapay.dev_scan).
  const devScan = async (ticket: TicketQr) => {
    setBezigId(ticket.id);
    setFout(null);
    try {
      setData(await devScanTicket(id, ticket.id));
    } catch (err) {
      setFout(foutmelding(err, 'Scannen lukt niet. Probeer het opnieuw.'));
    } finally {
      setBezigId(null);
    }
  };

  // Everything handed out: nothing left to show except who took them.
  if (tickets.length === 0 && !uitnodiging) {
    return (
      <Screen onRefresh={refresh} refreshing={refreshing}>
        {kop}
        <EmptyState
          icon="ticket"
          title="Nog geen tickets"
          text="Je hebt nog geen tickets voor dit evenement."
          action={
            evenement.open ? (
              <Button title="Tickets kopen" onPress={() => router.replace(`/evenement/${id}/tickets`)} />
            ) : undefined
          }
        />
      </Screen>
    );
  }

  return (
    <Screen
      onRefresh={refresh}
      refreshing={refreshing}
      footer={
        // Not a deelnemer yet: the tickets screen says when you can join (and has "Deelnemen").
        <Button
          title={deelname.is_deelnemer ? 'Naar het evenement' : 'Bekijk evenement'}
          variant="secondary"
          size="lg"
          onPress={() => router.push(deelname.is_deelnemer ? `/evenement/${id}` : `/evenement/${id}/tickets`)}
        />
      }
    >
      {kop}
      {fout ?? error ? <ErrorBanner message={(fout ?? error) as string} /> : null}
      {tickets.length > 0 ? (
        <TicketPager
          tickets={tickets}
          verlopen={!evenement.open}
          bezigId={bezigId}
          onTeGeven={(ticket, teGeven) => void zetTeGeven(ticket, teGeven)}
          onDevScan={__DEV__ ? (ticket) => void devScan(ticket) : undefined}
        />
      ) : (
        <EmptyState
          icon="ticket"
          title="Geen tickets meer bij jou"
          text="Al je tickets zijn aan vrienden gegeven. Hieronder zie je wie ze heeft."
        />
      )}
      {uitnodiging ? <VriendenPaneel uitnodiging={uitnodiging} evenementNaam={evenement.naam} open={evenement.open} /> : null}
    </Screen>
  );
}

/** One ticket per page, full width; swipe between them, dots under it. Starts at the first ticket that wasn't used yet. */
function TicketPager({
  tickets,
  verlopen,
  bezigId,
  onTeGeven,
  onDevScan,
}: {
  tickets: TicketQr[];
  verlopen: boolean;
  bezigId: number | null;
  onTeGeven: (ticket: TicketQr, teGeven: boolean) => void;
  onDevScan?: (ticket: TicketQr) => void;
}) {
  const [breedte, setBreedte] = useState(0);
  // Opens on the first ticket of mine that wasn't used yet (tickets for friends come after my own).
  const [index, setIndex] = useState(() => Math.max(0, tickets.findIndex((t) => !t.gebruikt && !t.te_geven)));
  const huidig = Math.min(index, tickets.length - 1);

  return (
    <View onLayout={(e) => setBreedte(e.nativeEvent.layout.width)} className="gap-4">
      {breedte > 0 ? (
        <FlatList
          data={tickets}
          keyExtractor={(ticket) => String(ticket.id)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={huidig}
          getItemLayout={(_, i) => ({ length: breedte, offset: breedte * i, index: i })}
          onScroll={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / breedte))}
          scrollEventThrottle={16}
          renderItem={({ item, index: i }) => (
            <View style={{ width: breedte }}>
              <TicketKaart
                ticket={item}
                nummer={i + 1}
                totaal={tickets.length}
                verlopen={verlopen}
                breedte={breedte}
                // Only when the backend says this ticket can still be given (mine, unused, munten not paid out yet).
                onTeGeven={item.kan_geven ? (teGeven) => onTeGeven(item, teGeven) : undefined}
                onDevScan={onDevScan && !item.gebruikt ? () => onDevScan(item) : undefined}
                bezig={bezigId === item.id}
              />
            </View>
          )}
        />
      ) : null}

      {tickets.length > 1 ? (
        <View className="flex-row flex-wrap items-center justify-center gap-1.5 px-2" accessibilityLabel={`Ticket ${huidig + 1} van ${tickets.length}`}>
          {tickets.map((ticket, i) => (
            <View
              key={ticket.id}
              className={`h-2 rounded-full ${i === huidig ? 'w-5 bg-purple-300' : ticket.gebruikt ? 'w-2 bg-zinc-800' : 'w-2 bg-zinc-600'}`}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

interface TicketKaartProps {
  ticket: TicketQr;
  nummer: number;
  totaal: number;
  verlopen: boolean;
  breedte: number;
  /** Undefined when this ticket can't be put on offer (used, received from a friend, gesloten evenement). */
  onTeGeven?: (teGeven: boolean) => void;
  /** Development builds only, for tickets that weren't used yet. */
  onDevScan?: () => void;
  bezig?: boolean;
}

/** Ticket naam + status, the QR code (greyed out with a "Gebruikt" tag once scanned) and the code in text. */
function TicketKaart({ ticket, nummer, totaal, verlopen, breedte, onTeGeven, onDevScan, bezig = false }: TicketKaartProps) {
  // Card padding (20 × 2) and the white quiet zone around the code (12 × 2).
  const qrGrootte = Math.min(MAX_QR, breedte - 64);
  const regel = [`Ticket ${nummer} van ${totaal}`, ticket.munten ? `Incl. ${formatMunten(ticket.munten)}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <View
      className={`items-center gap-4 rounded-3xl border p-5 ${
        ticket.gebruikt ? 'border-zinc-800 bg-[#111113]' : 'border-zinc-800 bg-zinc-900'
      }`}
    >
      <View className="w-full flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className={`text-lg font-bold ${ticket.gebruikt ? 'text-zinc-400' : 'text-zinc-50'}`}>
            {ticket.naam}
          </Text>
          <Text className="mt-0.5 text-[13px] text-zinc-400">{regel}</Text>
        </View>
        {ticket.te_geven && !ticket.gebruikt ? (
          <Pill label="Voor een vriend" tone="accent" />
        ) : (
          <StatusPill
            status={ticket.gebruikt ? 'inactief' : verlopen ? 'verlopen' : 'geldig'}
            label={ticket.gebruikt ? 'Gebruikt' : undefined}
          />
        )}
      </View>

      <View accessibilityLabel={ticket.gebruikt ? 'QR-code, gebruikt' : 'QR-code om te scannen bij de ingang'}>
        <View className={`rounded-2xl bg-white p-3 ${ticket.gebruikt ? 'opacity-20' : ''}`}>
          <QrCode value={ticket.qr} size={qrGrootte} />
        </View>
        {ticket.gebruikt ? (
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <View className="-rotate-12 rounded-xl border-2 border-zinc-300 bg-zinc-950/90 px-5 py-2">
              <Text className="text-xl font-extrabold uppercase tracking-[3px] text-zinc-100">Gebruikt</Text>
            </View>
          </View>
        ) : null}
      </View>

      <Text selectable className="font-mono text-xs text-zinc-500">
        {ticket.code}
      </Text>
      <Text className="text-center text-[13px] text-zinc-400">
        {ticket.gebruikt
          ? ticket.gebruikt_op
            ? `Gescand op ${formatDatum(ticket.gebruikt_op)} om ${formatTijd(ticket.gebruikt_op)}.`
            : 'Dit ticket is gescand.'
          : ticket.gekregen_van
            ? `Gekregen van ${ticket.gekregen_van}. Laat deze QR-code scannen bij de ingang.`
            : ticket.te_geven
              ? 'Wacht op een vriend. Je kunt hem ook zelf gebruiken: laat de QR-code scannen bij de ingang.'
              : 'Laat deze QR-code scannen bij de ingang.'}
      </Text>

      {onTeGeven ? (
        <Button
          title={ticket.te_geven ? 'Toch zelf houden' : 'Geef aan een vriend'}
          icon={ticket.te_geven ? undefined : 'share'}
          variant="secondary"
          size="sm"
          loading={bezig}
          onPress={() => onTeGeven(!ticket.te_geven)}
        />
      ) : null}

      {onDevScan ? (
        <Button title="Scan (dev)" icon="scan" variant="secondary" size="sm" loading={bezig} onPress={onDevScan} />
      ) : null}
    </View>
  );
}

/**
 * My link for friends: how many tickets are still on offer, the link to share, and who already took one.
 * A friend opening the link gets a ticket and joins the evenement; they never have to handle the ticket.
 */
function VriendenPaneel({
  uitnodiging,
  evenementNaam,
  open,
}: {
  uitnodiging: TicketUitnodiging;
  evenementNaam: string;
  open: boolean;
}) {
  const { beschikbaar, genomen } = uitnodiging;

  return (
    <View className="gap-3">
      <SectionLabel>Voor vrienden</SectionLabel>
      <Text className="text-[13px] leading-5 text-zinc-400">
        {beschikbaar > 0
          ? `Nog ${beschikbaar} ${beschikbaar === 1 ? 'ticket' : 'tickets'} voor vrienden. Wie de link opent krijgt een ticket en doet meteen mee, zonder iets te hoeven regelen.`
          : genomen.length > 0
            ? 'Al je tickets voor vrienden zijn vergeven.'
            : 'Zet een ticket op "Geef aan een vriend" om het met de link te delen.'}
      </Text>

      {beschikbaar > 0 && open ? (
        <Uitnodigingslink
          link={uitnodiging.link}
          label="Link voor vrienden"
          titel={`Ticket voor ${evenementNaam}`}
          omschrijving="Laat een vriend deze QR-code scannen in de LagaPay app. Hij of zij krijgt een ticket en doet meteen mee."
        />
      ) : null}

      {genomen.length > 0 ? (
        <Card radius={16} className="overflow-hidden">
          {genomen.map((vriend, i) => (
            <View
              key={`${vriend.naam}-${vriend.datum}-${i}`}
              className={`flex-row items-center justify-between gap-3 px-4 py-3 ${i < genomen.length - 1 ? 'border-b border-zinc-800' : ''}`}
            >
              <View className="flex-row items-center gap-2.5">
                <Icon name="check" size={16} color={kleuren.emerald300} />
                <Text className="text-[15px] font-semibold text-zinc-50">{vriend.naam}</Text>
              </View>
              <Text className="text-xs text-zinc-500">
                {formatDatum(vriend.datum)} om {formatTijd(vriend.datum)}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}
    </View>
  );
}
