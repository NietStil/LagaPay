<?php

use Hidehalo\Nanoid\Client;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Bar terminals: a device becomes the terminal of an evenement with its `terminal_code` (15 characters, nanoid,
     * like `code`). `terminals` keeps one row per gebruiker per evenement; leaving sets `actief` to 0, rejoining
     * back to 1. A terminal sale is a transactie of type uitgave with one `transactie_producten` row per product.
     * Opwaardering transacties point to their opwaardering.
     */
    public function up(): void
    {
        Schema::table('evenementen', function (Blueprint $table) {
            $table->string('terminal_code')->nullable()->unique()->after('code');
        });

        $nanoid = new Client();
        foreach (DB::table('evenementen')->whereNull('terminal_code')->pluck('id') as $id) {
            do {
                $code = $nanoid->generateId(15);
            } while (DB::table('evenementen')->where('terminal_code', $code)->exists());

            DB::table('evenementen')->where('id', $id)->update(['terminal_code' => $code]);
        }

        Schema::create('terminals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evenement_id')->constrained('evenementen')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('gebruikers')->cascadeOnDelete();
            $table->boolean('actief')->default(true);
            $table->timestamps();
            $table->unique(['evenement_id', 'user_id']);
        });

        Schema::table('transacties', function (Blueprint $table) {
            $table->foreignId('opwaardering_id')->nullable()->after('groep_id')->constrained('opwaarderingen')->nullOnDelete();
        });

        // A deleted product keeps its sales rows (product becomes null); the transactie keeps the total.
        Schema::create('transactie_producten', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transactie')->constrained('transacties')->cascadeOnDelete();
            $table->foreignId('product')->nullable()->constrained('producten')->nullOnDelete();
            $table->unsignedInteger('aantal');
        });

    }

    public function down(): void
    {
        Schema::dropIfExists('transactie_producten');

        Schema::table('transacties', function (Blueprint $table) {
            $table->dropConstrainedForeignId('opwaardering_id');
        });

        Schema::dropIfExists('terminals');

        Schema::table('evenementen', function (Blueprint $table) {
            $table->dropUnique(['terminal_code']);
            $table->dropColumn('terminal_code');
        });
    }
};
