<?php

namespace Database\Factories;

use App\Models\Gebruiker;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

class GebruikerFactory extends Factory
{
    protected $model = Gebruiker::class;

    protected static ?string $password;

    public function definition(): array
    {
        return [
            'voornaam'       => fake()->firstName(),
            'achternaam'     => fake()->lastName(),
            'tussenvoegsels' => null,
            'email'          => fake()->unique()->safeEmail(),
            'wachtwoord'     => static::$password ??= Hash::make('password'),
            'google_id'      => null,
        ];
    }
}
