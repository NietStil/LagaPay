<?php

namespace App\Services\Evenementen;

use App\Models\Product;
use App\Models\ProductCategorie;
use InvalidArgumentException;
use Illuminate\Support\Facades\DB;

class ProductenService {
    public function categorieToevoegen(int|string $evenement_id, string $naam): ProductCategorie
    {
        return ProductCategorie::create([
            'evenement_id' => $evenement_id,
            'naam'         => $naam,
        ]);
    }

    public function categorieBijwerken(int|string $evenement_id, int|string $id, string $naam): void
    {
        $this->vindCategorie($evenement_id, $id)->update(['naam' => $naam]);
    }

    public function categorieVerwijderen(int|string $evenement_id, int|string $id): void
    {
        $categorie = $this->vindCategorie($evenement_id, $id);

        DB::transaction(function () use ($categorie) {
            $categorie->producten()->delete();
            $categorie->delete();
        });
    }

    public function productToevoegen(int|string $evenement_id, int|string $categorie_id, string $naam, int $prijs): Product
    {
        return $this->vindCategorie($evenement_id, $categorie_id)->producten()->create([
            'naam'  => $naam,
            'prijs' => $prijs,
        ]);
    }

    public function productBijwerken(int|string $evenement_id, int|string $id, array $velden): void
    {
        $this->vindProduct($evenement_id, $id)->update($velden);
    }

    public function productVerwijderen(int|string $evenement_id, int|string $id): void
    {
        $this->vindProduct($evenement_id, $id)->delete();
    }

    private function vindCategorie(int|string $evenement_id, int|string $id): ProductCategorie
    {
        $categorie = ProductCategorie::findOrFail($id);

        if ((int) $categorie->evenement_id !== (int) $evenement_id) {
            throw new InvalidArgumentException("Categorie ID {$id} behoort niet tot evenement ID {$evenement_id}.");
        }

        return $categorie;
    }

    private function vindProduct(int|string $evenement_id, int|string $id): Product
    {
        $product = Product::with('categorie')->findOrFail($id);

        if ((int) $product->categorie->evenement_id !== (int) $evenement_id) {
            throw new InvalidArgumentException("Product ID {$id} behoort niet tot evenement ID {$evenement_id}.");
        }

        return $product;
    }

    public function getProductVerkoopPerUur($evenement_id) {
        $producten = Product::whereRelation('categorie', 'evenement_id', $evenement_id)->get();
        $uren = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];

        $productData = $producten->map(function ($product) use ($uren, $evenement_id) {
            $verkoopPerUur = [];

            foreach ($uren as $uur) {
                // Generate realistic hourly sales pattern per product
                $seed = crc32($evenement_id . '_' . $product->id . '_' . $uur);
                mt_srand($seed);

                $hourNum = (int) substr($uur, 0, 2);
                $multiplier = ($hourNum >= 17 && $hourNum <= 22) ? 2.5 : 1.0;
                $baseSales = mt_rand(4, 22);

                $verkoopPerUur[] = (int) round($baseSales * $multiplier);
            }

            mt_srand(); // reset seed

            return [
                'id' => $product->id,
                'naam' => $product->naam,
                'prijs' => $product->prijs,
                'verkoop_per_uur' => $verkoopPerUur,
            ];
        });

        return [
            'uren' => $uren,
            'producten' => $productData,
        ];
    }
}
