import { useState, useRef, useEffect, useCallback } from "react";
import { Brush, Eraser, Minus, Circle, Square, RotateCcw, Download, Undo, Redo } from "lucide-react";
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function WarteggTest() {
    const [currentBox, setCurrentBox] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [drawing, setDrawing] = useState(false);
    const [context, setContext] = useState(null);
    const [svgError, setSvgError] = useState(Array(8).fill(false));

    // State untuk alat gambar
    const [currentTool, setCurrentTool] = useState("pencil");
    const [brushSize, setBrushSize] = useState(2);
    const [brushColor, setBrushColor] = useState("#000000");
    const [brushOpacity, setBrushOpacity] = useState(1);
    const [isShapeMode, setIsShapeMode] = useState(false);
    const [startPoint, setStartPoint] = useState(null);
    const [currentEndPoint, setCurrentEndPoint] = useState(null);
    
    // State untuk undo/redo
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const [boxes, setBoxes] = useState([
        { id: 1, drawing: "", story: "", completed: false },
        { id: 2, drawing: "", story: "", completed: false },
        { id: 3, drawing: "", story: "", completed: false },
        { id: 4, drawing: "", story: "", completed: false },
        { id: 5, drawing: "", story: "", completed: false },
        { id: 6, drawing: "", story: "", completed: false },
        { id: 7, drawing: "", story: "", completed: false },
        { id: 8, drawing: "", story: "", completed: false },
    ]);

    // Path ke SVG - menggunakan path absolut
    const boxSvgs = [
        "/wartegg_file/box1.svg",
        "/wartegg_file/box2.svg",
        "/wartegg_file/box3.svg",
        "/wartegg_file/box4.svg",
        "/wartegg_file/box5.svg",
        "/wartegg_file/box6.svg",
        "/wartegg_file/box7.svg",
        "/wartegg_file/box8.svg",
    ];

    // Alat gambar yang tersedia (dihapus circle outline)
    const tools = [
        { id: "pencil", icon: Brush, name: "Pensil" },
        { id: "line", icon: Minus, name: "Garis" },
        { id: "filledCircle", icon: Circle, name: "Lingkaran" },
        { id: "eraser", icon: Eraser, name: "Hapus" },
    ];

    // Fungsi untuk membuat SVG placeholder jika file tidak ditemukan
    const createPlaceholderSvg = (index) => {
        return `data:image/svg+xml;base64,${btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
                <rect width="100" height="100" fill="#f0f0f0" stroke="#ccc" stroke-width="2"/>
                <text x="50" y="50" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="14" fill="#666">Box ${index + 1}</text>
            </svg>
        `)}`;
    };

    // Setup canvas dengan properti yang sesuai
    const setupCanvas = () => {
        if (!context) return;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.lineWidth = brushSize;
        context.globalAlpha = brushOpacity;

        if (currentTool === "eraser") {
            context.globalCompositeOperation = "destination-out";
        } else {
            context.globalCompositeOperation = "source-over";
            context.strokeStyle = brushColor;
            context.fillStyle = brushColor;
        }
    };

    // Menyimpan state canvas ke history
    const saveToHistory = () => {
        if (!canvasRef.current) return;
        
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(canvasRef.current.toDataURL());
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    // Undo - kembali ke state sebelumnya
    const undo = () => {
        if (historyIndex <= 0) return;
        
        const prevIndex = historyIndex - 1;
        setHistoryIndex(prevIndex);
        
        const img = new Image();
        img.onload = () => {
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            context.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
        };
        img.src = history[prevIndex];
        setHasUnsavedChanges(true);
    };

    // Redo - kembali ke state setelahnya
    const redo = () => {
        if (historyIndex >= history.length - 1) return;
        
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        
        const img = new Image();
        img.onload = () => {
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            context.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
        };
        img.src = history[nextIndex];
        setHasUnsavedChanges(true);
    };

    // Fungsi untuk mendapatkan posisi mouse/touch yang diperbaiki
    const getMousePos = useCallback((e) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        // Calculate scale factors
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        // Get client coordinates
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        
        if (clientX === undefined || clientY === undefined) {
            return { x: 0, y: 0 };
        }
        
        // Return scaled coordinates
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }, []);

    // Resize canvas sesuai container dengan debounce
    const resizeCanvas = useCallback(() => {
        if (!canvasRef.current || !containerRef.current) return;
        const canvas = canvasRef.current;
        const parentWidth = containerRef.current.offsetWidth;
        const size = Math.min(parentWidth - 20, 400);

        if (canvas.width !== size || canvas.height !== size) {
            const currentDrawing = boxes[currentBox].drawing;
            canvas.width = size;
            canvas.height = size;

            const ctx = canvas.getContext("2d");
            setContext(ctx);

            if (currentDrawing) {
                const img = new Image();
                img.onload = () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                };
                img.src = currentDrawing;
            } else {
                // Coba load SVG, jika error gunakan placeholder
                const svg = new Image();
                svg.onload = () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(svg, 0, 0, canvas.width, canvas.height);
                };
                svg.onerror = () => {
                    // Jika SVG gagal dimuat, gunakan placeholder
                    const placeholder = new Image();
                    placeholder.onload = () => {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(placeholder, 0, 0, canvas.width, canvas.height);
                    };
                    placeholder.src = createPlaceholderSvg(currentBox);
                    
                    // Tandai bahwa SVG ini error
                    const newSvgError = [...svgError];
                    newSvgError[currentBox] = true;
                    setSvgError(newSvgError);
                };
                svg.src = boxSvgs[currentBox];
            }
            
            // Reset history untuk canvas ini
            setHistory([]);
            setHistoryIndex(-1);
        }
    }, [boxes, currentBox, svgError]);

    // Reset canvas ke state awal
    const resetCanvas = () => {
        if (context && canvasRef.current) {
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            
            // Coba load SVG, jika error gunakan placeholder
            const svg = new Image();
            svg.onload = () => {
                context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                context.drawImage(svg, 0, 0, canvasRef.current.width, canvasRef.current.height);
            };
            svg.onerror = () => {
                const placeholder = new Image();
                placeholder.onload = () => {
                    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    context.drawImage(placeholder, 0, 0, canvasRef.current.width, canvasRef.current.height);
                };
                placeholder.src = createPlaceholderSvg(currentBox);
            };
            svg.src = boxSvgs[currentBox];
            
            setHasUnsavedChanges(false);
            // Reset history
            setHistory([]);
            setHistoryIndex(-1);
        }
    };

    // Effect untuk resize canvas dengan debounce
    useEffect(() => {
        let resizeTimeout;
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(resizeCanvas, 100);
        };
        
        resizeCanvas();
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
            clearTimeout(resizeTimeout);
        };
    }, [resizeCanvas]);

    // Effect saat berpindah box
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
                // Coba load SVG, jika error gunakan placeholder
                const svg = new Image();
                svg.onload = () => {
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    context.drawImage(svg, 0, 0, canvas.width, canvas.height);
                };
                svg.onerror = () => {
                    const placeholder = new Image();
                    placeholder.onload = () => {
                        context.clearRect(0, 0, canvas.width, canvas.height);
                        context.drawImage(placeholder, 0, 0, canvas.width, canvas.height);
                    };
                    placeholder.src = createPlaceholderSvg(currentBox);
                    
                    // Tandai bahwa SVG ini error
                    const newSvgError = [...svgError];
                    newSvgError[currentBox] = true;
                    setSvgError(newSvgError);
                };
                svg.src = boxSvgs[currentBox];
            }

            setHasUnsavedChanges(false);
            setDrawing(false);
            setIsShapeMode(false);
            setStartPoint(null);
            setCurrentEndPoint(null);
            // Reset history untuk box ini
            setHistory([]);
            setHistoryIndex(-1);
        }
    }, [currentBox, boxes, context]);

    // Effect untuk setup canvas saat properti berubah
    useEffect(() => {
        setupCanvas();
    }, [context, currentTool, brushSize, brushColor, brushOpacity]);

    // Fungsi untuk menggambar preview shape
    const drawPreview = useCallback(() => {
        if (!context || !isShapeMode || !startPoint || !currentEndPoint) return;
        
        // Simpan state canvas saat ini
        context.save();
        
        // Clear canvas temporary
        const currentImage = new Image();
        currentImage.src = canvasRef.current.toDataURL();
        currentImage.onload = () => {
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            context.drawImage(currentImage, 0, 0);
            
            // Setup properties untuk preview
            setupCanvas();
            context.globalAlpha = 0.7; // Transparan untuk preview
            context.setLineDash([5, 5]); // Garis putus-putus untuk preview
            context.beginPath();
            
            switch (currentTool) {
                case "line":
                    context.moveTo(startPoint.x, startPoint.y);
                    context.lineTo(currentEndPoint.x, currentEndPoint.y);
                    context.stroke();
                    break;
                case "filledCircle":
                    const radius = Math.sqrt(
                        Math.pow(currentEndPoint.x - startPoint.x, 2) + 
                        Math.pow(currentEndPoint.y - startPoint.y, 2)
                    );
                    context.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
                    context.stroke();
                    break;
            }
            
            context.restore();
        };
    }, [context, isShapeMode, startPoint, currentEndPoint, currentTool]);

    // Effect untuk menggambar preview shape
    useEffect(() => {
        if (isShapeMode && startPoint && currentEndPoint) {
            requestAnimationFrame(drawPreview);
        }
    }, [isShapeMode, startPoint, currentEndPoint, drawPreview]);

    // Memulai menggambar
    const startDrawing = (e) => {
        if (!context) return;
        const pos = getMousePos(e);

        if (["line", "filledCircle"].includes(currentTool)) {
            setStartPoint(pos);
            setCurrentEndPoint(pos);
            setIsShapeMode(true);
        } else {
            setupCanvas();
            context.beginPath();
            context.moveTo(pos.x, pos.y);
            setDrawing(true);
        }
        setHasUnsavedChanges(true);
    };

    // Menggambar
    const draw = (e) => {
        if (!context) return;
        const pos = getMousePos(e);

        if (isShapeMode) {
            setCurrentEndPoint(pos);
            return;
        }
        
        if (!drawing) return;

        setupCanvas();
        if (currentTool === "pencil" || currentTool === "eraser") {
            context.lineTo(pos.x, pos.y);
            context.stroke();
        }
    };

    // Berhenti menggambar
    const stopDrawing = (e) => {
        if (!context) return;

        if (isShapeMode && startPoint) {
            const pos = getMousePos(e);
            drawShape(startPoint, pos);
            setIsShapeMode(false);
            setStartPoint(null);
            setCurrentEndPoint(null);
            saveToHistory();
        }

        if (drawing) {
            context.closePath();
            setDrawing(false);
            saveToHistory();
        }
    };

    // Menggambar bentuk
    const drawShape = (start, end) => {
        if (!context) return;
        
        // Clear canvas dan gambar ulang dari history
        const currentImage = new Image();
        currentImage.src = history[historyIndex] || canvasRef.current.toDataURL();
        
        currentImage.onload = () => {
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            context.drawImage(currentImage, 0, 0);
            
            setupCanvas();
            context.beginPath();

            switch (currentTool) {
                case "line":
                    context.moveTo(start.x, start.y);
                    context.lineTo(end.x, end.y);
                    context.stroke();
                    break;
                case "filledCircle":
                    const radius = Math.sqrt(
                        Math.pow(end.x - start.x, 2) + 
                        Math.pow(end.y - start.y, 2)
                    );
                    context.arc(start.x, start.y, radius, 0, 2 * Math.PI);
                    context.fill();
                    break;
            }
        };
    };

    // Menyimpan gambar
    const saveDrawing = () => {
        if (canvasRef.current && hasUnsavedChanges) {
            const updatedBoxes = [...boxes];
            updatedBoxes[currentBox].drawing = canvasRef.current.toDataURL();
            updatedBoxes[currentBox].completed = true;
            setBoxes(updatedBoxes);
            setHasUnsavedChanges(false);
        }
    };

    // Download canvas sebagai gambar
    const downloadCanvas = () => {
        if (canvasRef.current) {
            const link = document.createElement("a");
            link.download = `wartegg-box-${currentBox + 1}.png`;
            link.href = canvasRef.current.toDataURL();
            link.click();
        }
    };

    // Mengubah cerita gambar
    const handleStoryChange = (e) => {
        const updatedBoxes = [...boxes];
        updatedBoxes[currentBox].story = e.target.value;
        setBoxes(updatedBoxes);
    };

    // Navigasi ke box tertentu
    const navigateToBox = (index) => {
        if (hasUnsavedChanges) {
            saveDrawing();
        }
        setCurrentBox(index);
    };

    // Ke box berikutnya
    const nextBox = () => {
        if (currentBox < 7) {
            if (hasUnsavedChanges) saveDrawing();
            setCurrentBox(currentBox + 1);
        }
    };

    // Ke box sebelumnya
    const prevBox = () => {
        if (currentBox > 0) {
            if (hasUnsavedChanges) saveDrawing();
            setCurrentBox(currentBox - 1);
        }
    };

    // Menyelesaikan tes
    const finishTest = () => {
        if (hasUnsavedChanges) saveDrawing();
        const allCompleted = boxes.every((box) => box.completed);
        if (allCompleted) setIsFinished(true);
        else alert("Harap selesaikan semua gambar sebelum menyelesaikan tes.");
    };

    // Mereset gambar di box saat ini
    const resetDrawing = () => {
        if (context && canvasRef.current) {
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            
            // Coba load SVG, jika error gunakan placeholder
            const svg = new Image();
            svg.onload = () => {
                context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                context.drawImage(svg, 0, 0, canvasRef.current.width, canvasRef.current.height);
            };
            svg.onerror = () => {
                const placeholder = new Image();
                placeholder.onload = () => {
                    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    context.drawImage(placeholder, 0, 0, canvasRef.current.width, canvasRef.current.height);
                };
                placeholder.src = createPlaceholderSvg(currentBox);
            };
            svg.src = boxSvgs[currentBox];
            
            const updatedBoxes = [...boxes];
            updatedBoxes[currentBox].drawing = "";
            updatedBoxes[currentBox].completed = false;
            updatedBoxes[currentBox].story = "";
            setBoxes(updatedBoxes);
            setHasUnsavedChanges(false);
            // Reset history
            setHistory([]);
            setHistoryIndex(-1);
        }
    };

    // Render box individual
    const renderBox = (boxNumber) => {
        const index = boxNumber - 1;
        const isCurrent = currentBox === index;

        return (
            <div
                key={boxNumber}
                className={`relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 border-2 flex items-center justify-center
                    ${isCurrent ? "border-4 border-blue-500" : "border-gray-800"}
                    ${boxes[index].completed ? "bg-green-100" : "bg-white"}
                    cursor-pointer transition-all duration-200 hover:scale-105`}
                onClick={() => navigateToBox(index)}
            >
                {svgError[index] ? (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-100 text-gray-500 text-xs text-center">
                        Box {boxNumber}
                    </div>
                ) : (
                    <img 
                        src={boxSvgs[index]} 
                        alt={`Box ${boxNumber}`} 
                        className="w-10 h-10 sm:w-12 sm:h-12"
                        onError={(e) => {
                            // Jika gambar gagal dimuat, gunakan placeholder
                            e.target.style.display = 'none';
                            const newSvgError = [...svgError];
                            newSvgError[index] = true;
                            setSvgError(newSvgError);
                        }}
                    />
                )}
                {boxes[index].completed && (
                    <span className="absolute bottom-1 right-1 text-green-600 text-xs font-bold">
                        ✔
                    </span>
                )}
                {isCurrent && (
                    <span className="absolute top-1 right-1 text-blue-500 text-xs font-bold">•</span>
                )}
            </div>
        );
    };

    // Render komponen dengan AuthenticatedLayout
    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold">Tes Wartegg</h2>}>
            <div className="min-h-screen bg-gray-100 py-4">
                <div className="container mx-auto px-2 sm:px-4">
                    <div className="bg-white border border-gray-300 p-3 sm:p-6 rounded-lg shadow-md">
                        <h1 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6">TEST WARTEGG</h1>

                        {/* Informasi jika SVG tidak ditemukan */}
                        {svgError.some(error => error) && (
                            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 mb-3 sm:p-4 sm:mb-4 text-sm sm:text-base" role="alert">
                                <p className="font-bold">Perhatian</p>
                                <p>Beberapa gambar SVG tidak dapat dimuat. Aplikasi menggunakan placeholder sebagai pengganti.</p>
                            </div>
                        )}

                        {/* Grid box */}
                        <div className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8 justify-center">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(renderBox)}
                        </div>

                        {/* Canvas + Story */}
                        {!isFinished && (
                            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8">
                                <div ref={containerRef} className="flex-1">
                                    <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2 sm:mb-3 md:mb-4 text-center">
                                        Gambar pada Kotak {currentBox + 1}
                                    </h3>
                                    <div className="border-2 border-gray-300 rounded-lg p-2 sm:p-3 md:p-4 bg-white">
                                        <canvas
                                            ref={canvasRef}
                                            onMouseDown={startDrawing}
                                            onMouseMove={draw}
                                            onMouseUp={stopDrawing}
                                            onMouseLeave={stopDrawing}
                                            onTouchStart={(e) => {
                                                e.preventDefault();
                                                startDrawing(e);
                                            }}
                                            onTouchMove={(e) => {
                                                e.preventDefault();
                                                draw(e);
                                            }}
                                            onTouchEnd={stopDrawing}
                                            className="border border-gray-300 cursor-crosshair w-full h-auto mx-auto"
                                            style={{
                                                touchAction: "none",
                                                maxWidth: "100%",
                                                aspectRatio: "1/1",
                                                cursor: currentTool === "eraser" ? "crosshair" : "default",
                                            }}
                                        />
                                        
                                        {/* Toolbar alat gambar */}
                                        <div className="mt-3 flex flex-wrap justify-center gap-2 mb-3">
                                            {tools.map((tool) => (
                                                <button
                                                    key={tool.id}
                                                    onClick={() => setCurrentTool(tool.id)}
                                                    className={`p-2 rounded-md flex items-center gap-1 text-xs
                                                        ${currentTool === tool.id 
                                                            ? "bg-blue-500 text-white" 
                                                            : "bg-gray-200 text-gray-800"}`}
                                                    title={tool.name}
                                                >
                                                    <tool.icon size={14} />
                                                    <span className="hidden sm:inline">{tool.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                        
                                        {/* Toolbar aksi */}
                                        <div className="flex flex-wrap justify-center gap-2">
                                            <button
                                                onClick={undo}
                                                disabled={historyIndex <= 0}
                                                className="px-2 sm:px-3 py-1 sm:py-2 bg-gray-500 text-white rounded-md text-xs sm:text-sm flex items-center gap-1 disabled:opacity-50"
                                                title="Undo"
                                            >
                                                <Undo size={14} />
                                                <span className="hidden sm:inline">Undo</span>
                                            </button>
                                            <button
                                                onClick={redo}
                                                disabled={historyIndex >= history.length - 1}
                                                className="px-2 sm:px-3 py-1 sm:py-2 bg-gray-500 text-white rounded-md text-xs sm:text-sm flex items-center gap-1 disabled:opacity-50"
                                                title="Redo"
                                            >
                                                <Redo size={14} />
                                                <span className="hidden sm:inline">Redo</span>
                                            </button>
                                            <button
                                                onClick={resetDrawing}
                                                className="px-2 sm:px-3 py-1 sm:py-2 bg-red-500 text-white rounded-md text-xs sm:text-sm flex items-center gap-1"
                                            >
                                                <RotateCcw size={14} />
                                                <span className="hidden sm:inline">Reset</span>
                                            </button>
                                            <button
                                                onClick={saveDrawing}
                                                disabled={!hasUnsavedChanges}
                                                className="px-2 sm:px-3 py-1 sm:py-2 bg-blue-600 text-white rounded-md text-xs sm:text-sm disabled:opacity-50"
                                            >
                                                Simpan
                                            </button>
                                            {/* <button
                                                onClick={downloadCanvas}
                                                className="px-2 sm:px-3 py-1 sm:py-2 bg-green-500 text-white rounded-md text-xs sm:text-sm flex items-center gap-1"
                                            >
                                                <Download size={14} />
                                                <span className="hidden sm:inline">Download</span>
                                            </button> */}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2 sm:mb-3 md:mb-4 text-center">
                                        Cerita Gambar
                                    </h3>
                                    <textarea
                                        value={boxes[currentBox].story}
                                        onChange={handleStoryChange}
                                        placeholder="Tuliskan cerita tentang gambar yang Anda buat..."
                                        className="w-full h-40 sm:h-48 md:h-64 p-2 sm:p-3 md:p-4 border border-gray-300 rounded-lg resize-none text-xs sm:text-sm md:text-base"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Navigation */}
                        {!isFinished && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                                <button
                                    onClick={prevBox}
                                    disabled={currentBox === 0}
                                    className="px-3 sm:px-4 md:px-6 py-1 sm:py-2 bg-gray-500 text-white rounded-md disabled:opacity-50 text-xs sm:text-sm md:text-base w-full sm:w-auto"
                                >
                                    ← Sebelumnya
                                </button>
                                <div className="flex flex-wrap justify-center gap-1 sm:gap-2 order-first sm:order-none mb-2 sm:mb-0">
                                    {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
                                        <button
                                            key={index}
                                            onClick={() => navigateToBox(index)}
                                            className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm
                                                ${currentBox === index
                                                    ? "bg-blue-500 text-white"
                                                    : boxes[index].completed
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-gray-200 text-gray-800"}`}
                                        >
                                            {index + 1}
                                        </button>
                                    ))}
                                </div>
                                {currentBox < 7 ? (
                                    <button
                                        onClick={nextBox}
                                        className="px-3 sm:px-4 md:px-6 py-1 sm:py-2 bg-blue-600 text-white rounded-md text-xs sm:text-sm md:text-base w-full sm:w-auto"
                                    >
                                        Berikutnya →
                                    </button>
                                ) : (
                                    <button
                                        onClick={finishTest}
                                        className="px-3 sm:px-4 md:px-6 py-1 sm:py-2 bg-green-600 text-white rounded-md text-xs sm:text-sm md:text-base w-full sm:w-auto"
                                    >
                                        Selesaikan Tes
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}