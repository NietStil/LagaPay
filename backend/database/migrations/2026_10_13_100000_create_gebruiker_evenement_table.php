<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gebruiker_evenement', function (Blueprint $table) {
            $table->foreignId('gebruiker_id')->constrained('gebruikers')->cascadeOnDelete();
            $table->foreignId('evenement_id')->constrained('evenementen')->cascadeOnDelete();
            $table->boolean('geblokkeerd')->default(false);
            $table->timestamps();
            $table->primary(['gebruiker_id', 'evenement_id']);
            $table->index('evenement_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gebruiker_evenement');
    }
};
