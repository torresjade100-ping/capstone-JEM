import React from 'react'

export default function PageSkeletonLoader({ rows = 6, type = 'table' }) {
  return (
    <div className="jem-skeleton-container" aria-busy="true" aria-live="polite">
      <style>{`
        .jem-skeleton-container {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
          box-sizing: border-box;
          animation: jemSkeletonPulse 1.5s ease-in-out infinite;
        }

        .jem-skeleton-bar {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: jemSkeletonShimmer 1.5s infinite;
          border-radius: 8px;
        }

        .jem-skeleton-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .jem-skeleton-title {
          height: 32px;
          width: 240px;
        }

        .jem-skeleton-actions {
          height: 36px;
          width: 140px;
        }

        .jem-skeleton-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .jem-skeleton-stat-card {
          height: 90px;
          border-radius: 14px;
        }

        .jem-skeleton-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .jem-skeleton-row {
          height: 48px;
          border-radius: 10px;
        }

        @keyframes jemSkeletonShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Skeleton Header */}
      <div className="jem-skeleton-header">
        <div className="jem-skeleton-bar jem-skeleton-title" />
        <div className="jem-skeleton-bar jem-skeleton-actions" />
      </div>

      {/* Skeleton Stats Grid */}
      <div className="jem-skeleton-stats-grid">
        <div className="jem-skeleton-bar jem-skeleton-stat-card" />
        <div className="jem-skeleton-bar jem-skeleton-stat-card" />
        <div className="jem-skeleton-bar jem-skeleton-stat-card" />
        <div className="jem-skeleton-bar jem-skeleton-stat-card" />
      </div>

      {/* Skeleton Content Card */}
      <div className="jem-skeleton-card">
        <div className="jem-skeleton-bar" style={{ height: '36px', width: '40%' }} />
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="jem-skeleton-bar jem-skeleton-row" style={{ opacity: 1 - idx * 0.12 }} />
        ))}
      </div>
    </div>
  )
}
