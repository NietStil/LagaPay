<?php

namespace Database\Factories;

use App\Models\Evenement;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use App\Models\Gebruiker;
use App\Models\Kaart;


class KaartFactory extends Factory
{
    protected $model = Kaart::class;
    public function definition(): array
    {
        return [
            'uid' => Str::random(64),
            'type' => fake()->word(),
            'actief' => fake()->boolean(),
            'evenement_id' => Evenement::factory(),
            'gebruiker_id' => Gebruiker::factory(),
        ];
    }
}
