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
        Schema::create('opwaarderingen', function (Blueprint $table) {
            $table->id();
            $table->string('mollie_id')->unique();
            $table->string('status');
            $table->decimal('amount', 10, 2);
            $table->string('method');
            $table->foreignId('gebruiker_id')->constrained('gebruikers')->onUpdate('no action')->onDelete('no action');
            $table->foreignId('evenement_id')->constrained('evenementen')->onUpdate('no action')->onDelete('no action');
            $table->timestamps();
        });

        Schema::create('transacties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gebruiker_id')->constrained('gebruikers')->onUpdate('no action')->onDelete('no action');
            $table->foreignId('evenement_id')->constrained('evenementen')->onUpdate('no action')->onDelete('no action');
            $table->foreignId('groep_id')->nullable()->constrained('groepen')->onUpdate('no action')->onDelete('no action');
            $table->integer('hoeveelheid');
            $table->string('type');
            $table->timestamps();
        });

        Schema::create('munten', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gebruiker_id')->nullable()->constrained('gebruikers')->onUpdate('no action')->onDelete('no action');
            $table->foreignId('evenement_id')->constrained('evenementen')->onUpdate('no action')->onDelete('no action');
            $table->foreignId('groep_id')->nullable()->constrained('groepen')->onUpdate('no action')->onDelete('no action');
            $table->integer('hoeveelheid');
            $table->foreignId('laatste_transactie')->nullable()->constrained('transacties')->onUpdate('no action')->onDelete('no action');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('munten');
        Schema::dropIfExists('transacties');
        Schema::dropIfExists('opwaarderingen');
    }
};
