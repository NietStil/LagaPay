<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Call your seeders here
        $this->call([
            GebruikerEvenementSeeder::class,
            TicketSeeder::class,
            GroepSeeder::class,
            ProductSeeder::class,
            KaartSeeder::class,
            TransactieSeeder::class,
        ]);
    }
}
