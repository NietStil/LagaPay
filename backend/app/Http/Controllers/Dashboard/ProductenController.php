<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Services\Evenementen\ProductenService;
use Illuminate\Http\Request;

class ProductenController extends Controller {
    public function __construct(
        protected ProductenService $productService
    ) {}

    public function createCategorie(Request $request, $evenement_id) {
        $validated = $request->validate([
            'naam' => 'required|string|max:255',
        ]);

        try {
            $this->productService->categorieToevoegen($evenement_id, $validated['naam']);
            return back()->with('success', 'Categorie succesvol toegevoegd.');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function updateCategorie(Request $request, $evenement_id, $id) {
        $validated = $request->validate([
            'naam' => 'required|string|max:255',
        ]);

        try {
            $this->productService->categorieBijwerken($evenement_id, $id, $validated['naam']);
            return back()->with('success', 'Categorie succesvol bijgewerkt.');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function deleteCategorie($evenement_id, $id) {
        try {
            $this->productService->categorieVerwijderen($evenement_id, $id);
            return back()->with('success', 'Categorie en producten succesvol verwijderd.');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function create(Request $request, $evenement_id, $categorie_id) {
        $validated = $request->validate([
            'naam'  => 'required|string|max:255',
            'prijs' => 'required|integer|min:0',
        ]);

        try {
            $this->productService->productToevoegen($evenement_id, $categorie_id, $validated['naam'], $validated['prijs']);
            return back()->with('success', 'Product succesvol toegevoegd.');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function update(Request $request, $evenement_id, $id) {
        $validated = $request->validate([
            'naam'  => 'sometimes|required|string|max:255',
            'prijs' => 'sometimes|required|integer|min:0',
        ]);

        try {
            $this->productService->productBijwerken($evenement_id, $id, $validated);
            return back()->with('success', 'Product succesvol bijgewerkt.');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function delete($evenement_id, $id) {
        try {
            $this->productService->productVerwijderen($evenement_id, $id);
            return back()->with('success', 'Product succesvol verwijderd.');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }
}
