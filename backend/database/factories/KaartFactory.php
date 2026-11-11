<?php

namespace Database\Factories;

use App\Models\Evenement;
use App\Models\Gebruiker;
use App\Models\Kaart;
use App\Models\KaartKoppeling;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class KaartFactory extends Factory
{
    protected $model = Kaart::class;

    /** A persoonlijke kaart without koppelingen. */
    public function definition(): array
    {
        return [
            'uid'          => Str::random(64),
            'type'         => Kaart::TYPE_PERSOONLIJK,
            'gebruiker_id' => Gebruiker::factory(),
        ];
    }

    /** A tijdelijke kaart (polsband) linked to this evenement as the owner's kaart there. */
    public function tijdelijkVoor(Evenement $evenement, bool $koppelingActief = true): static
    {
        return $this->state(['type' => Kaart::TYPE_TIJDELIJK])
            ->afterCreating(fn (Kaart $kaart) => KaartKoppeling::create([
                'kaart_id'     => $kaart->id,
                'gebruiker_id' => $kaart->gebruiker_id,
                'evenement_id' => $evenement->id,
                'actief'       => $koppelingActief,
            ]));
    }
}
