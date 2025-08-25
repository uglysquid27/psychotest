<?php

$totalQuestions = 200;
$questions = [];
$commonItems = [
    "cangkok.com", "tokopedia.net", "bukalapak.org", "shopee.co.id", "lazada.com",
    "instagram.id", "facebook.web", "twitter.co.id", "whatsapp.net", "telegram.me",
    "google.co.id", "yahoo.com", "bing.search", "wikipedia.org", "youtube.com",
    "netflix.stream", "spotify.music", "steam.games", "epic.store", "origin.play",
    "bankbca.com", "bankmandiri", "bri.co.id", "btn.bank", "danamon.com",
    "gojek.app", "grab.transport", "uber.ride", "traveloka.trip", "tiket.com",
    "kemnaker.go.id", "kemendagri", "kemenkeu.ri", "kemendikbud", "kemenag.go.id",
    "tokoh1", "brandX", "item42", "produkY", "kodeZ",
    "1234567890", "0987654321", "1122334455", "5566778899", "9988776655",
    "admin.user", "guest.account", "member.premium", "vip.customer", "super.admin",
    "JN83KLP", "2981QWR", "DKL9281", "MJT0934", "A1B2C3D", "ZXCVBNM", "R3F8G2L",
    "TYU654L", "0001112", "NMB45ER", "121212", "6869696", "46555", "1972", "FIFFIFT",
    "HARTX", "636363", "ATTIT", "321123", "700212088"
];

function subtleChange($str) {
    $len = strlen($str);
    if ($len <= 1) return $str;

    $strategies = ['swap_adjacent','case_change','similar_char','remove_one','add_one','punctuation_change'];
    $strategy = $strategies[array_rand($strategies)];

    switch ($strategy) {
        case 'swap_adjacent':
            if ($len >= 2) {
                $pos = rand(0, $len - 2);
                $temp = $str[$pos];
                $str[$pos] = $str[$pos + 1];
                $str[$pos + 1] = $temp;
            }
            break;
        case 'case_change':
            if (preg_match('/[a-zA-Z]/', $str)) {
                $pos = rand(0, $len - 1);
                $str[$pos] = ctype_lower($str[$pos]) ? strtoupper($str[$pos]) : strtolower($str[$pos]);
            }
            break;
        case 'similar_char':
            $similarMap = [
                'i'=>['l','1','I'],'l'=>['i','1','I'],'1'=>['i','l','I'],
                'o'=>['0','O','Q'],'0'=>['o','O','Q'],
                's'=>['5','S','z'],'5'=>['s','S','z'],'z'=>['2','Z','s'],
                '2'=>['z','Z','s'],'b'=>['6','8','B'],'6'=>['b','8','B'],'8'=>['b','6','B'],
                'n'=>['m','N','M'],'m'=>['n','N','M'], 'a'=>['@','4','A'], 'e'=>['3','E']
            ];
            $pos = rand(0, $len - 1);
            $char = strtolower($str[$pos]);
            if (isset($similarMap[$char])) {
                $str[$pos] = $similarMap[$char][array_rand($similarMap[$char])];
            }
            break;
        case 'remove_one':
            if ($len > 2) {
                $pos = rand(1, $len - 2);
                $str = substr($str, 0, $pos) . substr($str, $pos + 1);
            }
            break;
        case 'add_one':
            $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.';
            $newChar = $chars[rand(0, strlen($chars) - 1)];
            $pos = rand(1, $len - 1);
            $str = substr($str, 0, $pos) . $newChar . substr($str, $pos);
            break;
        case 'punctuation_change':
            $punctuations = ['.'=>',', ','=>'.', '-'=>'_', '_'=>'-'];
            $pos = rand(0, $len - 1);
            $char = $str[$pos];
            if (isset($punctuations[$char])) {
                $str[$pos] = $punctuations[$char];
            }
            break;
    }
    return $str;
}

for ($i = 0; $i < $totalQuestions; $i++) {
    $str1 = $commonItems[array_rand($commonItems)];
    $isSame = rand(0, 1) === 1;

    if ($isSame) {
        $str2 = $str1;
    } else {
        $attempts = 0;
        do {
            $str2 = subtleChange($str1);
            $attempts++;
        } while ($str2 === $str1 && $attempts < 5);

        if ($str2 === $str1) {
            $str2 = subtleChange($str1 . 'x');
            $str2 = substr($str2, 0, -1);
        }
    }

    $answer = ($str1 === $str2) ? 'S' : 'T';

    $questions[] = [
        'left' => $str1,
        'right' => $str2,
        'answer' => $answer,
        'question' => "{$str1} --- {$str2}"
    ];
}

// Pastikan ada contoh yang sesuai dengan permintaan
$examples = [
    ["121212", "121212", "S"],
    ["Indonesia", "Indonesian", "T"],
    ["Three Person", "Tree Person", "T"],
    ["6869696", "6869696", "S"],
    ["46555", "46555", "S"],
    ["Zia Alyna", "Zia Alyna", "S"],
    ["1972", "1972", "S"],
    ["FIFFIFT", "FIFFIFT", "S"],
    ["HARTX", "HARTX", "S"],
    ["Sri Handayani", "Sri Handayani", "S"],
    ["636363", "363636", "T"],
    ["ATTIT", "ATTTI", "T"],
    ["321123", "321223", "T"],
    ["700212088", "700212088", "S"],
    ["JN83KLP", "JN83KLP", "S"],
    ["2981QWR", "2981QWR", "S"],
    ["DKL9281", "DKL928I", "T"],
    ["MJT0934", "MJT9034", "T"],
    ["A1B2C3D", "A1B2C3D", "S"],
    ["ZXCVBNM", "ZXCvBNM", "T"]
];

foreach ($examples as $index => $example) {
    if ($index < count($questions)) {
        $questions[$index] = [
            'left' => $example[0],
            'right' => $example[1],
            'answer' => $example[2],
            'question' => "{$example[0]} --- {$example[1]}"
        ];
    }
}

shuffle($questions);

$fileContent = "<?php\n\nreturn " . var_export($questions, true) . ";\n";
file_put_contents(__DIR__ . '/ketelitian_ST_questions.php', $fileContent);

echo count($questions) . " soal tes ketelitian berhasil dibuat.\n";
echo "File disimpan sebagai: " . __DIR__ . "/ketelitian_ST_questions.php\n";

// Tampilkan contoh
echo "\nContoh soal:\n";
for ($i = 0; $i < 20; $i++) {
    echo ($i + 1) . ". " . $questions[$i]['question'] . " (Jawaban: " . $questions[$i]['answer'] . ")\n";
}