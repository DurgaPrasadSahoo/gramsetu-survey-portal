import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// A single "Actions" dropdown for a row of options, each either a navigation
// link (`to`) or a click handler (`onClick`), and independently disable-able.
export default function ActionsMenu({ items, label = 'Actions' }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <div className="actions-menu">
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {label} <span aria-hidden="true">▾</span>
      </button>

      {open && (
        <>
          <div className="actions-menu-backdrop" onClick={() => setOpen(false)} />
          <div className="actions-menu-list" role="menu">
            {items.map((item) =>
              item.disabled ? (
                <span key={item.label} className="actions-menu-item disabled" role="menuitem" aria-disabled="true">
                  {item.label}
                </span>
              ) : item.to ? (
                <Link
                  key={item.label}
                  to={item.to}
                  className="actions-menu-item"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  className={`actions-menu-item ${item.danger ? 'danger' : ''}`}
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    item.onClick();
                  }}
                >
                  {item.label}
                </button>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
