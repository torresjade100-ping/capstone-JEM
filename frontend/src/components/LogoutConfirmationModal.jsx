import React, { useEffect } from 'react'
import { LogOut, X, AlertTriangle } from 'lucide-react'

export default function LogoutConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  loading = false,
  title = 'Log out of JEM Hardware',
  message = 'Are you sure you want to log out?'
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onCancel()
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, loading, onCancel])

  if (!isOpen) return null

  return (
    <div
      className="jem-logout-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
    >
      <style>{`
        .jem-logout-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: jemFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .jem-logout-modal-card {
          width: 100%;
          max-width: 440px;
          background: #ffffff;
          border-radius: 20px;
          padding: 28px 24px 24px;
          box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.08);
          position: relative;
          text-align: center;
          animation: jemScaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          box-sizing: border-box;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        }

        .jem-logout-modal-icon-wrap {
          width: 60px;
          height: 60px;
          border-radius: 18px;
          background: #fff7ed;
          border: 1.5px solid #fed7aa;
          color: #ea580c;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
        }

        .jem-logout-modal-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 8px;
          letter-spacing: -0.02em;
        }

        .jem-logout-modal-message {
          font-size: 0.92rem;
          color: #64748b;
          line-height: 1.55;
          margin: 0 0 24px;
        }

        .jem-logout-modal-actions {
          display: flex;
          gap: 12px;
        }

        .jem-logout-btn-cancel {
          flex: 1;
          padding: 12px 18px;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 700;
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .jem-logout-btn-cancel:hover:not(:disabled) {
          background: #e2e8f0;
          color: #0f172a;
        }

        .jem-logout-btn-confirm {
          flex: 1;
          padding: 12px 18px;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 800;
          background: #ea580c;
          color: #ffffff;
          border: 1px solid #ea580c;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25);
          transition: all 0.15s ease;
        }

        .jem-logout-btn-confirm:hover:not(:disabled) {
          background: #c2410c;
          border-color: #c2410c;
          box-shadow: 0 6px 16px rgba(234, 88, 12, 0.35);
        }

        .jem-logout-btn-confirm:disabled,
        .jem-logout-btn-cancel:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .jem-logout-close-icon {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 6px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .jem-logout-close-icon:hover {
          color: #0f172a;
          background: #f1f5f9;
        }

        @keyframes jemFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes jemScaleUp {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @media (max-width: 480px) {
          .jem-logout-modal-card {
            padding: 24px 18px 20px;
          }
          .jem-logout-modal-actions {
            flex-direction: column-reverse;
          }
        }
      `}</style>

      <div className="jem-logout-modal-card">
        <button
          type="button"
          className="jem-logout-close-icon"
          onClick={onCancel}
          disabled={loading}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        <div className="jem-logout-modal-icon-wrap">
          <LogOut size={28} />
        </div>

        <h3 id="logout-modal-title" className="jem-logout-modal-title">
          {title}
        </h3>

        <p className="jem-logout-modal-message">
          <strong>{message}</strong>
          <br />
          <span style={{ fontSize: '0.84rem', color: '#94a3b8' }}>
            You will need to sign in again to access the store management and system operations.
          </span>
        </p>

        <div className="jem-logout-modal-actions">
          <button
            type="button"
            className="jem-logout-btn-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel / No
          </button>
          <button
            type="button"
            className="jem-logout-btn-confirm"
            onClick={onConfirm}
            disabled={loading}
          >
            <LogOut size={16} />
            {loading ? 'Logging out...' : 'Logout / Yes'}
          </button>
        </div>
      </div>
    </div>
  )
}
