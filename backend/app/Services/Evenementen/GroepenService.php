<?php

namespace App\Services\Evenementen;

use App\Models\Groep;

class GroepenService {
    public function getGroepen($id, $request = null) {
        $query = Groep::query()
            ->withCount('gebruikers')
            ->with([
                'gebruikers' => function ($q) {
                    $q->select('gebruikers.id', 'gebruikers.voornaam', 'gebruikers.tussenvoegsels', 'gebruikers.achternaam', 'gebruikers.email')
                      ->withPivot('created_at');
                }
            ])
            ->where('evenement_id', $id);

        if ($request && $request->filled('search')) {
            $search = '%' . $request->query('search') . '%';
            $query->where(function ($q) use ($search) {
                $q->where('naam', 'like', $search)
                    ->orWhere('code', 'like', $search);
            });
        }

        return $query->paginate(50)->withQueryString();
    }
}
