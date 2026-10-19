<?php

namespace App\Services\Mobiel;

/**
 * The gebruiker may not become deelnemer of the evenement (yet). Answered with 403 and a `reden`, so the app
 * can open the evenement's tickets for `ticket_nodig` and `niet_gescand`.
 */
class DeelnameGeweigerd extends \DomainException {
    public const GESLOTEN = 'gesloten';
    public const GEBLOKKEERD = 'geblokkeerd';
    public const TICKET_NODIG = 'ticket_nodig';
    public const NIET_GESCAND = 'niet_gescand';

    public const MELDINGEN = [
        self::GESLOTEN     => 'Dit evenement is gesloten.',
        self::GEBLOKKEERD  => 'Je bent geblokkeerd voor dit evenement.',
        self::TICKET_NODIG => 'Koop eerst een ticket om mee te doen.',
        self::NIET_GESCAND => 'Je doet mee zodra je ticket bij de ingang is gescand.',
    ];

    public function __construct(
        public readonly string $reden,
        public readonly int $evenementId,
    ) {
        parent::__construct(self::MELDINGEN[$reden]);
    }

    /** True when the gebruiker can fix it with a ticket or by having it scanned: the app then shows the tickets. */
    public function viaTickets(): bool {
        return in_array($this->reden, [self::TICKET_NODIG, self::NIET_GESCAND], true);
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
