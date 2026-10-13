<?php

namespace App\Services\Mobiel;

use App\Models\Gebruiker;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ProfielService {
    public function updateProfiel(Gebruiker $gebruiker, array $data): Gebruiker {
        $gebruiker->update([
            'voornaam'       => $data['voornaam'],
            'tussenvoegsels' => $data['tussenvoegsels'] ?? null,
            'achternaam'     => $data['achternaam'],
            'email'          => strtolower(trim($data['email'])),
        ]);

        return $gebruiker->refresh();
    }

    /**
     * Sets a new wachtwoord. The huidige wachtwoord must match when the gebruiker already has one
     * (Google-only accounts have none).
     *
     * @throws ValidationException
     */
    public function updateWachtwoord(Gebruiker $gebruiker, ?string $huidigWachtwoord, string $nieuwWachtwoord): void {
        if ($this->heeftWachtwoord($gebruiker) && ! Hash::check((string) $huidigWachtwoord, $gebruiker->getAuthPassword())) {
            throw ValidationException::withMessages([
                'huidig_wachtwoord' => ['Het huidige wachtwoord is onjuist.'],
            ]);
        }

        $gebruiker->update(['wachtwoord' => Hash::make($nieuwWachtwoord)]);
    }

    public function heeftWachtwoord(Gebruiker $gebruiker): bool {
        return filled($gebruiker->getAuthPassword());
    }
}
