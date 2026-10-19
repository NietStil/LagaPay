<?php

namespace App\Services\Mobiel;

/** A refused ticket offer or uitnodiging, with the HTTP status and extra fields for the response body. */
class TicketOverdrachtFout extends \RuntimeException {
    public function __construct(
        string $message,
        public readonly int $status,
        public readonly array $extra = [],
    ) {
        parent::__construct($message);
    }

    public function body(): array {
        return ['message' => $this->getMessage()] + $this->extra;
    }
}
