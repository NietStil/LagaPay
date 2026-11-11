<?php

namespace App\Services\Mobiel\Exceptions;

/** A refused ticket scan, with the HTTP status and (when known) the scanned ticket. */
class TicketScanFout extends \RuntimeException {
    public function __construct(
        string $message,
        public readonly int $status,
        public readonly ?array $ticket = null,
    ) {
        parent::__construct($message);
    }

    /** JSON body: the message, plus the ticket when the scanner should see whose/which ticket it was. */
    public function body(): array {
        return array_filter(['message' => $this->getMessage(), 'ticket' => $this->ticket], fn ($waarde) => $waarde !== null);
    }
}
