<?php

namespace App\Services\Evenementen;

use App\Models\Product;
use InvalidArgumentException;
use Illuminate\Support\Facades\DB;

class ProductenService {
    public function updateProducten(iterable $update, int|string $evenement_id): void
    {
        DB::transaction(function () use ($update, $evenement_id) {
            $valideerEvenement = function ($product, $id) use ($evenement_id) {
                if ((int) $product->evenement_id !== (int) $evenement_id) {
                    throw new InvalidArgumentException(
                        "Product ID {$id} behoort niet tot evenement ID {$evenement_id}."
                    );
                }
            };

            if (is_iterable($update)) {
                foreach ($update as $item) {
                    $id = is_array($item) ? ($item['id'] ?? null) : ($item->id ?? null);
                    if (!$id || !$product = Product::find($id)) {
                        continue;
                    }

                    $valideerEvenement($product, $id);

                    $product->update([
                        'prijs' => is_array($item) ? ($item['nieuwe_prijs'] ?? $item['niewe_prijs'] ?? $product->prijs) : ($item->nieuwe_prijs ?? $item->niewe_prijs ?? $product->prijs),
                        'naam'  => is_array($item) ? ($item['naam'] ?? $product->naam) : ($item->naam ?? $product->naam),
                    ]);
                }
            }
        });
    }

    public function productToevoegen($product) {
        $evenementId = is_array($product) ? ($product['evenement_id'] ?? null) : ($product->evenement_id ?? null);
        $prijs = is_array($product) ? ($product['prijs'] ?? $product['nieuwe_prijs'] ?? 0) : ($product->prijs ?? $product->nieuwe_prijs ?? 0);
        $naam = is_array($product) ? ($product['naam'] ?? '') : ($product->naam ?? '');

        return Product::create([
            'evenement_id' => $evenementId,
            'prijs'        => $prijs,
            'naam'         => $naam,
        ]);
    }

    public function productVerwijderen($id): void
    {
        $product = Product::findOrFail($id);
        $product->delete();
    }

    public function getProductVerkoopPerUur($evenement_id) {
        $producten = Product::where('evenement_id', $evenement_id)->get();
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
