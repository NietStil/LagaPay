<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Which saldo I pay from at this evenement: my groep (`betaalbron` = groep id) when I last switched to the
     * Groep page, my own saldo (null) when I last switched to Persoonlijk. Deleting the groep falls back to null.
     */
    public function up(): void
    {
        Schema::table('gebruiker_evenement', function (Blueprint $table) {
            $table->foreignId('betaalbron')->nullable()->after('geblokkeerd')->constrained('groepen')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('gebruiker_evenement', function (Blueprint $table) {
            $table->dropConstrainedForeignId('betaalbron');
        });
    }
};
