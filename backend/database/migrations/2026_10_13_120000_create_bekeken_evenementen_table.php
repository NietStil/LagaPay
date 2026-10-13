<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Evenementen whose link a gebruiker opened without becoming deelnemer (an evenement with tickets that
     * they have no ticket for yet, or that hasn't started). Feeds "Recent bekeken" on the app's Tickets tab
     * and gives access to the evenement's tickets.
     */
    public function up(): void
    {
        Schema::create('bekeken_evenementen', function (Blueprint $table) {
            $table->foreignId('gebruiker_id')->constrained('gebruikers')->cascadeOnDelete();
            $table->foreignId('evenement_id')->constrained('evenementen')->cascadeOnDelete();
            $table->timestamps();
            $table->primary(['gebruiker_id', 'evenement_id']);
            $table->index('evenement_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bekeken_evenementen');
    }
};
