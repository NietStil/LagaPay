<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('Evenementen', function (Blueprint $table) {
            $table->id();
            $table->string('naam');
            $table->boolean('open');
            $table->dateTime('start_datum');
            $table->dateTime('eind_datum');
            $table->boolean('telefoon_betaling');
            $table->boolean('munten_terugstorten');
            $table->string('code')->unique();
        });

        Schema::create('Groepen', function (Blueprint $table) {
            $table->id();
            $table->string('naam');
            $table->foreignId('event_id')->constrained('Evenementen')->onUpdate('no action')->onDelete('no action');
            $table->string('code');
        });

        Schema::create('Gebruiker_Groep', function (Blueprint $table) {
            $table->foreignId('groep_id')->constrained('Groepen')->onUpdate('no action')->onDelete('no action');
            $table->foreignId('gebruiker_id')->constrained('Gebruikers')->onUpdate('no action')->onDelete('no action');
            $table->primary(['groep_id', 'gebruiker_id']);
        });

        Schema::create('Tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('Evenementen')->onUpdate('no action')->onDelete('no action');
            $table->decimal('prijs', 10, 2);
            $table->string('naam');
            $table->integer('munten')->nullable();
        });

        Schema::create('Producten', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('Evenementen')->onUpdate('no action')->onDelete('no action');
            $table->integer('prijs')->comment('De prijs in munten');
            $table->string('naam');
        });

        Schema::create('Kaarten', function (Blueprint $table) {
            $table->id();
            $table->string('uid', 64);
            $table->string('type');
            $table->boolean('actief');
            $table->foreignId('event_id')->nullable()->constrained('Evenementen')->onUpdate('no action')->onDelete('no action');
            $table->foreignId('gebruiker_id')->constrained('Gebruikers')->onUpdate('no action')->onDelete('no action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('Kaarten');
        Schema::dropIfExists('Producten');
        Schema::dropIfExists('Tickets');
        Schema::dropIfExists('Gebruiker_Groep');
        Schema::dropIfExists('Groepen');
        Schema::dropIfExists('Evenementen');
    }
};
