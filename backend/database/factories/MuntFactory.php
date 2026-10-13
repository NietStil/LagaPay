<?php

namespace Database\Factories;

use App\Models\Evenement;
use App\Models\Munt;
use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Gebruiker;
use App\Models\Groep;

class MuntFactory extends Factory
{
    protected $model = Munt::class;

    public function definition(): array
    {
        return [
            'gebruiker_id' => Gebruiker::factory(),
            'evenement_id' => Evenement::factory(),
            'groep_id' => Groep::factory(),
            'hoeveelheid' => fake()->numberBetween(1, 100),
            'laatste_transactie' => null,
        ];
    }
}
