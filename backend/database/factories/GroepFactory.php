<?php

namespace Database\Factories;

use App\Models\Evenement;
use App\Models\Groep;
use Illuminate\Database\Eloquent\Factories\Factory;

class GroepFactory extends Factory
{
    protected $model = Groep::class;

    public function definition(): array
    {
        $randomTodayTimestamp = fake()->dateTimeBetween('today 00:00:00', 'now');

        return [
            'evenement_id' => Evenement::factory(),
            'naam'         => fake()->words(2, true),
            'code'         => fake()->unique()->regexify('[A-Za-z0-9_-]{10}'),
            'created_at'   => $randomTodayTimestamp,
            'updated_at'   => $randomTodayTimestamp,
        ];
    }
}
