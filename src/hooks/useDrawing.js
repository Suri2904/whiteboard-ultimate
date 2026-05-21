import { useRef, useState, useCallback } from 'react';

export const useDrawing = (pageSize = 'a4', pageOrientation = 'landscape') => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState('pen'); // pen, fountain, highlighter, eraser, lasso, hand
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentSize, setCurrentSize] = useState(2); // 1=S, 2=M, 4=L
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [background, setBackground] = useState('plain'); // plain, ruled, grid, dots
  const [allStrokes, setAllStrokes] = useState([]); // All strokes for this page
  const lastPointRef = useRef(null);
  const strokePathRef = useRef([]);
  const currentStrokeRef = useRef(null);

  const getPageDimensions = useCallback(() => {
    // A4: 210mm x 297mm = 794px x 1123px at 96 DPI
    // A3: 297mm x 420mm = 1123px x 1587px at 96 DPI
    const sizes = {
      a4: { width: 794, height: 1123 },
      a3: { width: 1123, height: 1587 }
    };

    const dims = sizes[pageSize];
    return pageOrientation === 'landscape'
      ? { width: dims.height, height: dims.width }
      : dims;
  }, [pageSize, pageOrientation]);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const pageDims = getPageDimensions();

    // Calculate scale to fit page in viewport
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const scaleX = containerWidth / pageDims.width;
    const scaleY = containerHeight / pageDims.height;
    const scale = Math.min(scaleX, scaleY, 0.9); // Max 90% of viewport

    const displayWidth = pageDims.width * scale;
    const displayHeight = pageDims.height * scale;

    canvas.width = pageDims.width * dpr;
    canvas.height = pageDims.height * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    contextRef.current = ctx;

    // Draw background
    drawBackground(ctx, pageDims.width, pageDims.height);

    // Save initial state
    saveToHistory();
  }, [background, pageSize, pageOrientation]);

  const drawBackground = (ctx, width, height) => {
    // Fill white
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    if (background === 'ruled') {
      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 1;
      const lineSpacing = 40;
      for (let y = lineSpacing; y < height; y += lineSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else if (background === 'grid') {
      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = gridSize; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = gridSize; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else if (background === 'dots') {
      ctx.fillStyle = '#CCCCCC';
      const dotSpacing = 30;
      const dotRadius = 1.5;
      for (let x = dotSpacing; x < width; x += dotSpacing) {
        for (let y = dotSpacing; y < height; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  };

  const getPointerPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Get the actual canvas dimensions (not display dimensions)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const dpr = window.devicePixelRatio || 1;

    return {
      x: (e.clientX - rect.left) * (scaleX / dpr),
      y: (e.clientY - rect.top) * (scaleY / dpr),
      pressure: e.pressure || 0.5
    };
  };

  const startDrawing = useCallback((e) => {
    if (currentTool === 'hand') return;
    if (e.pointerType === 'touch' && e.touches?.length > 1) return; // Ignore multi-touch

    const ctx = contextRef.current;
    if (!ctx) return;

    const pos = getPointerPos(e);
    setIsDrawing(true);
    lastPointRef.current = pos;
    strokePathRef.current = [pos];

    // Initialize current stroke data
    currentStrokeRef.current = {
      tool: currentTool,
      color: currentColor,
      size: currentSize,
      points: [pos]
    };

    // Set tool properties
    if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = currentSize * 4;
    } else if (currentTool === 'highlighter') {
      ctx.globalCompositeOperation = 'multiply';
      ctx.strokeStyle = currentColor;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = currentSize * 3;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = currentSize * (1 + pos.pressure);
    }

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }, [currentTool, currentColor, currentSize]);

  const draw = useCallback((e) => {
    if (!isDrawing || currentTool === 'hand') return;

    const ctx = contextRef.current;
    const pos = getPointerPos(e);
    const lastPoint = lastPointRef.current;

    if (!lastPoint) return;

    strokePathRef.current.push(pos);

    // Add point to current stroke
    if (currentStrokeRef.current) {
      currentStrokeRef.current.points.push(pos);
    }

    // Fountain pen: taper the stroke
    if (currentTool === 'fountain') {
      const speed = Math.sqrt(
        Math.pow(pos.x - lastPoint.x, 2) + Math.pow(pos.y - lastPoint.y, 2)
      );
      const dynamicWidth = Math.max(currentSize * 0.5, currentSize * (1 + pos.pressure) - speed * 0.1);
      ctx.lineWidth = dynamicWidth;
    } else if (currentTool === 'pen') {
      ctx.lineWidth = currentSize * (1 + pos.pressure);
    }

    // Smooth bezier curve
    const midX = (lastPoint.x + pos.x) / 2;
    const midY = (lastPoint.y + pos.y) / 2;
    ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midX, midY);
    ctx.stroke();

    lastPointRef.current = pos;
  }, [isDrawing, currentTool, currentSize]);

  const stopDrawing = useCallback(() => {
    if (isDrawing) {
      const ctx = contextRef.current;
      ctx.closePath();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;

      // Save completed stroke
      if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0) {
        setAllStrokes(prev => [...prev, currentStrokeRef.current]);
      }

      setIsDrawing(false);
      lastPointRef.current = null;
      strokePathRef.current = [];
      currentStrokeRef.current = null;

      saveToHistory();
    }
  }, [isDrawing]);

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataURL = canvas.toDataURL('image/png');

    setHistory(prev => {
      const newHistory = prev.slice(0, historyStep + 1);
      newHistory.push(dataURL);
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });

    setHistoryStep(prev => Math.min(prev + 1, 49));
  }, [historyStep]);

  const undo = useCallback(() => {
    if (historyStep > 0) {
      const newStep = historyStep - 1;
      restoreFromHistory(newStep);
      setHistoryStep(newStep);
    }
  }, [historyStep]);

  const redo = useCallback(() => {
    if (historyStep < history.length - 1) {
      const newStep = historyStep + 1;
      restoreFromHistory(newStep);
      setHistoryStep(newStep);
    }
  }, [historyStep, history]);

  const restoreFromHistory = (step) => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = history[step];
  };

  const clearCanvas = useCallback(() => {
    const ctx = contextRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    const pageDims = getPageDimensions();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(ctx, pageDims.width, pageDims.height);
    setAllStrokes([]);
    saveToHistory();
  }, [background, getPageDimensions]);

  const getCanvasDataURL = useCallback(() => {
    return canvasRef.current?.toDataURL('image/png');
  }, []);

  const getDrawingData = useCallback(() => {
    return {
      strokes: allStrokes,
      background: background,
      imageData: getCanvasDataURL()
    };
  }, [allStrokes, background, getCanvasDataURL]);

  const loadDrawingData = useCallback((data) => {
    if (!data) return;

    const ctx = contextRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    // Clear canvas and draw background
    const pageDims = getPageDimensions();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set background first
    if (data.background) {
      setBackground(data.background);
    }

    drawBackground(ctx, pageDims.width, pageDims.height);

    // Load image if available - draw at logical size
    if (data.imageData) {
      const img = new Image();
      img.onload = () => {
        // Draw the image at the logical coordinate size (accounting for DPR scaling)
        ctx.drawImage(img, 0, 0, pageDims.width, pageDims.height);
      };
      img.src = data.imageData;
    }

    // Set strokes
    setAllStrokes(data.strokes || []);
  }, [getPageDimensions]);

  return {
    canvasRef,
    initCanvas,
    startDrawing,
    draw,
    stopDrawing,
    currentTool,
    setCurrentTool,
    currentColor,
    setCurrentColor,
    currentSize,
    setCurrentSize,
    background,
    setBackground,
    undo,
    redo,
    clearCanvas,
    getCanvasDataURL,
    getDrawingData,
    loadDrawingData,
    canUndo: historyStep > 0,
    canRedo: historyStep < history.length - 1
  };
};
