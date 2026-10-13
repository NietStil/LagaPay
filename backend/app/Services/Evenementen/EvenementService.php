<?php

namespace App\Services\Evenementen;

use App\Models\Evenement;

class EvenementService {
    public function getEvenementen($id) {
        return Evenement::withCount(['tickets', 'producten', 'groepen'])
            ->with([
                'tickets' => function ($query) {
                    $query->withCount('gebruikers');
                },
                'producten',
                'kaarten',
            ])
            ->findOrFail($id);
    }
}
