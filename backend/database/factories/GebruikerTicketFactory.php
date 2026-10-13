<?php

namespace Database\Factories;

use App\Models\Gebruiker;
use App\Models\Ticket;
use Illuminate\Database\Eloquent\Factories\Factory;

class GebruikerTicketFactory extends Factory
{
    public function definition(): array
    {
        return [
            'gebruiker_id' => Gebruiker::inRandomOrder()->first()?->id ?? Gebruiker::factory(),
            'ticket_id' => Ticket::inRandomOrder()->first()?->id ?? Ticket::factory(),
        ];
    }
}
