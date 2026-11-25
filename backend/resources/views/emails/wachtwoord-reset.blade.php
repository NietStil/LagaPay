<x-mail::message>
# Wachtwoord herstellen

Hoi {{ $naam }},

We hebben een verzoek ontvangen om het wachtwoord van je {{ config('app.name') }}-account te herstellen. Klik op de knop hieronder om een nieuw wachtwoord in te stellen.

<x-mail::button :url="$link">
Nieuw wachtwoord instellen
</x-mail::button>

Deze link is {{ $minutenGeldig }} minuten geldig.

Heb je dit niet aangevraagd? Dan hoef je niets te doen, je wachtwoord blijft hetzelfde.

Groetjes,<br>
{{ config('app.name') }}

<x-slot:subcopy>
Werkt de knop niet? Kopieer dan deze link in je browser: <span class="break-all">[{{ $link }}]({{ $link }})</span>
</x-slot:subcopy>
</x-mail::message>
