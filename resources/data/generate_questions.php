<?php

// ====== Definisi pasangan analogi ======
$analogyPairs = [
    ['left' => 'GAJAH', 'right' => 'KEKUATAN', 'comparison' => 'BEO', 'answer' => 'KEMERDUAN'],
    ['left' => 'BURUNG', 'right' => 'TERBANG', 'comparison' => 'IKAN', 'answer' => 'BERENANG'],
    ['left' => 'SINGA', 'right' => 'GARANG', 'comparison' => 'KUCING', 'answer' => 'LUCU'],
    ['left' => 'ULAR', 'right' => 'BERBISA', 'comparison' => 'KALAJENGKING', 'answer' => 'MENYENGAT'],
    ['left' => 'KUDA', 'right' => 'LARI', 'comparison' => 'KERA', 'answer' => 'MEMANJAT'],
    ['left' => 'LUMBA-LUMBA', 'right' => 'CERDAS', 'comparison' => 'GAJAH', 'answer' => 'KUAT'],
    ['left' => 'MERPATI', 'right' => 'SETIA', 'comparison' => 'ANJING', 'answer' => 'SETIA'],
    ['left' => 'KUPU-KUPU', 'right' => 'INDAH', 'comparison' => 'BURUNG', 'answer' => 'MERDU'],
    ['left' => 'DOKTER', 'right' => 'STETOSKOP', 'comparison' => 'HAKIM', 'answer' => 'PALU'],
    ['left' => 'GURU', 'right' => 'PAPAN TULIS', 'comparison' => 'KOKI', 'answer' => 'WAJAN'],
    ['left' => 'POLISI', 'right' => 'PISTOL', 'comparison' => 'PETANI', 'answer' => 'CANGKUL'],
    ['left' => 'PENYANYI', 'right' => 'MIKROFON', 'comparison' => 'PENARI', 'answer' => 'PAKAIAN'],
    ['left' => 'PENA', 'right' => 'MENULIS', 'comparison' => 'GUNTING', 'answer' => 'MEMOTONG'],
    ['left' => 'SENDOK', 'right' => 'MAKAN', 'comparison' => 'SAPU', 'answer' => 'MENYAPU'],
    ['left' => 'JAM', 'right' => 'WAKTU', 'comparison' => 'TERMOMETER', 'answer' => 'SUHU'],
    ['left' => 'KOMPAS', 'right' => 'ARAH', 'comparison' => 'TIMBANGAN', 'answer' => 'BERAT'],
    ['left' => 'API', 'right' => 'PANAS', 'comparison' => 'ES', 'answer' => 'DINGIN'],
    ['left' => 'HUJAN', 'right' => 'BASAH', 'comparison' => 'MATAHARI', 'answer' => 'KERING'],
    ['left' => 'GUNUNG', 'right' => 'TINGGI', 'comparison' => 'LAUT', 'answer' => 'DALAM'],
    ['left' => 'SUNGAI', 'right' => 'MENGALIR', 'comparison' => 'DANAU', 'answer' => 'TENANG'],
    ['left' => 'MATA', 'right' => 'MELIHAT', 'comparison' => 'TELINGA', 'answer' => 'MENDENGAR'],
    ['left' => 'HIDUNG', 'right' => 'MENCIUM', 'comparison' => 'LIDAH', 'answer' => 'MENCECAP'],
    ['left' => 'KULIT', 'right' => 'MERABA', 'comparison' => 'MATA', 'answer' => 'MELIHAT'],
    ['left' => 'MOBIL', 'right' => 'BERJALAN', 'comparison' => 'PESAWAT', 'answer' => 'TERBANG'],
    ['left' => 'KAPAL', 'right' => 'BERLAYAR', 'comparison' => 'KERETA', 'answer' => 'MELAJU'],
    ['left' => 'SEPEDA', 'right' => 'MENGAYUH', 'comparison' => 'MOTOR', 'answer' => 'MENGEMUDI'],
    ['left' => 'BUKU', 'right' => 'MEMBACA', 'comparison' => 'PENA', 'answer' => 'MENULIS'],
    ['left' => 'PETA', 'right' => 'GEOGRAFI', 'comparison' => 'GLOBE', 'answer' => 'BUMI'],
    ['left' => 'KALKULATOR', 'right' => 'MENGHITUNG', 'comparison' => 'MIKROSKOP', 'answer' => 'MENGAMATI'],
    ['left' => 'PAGI', 'right' => 'MATAHARI', 'comparison' => 'MALAM', 'answer' => 'BULAN'],
    ['left' => 'MUSIM HUJAN', 'right' => 'HUJAN', 'comparison' => 'MUSIM KEMARAU', 'answer' => 'PANAS'],
    ['left' => 'GULA', 'right' => 'MANIS', 'comparison' => 'GARAM', 'answer' => 'ASIN'],
    ['left' => 'CABE', 'right' => 'PEDAS', 'comparison' => 'JAHE', 'answer' => 'HANGAT'],
    ['left' => 'LEMON', 'right' => 'ASAM', 'comparison' => 'MADU', 'answer' => 'MANIS'],
    ['left' => 'BAJA', 'right' => 'KUAT', 'comparison' => 'KAPAS', 'answer' => 'LEMBUT'],
    ['left' => 'KACA', 'right' => 'TRANSPARAN', 'comparison' => 'BESI', 'answer' => 'KOKOH'],
    ['left' => 'KARET', 'right' => 'ELASTIS', 'comparison' => 'KAYU', 'answer' => 'KERAS'],
    ['left' => 'DAUN', 'right' => 'HIJAU', 'comparison' => 'LANGIT', 'answer' => 'BIRU'],
    ['left' => 'SALJU', 'right' => 'PUTIH', 'comparison' => 'ARANG', 'answer' => 'HITAM'],
    ['left' => 'SURYA', 'right' => 'KUNING', 'comparison' => 'LAUT', 'answer' => 'BIRU'],
    ['left' => 'SENYUM', 'right' => 'BAHAGIA', 'comparison' => 'TANGIS', 'answer' => 'SEDIH'],
    ['left' => 'TERTAWA', 'right' => 'GEMBIRA', 'comparison' => 'MARAH', 'answer' => 'KESAL'],
    ['left' => 'SEPAK BOLA', 'right' => 'BOLA', 'comparison' => 'BULU TANGKIS', 'answer' => 'KOK'],
    ['left' => 'BASKET', 'right' => 'RING', 'comparison' => 'VOLI', 'answer' => 'NET'],
    ['left' => 'TENIS', 'right' => 'RAKET', 'comparison' => 'GOLF', 'answer' => 'STIK'],
    ['left' => 'PIANO', 'right' => 'MEMAINKAN', 'comparison' => 'MIC', 'answer' => 'MENYANYI'],
    ['left' => 'GUITAR', 'right' => 'MENGGENJREK', 'comparison' => 'DRUM', 'answer' => 'MEMUKUL'],
    ['left' => 'ANGIN', 'right' => 'BERTIUP', 'comparison' => 'HUJAN', 'answer' => 'TURUN'],
    ['left' => 'PETIR', 'right' => 'BERKILAT', 'comparison' => 'GUNTUR', 'answer' => 'MENGGELEGAR'],
];

// ====== Definisi opsi salah berdasarkan kategori ======
$wrongOptions = [
    'animal_ability' => ['TERBANG','BERENANG','MELONCAT','MEMANJAT','BERBISA','GARANG','CERDAS','KUAT','LUCU','MENYENGAT'],
    'profession_tool' => ['PALU','WAJAN','GUNTING','STETOSKOP','PENSIL','PISAU','CANGKUL','MIKROFON','PAPAN TULIS'],
    'object_function' => ['MEMOTONG','MENULIS','MENGGAMBAR','MENIMBANG','MEMBACA','MEMASAK','MENYAPU','MAKAN'],
    'nature_property' => ['PANAS','DINGIN','KERING','BASAH','TINGGI','DALAM','TENANG'],
    'sense_action' => ['MELIHAT','MENDENGAR','MENCECAP','MERABA'],
    'vehicle_action' => ['BERJALAN','TERBANG','BERLAYAR','MELAJU','MENGAYUH','MENGEMUDI'],
    'learning_tool' => ['MENULIS','MEMBACA','MENGHITUNG','MENGAMATI'],
    'time_object' => ['MATAHARI','BULAN','HUJAN','PANAS'],
    'food_taste' => ['MANIS','ASIN','PEDAS','HANGAT','LEMBUT','GURIH'],
    'material_property' => ['KUAT','LEMBUT','KERAS','ELASTIS','TRANSPARAN','KOKOH'],
    'color_assoc' => ['HIJAU','BIRU','PUTIH','HITAM','KUNING','MERAH'],
    'emotion' => ['BAHAGIA','SEDIH','GEMBIRA','KESAL'],
    'sport_equipment' => ['BOLA','NET','RAKET','STIK','KOK'],
    'music_instrument' => ['MEMAINKAN','MENYANYI','MEMUKUL','MENGGENJREK'],
    'weather_effect' => ['BERTIUP','TURUN','MENGGELEGAR','BERKILAT'],
    'general' => ['CANTIK','BODOH','CERAH','LEMBUT','KUAT','PANAS','DINGIN','TERBANG','MELIHAT']
];

// ====== Mapping jawaban ke kategori ======
$categoryMap = [
    'KEMERDUAN'=>'animal_ability','TERBANG'=>'animal_ability','BERENANG'=>'animal_ability','LUCU'=>'animal_ability','MENYENGAT'=>'animal_ability','MEMANJAT'=>'animal_ability','KUAT'=>'animal_ability','SETIA'=>'animal_ability','MERDU'=>'animal_ability',
    'PALU'=>'profession_tool','STETOSKOP'=>'profession_tool','WAJAN'=>'profession_tool','CANGKUL'=>'profession_tool','MIKROFON'=>'profession_tool','PAPAN TULIS'=>'profession_tool',
    'MENULIS'=>'object_function','MEMOTONG'=>'object_function','MAKAN'=>'object_function','MENYAPU'=>'object_function',
    'PANAS'=>'nature_property','DINGIN'=>'nature_property','KERING'=>'nature_property','BASAH'=>'nature_property','TINGGI'=>'nature_property','DALAM'=>'nature_property','TENANG'=>'nature_property',
    'MELIHAT'=>'sense_action','MENDENGAR'=>'sense_action','MENCECAP'=>'sense_action','MERABA'=>'sense_action',
    'BERJALAN'=>'vehicle_action','TERBANG'=>'vehicle_action','BERLAYAR'=>'vehicle_action','MELAJU'=>'vehicle_action','MENGAYUH'=>'vehicle_action','MENGEMUDI'=>'vehicle_action',
    'MEMBACA'=>'learning_tool','MENGHITUNG'=>'learning_tool','MENGAMATI'=>'learning_tool','MENULIS'=>'learning_tool',
    'BULAN'=>'time_object','MATAHARI'=>'time_object','HUJAN'=>'time_object',
    'ASIN'=>'food_taste','MANIS'=>'food_taste','PEDAS'=>'food_taste','HANGAT'=>'food_taste',
    'LEMBUT'=>'material_property','KUAT'=>'material_property','KERAS'=>'material_property','ELASTIS'=>'material_property','TRANSPARAN'=>'material_property','KOKOH'=>'material_property',
    'HIJAU'=>'color_assoc','BIRU'=>'color_assoc','PUTIH'=>'color_assoc','HITAM'=>'color_assoc','KUNING'=>'color_assoc','MERAH'=>'color_assoc',
    'BAHAGIA'=>'emotion','SEDIH'=>'emotion','GEMBIRA'=>'emotion','KESAL'=>'emotion',
    'BOLA'=>'sport_equipment','NET'=>'sport_equipment','RAKET'=>'sport_equipment','STIK'=>'sport_equipment','KOK'=>'sport_equipment',
    'MEMAINKAN'=>'music_instrument','MENYANYI'=>'music_instrument','MEMUKUL'=>'music_instrument','MENGGENJREK'=>'music_instrument',
    'BERTIUP'=>'weather_effect','TURUN'=>'weather_effect','MENGGELEGAR'=>'weather_effect','BERKILAT'=>'weather_effect'
];

// ====== Generate soal ======
$questions = [];
foreach ($analogyPairs as $pair) {
    $questionText = "{$pair['left']} - {$pair['right']} = {$pair['comparison']} - .....";
    
    $category = $categoryMap[$pair['answer']] ?? 'general';
    $availableWrongOptions = array_diff($wrongOptions[$category], [$pair['answer']]);
    $selectedWrongOptions = array_rand(array_flip($availableWrongOptions), min(3, count($availableWrongOptions)));
    if (!is_array($selectedWrongOptions)) $selectedWrongOptions = [$selectedWrongOptions];
    
    $options = array_merge([$pair['answer']], $selectedWrongOptions);
    shuffle($options);
    
    $questions[] = [
        'question'=>$questionText,
        'options'=>$options,
        'answer'=>$pair['answer'],
        'left'=>$pair['left'],
        'right'=>$pair['right'],
        'comparison'=>$pair['comparison']
    ];
}

// ====== Duplikasi & variasi untuk 200 soal ======
$totalQuestions = [];
while(count($totalQuestions)<200){
    foreach($questions as $q){
        if(count($totalQuestions)>=200) break;
        $newQ = $q;
        shuffle($newQ['options']);
        $totalQuestions[] = $newQ;
    }
}

// ====== Shuffle dan simpan ke file ======
shuffle($totalQuestions);
$fileContent = "<?php\n\nreturn ".var_export($totalQuestions,true).";\n";
file_put_contents(__DIR__.'/analogi_questions.php',$fileContent);

echo "200 soal analogi psikotes berhasil dibuat di resources/data/analogi_questions.php\n";
