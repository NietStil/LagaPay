<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Producten hang under a categorie, which belongs to the evenement. `producten.evenement_id` is dropped
     * because the categorie already says which evenement a product is from.
     * Existing producten are moved into an "Algemeen" categorie per evenement.
     */
    public function up(): void
    {
        Schema::create('product_categorieen', function (Blueprint $table) {
            $table->id();
            $table->string('naam');
            $table->foreignId('evenement_id')->constrained('evenementen')->onUpdate('no action')->onDelete('no action');
        });

        Schema::table('producten', function (Blueprint $table) {
            $table->foreignId('categorie_id')->nullable()->after('id')->constrained('product_categorieen')->onUpdate('no action')->onDelete('no action');
        });

        $evenementIds = DB::table('producten')->distinct()->pluck('evenement_id');
        foreach ($evenementIds as $evenementId) {
            $categorieId = DB::table('product_categorieen')->insertGetId([
                'naam'         => 'Algemeen',
                'evenement_id' => $evenementId,
            ]);
            DB::table('producten')->where('evenement_id', $evenementId)->update(['categorie_id' => $categorieId]);
        }

        Schema::table('producten', function (Blueprint $table) {
            $table->foreignId('categorie_id')->nullable(false)->change();
            $table->dropConstrainedForeignId('evenement_id');
        });
    }

    public function down(): void
    {
        Schema::table('producten', function (Blueprint $table) {
            $table->foreignId('evenement_id')->nullable()->after('id')->constrained('evenementen')->onUpdate('no action')->onDelete('no action');
        });

        DB::table('producten')
            ->join('product_categorieen', 'product_categorieen.id', '=', 'producten.categorie_id')
            ->update(['producten.evenement_id' => DB::raw('product_categorieen.evenement_id')]);

        Schema::table('producten', function (Blueprint $table) {
            $table->foreignId('evenement_id')->nullable(false)->change();
            $table->dropConstrainedForeignId('categorie_id');
        });

        Schema::dropIfExists('product_categorieen');
    }
};
