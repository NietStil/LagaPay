<x-mail::message>
@if ($heeftWachtwoord)
# Wachtwoord herstellen
@else
# Wachtwoord instellen
@endif

{{ $naam ? "Hoi {$naam}," : 'Hoi,' }}

@if ($heeftWachtwoord)
We hebben een verzoek ontvangen om het wachtwoord van je {{ config('app.name') }}-account te herstellen. Klik op de knop hieronder om een nieuw wachtwoord in te stellen.
@else
We hebben een verzoek ontvangen om een wachtwoord voor je {{ config('app.name') }}-account in te stellen. Je logt nu in met Google. Met deze link stel je ook een wachtwoord in, zodat je met je e-mailadres kunt inloggen. Inloggen met Google blijft gewoon werken.
@endif

<x-mail::button :url="$link">
{{ $heeftWachtwoord ? 'Nieuw wachtwoord instellen' : 'Wachtwoord instellen' }}
</x-mail::button>

Deze link is {{ $minutenGeldig }} minuten geldig.

@if ($heeftWachtwoord)
Heb je dit niet aangevraagd? Dan hoef je niets te doen, je wachtwoord blijft hetzelfde.
@else
Heb je dit niet aangevraagd? Dan hoef je niets te doen, je blijft gewoon inloggen met Google.
@endif

Groetjes,<br>
{{ config('app.name') }}

<x-slot:subcopy>
Werkt de knop niet? Kopieer dan deze link in je browser: <span class="break-all">[{{ $link }}]({{ $link }})</span>
</x-slot:subcopy>
</x-mail::message>
