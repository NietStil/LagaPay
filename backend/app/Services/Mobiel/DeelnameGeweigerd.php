<?php

namespace App\Services\Mobiel;

/**
 * The gebruiker may not become deelnemer of the evenement (yet). Answered with 403 and a `reden`, so the app
 * can open the evenement's tickets for `ticket_nodig` and `niet_gestart`.
 */
class DeelnameGeweigerd extends \DomainException {
    public const GESLOTEN = 'gesloten';
    public const GEBLOKKEERD = 'geblokkeerd';
    public const TICKET_NODIG = 'ticket_nodig';
    public const NIET_GESTART = 'niet_gestart';

    public const MELDINGEN = [
        self::GESLOTEN     => 'Dit evenement is gesloten.',
        self::GEBLOKKEERD  => 'Je bent geblokkeerd voor dit evenement.',
        self::TICKET_NODIG => 'Koop eerst een ticket om mee te doen.',
        self::NIET_GESTART => 'Je kunt meedoen zodra het evenement begint.',
    ];

    public function __construct(
        public readonly string $reden,
        public readonly int $evenementId,
    ) {
        parent::__construct(self::MELDINGEN[$reden]);
    }

    /** True when the gebruiker can fix it with a ticket or by waiting: the app then shows the tickets. */
    public function viaTickets(): bool {
        return in_array($this->reden, [self::TICKET_NODIG, self::NIET_GESTART], true);
    }

    /** JSON body of the 403 response. */
    public function body(): array {
        return [
            'message'      => $this->getMessage(),
            'reden'        => $this->reden,
            'evenement_id' => $this->evenementId,
        ];
    }
}
