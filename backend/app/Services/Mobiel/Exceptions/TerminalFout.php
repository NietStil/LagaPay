<?php

namespace App\Services\Mobiel\Exceptions;

/** A refused terminal action (afrekenen), with the HTTP status for the response. */
class TerminalFout extends \RuntimeException {
    public function __construct(
        string $message,
        public readonly int $status,
    ) {
        parent::__construct($message);
    }
}
