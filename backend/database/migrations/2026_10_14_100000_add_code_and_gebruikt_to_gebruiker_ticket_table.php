<?php

use App\Models\GekochtTicket;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Every gebruiker_ticket row is one bought ticket with its own QR code (`code`). Scanning it at the entrance
     * sets `gebruikt` (and `gebruikt_op`). Timestamps record when it was bought.
     */
    public function up(): void
    {
        Schema::table('gebruiker_ticket', function (Blueprint $table) {
            $table->string('code', 32)->nullable()->unique()->after('ticket_id');
            $table->boolean('gebruikt')->default(false)->after('code');
            $table->timestamp('gebruikt_op')->nullable()->after('gebruikt');
            $table->timestamps();
        });

        // Tickets bought before this migration get a code too. (Ids first: paging over "code is null" while
        // filling in codes would skip rows.)
        foreach (DB::table('gebruiker_ticket')->whereNull('code')->pluck('id') as $id) {
            DB::table('gebruiker_ticket')->where('id', $id)->update(['code' => GekochtTicket::nieuweCode()]);
        }
    }

    public function down(): void
    {
        Schema::table('gebruiker_ticket', function (Blueprint $table) {
            $table->dropUnique(['code']);
            $table->dropColumn(['code', 'gebruikt', 'gebruikt_op', 'created_at', 'updated_at']);
        });
    }
};
