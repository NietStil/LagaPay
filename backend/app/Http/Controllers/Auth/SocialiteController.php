<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Gebruiker;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Laravel\Socialite\Facades\Socialite;

class SocialiteController extends Controller
{
    private const MOBIEL_FOUT = 'Inloggen via Google is mislukt.';

    /*
    |--------------------------------------------------------------------------
    | Organisator dashboard (organisator.*): session based web login
    |--------------------------------------------------------------------------
    */

    public function redirectToGoogle()
    {
        return Socialite::driver('google')->redirect();
    }

    public function handleGoogleCallback(Request $request)
    {
        try {
            $user = $this->gebruikerVoorGoogle(Socialite::driver('google')->user());
        } catch (\Exception $e) {
            return redirect('/login')->withErrors([
                'email' => 'Inloggen via Google is mislukt. Probeer het opnieuw.',
            ]);
        }

        Auth::login($user);
        $request->session()->regenerate();

        return redirect('/dashboard/evenementen');
    }

    /*
    |--------------------------------------------------------------------------
    | Mobile app (api.*): stateless, returns a Sanctum token via deep link
    |--------------------------------------------------------------------------
    | The app opens /auth/google?app_redirect=<deep link>. There is no session on the API, so the
    | deep link travels through Google inside an encrypted `state` and comes back on the callback.
    */

    public function redirectToMobileGoogle(Request $request)
    {
        $appRedirect = $request->query('app_redirect');

        if (!is_string($appRedirect) || !$this->isAllowedAppRedirect($appRedirect)) {
            $appRedirect = 'lagapay://login';
        }

        return $this->mobielDriver()
            ->with(['state' => Crypt::encryptString($appRedirect)])
            ->redirect();
    }

    public function handleMobileGoogleCallback(Request $request)
    {
        $appRedirect = $this->appRedirectUitState($request->query('state'));

        try {
            $user = $this->gebruikerVoorGoogle($this->mobielDriver()->user());
        } catch (\Exception $e) {
            return redirect()->away($this->appRedirectUrl($appRedirect, ['error' => self::MOBIEL_FOUT]));
        }

        $token = $user->createToken('expo-mobile-app')->plainTextToken;

        return redirect()->away($this->appRedirectUrl($appRedirect, ['token' => $token]));
    }

    private function mobielDriver()
    {
        return Socialite::driver('google')->stateless();
    }

    private function appRedirectUitState(mixed $state): string
    {
        $url = $this->ontsleutelState($state);

        return $url && $this->isAllowedAppRedirect($url) ? $url : 'lagapay://login';
    }

    private function ontsleutelState(mixed $state): ?string
    {
        try {
            return is_string($state) ? Crypt::decryptString($state) : null;
        } catch (DecryptException) {
            return null;
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Shared callback (main domain)
    |--------------------------------------------------------------------------
    | Google only accepts the main domain as redirect URI (it rejects *.localhost), so both flows
    | use it. Forward to the subdomain that started the login: the app's state is encrypted by us,
    | the dashboard's state is Socialite's random session state.
    */

    public function forwardGoogleCallback(Request $request)
    {
        $subdomein = $this->ontsleutelState($request->query('state')) !== null ? 'api' : 'organisator';

        $app = parse_url(config('app.url'));
        $url = $app['scheme'] . '://' . $subdomein . '.' . $app['host']
            . (isset($app['port']) ? ':' . $app['port'] : '')
            . '/auth/google/callback';

        $query = $request->getQueryString();

        return redirect()->away($query ? $url . '?' . $query : $url);
    }

    /**
     * Only allow redirects back into the app (custom scheme, Expo Go) or to
     * localhost for web development, so tokens can't be sent to arbitrary hosts.
     */
    private function isAllowedAppRedirect(string $url): bool
    {
        $parts = parse_url($url);

        if (!$parts || empty($parts['scheme'])) {
            return false;
        }

        $scheme = strtolower($parts['scheme']);

        if (in_array($scheme, ['lagapay', 'exp', 'exps'], true)) {
            return true;
        }

        return in_array($scheme, ['http', 'https'], true)
            && in_array($parts['host'] ?? '', ['localhost', '127.0.0.1'], true);
    }

    private function appRedirectUrl(string $base, array $query): string
    {
        return $base . (str_contains($base, '?') ? '&' : '?') . http_build_query($query);
    }

    private function gebruikerVoorGoogle(SocialiteUser $googleUser): Gebruiker
    {
        $email = strtolower(trim($googleUser->getEmail()));

        $user = Gebruiker::where('google_id', $googleUser->getId())
            ->orWhere('email', $email)
            ->first();

        if ($user) {
            if (!$user->google_id) {
                $user->update(['google_id' => $googleUser->getId()]);
            }

            return $user;
        }

        return Gebruiker::create([
            'voornaam'   => $googleUser->user['given_name'] ?? $googleUser->getName() ?? '',
            'achternaam' => $googleUser->user['family_name'] ?? '',
            'email'      => $email,
            'google_id'  => $googleUser->getId(),
        ]);
    }

    public function handleGoogleToken(Request $request)
    {
        $request->validate([
            'id_token' => ['required', 'string'],
        ]);

        try {
            // Verify ID Token via Google OAuth2 tokeninfo API
            $response = Http::get('https://oauth2.googleapis.com/tokeninfo', [
                'id_token' => $request->id_token,
            ]);

            if ($response->failed()) {
                return response()->json(['message' => 'Ongeldige Google token.'], 422);
            }

            $payload = $response->json();
            $googleId = $payload['sub'] ?? null;
            $email = strtolower(trim($payload['email'] ?? ''));

            if (!$email) {
                return response()->json(['message' => 'Geen e-mailadres gekoppeld aan dit Google account.'], 422);
            }

            $user = Gebruiker::where('google_id', $googleId)
                ->orWhere('email', $email)
                ->first();

            if ($user) {
                if (!$user->google_id) {
                    $user->update(['google_id' => $googleId]);
                }
            } else {
                $user = Gebruiker::create([
                    'voornaam'   => $payload['given_name'] ?? $payload['name'] ?? 'Google',
                    'achternaam' => $payload['family_name'] ?? 'Gebruiker',
                    'email'      => $email,
                    'google_id'  => $googleId,
                ]);
            }

            $token = $user->createToken('expo-mobile-app')->plainTextToken;

            return response()->json([
                'token' => $token,
                'user'  => $user,
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Inloggen via Google mislukt: ' . $e->getMessage(),
            ], 500);
        }
    }
}
