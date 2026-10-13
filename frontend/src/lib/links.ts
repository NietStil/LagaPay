// Parsing of LagaPay join links (QR codes and shared links).
//
// Accepted forms (see app-design/API.md "Deep links"):
//   https://lagapay.nl/e/{code}    lagapay://e/{code}    lagapay.nl/e/{code}
//   https://lagapay.nl/g/{code}    lagapay://g/{code}
//   exp://192.168.1.2:8081/--/e/{code}   (Expo Go / dev client)
// Query strings and hashes are ignored; a trailing slash is allowed.

export type LagaPayLink =
  | { soort: 'evenement'; code: string; pad: `/e/${string}` }
  | { soort: 'groep'; code: string; pad: `/g/${string}` };

const PAD_PATROON = /^\/(e|g)\/([A-Za-z0-9_-]+)\/?$/;

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
  return m[1] === 'e'
    ? { soort: 'evenement', code, pad: `/e/${code}` }
    : { soort: 'groep', code, pad: `/g/${code}` };
}
