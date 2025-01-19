"use client";
import React, { useRef, useState, useEffect } from "react";

interface Position {
    x: number;
    y: number;
    size: number;
}

interface ImageDimensions {
    width: number;
    height: number;
}

const TouchMaskDrawer = () => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [masks, setMasks] = useState<Position[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushSize, setBrushSize] = useState(20);
    const [isEraser, setIsEraser] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [imageUrl, setImageUrl] = useState("https://picsum.photos/800/600");
    const [imageDimensions, setImageDimensions] = useState<ImageDimensions>({
        width: 0,
        height: 0,
    });

    useEffect(() => {
        const handleImageLoad = () => {
            if (imageRef.current && containerRef.current) {
                const { naturalWidth, naturalHeight } = imageRef.current;
                const aspectRatio = naturalWidth / naturalHeight;
                const containerWidth = containerRef.current.clientWidth;
                const containerHeight = containerWidth / aspectRatio;

                setImageDimensions({
                    width: containerWidth,
                    height: containerHeight,
                });
            }
        };

        window.addEventListener("resize", handleImageLoad);
        if (imageRef.current && imageRef.current.complete) {
            handleImageLoad();
        }

        return () => window.removeEventListener("resize", handleImageLoad);
    }, []);

    const handleFileUpload = (file: File) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageUrl(reader.result as string);
                setMasks([]); // Clear existing masks
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        handleFileUpload(file);
    };

    const getPosition = (event: React.TouchEvent | React.MouseEvent): Position | null => {
        if (!containerRef.current) return null;

        const rect = containerRef.current.getBoundingClientRect();
        let clientX: number, clientY: number;

        if ('touches' in event) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
            size: brushSize,
        };
    };

    const startDrawing = (event: React.TouchEvent | React.MouseEvent) => {
        event.preventDefault();
        const position = getPosition(event);
        if (position) {
            setIsDrawing(true);
            if (!isEraser) {
                setMasks((prev) => [...prev, position]);
            } else {
                removeMasksNear(position);
            }
        }
    };

    const draw = (event: React.TouchEvent | React.MouseEvent) => {
        event.preventDefault();
        if (!isDrawing) return;

        const position = getPosition(event);
        if (position) {
            if (!isEraser) {
                setMasks((prev) => [...prev, position]);
            } else {
                removeMasksNear(position);
            }
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const removeMasksNear = (position: Position) => {
        setMasks((prev) =>
            prev.filter((mask) => {
                const distance = Math.sqrt(
                    Math.pow(mask.x - position.x, 2) + Math.pow(mask.y - position.y, 2)
                );
                const maxSize = Math.max(mask.size, position.size);
                return distance > maxSize / 2;
            })
        );
    };

    const clearMasks = () => {
        setMasks([]);
    };

    const exportMask = () => {
        if (!imageDimensions.width || !imageDimensions.height || !imageRef.current)
            return;

        const canvas = document.createElement("canvas");
        const { naturalWidth, naturalHeight } = imageRef.current;
        canvas.width = naturalWidth;
        canvas.height = naturalHeight;
        const ctx = canvas.getContext("2d");

        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const scaleX = naturalWidth / imageDimensions.width;
            const scaleY = naturalHeight / imageDimensions.height;

            ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
            masks.forEach((pos) => {
                const scaledX = pos.x * scaleX;
                const scaledY = pos.y * scaleY;
                const scaledSize = pos.size * scaleX;

                ctx.beginPath();
                ctx.arc(scaledX, scaledY, scaledSize / 2, 0, Math.PI * 2);
                ctx.fill();
            });

            try {
                canvas.toBlob((blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = "mask.png";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                    }
                }, "image/png");
            } catch (error) {
                console.error("Error exporting mask:", error);
            }
        }
    };

    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        if (imageRef.current && containerRef.current) {
            const { naturalWidth, naturalHeight } = imageRef.current;
            const aspectRatio = naturalWidth / naturalHeight;
            const containerWidth = containerRef.current.clientWidth;
            setImageDimensions({
                width: containerWidth,
                height: containerWidth / aspectRatio,
            });
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-white mb-2">Image Mask Editor</h1>
                    <p className="text-gray-400">Draw or erase areas to create your mask</p>
                </div>

                <div className="bg-gray-800 rounded-2xl shadow-xl p-6 space-y-6">
                    {/* Upload Section */}
                    <div className="flex justify-center">
                        <div
                            className={`relative w-full max-w-xl mx-auto rounded-lg border-2 border-dashed p-4 transition-colors ${
                                isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'
                            }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileUpload(file);
                                }}
                            />
                            <div className="text-center cursor-pointer">
                                <svg
                                    className="mx-auto h-12 w-12 text-gray-400"
                                    stroke="currentColor"
                                    fill="none"
                                    viewBox="0 0 48 48"
                                >
                                    <path
                                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4-4m4-24h8m-4-4v8m-12 4h.02"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                                <p className="mt-1 text-sm text-gray-400">Drop an image here or click to upload</p>
                                <p className="mt-1 text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                            </div>
                        </div>
                    </div>

                    {/* Drawing Area */}
                    <div
                        ref={containerRef}
                        className="relative w-full max-w-xl mx-auto bg-gray-700 rounded-lg overflow-hidden touch-none shadow-inner"
                        style={{ height: imageDimensions.height }}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                    >
                        <img
                            ref={imageRef}
                            src={imageUrl}
                            alt="Source"
                            className="absolute top-0 left-0 w-full h-full object-cover"
                            onLoad={handleImageLoad}
                        />

                        {masks.map((position, index) => (
                            <div
                                key={index}
                                className="absolute rounded-full bg-red-500 opacity-50"
                                style={{
                                    left: position.x - position.size / 2,
                                    top: position.y - position.size / 2,
                                    width: position.size,
                                    height: position.size,
                                }}
                            />
                        ))}
                    </div>

                    {/* Controls */}
                    <div className="bg-gray-700 rounded-xl p-4 shadow-inner">
                        <div className="flex gap-4 items-center flex-wrap justify-center">
                            <div className="flex gap-2 bg-gray-800 rounded-lg p-1 shadow-sm">
                                <button
                                    className={`p-2 rounded-md flex items-center justify-center w-10 h-10 transition-all duration-200 ${
                                        !isEraser
                                            ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-400"
                                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                    }`}
                                    onClick={() => setIsEraser(false)}
                                    title="Pencil"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                                <button
                                    className={`p-2 rounded-md flex items-center justify-center w-10 h-10 transition-all duration-200 ${
                                        isEraser
                                            ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-400"
                                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                    }`}
                                    onClick={() => setIsEraser(true)}
                                    title="Eraser"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="flex flex-col items-center gap-1 min-w-[160px]">
                                <label className="text-sm text-gray-300 font-medium">Brush Size</label>
                                <input
                                    type="range"
                                    min="5"
                                    max="50"
                                    value={brushSize}
                                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                                <span className="text-xs text-gray-400">{brushSize}px</span>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm hover:shadow-md w-10 h-10 flex items-center justify-center"
                                    onClick={exportMask}
                                    title="Export Mask"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </button>
                                <button
                                    className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm hover:shadow-md w-10 h-10 flex items-center justify-center"
                                    onClick={clearMasks}
                                    title="Clear All"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TouchMaskDrawer;