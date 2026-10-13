<?php

namespace Database\Factories;

use App\Models\Evenement;
use App\Models\Ticket;
use Illuminate\Database\Eloquent\Factories\Factory;

class TicketFactory extends Factory
{
    protected $model = Ticket::class;
    public function definition(): array
    {
        return [
            'evenement_id' => Evenement::factory(),
            'prijs' => fake()->randomFloat(2, 5, 100),
            'naam' => fake()->words(2, true),
            'munten' => fake()->optional()->numberBetween(1, 10),
        ];
    }
}
