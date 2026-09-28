<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Evenement;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $evenementen = Evenement::withCount(['groepen', 'transacties'])
            ->orderBy('id', 'desc')
            ->get();

        return Inertia::render('Dashboard/Evenementen/index', [
            'evenementen' => $evenementen,
        ]);
    }
}
