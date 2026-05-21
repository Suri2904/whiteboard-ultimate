import { useState } from 'react';
import './PageManager.css';

export const PageManager = ({ pages, currentPage, onPageChange, onAddPage, onDeletePage }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteClick = () => {
    if (pages.length === 1) {
      alert('Cannot delete the last page');
      return;
    }
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    onDeletePage(currentPage);
  };

  return (
    <>
      <div className="page-manager">
        <button
          className="page-nav-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          title="Previous page"
        >
          ←
        </button>

        <div className="page-indicator">
          Page {currentPage + 1} of {pages.length}
        </div>

        <button
          className="page-nav-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === pages.length - 1}
          title="Next page"
        >
          →
        </button>

        <button
          className="page-delete-btn"
          onClick={handleDeleteClick}
          title="Delete current page"
        >
          🗑
        </button>

        <button
          className="page-add-btn"
          onClick={onAddPage}
          title="Add new page"
        >
          + Page
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="page-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="page-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Page {currentPage + 1}?</h3>
            <p>This page will be permanently deleted.</p>
            <div className="page-modal-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="btn-delete" onClick={handleDeleteConfirm}>
                Delete Page
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
