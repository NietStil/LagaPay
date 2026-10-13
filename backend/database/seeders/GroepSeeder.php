<?php

namespace Database\Seeders;

use App\Models\Evenement;
use App\Models\Groep;
use App\Models\Gebruiker;
use Illuminate\Database\Seeder;

class GroepSeeder extends Seeder
{
    public function run(): void
    {
        Evenement::all()->each(function ($evenement) {

            $groepen = Groep::factory()->count(rand(3, 5))->create([
                'evenement_id' => $evenement->id,
            ]);

            $eventGebruikers = Gebruiker::whereHas('evenementen', function ($query) use ($evenement) {
                $query->where('evenementen.id', $evenement->id);
            })->get();

            if ($eventGebruikers->isEmpty()) {
                $eventGebruikers = Gebruiker::all();
            }

            if ($eventGebruikers->isEmpty()) {
                return;
            }

            $groepen->each(function ($groep) use ($eventGebruikers) {
                $aantalTeKoppelen = min(rand(3, 5), $eventGebruikers->count());

                if ($aantalTeKoppelen > 0) {
                    $willekeurigeGebruikers = $eventGebruikers->random($aantalTeKoppelen);

                    $attachData = [];
                    foreach ($willekeurigeGebruikers as $user) {
                        $randomTodayTimestamp = fake()->dateTimeBetween('today 00:00:00', 'now');
                        $attachData[$user->id] = [
                            'created_at' => $randomTodayTimestamp,
                            'updated_at' => $randomTodayTimestamp,
                        ];
                    }

                    $groep->gebruikers()->attach($attachData);
                }
            });
        });
    }
}
