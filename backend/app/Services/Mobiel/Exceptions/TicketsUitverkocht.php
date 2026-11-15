<?php

namespace App\Services\Mobiel\Exceptions;

/** A bestelling asks for more tickets of a type than are left (answered with 409). */
class TicketsUitverkocht extends \DomainException {
    public static function voor(string $naam, int $over): self {
        return new self($over === 0
            ? "{$naam} is uitverkocht."
            : "Er zijn nog maar {$over} tickets van {$naam} beschikbaar.");
    }
}
