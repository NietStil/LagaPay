<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * How many tickets of this type may be sold in total (null = onbeperkt). The organisator can raise it later
     * ("tickets toevoegen"). Sold = the gebruiker_ticket rows of the type, so nothing has to be counted down.
     */
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->unsignedInteger('capaciteit')->nullable()->after('munten');
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropColumn('capaciteit');
        });
    }
};
