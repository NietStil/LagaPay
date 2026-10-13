<?php

namespace Database\Seeders;

use App\Models\Evenement;
use App\Models\Gebruiker;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class GebruikerEvenementSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Create the Admin user with custom credentials
        $admin = Gebruiker::factory()->create([
            'voornaam'       => 'Admin',
            'achternaam'     => 'User',
            'tussenvoegsels' => null,
            'email'          => 'admin@example.com',
            'wachtwoord'     => Hash::make('secret12json3'),
            'rol'            => 'admin',
            'google_id'      => null,
        ]);

        Evenement::factory()->count(3)->create([
            'gebruiker' => $admin->id,
        ]);

        // 2. Create 5 Organizators and give each of them 1 to 5 evenementen
        $organizators = Gebruiker::factory()->count(5)->create([
            'rol' => 'organizator',
        ]);

        foreach ($organizators as $organizator) {
            $aantalEvenementen = rand(1, 5);

            Evenement::factory()->count($aantalEvenementen)->create([
                'gebruiker' => $organizator->id,
            ]);
        }

        // 3. Create 50 Regular Gebruikers (without evenementen)
        Gebruiker::factory()->count(50)->create([
            'rol' => 'gebruiker',
        ]);
    }
}
