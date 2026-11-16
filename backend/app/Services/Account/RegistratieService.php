<?php

namespace App\Services\Account;

use App\Models\Gebruiker;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

/**
 * Creating a gebruiker account. Shared by the app (POST /register on the api subdomain), the website (POST /register on the main
 * domain) and the organisator dashboard, so all of them validate and store a new account the same way.
 */
class RegistratieService
{
    /**
     * @return array<string, mixed>
     */
    public static function regels(): array
    {
        return [
            'voornaam'       => ['required', 'string', 'max:255'],
            'tussenvoegsels' => ['nullable', 'string', 'max:255'],
            'achternaam'     => ['required', 'string', 'max:255'],
            'email'          => ['required', 'string', 'email', 'max:255', Rule::unique(Gebruiker::class, 'email')],
            'wachtwoord'     => ['required', 'string', 'min:8'],
        ];
    }

    /** @param  array{voornaam: string, tussenvoegsels?: ?string, achternaam: string, email: string, wachtwoord: string}  $gegevens */
    public function registreer(array $gegevens): Gebruiker
    {
        return Gebruiker::create([
            'voornaam'       => $gegevens['voornaam'],
            'tussenvoegsels' => $gegevens['tussenvoegsels'] ?? null,
            'achternaam'     => $gegevens['achternaam'],
            'email'          => strtolower(trim($gegevens['email'])),
            'wachtwoord'     => Hash::make($gegevens['wachtwoord']),
        ]);
    }
}
