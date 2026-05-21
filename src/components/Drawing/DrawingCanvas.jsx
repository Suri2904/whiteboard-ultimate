import { useEffect, useState, useCallback } from 'react';
import { useDrawing } from '../../hooks/useDrawing';
import { DrawingToolbar } from './DrawingToolbar';
import { PageManager } from './PageManager';
import jsPDF from 'jspdf';
import './DrawingCanvas.css';

export const DrawingCanvas = ({ title, initialData, onBack, onSave, onDelete }) => {
  const [editableTitle, setEditableTitle] = useState(title || 'Untitled Drawing');
  const [pages, setPages] = useState(initialData?.pages || [null]); // Array of page data
  const [currentPage, setCurrentPage] = useState(0);
  const [showBackgroundMenu, setShowBackgroundMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPageSizeMenu, setShowPageSizeMenu] = useState(false);
  const [pageSize, setPageSize] = useState(initialData?.pageSize || 'a4'); // 'a4' or 'a3'
  const [pageOrientation, setPageOrientation] = useState(initialData?.orientation || 'landscape'); // 'portrait' or 'landscape'

  const {
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
    canUndo,
    canRedo
  } = useDrawing(pageSize, pageOrientation);

  // Initialize canvas on mount
  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  // Load initial data once on mount
  useEffect(() => {
    if (initialData?.pages?.[0]) {
      setTimeout(() => {
        loadDrawingData(initialData.pages[0]);
      }, 100);
    }
  }, []); // Only run once on mount

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Save current page data when switching pages
  const saveCurrentPage = useCallback(() => {
    const drawingData = getDrawingData();
    setPages(prev => {
      const updated = [...prev];
      updated[currentPage] = drawingData;
      return updated;
    });
  }, [currentPage, getDrawingData]);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage < 0 || newPage >= pages.length) return;

    // Save current page before switching
    saveCurrentPage();

    // Load new page
    setCurrentPage(newPage);

    // Wait for next tick to load page data
    setTimeout(() => {
      if (pages[newPage]) {
        loadDrawingData(pages[newPage]);
      } else {
        clearCanvas();
      }
    }, 50);
  };

  // Add new page
  const handleAddPage = () => {
    saveCurrentPage();
    setPages(prev => [...prev, null]);
    setCurrentPage(pages.length);
    setTimeout(() => clearCanvas(), 50);
  };

  // Delete current page
  const handleDeletePage = (pageIndex) => {
    if (pages.length === 1) return; // Can't delete last page

    setPages(prev => prev.filter((_, i) => i !== pageIndex));

    // Adjust current page after deletion
    if (pageIndex === pages.length - 1) {
      // Deleted last page, go to previous
      setCurrentPage(pageIndex - 1);
    } else if (pageIndex < currentPage) {
      // Deleted page before current, adjust index
      setCurrentPage(currentPage - 1);
    }
    // If deleted page after current, currentPage stays same

    // Load the new current page
    setTimeout(() => {
      const newIndex = pageIndex === pages.length - 1 ? pageIndex - 1 :
                       pageIndex < currentPage ? currentPage - 1 : currentPage;
      const pageData = pages[newIndex];

      if (pageData) {
        loadDrawingData(pageData);
      } else {
        clearCanvas();
      }
    }, 50);
  };

  // Save drawing as JSON
  const handleSaveDrawing = () => {
    // Prompt for filename
    const fileName = prompt('Enter file name:', editableTitle);
    if (!fileName) return; // User cancelled

    saveCurrentPage();

    const drawingFile = {
      version: 1,
      title: fileName,
      pageSize: pageSize,
      orientation: pageOrientation,
      pages: pages.map((page, i) => i === currentPage ? getDrawingData() : page),
      createdAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(drawingFile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.samsungnote.json`;
    a.click();
    URL.revokeObjectURL(url);

    // Update the title if changed
    setEditableTitle(fileName);
  };

  // Export as PDF
  const handleDownloadPDF = async () => {
    saveCurrentPage();

    const canvas = canvasRef.current;
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    const pdf = new jsPDF({
      orientation: width > height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [width, height]
    });

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage();

      const pageData = i === currentPage ? getDrawingData() : pages[i];
      if (pageData && pageData.imageData) {
        pdf.addImage(pageData.imageData, 'PNG', 0, 0, width, height);
      }
    }

    pdf.save(`${editableTitle}.pdf`);
  };

  // Share (copy as image)
  const handleShare = async () => {
    const dataURL = getCanvasDataURL();
    const blob = await (await fetch(dataURL)).blob();

    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      alert('Drawing copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy drawing');
    }
  };

  // Delete confirmation
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    if (onDelete) onDelete();
  };

  // Handle pointer events
  const handlePointerDown = (e) => {
    e.preventDefault();
    startDrawing(e);
  };

  const handlePointerMove = (e) => {
    e.preventDefault();
    draw(e);
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    stopDrawing(e);
  };

  return (
    <div className="drawing-canvas-container">
      {/* Top toolbar */}
      <div className="drawing-top-toolbar">
        <button className="back-btn" onClick={onBack} title="Back">
          ← Back
        </button>

        <input
          type="text"
          className="drawing-title-input"
          value={editableTitle}
          onChange={(e) => setEditableTitle(e.target.value)}
          placeholder="Drawing Title"
        />

        <div className="top-toolbar-actions">
          <button
            className="toolbar-action-btn"
            onClick={() => {
              setShowPageSizeMenu(!showPageSizeMenu);
              setShowBackgroundMenu(false);
            }}
            title="Page Size"
          >
            📄 {pageSize.toUpperCase()} {pageOrientation === 'landscape' ? '↔' : '↕'}
          </button>

          {showPageSizeMenu && (
            <div className="page-size-menu">
              <div className="menu-section">
                <div className="menu-label">Size</div>
                <button
                  className={pageSize === 'a4' ? 'active' : ''}
                  onClick={() => { setPageSize('a4'); setShowPageSizeMenu(false); }}
                >
                  A4 (210 × 297mm)
                </button>
                <button
                  className={pageSize === 'a3' ? 'active' : ''}
                  onClick={() => { setPageSize('a3'); setShowPageSizeMenu(false); }}
                >
                  A3 (297 × 420mm)
                </button>
              </div>
              <div className="menu-divider" />
              <div className="menu-section">
                <div className="menu-label">Orientation</div>
                <button
                  className={pageOrientation === 'portrait' ? 'active' : ''}
                  onClick={() => { setPageOrientation('portrait'); setShowPageSizeMenu(false); }}
                >
                  ↕ Portrait
                </button>
                <button
                  className={pageOrientation === 'landscape' ? 'active' : ''}
                  onClick={() => { setPageOrientation('landscape'); setShowPageSizeMenu(false); }}
                >
                  ↔ Landscape
                </button>
              </div>
            </div>
          )}

          <button
            className="toolbar-action-btn"
            onClick={() => {
              setShowBackgroundMenu(!showBackgroundMenu);
              setShowPageSizeMenu(false);
            }}
            title="Background"
          >
            ▦
          </button>

          {showBackgroundMenu && (
            <div className="background-menu">
              <button onClick={() => { setBackground('plain'); setShowBackgroundMenu(false); }}>
                Plain
              </button>
              <button onClick={() => { setBackground('ruled'); setShowBackgroundMenu(false); }}>
                Ruled
              </button>
              <button onClick={() => { setBackground('grid'); setShowBackgroundMenu(false); }}>
                Grid
              </button>
              <button onClick={() => { setBackground('dots'); setShowBackgroundMenu(false); }}>
                Dots
              </button>
            </div>
          )}

          <button className="toolbar-action-btn" onClick={handleSaveDrawing} title="Save Drawing (Editable)">
            💾 Save
          </button>

          <button className="toolbar-action-btn" onClick={handleDownloadPDF} title="Download PDF (Read-only)">
            📄 PDF
          </button>

          <button className="toolbar-action-btn" onClick={handleShare} title="Share">
            ⬆ Share
          </button>

          <button className="delete-btn" onClick={handleDeleteClick} title="Delete">
            🗑 Delete
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="drawing-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* Left toolbar */}
      <DrawingToolbar
        currentTool={currentTool}
        onToolChange={setCurrentTool}
        currentColor={currentColor}
        onColorChange={setCurrentColor}
        currentSize={currentSize}
        onSizeChange={setCurrentSize}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {/* Page manager */}
      <PageManager
        pages={pages}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onAddPage={handleAddPage}
        onDeletePage={handleDeletePage}
      />

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Drawing?</h3>
            <p>This action cannot be undone. All pages will be permanently deleted.</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="btn-delete" onClick={handleDeleteConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
