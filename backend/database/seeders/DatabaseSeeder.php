<?php

namespace Database\Seeders;

use App\Models\Gebruiker;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        Gebruiker::factory()->create([
            'voornaam'   => 'Test',
            'achternaam' => 'Gebruiker',
            'email'      => 'test@example.com',
        ]);
    }
}
