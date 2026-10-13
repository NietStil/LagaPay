<?php

namespace App\Services\Mobiel;

use App\Models\Evenement;
use App\Models\Groep;
use App\Models\Kaart;
use App\Models\Transactie;
use DateTimeInterface;
use Illuminate\Support\Carbon;

/**
 * Turns models into the JSON shapes of the app API (see frontend/app-design/API.md).
 */
class Weergave {
    /** Transactie types that take munten out of a wallet. Every other type adds munten. */
    public const NEGATIEVE_TYPES = ['uitgave', 'terugstorting'];

    /** Transactie types that count as "munten gekocht" for a groep lid. */
    public const GEKOCHT_TYPES = ['opwaardering', 'ticket'];

    public const LABELS = [
        'opwaardering'  => 'Opwaardering',
        'ticket'        => 'Ticket: inbegrepen munten',
        'uitgave'       => 'Uitgave',
        'terugstorting' => 'Terugstorting',
    ];

    public function evenementBasis(Evenement $evenement): array {
        return [
            'id'                  => $evenement->id,
            'naam'                => $evenement->naam,
            'open'                => (bool) $evenement->open,
            'start_datum'         => $this->datum($evenement->start_datum),
            'eind_datum'          => $this->datum($evenement->eind_datum),
            'telefoon_betaling'   => (bool) $evenement->telefoon_betaling,
            'munten_terugstorten' => (bool) $evenement->munten_terugstorten,
            'heeft_tickets'       => (bool) $evenement->heeft_tickets,
            'munt_prijs'          => $this->geld($evenement->munt_prijs),
        ];
    }

    public function transactie(Transactie $transactie, bool $metGebruiker = false): array {
        $gebruiker = $metGebruiker ? $transactie->gebruiker : null;

        return [
            'id'        => $transactie->id,
            'type'      => $transactie->type,
            'label'     => self::LABELS[$transactie->type] ?? ucfirst((string) $transactie->type),
            'bedrag'    => $this->bedrag($transactie->type, (int) $transactie->hoeveelheid),
            'datum'     => $this->datum($transactie->created_at),
            'gebruiker' => $gebruiker ? ['id' => $gebruiker->id, 'voornaam' => $gebruiker->voornaam] : null,
        ];
    }

    /** Applies the sign of the transactie type to the (positive) stored hoeveelheid. */
    public function bedrag(?string $type, int $hoeveelheid): int {
        return in_array($type, self::NEGATIEVE_TYPES, true) ? -abs($hoeveelheid) : abs($hoeveelheid);
    }

    /** Expects the kaart's evenement relation to be loaded (id, naam, open) for tijdelijke kaarten. */
    public function kaart(?Kaart $kaart): ?array {
        if (! $kaart) {
            return null;
        }

        $permanent = $kaart->evenement_id === null;
        $evenement = $permanent ? null : $kaart->evenement;

        if (! $kaart->actief) {
            $status = 'inactief';
        } elseif ($evenement && ! $evenement->open) {
            $status = 'verlopen';
        } else {
            $status = 'actief';
        }

        return [
            'id'           => $kaart->id,
            'uid_laatste4' => strtoupper(substr((string) $kaart->uid, -4)),
            'permanent'    => $permanent,
            'actief'       => (bool) $kaart->actief,
            'status'       => $status,
            'evenement'    => $evenement ? ['id' => $evenement->id, 'naam' => $evenement->naam] : null,
        ];
    }

    public function groepKort(?Groep $groep): ?array {
        return $groep ? ['id' => $groep->id, 'naam' => $groep->naam] : null;
    }

    /** Euros as a decimal string with 2 decimals ("1.50"). */
    public function geld(mixed $waarde): ?string {
        return $waarde === null ? null : number_format((float) $waarde, 2, '.', '');
    }

    public function datum(mixed $waarde): ?string {
        if ($waarde === null) {
            return null;
        }

        return ($waarde instanceof DateTimeInterface ? Carbon::instance($waarde) : Carbon::parse($waarde))->toIso8601String();
    }
}
