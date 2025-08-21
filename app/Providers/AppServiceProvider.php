<?php

namespace App\Providers;

use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;
use App\Http\Controllers\SidebarController;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);
        
        // Share auth data with all Inertia responses
        Inertia::share([
            'auth' => function () {
                // Debug: Let's see what we're sharing
                $authData = SidebarController::get();
                \Log::info('AppServiceProvider sharing auth data:', $authData);
                return $authData;
            }
        ]);
    }
}