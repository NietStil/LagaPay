<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Links a kaart to a slot (persoonlijk or groep) of a gebruiker within an evenement.
     * Every foreign key cascades, so deleting a kaart, gebruiker, evenement or groep never gets blocked by this table.
     */
    public function up(): void
    {
        Schema::create('kaart_koppelingen', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kaart_id')->constrained('kaarten')->cascadeOnDelete();
            $table->foreignId('gebruiker_id')->constrained('gebruikers')->cascadeOnDelete();
            $table->foreignId('evenement_id')->constrained('evenementen')->cascadeOnDelete();
            $table->foreignId('groep_id')->nullable()->constrained('groepen')->cascadeOnDelete();
            $table->string('soort');
            $table->timestamps();
            $table->unique(['gebruiker_id', 'evenement_id', 'soort']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kaart_koppelingen');
    }
};
