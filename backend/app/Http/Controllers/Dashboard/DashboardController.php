<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use App\Models\Evenement;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $evenementen = Evenement::where('gebruiker', Auth::id())
            ->withCount(['groepen', 'transacties'])
            ->orderBy('id', 'desc')
            ->get();

        return Inertia::render('Dashboard/Evenementen/index', [
            'evenementen' => $evenementen,
        ]);
    }
}
