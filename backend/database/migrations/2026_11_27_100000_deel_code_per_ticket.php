<?php

use App\Models\GekochtTicket;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Every ticket gets its own link to give it to a friend: `deel_code` ({link_url}/t/{deel_code}) claims exactly
     * that ticket. There is no "on offer" step anymore, so `te_geven` and the shared links per buyer per evenement
     * (`ticket_uitnodigingen`) go. The code stays on the ticket after a friend claims it, so the link can still say
     * "already claimed".
     */
    public function up(): void
    {
        Schema::table('gebruiker_ticket', function (Blueprint $table) {
            $table->string('deel_code', 32)->nullable()->unique()->after('code');
        });

        // Every existing ticket gets its link. (Ids first, like the QR code migration.)
        foreach (DB::table('gebruiker_ticket')->pluck('id') as $id) {
            DB::table('gebruiker_ticket')->where('id', $id)->update(['deel_code' => GekochtTicket::nieuweDeelCode()]);
        }

        Schema::table('gebruiker_ticket', function (Blueprint $table) {
            $table->dropColumn('te_geven');
        });

        Schema::dropIfExists('ticket_uitnodigingen');
    }

    /** Back to tickets that must be put on offer first; nothing is on offer after the rollback. */
    public function down(): void
    {
        Schema::create('ticket_uitnodigingen', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gebruiker_id')->constrained('gebruikers')->cascadeOnDelete();
            $table->foreignId('evenement_id')->constrained('evenementen')->cascadeOnDelete();
            $table->string('code', 32)->unique();
            $table->timestamps();
            $table->unique(['gebruiker_id', 'evenement_id']);
        });

        Schema::table('gebruiker_ticket', function (Blueprint $table) {
            $table->boolean('te_geven')->default(false)->after('gebruikt_op');
        });

        Schema::table('gebruiker_ticket', function (Blueprint $table) {
            $table->dropUnique(['deel_code']);
            $table->dropColumn('deel_code');
        });
    }
};
