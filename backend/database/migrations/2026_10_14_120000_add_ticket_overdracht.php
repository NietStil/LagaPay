<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tickets for friends. A bought ticket (gebruiker_ticket row) is held by `gebruiker_id`; the buyer can put
     * it on offer (`te_geven`) and a friend takes it through the buyer's uitnodigingslink, which moves the row
     * to the friend. Included munten are credited to whoever holds the ticket as a deelnemer
     * (`munten_uitgekeerd`), so a ticket that is still on offer credits nobody.
     */
    public function up(): void
    {
        Schema::table('gebruiker_ticket', function (Blueprint $table) {
            // Who paid. Not a foreign key: it only says who to thank, and may point to a deleted gebruiker.
            $table->unsignedBigInteger('gekocht_door')->nullable()->index()->after('gebruiker_id');
            $table->boolean('te_geven')->default(false)->after('gebruikt_op');
            $table->boolean('munten_uitgekeerd')->default(false)->after('te_geven');
            $table->timestamp('overgedragen_op')->nullable()->after('munten_uitgekeerd');
        });

        // Tickets bought before this migration: the holder is the buyer, and the munten were credited at purchase.
        DB::table('gebruiker_ticket')->update([
            'gekocht_door'      => DB::raw('gebruiker_id'),
            'munten_uitgekeerd' => true,
        ]);

        // One link per buyer per evenement.
        Schema::create('ticket_uitnodigingen', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gebruiker_id')->constrained('gebruikers')->cascadeOnDelete();
            $table->foreignId('evenement_id')->constrained('evenementen')->cascadeOnDelete();
            $table->string('code', 32)->unique();
            $table->timestamps();
            $table->unique(['gebruiker_id', 'evenement_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_uitnodigingen');

        Schema::table('gebruiker_ticket', function (Blueprint $table) {
            $table->dropIndex(['gekocht_door']);
            $table->dropColumn(['gekocht_door', 'te_geven', 'munten_uitgekeerd', 'overgedragen_op']);
        });
    }
};
