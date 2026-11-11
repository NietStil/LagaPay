<?php

namespace App\Services\Mobiel\Exceptions;

/**
 * Thrown when joining a groep while already in another groep of the same evenement (HTTP 409).
 */
class GroepConflictException extends \RuntimeException {
}
