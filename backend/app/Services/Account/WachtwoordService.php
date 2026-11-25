<?php

namespace App\Services\Account;

use App\Mail\WachtwoordResetMail;
use App\Models\Gebruiker;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;

class WachtwoordService
{
    /**
     * Creates a reset token for the gebruiker with this email and stores it (hashed) in password_reset_tokens,
     * replacing any earlier token for that email. Returns the plain token for the reset link, or null when no
     * gebruiker has this email or a token was created less than auth.passwords.users.throttle seconds ago.
     */
    public function maakResetToken(string $email): ?string
    {
        $gebruiker = Gebruiker::where('email', $email)->first();
        if (! $gebruiker) {
            return null;
        }

        $broker = Password::broker();
        if ($broker->getRepository()->recentlyCreatedToken($gebruiker)) {
            return null;
        }

        return $broker->createToken($gebruiker);
    }

    /**
     * Mails a link to {$basisUrl}/wachtwoord-veranderen/{token}?email=... when maakResetToken gives a token;
     * otherwise does nothing, so the caller can't tell whether the email has an account.
     */
    public function stuurResetMail(string $email, string $basisUrl): void
    {
        $token = $this->maakResetToken($email);
        if (! $token) {
            return;
        }

        $gebruiker = Gebruiker::where('email', $email)->firstOrFail();
        $link = rtrim($basisUrl, '/') . '/wachtwoord-veranderen/' . $token . '?' . http_build_query(['email' => $email]);

        Mail::to($email)->send(new WachtwoordResetMail(
            link: $link,
            naam: $gebruiker->voornaam ?: $gebruiker->name,
            minutenGeldig: (int) config('auth.passwords.users.expire', 60),
        ));
    }

    /**
     * Sets a new wachtwoord when the token belongs to this email and hasn't expired; the token is then deleted.
     * Returns false for an unknown email or an invalid or expired token.
     */
    public function resetWachtwoord(string $email, string $token, string $wachtwoord): bool
    {
        $status = Password::broker()->reset(
            // 'password' is the broker's key; the provider leaves it out of the gebruiker lookup.
            ['email' => $email, 'token' => $token, 'password' => $wachtwoord],
            fn (Gebruiker $gebruiker, string $nieuw) => $this->veranderWachtwoord($gebruiker, $nieuw),
        );

        return $status === Password::PASSWORD_RESET;
    }

    public function veranderWachtwoord(Gebruiker $gebruiker, string $nieuwWachtwoord): void
    {
        $gebruiker->update(['wachtwoord' => Hash::make($nieuwWachtwoord)]);
    }
}
