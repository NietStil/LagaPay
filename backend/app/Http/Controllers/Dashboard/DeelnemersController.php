<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Services\Evenementen\DeelnemersService;

class DeelnemersController extends Controller {
    public function __construct(
        protected DeelnemersService $deelnemersService,
    ) {}

    public function delete($evenement_id, $gebruiker_id) {
        try {
            $this->deelnemersService->deelnemerVerwijderen($evenement_id, $gebruiker_id);
            return back()->with('success', 'Deelnemer succesvol verwijderd uit evenement.');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function kaartenDeactiveren($evenement_id, $gebruiker_id) {
        try {
            $this->deelnemersService->kaartenDeactiveren($evenement_id, $gebruiker_id);
            return back()->with('success', 'Kaarten van deelnemer gedeactiveerd.');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function DeelnemerUitGroep($evenement_id, $gebruiker_id) {
        try {
            $this->deelnemersService->DeelnemerUitGroep($evenement_id, $gebruiker_id);
            return back()->with('success', 'Deelnemer verwijderd uit alle groepen.');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }
}
