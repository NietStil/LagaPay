<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A received ticket can be passed on again, so the buyer (`gekocht_door`) is no longer always the one I got it
     * from. Every claim through a ticket link is logged: which ticket, from whom, to whom, when. It replaces
     * `gebruiker_ticket.overgedragen_op` (the moment of the last transfer).
     */
    public function up(): void
    {
        Schema::create('ticket_overdrachten', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gekocht_ticket_id')->constrained('gebruiker_ticket')->cascadeOnDelete();
            // Not foreign keys, like gekocht_door: they say who gave it to whom, also after an account is deleted.
            $table->unsignedBigInteger('van_gebruiker_id')->index();
            $table->unsignedBigInteger('naar_gebruiker_id')->index();
            $table->timestamp('created_at')->nullable();
        });

        // Transfers so far: always from the buyer to the holder.
        $overgedragen = DB::table('gebruiker_ticket')->whereNotNull('overgedragen_op')->get(['id', 'gekocht_door', 'gebruiker_id', 'overgedragen_op']);
        foreach ($overgedragen as $ticket) {
            DB::table('ticket_overdrachten')->insert([
                'gekocht_ticket_id' => $ticket->id,
                'van_gebruiker_id'  => $ticket->gekocht_door ?? $ticket->gebruiker_id,
                'naar_gebruiker_id' => $ticket->gebruiker_id,
                'created_at'        => $ticket->overgedragen_op,
            ]);
        }

        Schema::table('gebruiker_ticket', function (Blueprint $table) {
            $table->dropColumn('overgedragen_op');
        });
    }

    public function down(): void
    {
        Schema::table('gebruiker_ticket', function (Blueprint $table) {
            $table->timestamp('overgedragen_op')->nullable()->after('munten_uitgekeerd');
        });

        foreach (DB::table('ticket_overdrachten')->orderBy('id')->get() as $overdracht) {
            DB::table('gebruiker_ticket')->where('id', $overdracht->gekocht_ticket_id)->update(['overgedragen_op' => $overdracht->created_at]);
        }

        Schema::dropIfExists('ticket_overdrachten');
    }
};
