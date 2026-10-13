<?php

namespace Database\Seeders;

use App\Models\Evenement;
use App\Models\Gebruiker;
use App\Models\Ticket;
use Illuminate\Database\Seeder;

class TicketSeeder extends Seeder
{
    public function run(): void
    {
        $gebruikers = Gebruiker::all();

        if ($gebruikers->isEmpty()) {
            return;
        }

        // 1. Create all evenementen and their tickets first
        Evenement::all()->each(function ($evenement) {
            $numberOfTicketTypes = rand(1, 3);

            Ticket::factory()->count($numberOfTicketTypes)->create([
                'evenement_id' => $evenement->id,
            ]);
        });

        $allTickets = Ticket::all();

        if ($allTickets->isEmpty()) {
            return;
        }

        // Helper function to pick tickets where every ID is at least 3 apart
        $pickSpacedTickets = function ($tickets, $count) {
            $shuffled = $tickets->shuffle();
            $selected = collect();

            foreach ($shuffled as $ticket) {
                if ($selected->count() >= $count) {
                    break;
                }

                // Check if this ticket's ID is at least 3 apart from all already selected tickets
                $isValid = true;
                foreach ($selected as $selTicket) {
                    if (abs($ticket->id - $selTicket->id) < 3) {
                        $isValid = false;
                        break;
                    }
                }

                if ($isValid) {
                    $selected->push($ticket);
                }
            }

            return $selected;
        };

        // 2. Assign spaced tickets to regular users (e.g., 1 to 4 tickets per user)
        $gebruikers->each(function ($gebruiker) use ($allTickets, $pickSpacedTickets) {
            $numberOfTicketsToBuy = rand(1, min(4, $allTickets->count()));

            $selectedTickets = $pickSpacedTickets($allTickets, $numberOfTicketsToBuy);

            if ($selectedTickets->isNotEmpty()) {
                $gebruiker->tickets()->syncWithoutDetaching($selectedTickets->pluck('id'));
            }
        });

        // 3. Ensure the admin user has exactly 3 tickets that are at least 3 IDs apart
        $admin = Gebruiker::where('email', 'admin@example.com')->first();

        if ($admin) {
            $adminTickets = $pickSpacedTickets($allTickets, 3);

            if ($adminTickets->isNotEmpty()) {
                $admin->tickets()->syncWithoutDetaching($adminTickets->pluck('id'));
            }
        }
    }
}
