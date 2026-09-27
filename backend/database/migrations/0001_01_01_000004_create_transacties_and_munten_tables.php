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
        Schema::create('Opwaarderingen', function (Blueprint $table) {
            $table->id();
            $table->string('mollie_id')->unique();
            $table->string('status');
            $table->decimal('amount', 10, 2);
            $table->string('method');
            $table->foreignId('gebruiker_id')->constrained('Gebruikers')->onUpdate('no action')->onDelete('no action');
            $table->foreignId('event_id')->constrained('Evenementen')->onUpdate('no action')->onDelete('no action');
        });

        Schema::create('Transacties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gebruiker_id')->constrained('Gebruikers')->onUpdate('no action')->onDelete('no action');
            $table->foreignId('event_id')->constrained('Evenementen')->onUpdate('no action')->onDelete('no action');
            $table->foreignId('groep_id')->nullable()->constrained('Groepen')->onUpdate('no action')->onDelete('no action');
            $table->integer('hoeveelheid');
            $table->string('type');
        });

        Schema::create('Munten', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gebruiker_id')->nullable()->constrained('Gebruikers')->onUpdate('no action')->onDelete('no action');
            $table->foreignId('event_id')->constrained('Evenementen')->onUpdate('no action')->onDelete('no action');
            $table->foreignId('groep_id')->nullable()->constrained('Groepen')->onUpdate('no action')->onDelete('no action');
            $table->integer('hoeveelheid');
            $table->foreignId('laatste_transactie')->nullable()->constrained('Transacties')->onUpdate('no action')->onDelete('no action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('Munten');
        Schema::dropIfExists('Transacties');
        Schema::dropIfExists('Opwaarderingen');
    }
};
