<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One kaart per gebruiker per evenement, linked only through kaart_koppelingen.
     *
     * - kaarten: uid, type, gebruiker_id. type only says which kaart can be my persoonlijke kaart ('persoonlijk')
     *   versus a polsband ('tijdelijk'); evenement_id and actief go away.
     * - kaart_koppelingen: the pivot kaart × evenement × gebruiker, unique per gebruiker per evenement, with actief =
     *   the kaart works at that evenement (the only actief flag). soort and groep_id go away: the wallet a kaart pays
     *   from is the gebruiker's betaalbron in gebruiker_evenement.
     *
     * Existing data:
     * - persoonlijk and groep koppeling for the same evenement: the persoonlijk one stays (it already won at the
     *   terminal); a groep-only koppeling stays and makes that groep the betaalbron.
     * - every tijdelijke kaart becomes a koppeling, unless the gebruiker already has a kaart in that evenement; of
     *   several, the newest actieve one wins.
     * - a deactivated kaart keeps not working: its koppelingen become inactief.
     */
    public function up(): void
    {
        $this->eenKoppelingPerGebruikerPerEvenement();

        Schema::table('kaart_koppelingen', function (Blueprint $table) {
            // The new index first: it also serves the gebruiker_id foreign key once the old one is gone.
            $table->unique(['gebruiker_id', 'evenement_id']);
            $table->boolean('actief')->default(true)->after('evenement_id');
        });

        Schema::table('kaart_koppelingen', function (Blueprint $table) {
            $table->dropUnique(['gebruiker_id', 'evenement_id', 'soort']);
            $table->dropConstrainedForeignId('groep_id');
            $table->dropColumn('soort');
        });

        // type followed evenement_id: without an evenement the kaart was the persoonlijke kaart.
        DB::table('kaarten')->whereNull('evenement_id')->update(['type' => 'persoonlijk']);
        DB::table('kaarten')->whereNotNull('evenement_id')->update(['type' => 'tijdelijk']);

        $this->tijdelijkeKaartenNaarKoppelingen();

        DB::table('kaart_koppelingen')
            ->whereIn('kaart_id', DB::table('kaarten')->select('id')->where('actief', false))
            ->update(['actief' => false]);

        Schema::table('kaarten', function (Blueprint $table) {
            $table->dropConstrainedForeignId('evenement_id');
            $table->dropColumn('actief');
        });
    }

    public function down(): void
    {
        Schema::table('kaarten', function (Blueprint $table) {
            $table->boolean('actief')->default(true)->after('type');
            $table->foreignId('evenement_id')->nullable()->after('actief')->constrained('evenementen')->onUpdate('no action')->onDelete('no action');
        });

        // Tijdelijke kaarten get their evenement (and actief) back from their koppeling, which goes away.
        $koppelingen = DB::table('kaart_koppelingen')
            ->join('kaarten', 'kaarten.id', '=', 'kaart_koppelingen.kaart_id')
            ->where('kaarten.type', 'tijdelijk')
            ->select('kaart_koppelingen.id', 'kaart_koppelingen.kaart_id', 'kaart_koppelingen.evenement_id', 'kaart_koppelingen.actief')
            ->get();

        foreach ($koppelingen as $koppeling) {
            DB::table('kaarten')->where('id', $koppeling->kaart_id)->update([
                'evenement_id' => $koppeling->evenement_id,
                'actief'       => (bool) $koppeling->actief,
            ]);
            DB::table('kaart_koppelingen')->where('id', $koppeling->id)->delete();
        }

        Schema::table('kaart_koppelingen', function (Blueprint $table) {
            $table->foreignId('groep_id')->nullable()->after('evenement_id')->constrained('groepen')->cascadeOnDelete();
            $table->string('soort')->default('persoonlijk')->after('groep_id');
            $table->unique(['gebruiker_id', 'evenement_id', 'soort']);
        });

        Schema::table('kaart_koppelingen', function (Blueprint $table) {
            $table->dropUnique(['gebruiker_id', 'evenement_id']);
            $table->dropColumn('actief');
        });
    }

    /** Persoonlijk wins over groep; a groep-only koppeling makes that groep the betaalbron. */
    private function eenKoppelingPerGebruikerPerEvenement(): void
    {
        $groepKoppelingen = DB::table('kaart_koppelingen')->where('soort', 'groep')->get();

        foreach ($groepKoppelingen as $koppeling) {
            $heeftPersoonlijk = DB::table('kaart_koppelingen')
                ->where('gebruiker_id', $koppeling->gebruiker_id)
                ->where('evenement_id', $koppeling->evenement_id)
                ->where('soort', 'persoonlijk')
                ->exists();

            if ($heeftPersoonlijk) {
                DB::table('kaart_koppelingen')->where('id', $koppeling->id)->delete();
            } elseif ($koppeling->groep_id) {
                DB::table('gebruiker_evenement')
                    ->where('gebruiker_id', $koppeling->gebruiker_id)
                    ->where('evenement_id', $koppeling->evenement_id)
                    ->update(['betaalbron' => $koppeling->groep_id]);
            }
        }
    }

    /** Every tijdelijke kaart becomes a koppeling where the gebruiker has none yet; the newest actieve one wins. */
    private function tijdelijkeKaartenNaarKoppelingen(): void
    {
        $tijdelijk = DB::table('kaarten')
            ->whereNotNull('evenement_id')
            ->orderByDesc('actief')
            ->orderByDesc('id')
            ->get();

        foreach ($tijdelijk as $kaart) {
            $bestaat = DB::table('kaart_koppelingen')
                ->where('gebruiker_id', $kaart->gebruiker_id)
                ->where('evenement_id', $kaart->evenement_id)
                ->exists();

            if (! $bestaat) {
                DB::table('kaart_koppelingen')->insert([
                    'kaart_id'     => $kaart->id,
                    'gebruiker_id' => $kaart->gebruiker_id,
                    'evenement_id' => $kaart->evenement_id,
                    'actief'       => (bool) $kaart->actief,
                    'created_at'   => now(),
                    'updated_at'   => now(),
                ]);
            }
        }
    }
};
