<?php

namespace Database\Seeders;

use App\Models\Kaart;
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

        // 1. Give every account/gebruiker a card with the type 'persoonlijk'
        $gebruikers->each(function ($gebruiker) {
            Kaart::factory()->create([
                'gebruiker_id' => $gebruiker->id,
                'evenement_id' => null,
                'type' => 'persoonlijk',
            ]);
        });

        // 2. Give out 100 cards randomly with the type 'tijdelijk'
        // Using a loop ensures each of the 100 cards gets a distinct random user and event
        foreach (range(1, 100) as $i) {
            Kaart::factory()->create([
                'type' => 'tijdelijk',
                'gebruiker_id' => $gebruikers->random()->id,
                'evenement_id' => $evenementen->random()->id,
            ]);
        }
    }
}
