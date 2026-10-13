// Screen 1 — Tickets tab (MijnTickets.dc.html): gekochte tickets and evenementen without a ticket yet.

import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';

import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  ErrorState,
  Icon,
  LoadingState,
  Screen,
  SectionLabel,
  StatusPill,
  TabTitle,
  kleuren,
} from '@/components/lagapay';
import { useApiData } from '@/hooks/use-api-data';
import { getMijnTickets } from '@/lib/api/lagapay';
import type { GekochtTicket, RecentBekeken } from '@/lib/api/types';
import { formatDatum, formatDatumBereikKort, formatEuro, formatMunten } from '@/lib/format';

export default function TicketsScreen() {
  const { data, error, loading, refreshing, reload, refresh } = useApiData(getMijnTickets, []);

  let inhoud: ReactNode;
  if (loading) {
    inhoud = <LoadingState />;
  } else if (!data) {
    inhoud = <ErrorState message={error ?? ''} title="Tickets laden lukt niet" onRetry={reload} />;
  } else if (data.gekocht.length === 0 && data.recent_bekeken.length === 0) {
    inhoud = (
      <EmptyState
        icon="ticket"
        title="Nog geen tickets"
        text="Tickets die je koopt verschijnen hier. Doe je mee aan een evenement met tickets, dan kun je hier een ticket kopen."
        action={
          <Button title="Evenement toevoegen" icon="scan" variant="secondary" onPress={() => router.push('/toevoegen')} />
        }
      />
    );
  } else {
    inhoud = (
      <>
        {error ? <ErrorBanner message={error} /> : null}
        {data.gekocht.length > 0 ? (
          <View>
            <SectionLabel>Gekocht</SectionLabel>
            <View className="gap-3">
              {data.gekocht.map((ticket) => (
                <TicketKaart key={ticket.id} ticket={ticket} />
              ))}
            </View>
          </View>
        ) : null}
        {data.recent_bekeken.length > 0 ? (
          <View>
            <SectionLabel>Recent bekeken, nog geen ticket</SectionLabel>
            <View className="gap-3">
              {data.recent_bekeken.map((evenement) => (
                <RecentRij key={evenement.id} evenement={evenement} />
              ))}
            </View>
          </View>
        ) : null}
      </>
    );
  }

  return (
    <Screen gap={20} onRefresh={loading ? undefined : refresh} refreshing={refreshing}>
      <TabTitle>Tickets</TabTitle>
      {inhoud}
    </Screen>
  );
}

/** Ticket card: naam + ticket type/dates + status, dashed strip with included munten and "Bekijk". */
function TicketKaart({ ticket }: { ticket: GekochtTicket }) {
  const { evenement } = ticket;
  const regel = `${ticket.naam} · ${formatDatumBereikKort(evenement.start_datum, evenement.eind_datum)}`;
  const munten = ticket.munten ? `Incl. ${formatMunten(ticket.munten)}` : null;

  return (
    <Card
      radius={20}
      // Not a deelnemer yet (evenement with tickets that hasn't started, or not joined): its tickets screen.
      onPress={() => router.push(evenement.is_deelnemer ? `/evenement/${evenement.id}` : `/evenement/${evenement.id}/tickets`)}
      accessibilityLabel={`${evenement.naam}, ${regel}, ${ticket.status === 'geldig' ? 'geldig' : 'verlopen'}. Bekijk evenement`}
      className="overflow-hidden"
    >
      <View className="flex-row items-start justify-between gap-3 px-[18px] py-4">
        <View className="min-w-0 flex-1">
          <Text numberOfLines={2} className="text-[17px] font-bold text-zinc-50">
            {evenement.naam}
          </Text>
          <Text numberOfLines={1} className="mt-1 text-[13px] text-zinc-400">
            {regel}
          </Text>
        </View>
        <StatusPill status={ticket.status} />
      </View>

      <View className="relative flex-row items-center justify-between overflow-hidden bg-[#131316] px-[18px] py-3">
        {/* Dashed top border only: RN (iOS) draws dashed borders only when all sides have the same width,
            so a fully dashed box is drawn and its left/right/bottom edges are clipped away. */}
        <View
          pointerEvents="none"
          className="absolute -bottom-1 -left-1 -right-1 top-0 border-[1.5px] border-dashed border-zinc-700"
        />
        {munten ? <Text className="text-[13px] text-zinc-400">{munten}</Text> : <View />}
        <View className="flex-row items-center gap-1.5">
          <Text className="text-[13px] font-semibold text-purple-300">Bekijk</Text>
          <Icon name="chevron-right" size={16} color={kleuren.purple300} />
        </View>
      </View>
    </Card>
  );
}

/** Evenement without a ticket: naam, date + lowest price, "Koop ticket". */
function RecentRij({ evenement }: { evenement: RecentBekeken }) {
  const regel =
    evenement.vanaf_prijs !== null
      ? `${formatDatum(evenement.start_datum)} · vanaf ${formatEuro(evenement.vanaf_prijs)}`
      : formatDatum(evenement.start_datum);
  const naarTickets = () => router.push(`/evenement/${evenement.id}/tickets`);

  return (
    <Card
      radius={20}
      onPress={naarTickets}
      accessibilityLabel={`${evenement.naam}, ${regel}. Koop ticket`}
      className="flex-row items-center justify-between gap-3 px-[18px] py-4"
    >
      <View className="min-w-0 flex-1">
        <Text numberOfLines={2} className="text-base font-bold text-zinc-50">
          {evenement.naam}
        </Text>
        <Text numberOfLines={1} className="mt-1 text-[13px] text-zinc-400">
          {regel}
        </Text>
      </View>
      {/* Looks like a small primary Button, but the whole card is the button (a nested Pressable would
          render a <button> inside a <button> on web). */}
      <View className="shrink-0 rounded-xl bg-purple-700 px-3.5 py-[9px]">
        <Text className="text-[13px] font-semibold text-white">Koop ticket</Text>
      </View>
    </Card>
  );
}
