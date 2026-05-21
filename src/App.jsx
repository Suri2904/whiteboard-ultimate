import { useState, useRef } from 'react';
import { DrawingCanvas } from './components/Drawing/DrawingCanvas';
import './styles/variables.css';

function App() {
  const [showDrawing, setShowDrawing] = useState(false);
  const [loadedDrawing, setLoadedDrawing] = useState(null);
  const fileInputRef = useRef(null);

  const handleLoadDrawing = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const drawingData = JSON.parse(event.target.result);
        setLoadedDrawing(drawingData);
        setShowDrawing(true);
      } catch (err) {
        alert('Failed to load drawing file. Please make sure it\'s a valid .samsungnote.json file.');
        console.error('Failed to parse drawing file:', err);
      }
    };
    reader.readAsText(file);
  };

  const handleNewDrawing = () => {
    setLoadedDrawing(null);
    setShowDrawing(true);
  };

  return (
    <div className="app">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.samsungnote.json"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {showDrawing ? (
        <DrawingCanvas
          title={loadedDrawing?.title || "New Drawing"}
          initialData={loadedDrawing}
          onBack={() => {
            setShowDrawing(false);
            setLoadedDrawing(null);
          }}
          onSave={(drawingData) => {
            console.log('Drawing saved:', drawingData);
            setShowDrawing(false);
            setLoadedDrawing(null);
          }}
          onDelete={() => {
            console.log('Drawing deleted');
            setShowDrawing(false);
            setLoadedDrawing(null);
          }}
        />
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: '20px',
          background: '#F4F4F4'
        }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#1A1A1A', marginBottom: '10px' }}>
            Samsung Notes
          </h1>
          <p style={{ fontSize: '16px', color: '#6B6B6B', marginBottom: '20px' }}>
            Create new drawings or load existing ones
          </p>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={handleNewDrawing}
              style={{
                padding: '14px 28px',
                fontSize: '16px',
                background: '#1259C3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 500,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}
            >
              ✏️ New Drawing
            </button>

            <button
              onClick={handleLoadDrawing}
              style={{
                padding: '14px 28px',
                fontSize: '16px',
                background: '#FFFFFF',
                color: '#1259C3',
                border: '2px solid #1259C3',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 500,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}
            >
              📂 Load Drawing
            </button>
          </div>

          <div style={{
            marginTop: '40px',
            padding: '20px',
            background: '#E8F0FD',
            borderRadius: '12px',
            maxWidth: '500px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '14px', color: '#1259C3', lineHeight: 1.6 }}>
              <strong>💡 Tip:</strong> Use "Save" button to download editable .json files.
              Use "PDF" button for final read-only exports.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
