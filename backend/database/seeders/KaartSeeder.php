<?php

namespace Database\Seeders;

use App\Models\Kaart;
use App\Models\KaartKoppeling;
use App\Models\Gebruiker;
use App\Models\Evenement;
use Illuminate\Database\Seeder;

class KaartSeeder extends Seeder
{
    public function run(): void
    {
        $evenementen = Evenement::all();
        $gebruikers = Gebruiker::all();

        if ($evenementen->isEmpty() || $gebruikers->isEmpty()) {
            return; // Make sure events and users exist first
        }

        // 1. Give every account/gebruiker a persoonlijke kaart (not linked to an evenement yet)
        $gebruikers->each(fn (Gebruiker $gebruiker) => Kaart::factory()->create([
            'gebruiker_id' => $gebruiker->id,
        ]));

        // 2. Give out up to 100 tijdelijke kaarten, each linked to a random gebruiker and evenement.
        // A gebruiker has at most one kaart per evenement, so taken combinations are skipped.
        foreach (range(1, 100) as $i) {
            $gebruiker = $gebruikers->random();
            $evenement = $evenementen->random();

            $bezet = KaartKoppeling::where('gebruiker_id', $gebruiker->id)->where('evenement_id', $evenement->id)->exists();

            if (! $bezet) {
                Kaart::factory()->tijdelijkVoor($evenement)->create(['gebruiker_id' => $gebruiker->id]);
            }
        }
    }
}
