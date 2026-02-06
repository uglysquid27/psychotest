// resources/js/Pages/Psychotest/KetelitianTest/TestPage.jsx
import { useState, useEffect, useRef } from "react";
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function TesKetelitian({ questions }) {
  const [testStarted, setTestStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState(Array(questions.length).fill(null));
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [isFinished, setIsFinished] = useState(false);
  const [timeStarted, setTimeStarted] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showGuide, setShowGuide] = useState(true); // New state for guide
  const questionRefs = useRef([]);
  const questionsContainerRef = useRef(null);
  const timerRef = useRef(null);

  // Timer hanya berjalan saat testStarted = true dan belum selesai
  useEffect(() => {
    if (!testStarted || isFinished) return;

    timerRef.current = setInterval(() => {
      setTimeElapsed(Math.floor((new Date() - timeStarted) / 1000));
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [testStarted, isFinished, timeStarted]);

  // Auto-scroll ke soal aktif
  useEffect(() => {
    if (testStarted && questionRefs.current[currentIndex] && questionsContainerRef.current) {
      const el = questionRefs.current[currentIndex];
      const container = questionsContainerRef.current;

      let top = 0;

      if (window.innerWidth >= 1024) { // desktop/lg
        const offsetTop = el.offsetTop;
        const offsetHeight = el.offsetHeight;
        const containerHeight = container.offsetHeight;

        top = Math.max(0, offsetTop - containerHeight / 1 + offsetHeight / 1);
      }

      container.scrollTo({ top, behavior: 'smooth' });
    }
  }, [currentIndex, testStarted]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const startTest = () => {
    setTestStarted(true);
    setTimeStarted(new Date());
    setShowGuide(false); // Hide guide when test starts
  };

  const submitTest = async () => {
    if (isFinished) return;
    
    // Hitung skor
    const correct = userAnswers.filter((ans, i) => ans === questions[i].answer).length;
    const wrong = questions.length - correct;
    setScore({ correct, wrong });
    
    // Prepare data for submission
    const submissionData = {
        answers: userAnswers,
        questions: questions,
        time_elapsed: timeElapsed
    };
    
    try {
        const response = await axios.post(route('ketelitian.submit'), submissionData);
        
        if (response.data.success) {
            setIsFinished(true);
            clearInterval(timerRef.current);
            
            // Optional: Show success message
            console.log('Test results saved successfully');
        }
    } catch (error) {
        console.error('Failed to save test results:', error);
        // Still finish test locally even if save fails
        setIsFinished(true);
        clearInterval(timerRef.current);
    }
};

  const handleAnswer = (answer) => {
      if (isFinished || !testStarted) return;

      const newAnswers = [...userAnswers];
      newAnswers[currentIndex] = answer;
      setUserAnswers(newAnswers);

      if (currentIndex < questions.length - 1) {
          setCurrentIndex(prev => prev + 1);
      } else {
          // Auto submit when last question answered
          submitTest();
      }
  };

  const navigateToQuestion = (index) => {
    if (index >= 0 && index < questions.length && testStarted && !isFinished) {
      setCurrentIndex(index);
    }
  };

  // Split soal menjadi dua kolom untuk overview
  const splitQuestionsIntoColumns = () => {
    const mid = Math.ceil(questions.length / 2);
    return {
      leftColumn: questions.slice(0, mid),
      rightColumn: questions.slice(mid)
    };
  };
  const { leftColumn, rightColumn } = splitQuestionsIntoColumns();

  const handleRestart = () => {
    setTestStarted(false);
    setShowGuide(true); // Show guide again
    setCurrentIndex(0);
    setUserAnswers(Array(questions.length).fill(null));
    setScore({ correct: 0, wrong: 0 });
    setIsFinished(false);
    setTimeStarted(null);
    setTimeElapsed(0);
    clearInterval(timerRef.current);
  };

  const handleNewSession = () => {
    window.location.reload(); // Reload for new questions
  };

  // Guide/Introduction Screen
  if (showGuide) {
    return (
      <AuthenticatedLayout
        header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Tes Ketelitian (S/T)</h2>}
      >
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen py-8 px-4">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-4 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                Tes Ketelitian (S/T)
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Uji kemampuan Anda dalam memperhatikan detail dan menemukan perbedaan
              </p>
            </div>

            {/* Test Info Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <div className="text-blue-600 mb-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="font-bold text-lg mb-2">50 Soal</h3>
                <p className="text-gray-600">Tentukan apakah pasangan teks SAMA atau TIDAK SAMA</p>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <div className="text-green-600 mb-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-lg mb-2">Tidak Terbatas</h3>
                <p className="text-gray-600">Waktu pengerjaan tidak dibatasi, fokus pada ketelitian</p>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <div className="text-purple-600 mb-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="font-bold text-lg mb-2">Detail Oriented</h3>
                <p className="text-gray-600">Perhatikan setiap karakter termasuk huruf, angka, dan tanda baca</p>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Petunjuk Pengerjaan
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <span className="font-bold text-blue-600">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">SAMA (S)</h4>
                    <p className="text-gray-600">Tekan tombol <span className="font-bold text-green-600">S</span> jika kedua teks identik persis tanpa perbedaan</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-4">
                    <span className="font-bold text-red-600">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">TIDAK SAMA (T)</h4>
                    <p className="text-gray-600">Tekan tombol <span className="font-bold text-red-600">T</span> jika ada perbedaan sekecil apapun pada kedua teks</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
                    <span className="font-bold text-yellow-600">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Perhatian Khusus</h4>
                    <p className="text-gray-600">Perhatikan huruf besar/kecil, spasi, tanda baca, dan angka</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-4">
                    <span className="font-bold text-green-600">4</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Navigasi</h4>
                    <p className="text-gray-600">Gunakan panel soal di kiri untuk berpindah ke soal tertentu</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Examples */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8 border border-blue-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Contoh Soal</h3>
              
              <div className="space-y-6">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-lg font-semibold bg-blue-100 text-blue-800 px-3 py-1 rounded">"PT. Maju Jaya Sejahtera"</div>
                    <div className="text-lg font-semibold bg-blue-100 text-blue-800 px-3 py-1 rounded">"PT. Maju Jaya Sejahtera"</div>
                  </div>
                  <div className="flex items-center text-green-600 font-medium">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Jawaban: <span className="font-bold ml-1">S (Sama)</span>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-lg font-semibold bg-red-100 text-red-800 px-3 py-1 rounded">"021-55667788"</div>
                    <div className="text-lg font-semibold bg-red-100 text-red-800 px-3 py-1 rounded">"021-55667789"</div>
                  </div>
                  <div className="flex items-center text-red-600 font-medium">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Jawaban: <span className="font-bold ml-1">T (Tidak Sama)</span>
                    <span className="ml-2 text-sm text-gray-600">(angka terakhir berbeda)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-white rounded-xl p-6 mb-8 shadow-md border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Tips untuk Hasil Terbaik
              </h3>
              <ul className="grid md:grid-cols-2 gap-3">
                <li className="flex items-center text-gray-700">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Fokus pada satu soal pada satu waktu
                </li>
                <li className="flex items-center text-gray-700">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Scan teks dari kiri ke kanan
                </li>
                <li className="flex items-center text-gray-700">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Periksa spasi dan tanda baca
                </li>
                <li className="flex items-center text-gray-700">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Jangan terburu-buru, teliti lebih penting
                </li>
              </ul>
            </div>

            {/* Start Button */}
            <div className="text-center">
              <button 
                onClick={startTest}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-12 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-lg"
              >
                <div className="flex items-center justify-center">
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Mulai Tes Ketelitian
                </div>
              </button>
              <p className="text-gray-600 mt-4 text-sm">
                Siap untuk menguji ketelitian Anda? Klik tombol di atas untuk memulai
              </p>
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  // Main Test Interface
  return (
    <AuthenticatedLayout
      header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Tes Ketelitian (S/T)</h2>}
    >
      <div className="bg-gray-100 py-4 min-h-screen">
        <div className="mx-auto px-2 sm:px-4 container">
          <div className="bg-white shadow-md border border-gray-300 rounded-lg overflow-hidden">

            {/* Header: Progress + Timer */}
            {testStarted && (
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
                <div className="flex justify-between items-center">
                  <div className="font-bold text-lg">
                    Pertanyaan {currentIndex + 1} / {questions.length}
                  </div>
                  <div className={`text-sm px-3 py-1 rounded-full ${timeElapsed > 300 ? 'bg-red-700' : 'bg-blue-800'}`}>
                    Waktu: {formatTime(timeElapsed)}
                  </div>
                </div>
                <div className="bg-blue-300 mt-2 rounded-full w-full h-2">
                  <div 
                    className="bg-blue-100 rounded-full h-2 transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {!testStarted && !showGuide ? (
              /* Start Screen */
              <div className="p-6 md:p-8 text-center">
                <div className="mb-6">
                  <h3 className="mb-4 font-bold text-blue-700 text-2xl md:text-3xl">Tes Ketelitian (S/T)</h3>
                  <p className="mx-auto mb-6 max-w-2xl text-gray-600">
                    Tes ini menguji kemampuan Anda dalam memperhatikan detail dengan membandingkan dua teks dan menentukan apakah mereka SAMA atau TIDAK SAMA.
                  </p>
                </div>

                <div className="bg-blue-50 mx-auto mb-8 p-6 border border-blue-200 rounded-xl max-w-2xl">
                  <h4 className="mb-4 font-bold text-blue-800 text-lg">📋 Petunjuk Pengerjaan:</h4>
                  <ul className="space-y-3 mb-6 text-left">
                    <li className="flex items-start">
                      <div className="bg-blue-100 mt-0.5 mr-3 p-1 rounded-full text-blue-800">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V7z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span>Anda memiliki <strong>50 soal</strong> yang harus diselesaikan</span>
                    </li>
                    <li className="flex items-start">
                      <div className="bg-blue-100 mt-0.5 mr-3 p-1 rounded-full text-blue-800">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V7z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span>Waktu pengerjaan tidak dibatasi, tapi usahakan <strong>cepat dan tepat</strong></span>
                    </li>
                    <li className="flex items-start">
                      <div className="bg-green-100 mt-0.5 mr-3 p-1 rounded-full text-green-800">
                        <strong className="text-lg">S</strong>
                      </div>
                      <span>Tekan tombol <strong>S (Sama)</strong> jika kedua teks identik</span>
                    </li>
                    <li className="flex items-start">
                      <div className="bg-red-100 mt-0.5 mr-3 p-1 rounded-full text-red-800">
                        <strong className="text-lg">T</strong>
                      </div>
                      <span>Tekan tombol <strong>T (Tidak Sama)</strong> jika ada perbedaan</span>
                    </li>
                    <li className="flex items-start">
                      <div className="bg-blue-100 mt-0.5 mr-3 p-1 rounded-full text-blue-800">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span>Anda bisa mengklik nomor soal di panel kiri untuk berpindah ke soal tertentu</span>
                    </li>
                  </ul>
                </div>

                <div className="mb-6">
                  <h4 className="mb-4 font-bold text-gray-700 text-lg">Contoh Soal:</h4>
                  <div className="bg-gray-50 mx-auto p-6 border border-gray-200 rounded-lg max-w-md">
                    <div className="flex justify-between items-center mb-4">
                      <div className="font-semibold text-lg">"Budi pergi ke pasar"</div>
                      <div className="font-semibold text-lg">"Budi pergi ke pasar"</div>
                    </div>
                    <p className="mb-4 text-gray-600 text-sm">→ Kedua teks SAMA persis, jadi jawabannya <strong>S</strong></p>
                    
                    <div className="flex justify-between items-center mb-4">
                      <div className="font-semibold text-lg">"123-4567"</div>
                      <div className="font-semibold text-lg">"123-4568"</div>
                    </div>
                    <p className="text-gray-600 text-sm">→ Ada perbedaan di angka terakhir, jadi jawabannya <strong>T</strong></p>
                  </div>
                </div>

                <button 
                  onClick={startTest}
                  className="bg-green-600 hover:bg-green-700 shadow-lg px-8 py-4 rounded-lg font-bold text-white text-lg md:text-xl hover:scale-105 transition-all duration-300 transform"
                >
                  <svg className="inline-block mr-2 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Mulai Tes Ketelitian
                </button>
              </div>
            ) : (
              <div className="flex lg:flex-row flex-col-reverse">

                {/* Panel Soal: Overview */}
                <div className="p-4 border-gray-200 lg:border-r border-b lg:w-2/3">
                  <h3 className="mb-4 font-bold text-lg text-center">Daftar Soal</h3>
                  <div ref={questionsContainerRef} className="mb-4 max-h-[50vh] overflow-auto">
                    <div className="flex md:flex-row flex-col md:space-x-4">
                      {/* Kolom Kiri */}
                      <div className="flex-1 mb-4 md:mb-0">
                        {leftColumn.map((q, idx) => {
                          const globalIndex = idx;
                          const userAns = userAnswers[globalIndex];
                          const isActive = globalIndex === currentIndex;

                          // Warna preview hanya muncul saat selesai
                          const bgColor = isFinished
                            ? userAns
                              ? (userAns === q.answer ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300')
                              : 'bg-gray-50 border-gray-200'
                            : (isActive ? 'bg-yellow-100 border-yellow-400' : 'bg-gray-50 border-gray-200');

                          return (
                            <div
                              key={globalIndex}
                              ref={el => questionRefs.current[globalIndex] = el}
                              onClick={() => navigateToQuestion(globalIndex)}
                              className={`p-3 mb-2 rounded-md border transition-colors cursor-pointer ${bgColor} ${!isFinished ? 'hover:bg-blue-50' : ''}`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-sm md:text-base">{globalIndex + 1}. {q.left} - {q.right}</span>
                                {isFinished && userAns && (
                                  <span className={`font-bold ${userAns === q.answer ? 'text-green-600' : 'text-red-600'}`}>
                                    {userAns}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Kolom Kanan */}
                      <div className="flex-1">
                        {rightColumn.map((q, idx) => {
                          const globalIndex = idx + leftColumn.length;
                          const userAns = userAnswers[globalIndex];
                          const isActive = globalIndex === currentIndex;

                          const bgColor = isFinished
                            ? userAns
                              ? (userAns === q.answer ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300')
                              : 'bg-gray-50 border-gray-200'
                            : (isActive ? 'bg-yellow-100 border-yellow-400' : 'bg-gray-50 border-gray-200');

                          return (
                            <div
                              key={globalIndex}
                              ref={el => questionRefs.current[globalIndex] = el}
                              onClick={() => navigateToQuestion(globalIndex)}
                              className={`p-3 mb-2 rounded-md border transition-colors cursor-pointer ${bgColor} ${!isFinished ? 'hover:bg-blue-50' : ''}`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-sm md:text-base">{globalIndex + 1}. {q.left} - {q.right}</span>
                                {isFinished && userAns && (
                                  <span className={`font-bold ${userAns === q.answer ? 'text-green-600' : 'text-red-600'}`}>
                                    {userAns}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  
                  {isFinished && (
                    <div className="flex justify-center gap-4">
                      <button 
                        onClick={handleRestart}
                        className="flex items-center bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg text-white transition-colors duration-200"
                      >
                        <svg className="mr-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Kerjakan Tes Lagi
                      </button>
                      <button 
                        onClick={handleNewSession}
                        className="flex items-center bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg text-white transition-colors duration-200"
                      >
                        <svg className="mr-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Sesi Baru
                      </button>
                    </div>
                  )}
                </div>

                {/* Panel Jawaban */}
                <div className="bg-gray-50 mb-4 lg:mb-0 p-4 lg:w-1/3">
                  <h3 className="mb-4 font-bold text-lg lg:text-left text-center">Jawaban</h3>
                  {!isFinished ? (
                    <div className="mb-6 lg:text-left text-center">
                      <p className="mb-4 text-gray-600">Apakah kedua teks di samping SAMA atau TIDAK SAMA?</p>
                      <div className="flex flex-col gap-4 mb-6">
                        <button onClick={() => handleAnswer('S')} className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-md px-4 md:px-8 py-3 md:py-4 rounded-lg font-bold text-white text-lg md:text-xl hover:scale-105 transition-all transform">
                          S (Sama)
                        </button>
                        <button onClick={() => handleAnswer('T')} className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-md px-4 md:px-8 py-3 md:py-4 rounded-lg font-bold text-white text-lg md:text-xl hover:scale-105 transition-all transform">
                          T (Tidak Sama)
                        </button>
                      </div>
                      <div className="mt-6 text-gray-500 text-sm">
                        <p className="mb-2"><strong>Tip:</strong> Fokus pada setiap karakter termasuk huruf, angka, dan tanda baca.</p>
                        <p>Gunakan tombol S dan T dengan cepat untuk menghemat waktu.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 border border-green-200 rounded-lg text-center">
                      <h3 className="mb-4 font-bold text-green-800 text-xl md:text-2xl">Tes Selesai!</h3>
                      <div className="gap-4 grid grid-cols-2 mb-6">
                        <div className="bg-white shadow p-4 rounded-lg">
                          <div className="font-bold text-green-600 text-2xl md:text-3xl">{score.correct}</div>
                          <div className="text-gray-600 text-sm md:text-base">Jawaban Benar</div>
                        </div>
                        <div className="bg-white shadow p-4 rounded-lg">
                          <div className="font-bold text-red-600 text-2xl md:text-3xl">{score.wrong}</div>
                          <div className="text-gray-600 text-sm md:text-base">Jawaban Salah</div>
                        </div>
                      </div>
                      <div className="mb-4 text-gray-700">
                        <p className="flex items-center justify-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Total Waktu: {formatTime(timeElapsed)}
                        </p>
                        <p className="mt-2 font-bold">
                          Skor: {((score.correct / questions.length) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className={`text-lg font-semibold mt-4 ${
                        score.correct >= questions.length*0.8 ? 'text-green-600' :
                        score.correct >= questions.length*0.6 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {score.correct >= questions.length*0.8 ? 'Luar Biasa! 🎉' :
                         score.correct >= questions.length*0.6 ? 'Bagus! 👍' : 'Perlu lebih teliti'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Peringatan waktu sudah lama */}
      {testStarted && !isFinished && timeElapsed > 300 && (
        <div className="right-4 bottom-4 fixed bg-yellow-500 shadow-lg p-4 rounded-lg text-white animate-pulse">
          <div className="flex items-center font-semibold">
            <svg className="mr-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Waktu pengerjaan sudah 5 menit
          </div>
          <div className="mt-1 text-sm">Coba percepat tempo!</div>
        </div>
      )}
    </AuthenticatedLayout>
  );
}