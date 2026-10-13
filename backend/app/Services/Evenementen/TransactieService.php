<?php

namespace App\Services\Evenementen;

use App\Models\Groep;
use App\Models\Transactie;
use Illuminate\Support\Collection;

class TransactieService {
    public function evenementGebruikerTransacties($evenement_id, $gebruikers) {
        $gebruikersTransacties = [];
        if (!$gebruikers) {
            return $gebruikersTransacties;
        }

        foreach ($gebruikers as $gebruiker) {
            $gebruikersTransacties[] = [
                'id' => $gebruiker->id,
                'transacties' => $this->gebruikerTransacties($evenement_id, $gebruiker->id),
            ];
        }

        return $gebruikersTransacties;
    }

    private function gebruikerTransacties($evenement_id, $gebruiker_id) {
        return Transactie::where('gebruiker_id', $gebruiker_id)
            ->where('evenement_id', $evenement_id)
            ->whereNull('groep_id')
            ->orderBy('created_at', 'DESC')
            ->get()
            ->map(function ($transactie) {
                $actie = ($transactie->type == 'opwaardering') ? "gekocht" : "uitgegeven";
                $naam = $transactie->gebruiker ? $transactie->gebruiker->voornaam : "Deelnemer";

                return [
                    'timestamp' => $transactie->created_at ? $transactie->created_at->format('Y-m-d H:i:s') : null,
                    'bericht'   => "Je hebt " . $transactie->hoeveelheid . " munten " . $actie,
                ];
            });
    }

    public function evenementGroepTransacties($evenement_id){
        $groepen = Groep::select('id')
            ->where('evenement_id', $evenement_id)
            ->get();

        $groepenTransacties = [];
        foreach ($groepen as $groep) {
            $groepenTransacties[] = [
                'id' => $groep->id,
                'transacties' => $this->groepTransacties($groep->id),
            ];
        }

        return $groepenTransacties;
    }

    private function groepTransacties($groep_id) {
        $transacties = Transactie::with('gebruiker')
            ->where('groep_id', $groep_id)
            ->get()
            ->map(function ($transactie) {
                $actie = ($transactie->type == 'opwaardering') ? "gekocht" : "uitgegeven";

                return [
                    'timestamp' => $transactie->created_at ? $transactie->created_at->format('Y-m-d H:i:s') : null,
                    'bericht'   => ($transactie->gebruiker ? $transactie->gebruiker->voornaam : 'Deelnemer') . " heeft "
                                   . $transactie->hoeveelheid . " munten "
                                   . $actie,
                ];
            });

        $groep = Groep::
        with(['gebruikers' => function ($query) {
            $query->withPivot('created_at');
        }])->findOrFail($groep_id);

        $gebruikers = $groep->gebruikers->map(function ($gebruiker) use ($groep) {
            $toegevoegdOp = $gebruiker->pivot && $gebruiker->pivot->created_at
                ? $gebruiker->pivot->created_at->format('Y-m-d H:i:s')
                : null;

            return [
                'timestamp' => $toegevoegdOp,
                'bericht'   => $gebruiker->voornaam . " is lid geworden van de groep " . $groep->naam,
            ];
        });

        $groepAangemaakt = [
            'timestamp' => $groep->created_at ? $groep->created_at->format('Y-m-d H:i:s') : null,
            'bericht' => "De groep " . $groep->naam . " is aangemaakt"
        ];

        $sortedTransacties = $this->combineAndSort($transacties, $gebruikers);
        $sortedTransacties[] = $groepAangemaakt;
        return $sortedTransacties;
    }

    private function combineAndSort($array1, $array2) {
        $collection1 = $array1 instanceof Collection ? $array1 : collect($array1);
        $collection2 = $array2 instanceof Collection ? $array2 : collect($array2);

        return $collection1
            ->concat($collection2)
            ->sortByDesc('timestamp')
            ->values();
    }
}
