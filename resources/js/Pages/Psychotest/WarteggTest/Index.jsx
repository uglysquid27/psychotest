import { useState, useRef, useEffect } from "react";
import { useForm } from "@inertiajs/react";
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function WarteggTest() {
    const [currentBox, setCurrentBox] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [drawing, setDrawing] = useState(false);
    const [context, setContext] = useState(null);

    const [boxes, setBoxes] = useState([
        { id: 1, drawing: '', story: '', completed: false },
        { id: 2, drawing: '', story: '', completed: false },
        { id: 3, drawing: '', story: '', completed: false },
        { id: 4, drawing: '', story: '', completed: false },
        { id: 5, drawing: '', story: '', completed: false },
        { id: 6, drawing: '', story: '', completed: false },
        { id: 7, drawing: '', story: '', completed: false },
        { id: 8, drawing: '', story: '', completed: false },
    ]);

    const { data, setData, post, errors } = useForm({
        drawings: boxes,
        completed_at: null,
    });

    const symbols = ["●", "⌒", "〓", "◻", "⌓", "| |", "⋰", "◠"];

    const drawSymbol = (ctx, symbol) => {
        ctx.font = `${ctx.canvas.width / 6}px Arial`;
        ctx.fillStyle = "black";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(symbol, ctx.canvas.width / 2, ctx.canvas.height / 2);
    };

    const resizeCanvas = () => {
        if (!canvasRef.current || !containerRef.current) return;
        const canvas = canvasRef.current;
        const parentWidth = containerRef.current.offsetWidth;
        const size = Math.min(parentWidth - 20, 400);
        
        // Only resize if dimensions actually changed
        if (canvas.width !== size || canvas.height !== size) {
            const currentDrawing = boxes[currentBox].drawing;
            canvas.width = size;
            canvas.height = size;
            
            // Reinitialize context after resize
            const ctx = canvas.getContext('2d');
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#000000';
            setContext(ctx);
            
            // Redraw content
            if (currentDrawing) {
                const img = new Image();
                img.onload = () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                };
                img.src = currentDrawing;
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                drawSymbol(ctx, symbols[currentBox]);
            }
        }
    };

    const resetCanvas = () => {
        if (context && canvasRef.current) {
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            drawSymbol(context, symbols[currentBox]);
            setHasUnsavedChanges(false);
        }
    };

    useEffect(() => {
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);
        return () => window.removeEventListener("resize", resizeCanvas);
    }, []);

    // Effect untuk menangani perubahan box
    useEffect(() => {
        if (context && canvasRef.current) {
            const canvas = canvasRef.current;
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            if (boxes[currentBox].drawing) {
                const img = new Image();
                img.onload = () => {
                    context.drawImage(img, 0, 0, canvas.width, canvas.height);
                };
                img.src = boxes[currentBox].drawing;
            } else {
                drawSymbol(context, symbols[currentBox]);
            }
            
            // Reset drawing state saat pindah box
            setHasUnsavedChanges(false);
            setDrawing(false);
        }
    }, [currentBox, boxes]);

    const startDrawing = (e) => {
        if (!context) return;
        const rect = canvasRef.current.getBoundingClientRect();
        context.beginPath();
        context.moveTo(
            (e.clientX || e.touches[0].clientX) - rect.left,
            (e.clientY || e.touches[0].clientY) - rect.top
        );
        setDrawing(true);
        setHasUnsavedChanges(true);
    };

    const draw = (e) => {
        if (!drawing || !context) return;
        const rect = canvasRef.current.getBoundingClientRect();
        context.lineTo(
            (e.clientX || e.touches[0].clientX) - rect.left,
            (e.clientY || e.touches[0].clientY) - rect.top
        );
        context.stroke();
    };

    const stopDrawing = () => {
        if (!context) return;
        context.closePath();
        setDrawing(false);
    };

    const saveDrawing = () => {
        if (canvasRef.current && hasUnsavedChanges) {
            const updatedBoxes = [...boxes];
            updatedBoxes[currentBox].drawing = canvasRef.current.toDataURL();
            updatedBoxes[currentBox].completed = true;
            setBoxes(updatedBoxes);
            setHasUnsavedChanges(false);
        }
    };

    const handleStoryChange = (e) => {
        const updatedBoxes = [...boxes];
        updatedBoxes[currentBox].story = e.target.value;
        setBoxes(updatedBoxes);
    };

    const navigateToBox = (index) => {
        // Jika ada perubahan yang belum disimpan di box saat ini, simpan dulu
        if (hasUnsavedChanges) {
            saveDrawing();
        }
        
        // Pindah ke box yang dipilih
        setCurrentBox(index);
    };

    const nextBox = () => {
        if (currentBox < 7) {
            // Save current drawing if any
            if (hasUnsavedChanges) {
                saveDrawing();
            }
            
            // Move to next box
            setCurrentBox(currentBox + 1);
        }
    };

    const prevBox = () => {
        if (currentBox > 0) {
            // Save current drawing if any
            if (hasUnsavedChanges) {
                saveDrawing();
            }
            
            // Move to previous box
            setCurrentBox(currentBox - 1);
        }
    };

    const finishTest = () => {
        // Save current drawing if any
        if (hasUnsavedChanges) {
            saveDrawing();
        }
        
        // Check if all boxes are completed
        const allCompleted = boxes.every(box => box.completed);
        if (allCompleted) {
            setIsFinished(true);
        } else {
            alert('Harap selesaikan semua gambar sebelum menyelesaikan tes.');
        }
    };

    const confirmSubmit = () => {
        setData({
            drawings: boxes,
            completed_at: new Date().toISOString(),
        });
        post(route('wartegg-test.store'));
    };

    const resetDrawing = () => {
        if (context && canvasRef.current) {
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            drawSymbol(context, symbols[currentBox]);
            const updatedBoxes = [...boxes];
            updatedBoxes[currentBox].drawing = '';
            updatedBoxes[currentBox].completed = false;
            updatedBoxes[currentBox].story = '';
            setBoxes(updatedBoxes);
            setHasUnsavedChanges(false);
        }
    };

    const renderBox = (boxNumber) => {
        const index = boxNumber - 1;
        const isCurrent = currentBox === index;

        return (
            <div
                key={boxNumber}
                className={`relative w-20 h-20 sm:w-24 sm:h-24 border-2 flex items-center justify-center text-2xl sm:text-3xl
                    ${isCurrent ? 'border-4 border-blue-500' : 'border-gray-800'}
                    ${boxes[index].completed ? 'bg-green-100' : 'bg-white'}
                    cursor-pointer transition-all duration-200 hover:scale-105`}
                onClick={() => navigateToBox(index)}
            >
                {symbols[index]}
                {boxes[index].completed && (
                    <span className="absolute bottom-1 right-1 text-green-600 text-xs font-bold">✔</span>
                )}
                {isCurrent && (
                    <span className="absolute top-1 right-1 text-blue-500 text-xs font-bold">•</span>
                )}
            </div>
        );
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-gray-800 dark:text-gray-200 text-xl leading-tight">Tes Wartegg</h2>}
        >
            <div className="min-h-screen bg-gray-100 py-4">
                <div className="container mx-auto px-4">
                    <div className="bg-white border border-gray-300 p-4 sm:p-6 rounded-lg shadow-md">

                        {/* Grid box */}
                        <div className="grid grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8 justify-center">
                            {[1,2,3,4,5,6,7,8].map(renderBox)}
                        </div>

                        {/* Progress indicator */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium">Progress: {boxes.filter(b => b.completed).length} dari 8</span>
                                <span className="text-sm font-medium">Kotak {currentBox + 1} dari 8</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                    className="bg-blue-600 h-2.5 rounded-full" 
                                    style={{ width: `${(boxes.filter(b => b.completed).length / 8) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Canvas + Story */}
                        {!isFinished && (
                            <div className="flex flex-col md:flex-row gap-6 sm:gap-8 mb-8">
                                <div ref={containerRef} className="flex-1">
                                    <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-center">
                                        Gambar pada Kotak {currentBox + 1} - {symbols[currentBox]}
                                    </h3>
                                    <div className="border-2 border-gray-300 rounded-lg p-3 sm:p-4 bg-white">
                                        <canvas
                                            ref={canvasRef}
                                            onMouseDown={startDrawing}
                                            onMouseMove={draw}
                                            onMouseUp={stopDrawing}
                                            onMouseLeave={stopDrawing}
                                            onTouchStart={(e) => { e.preventDefault(); startDrawing(e); }}
                                            onTouchMove={(e) => { e.preventDefault(); draw(e); }}
                                            onTouchEnd={stopDrawing}
                                            className="border border-gray-300 cursor-crosshair w-full h-auto mx-auto"
                                            style={{ touchAction: 'none', maxWidth: "100%", aspectRatio: "1/1" }}
                                        />
                                        <div className="mt-3 flex justify-center gap-2">
                                            <button onClick={resetDrawing} className="px-3 py-2 bg-red-500 text-white rounded-md text-sm">
                                                Hapus
                                            </button>
                                            <button 
                                                onClick={saveDrawing} 
                                                disabled={!hasUnsavedChanges}
                                                className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm disabled:opacity-50"
                                            >
                                                Simpan
                                            </button>
                                        </div>
                                        {boxes[currentBox].completed && !hasUnsavedChanges && (
                                            <p className="text-green-600 text-sm mt-2 text-center">✔ Gambar tersimpan</p>
                                        )}
                                        {hasUnsavedChanges && (
                                            <p className="text-yellow-600 text-sm mt-2 text-center">⚠ Perubahan belum disimpan</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-center">Cerita Gambar</h3>
                                    <textarea
                                        value={boxes[currentBox].story}
                                        onChange={handleStoryChange}
                                        placeholder="Tuliskan cerita tentang gambar yang Anda buat..."
                                        className="w-full h-48 sm:h-64 p-3 sm:p-4 border border-gray-300 rounded-lg resize-none text-sm sm:text-base"
                                    />
                                    <p className="text-gray-500 text-xs mt-1">Cerita akan otomatis tersimpan saat Anda mengetik</p>
                                </div>
                            </div>
                        )}

                        {/* PREVIEW MODE */}
                        {isFinished && (
                            <div className="mb-8">
                                <h3 className="text-lg sm:text-xl font-bold mb-4 text-center">Preview Hasil Wartegg</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {boxes.map((box, i) => (
                                        <div key={i} className="border rounded-lg p-2 flex flex-col bg-gray-50">
                                            <div className="text-center text-2xl mb-1">{symbols[i]}</div>
                                            {box.drawing ? (
                                                <img src={box.drawing} alt={`Box ${i+1}`} className="w-full h-32 object-contain border rounded"/>
                                            ) : (
                                                <div className="w-full h-32 flex items-center justify-center text-gray-400 border rounded">(Kosong)</div>
                                            )}
                                            <p className="mt-2 text-sm text-gray-700">{box.story || "(Tidak ada cerita)"}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-center mt-6 gap-4">
                                    <button 
                                        onClick={() => setIsFinished(false)} 
                                        className="px-6 py-3 bg-gray-500 text-white rounded-lg shadow"
                                    >
                                        Kembali Edit
                                    </button>
                                    <button 
                                        onClick={confirmSubmit} 
                                        className="px-6 py-3 bg-green-600 text-white rounded-lg shadow"
                                    >
                                        Konfirmasi & Kirim
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Navigation */}
                        {!isFinished && (
                            <div className="flex justify-between">
                                <button
                                    onClick={prevBox}
                                    disabled={currentBox === 0}
                                    className="px-4 sm:px-6 py-2 bg-gray-500 text-white rounded-md disabled:opacity-50 text-sm sm:text-base"
                                >
                                    ← Sebelumnya
                                </button>
                                <div className="flex gap-2">
                                    {[0,1,2,3,4,5,6,7].map(index => (
                                        <button
                                            key={index}
                                            onClick={() => navigateToBox(index)}
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm
                                                ${currentBox === index ? 'bg-blue-500 text-white' : 
                                                  boxes[index].completed ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'}`}
                                        >
                                            {index+1}
                                        </button>
                                    ))}
                                </div>
                                {currentBox < 7 ? (
                                    <button
                                        onClick={nextBox}
                                        className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-md text-sm sm:text-base"
                                    >
                                        Berikutnya →
                                    </button>
                                ) : (
                                    <button
                                        onClick={finishTest}
                                        className="px-4 sm:px-6 py-2 bg-green-600 text-white rounded-md text-sm sm:text-base"
                                    >
                                        Selesaikan Tes
                                    </button>
                                )}
                            </div>
                        )}

                        {errors.drawings && (
                            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm sm:text-base">
                                {errors.drawings}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}