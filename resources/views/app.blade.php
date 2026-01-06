<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    
    <!-- Favicon -->
    <link rel="icon" type="image/png" href="/favicon.png">
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

    <!-- Routes (Inertia) -->
    @routes

    @php
        // Check if we're in development mode AND Vite is actually running
        $isDevelopment = app()->environment('local', 'development');
        $viteIsRunning = false;
        
        if ($isDevelopment) {
            // Try to connect to Vite dev server
            $vitePort = 5173;
            $connection = @fsockopen('localhost', $vitePort, $errno, $errstr, 1);
            $viteIsRunning = ($connection !== false);
            if ($connection) fclose($connection);
        }
        
        // Also check if production build exists
        $manifestPath = public_path('build/manifest.json');
        $hasProductionBuild = file_exists($manifestPath);
    @endphp

    @if($isDevelopment && $viteIsRunning)
        <!-- Development - Vite Dev Server is running -->
        @viteReactRefresh
        @vite(['resources/js/app.jsx'])
    @elseif($hasProductionBuild)
        <!-- Production - Load built assets -->
        @php
            $manifest = json_decode(file_get_contents($manifestPath), true);
            
            // Find and load the main app.jsx file
            foreach ($manifest as $key => $fileData) {
                if (str_contains($key, 'resources/js/app.jsx')) {
                    // Load CSS files
                    if (isset($fileData['css'])) {
                        foreach ($fileData['css'] as $cssFile) {
                            echo '<link rel="stylesheet" href="' . asset('build/' . $cssFile) . '">';
                        }
                    }
                    // Load JS file
                    echo '<script type="module" src="' . asset('build/' . $fileData['file']) . '"></script>';
                    break;
                }
            }
        @endphp
    @else
        <!-- Neither Vite nor production build available -->
        <script>
            console.error('Neither Vite dev server nor production build found!');
            console.error('Run: npm run dev (development) or npm run build (production)');
        </script>
    @endif

    <!-- Inertia Head -->
    @inertiaHead
    
    <title inertia>{{ config('app.name', 'Laravel') }}</title>
</head>
<body class="font-sans antialiased">
    @inertia
    <!-- NO data-page removal script here - it's in app.jsx -->
</body>
</html>