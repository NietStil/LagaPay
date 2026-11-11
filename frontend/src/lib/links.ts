// Parsing of LagaPay join links (QR codes and shared links).
//
// Accepted forms (see app-design/API.md "Deep links"):
//   https://lagapay.nl/e/{code}    lagapay://e/{code}    lagapay.nl/e/{code}
//   https://lagapay.nl/g/{code}    lagapay://g/{code}
//   https://lagapay.nl/t/{code}    lagapay://t/{code}    (a ticket a friend bought for you)
//   https://lagapay.nl/k/{code}    lagapay://k/{code}    (terminal code: this device becomes a bar terminal)
//   exp://192.168.1.2:8081/--/e/{code}   (Expo Go / dev client)
// Query strings and hashes are ignored; a trailing slash is allowed.

export type LagaPayLink =
  | { soort: 'evenement'; code: string; pad: `/e/${string}` }
  | { soort: 'groep'; code: string; pad: `/g/${string}` }
  | { soort: 'ticket'; code: string; pad: `/t/${string}` }
  | { soort: 'terminal'; code: string; pad: `/k/${string}` };

const PAD_PATROON = /^\/(e|g|t|k)\/([A-Za-z0-9_-]+)\/?$/;

/** Returns the evenement/groep link inside `data`, or null when it isn't a LagaPay join link. */
export function parseLagaPayLink(data: string): LagaPayLink | null {
  let rest = data.trim().split(/[?#]/)[0] ?? '';

  const schema = /^([a-z][a-z0-9+.-]*):\/\/(.*)$/i.exec(rest);
  if (schema) {
    const naam = schema[1].toLowerCase();
    rest = schema[2];
    if (naam === 'http' || naam === 'https' || naam === 'exp' || naam === 'exps') {
      // Drop the host (and port).
      const slash = rest.indexOf('/');
      rest = slash === -1 ? '' : rest.slice(slash);
    } else {
      // Custom scheme (lagapay://e/code): the "host" is the first path segment.
      rest = `/${rest}`;
    }
  } else if (!rest.startsWith('/') && /^[^/]+\.[^/]+\//.test(rest)) {
    // "lagapay.nl/e/code" without a scheme.
    rest = rest.slice(rest.indexOf('/'));
  } else if (!rest.startsWith('/')) {
    rest = `/${rest}`;
  }

  // Expo Go / dev client URLs put the app path after "/--".
  rest = rest.replace(/^\/--(?=\/)/, '');

  const m = PAD_PATROON.exec(rest);
  if (!m) return null;
  const code = m[2];
  if (m[1] === 'e') return { soort: 'evenement', code, pad: `/e/${code}` };
  if (m[1] === 'g') return { soort: 'groep', code, pad: `/g/${code}` };
  if (m[1] === 'k') return { soort: 'terminal', code, pad: `/k/${code}` };
  return { soort: 'ticket', code, pad: `/t/${code}` };
}

/** Prefix of the QR content on a ticket (backend GekochtTicket::QR_VOORVOEGSEL). */
export const TICKET_QR_VOORVOEGSEL = 'LAGAPAY-TICKET:';

const TICKET_CODE = /^[A-Za-z0-9_-]{20}$/;

/** The ticket code in a scanned ticket QR code ("LAGAPAY-TICKET:{code}") or a bare 20 character code, else null. */
export function ticketCodeUit(data: string): string | null {
  const invoer = data.trim();
  const code = invoer.startsWith(TICKET_QR_VOORVOEGSEL) ? invoer.slice(TICKET_QR_VOORVOEGSEL.length) : invoer;
  return TICKET_CODE.test(code) ? code : null;
}
