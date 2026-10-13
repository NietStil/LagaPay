<?php

namespace Database\Factories;

use App\Models\Groep;
use App\Models\Gebruiker;
use Illuminate\Database\Eloquent\Factories\Factory;

class GebruikerGroepFactory extends Factory
{
    public function definition(): array
    {
        return [
            'groep_id' => Groep::factory(),
            'gebruiker_id' => Gebruiker::factory(),
        ];
    }
}
