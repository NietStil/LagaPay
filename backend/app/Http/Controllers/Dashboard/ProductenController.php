<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Services\Evenementen\ProductenService;
use Illuminate\Http\Request;

class ProductenController extends Controller {
    public function __construct(
        protected ProductenService $productService
    ) {}

    public function create(Request $request) {
        try {
            $this->productService->productToevoegen([
                'evenement_id' => $request->input('evenement_id'),
                'naam'         => $request->input('naam'),
                'prijs'        => $request->input('prijs', 1),
            ]);

            return back()->with('success', 'Product succesvol toegevoegd.');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function update(Request $request, $evenement_id) {
        $update = $request->input('update', []);

        try {
            $this->productService->updateProducten($update, $evenement_id);

            return back()->with('success', 'Producten succesvol bijgewerkt.');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function delete($evenement_id, $id) {
        try {
            $this->productService->productVerwijderen($id);
            return back()->with('success', 'Product succesvol verwijderd.');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }
}
