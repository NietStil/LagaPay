// Bar terminal — Scan (app-design/terminal/Scan.dc.html): scans ticket QR codes of this evenement at the entrance
// (same as POST /tickets/scan, allowed for an actieve terminal). Only ticket codes are sent; any other QR code
// (an evenement or terminal link, ...) gets a message instead. The result is shown under the camera.

import { useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { ErrorBanner, Icon, QrScanner, Screen, kleuren } from '@/components/lagapay';
import { useTerminalId } from '@/components/terminal/winkelwagen';
import { foutmelding, scanTicketBijTerminal } from '@/lib/api/lagapay';
import type { GescandTicket } from '@/lib/api/types';
import { parseLagaPayLink, ticketCodeUit } from '@/lib/links';

export default function TerminalScanScreen() {
  const id = useTerminalId();
  const [bezig, setBezig] = useState(false);
  const [gescand, setGescand] = useState<GescandTicket | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const bezigRef = useRef(false);

  const scan = async (data: string) => {
    if (bezigRef.current) return;

    const code = ticketCodeUit(data);
    if (!code) {
      setGescand(null);
      setFout(
        parseLagaPayLink(data)
          ? 'Dit is geen ticket maar een LagaPay-link. Scan de QR-code op het ticket van de bezoeker.'
          : 'Deze QR-code is geen LagaPay-ticket.',
      );
      return;
    }

    bezigRef.current = true;
    setBezig(true);
    setFout(null);
    setGescand(null);
    try {
      setGescand(await scanTicketBijTerminal(id, code));
    } catch (err: any) {
      // 409 already used / 422 other evenement also return the ticket.
      const ticket: GescandTicket | undefined = err?.response?.data?.ticket;
      setFout(ticket ? `${foutmelding(err)} (${ticket.naam} van ${ticket.eigenaar})` : foutmelding(err));
    } finally {
      bezigRef.current = false;
      setBezig(false);
    }
  };

  return (
    <Screen scroll={false} gap={16}>
      <Text accessibilityRole="header" className="text-[22px] font-bold tracking-[-0.3px] text-zinc-50">
        Scannen
      </Text>

      <View className="flex-1 items-center justify-center overflow-hidden rounded-3xl border border-zinc-800 bg-[#131316]">
        <QrScanner
          onScan={(data) => void scan(data)}
          bezig={bezig}
          bezigLabel="Ticket controleren…"
          waarom="De terminal gebruikt de camera om tickets bij de ingang te scannen."
          geenCameraTekst="Dit toestel heeft geen camera. Scan tickets met een telefoon."
        />
      </View>

      {fout ? (
        <ErrorBanner message={fout} />
      ) : gescand ? (
        <View className="flex-row items-center gap-3.5 rounded-[18px] border border-emerald-800 bg-emerald-950 p-4">
          <View className="h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-400">
            <Icon name="check" size={22} color={kleuren.emerald950} strokeWidth={3} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-base font-bold text-emerald-300">Ticket geldig</Text>
            <Text className="mt-0.5 text-[13px] text-emerald-200">{`${gescand.naam} · ${gescand.eigenaar}`}</Text>
          </View>
        </View>
      ) : (
        <View className="items-center">
          <Text className="text-base font-bold text-zinc-50">Richt de camera op een QR-code</Text>
          <Text className="mt-1 text-[13px] text-zinc-400">De code wordt automatisch herkend.</Text>
        </View>
      )}
    </Screen>
  );
}
