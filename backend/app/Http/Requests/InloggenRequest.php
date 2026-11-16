<?php

namespace App\Http\Requests;

use App\Models\Gebruiker;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

/**
 * Logging in with email + wachtwoord. Shared by the organisator dashboard, the website (main domain) and the app
 * (which also sends a device_name, validated in AuthController::mobileLogin()).
 */
class InloggenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'email'      => ['required', 'string', 'email'],
            'wachtwoord' => ['required', 'string'],
        ];
    }

    /**
     * Session login (dashboard and website): logs in with "remember me" when asked and starts a fresh session.
     *
     * @throws ValidationException wrong email or wachtwoord
     */
    public function inloggen(): Gebruiker
    {
        if (! Auth::attempt($this->inloggegevens(), $this->boolean('remember'))) {
            $this->onjuist();
        }

        $this->session()->regenerate();

        return Auth::user();
    }

    /**
     * Token login (app): only checks the credentials, without a session.
     *
     * @throws ValidationException wrong email or wachtwoord
     */
    public function gebruiker(): Gebruiker
    {
        if (! Auth::validate($this->inloggegevens())) {
            $this->onjuist();
        }

        return Gebruiker::where('email', $this->inloggegevens()['email'])->firstOrFail();
    }

    /** The credentials for Auth::attempt()/validate(), with the email normalised like at registration. */
    protected function inloggegevens(): array
    {
        return [
            'email'    => strtolower(trim($this->validated('email'))),
            'password' => $this->validated('wachtwoord'),
        ];
    }

    protected function onjuist(): never
    {
        throw ValidationException::withMessages([
            'email' => 'De opgegeven inloggegevens zijn onjuist.',
        ]);
    }
}
