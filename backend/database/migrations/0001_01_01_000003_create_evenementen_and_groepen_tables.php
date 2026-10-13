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
        Schema::create('evenementen', function (Blueprint $table) {
            $table->id();
            $table->string('naam');
            $table->unsignedBigInteger('gebruiker');
            $table->boolean('open');
            $table->dateTime('start_datum');
            $table->dateTime('eind_datum');
            $table->boolean('telefoon_betaling');
            $table->boolean('munten_terugstorten');
            $table->boolean('heeft_tickets');
            $table->decimal('munt_prijs', 10, 2);
            $table->string('code')->unique();
            $table->timestamps();
        });

        Schema::create('groepen', function (Blueprint $table) {
            $table->id();
            $table->string('naam');
            $table->foreignId('evenement_id')->constrained('evenementen')->onUpdate('no action')->onDelete('no action');
            $table->string('code');
            $table->timestamps();
        });

        Schema::create('gebruiker_groep', function (Blueprint $table) {
            $table->foreignId('groep_id')->constrained('groepen')->onUpdate('no action')->onDelete('no action');
            $table->foreignId('gebruiker_id')->constrained('gebruikers')->onUpdate('no action')->onDelete('no action');
            $table->primary(['groep_id', 'gebruiker_id']);
            $table->timestamps();
        });

        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evenement_id')->constrained('evenementen')->onUpdate('no action')->onDelete('no action');
            $table->decimal('prijs', 10, 2);
            $table->string('naam');
            $table->integer('munten')->nullable();
            $table->timestamps();
        });

        Schema::create('gebruiker_ticket', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gebruiker_id')->constrained('gebruikers')->cascadeOnDelete();
            $table->foreignId('ticket_id')->constrained('tickets')->cascadeOnDelete();
        });

        Schema::create('producten', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evenement_id')->constrained('evenementen')->onUpdate('no action')->onDelete('no action');
            $table->integer('prijs')->comment('De prijs in munten');
            $table->string('naam');
            $table->timestamps();
        });

        Schema::create('kaarten', function (Blueprint $table) {
            $table->id();
            $table->string('uid', 64);
            $table->string('type');
            $table->boolean('actief');
            $table->foreignId('evenement_id')->nullable()->constrained('evenementen')->onUpdate('no action')->onDelete('no action');
            $table->foreignId('gebruiker_id')->constrained('gebruikers')->onUpdate('no action')->onDelete('no action');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kaarten');
        Schema::dropIfExists('producten');
        Schema::dropIfExists('tickets');
        Schema::dropIfExists('gebruiker_groep');
        Schema::dropIfExists('groepen');
        Schema::dropIfExists('evenementen');
    }
};
