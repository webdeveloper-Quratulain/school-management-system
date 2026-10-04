import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";

const when = (iso) =>
  new Date(iso).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const box = useRef(null);

  const refreshCount = useCallback(async () => {
    try {
      const res = await api("/notifications/unread-count");
      setCount(res.count);
    } catch {
      // a failed background check should not bother the user
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await api("/notifications"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    const check = () => {
      if (!document.hidden) refreshCount();
    };
    check();
    const timer = setInterval(check, 30000);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", check);
    };
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (box.current && !box.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    if (open) {
      setOpen(false);
    } else {
      setOpen(true);
      loadList();
    }
  }

  async function markRead(n) {
    if (n.isRead) return;
    setItems((list) => list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    setCount((c) => Math.max(0, c - 1));
    try {
      await api(`/notifications/${n.id}/read`, { method: "PATCH" });
    } catch (err) {
      setError(err.message);
      loadList();
    }
  }

  async function markAll() {
    try {
      await api("/notifications/read-all", { method: "PATCH" });
      setItems((list) => list.map((x) => ({ ...x, isRead: true })));
      setCount(0);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="relative" ref={box}>
      <button
        onClick={toggle}
        aria-label={`Notifications${count ? `, ${count} unread` : ""}`}
        aria-expanded={open}
        className="relative rounded px-2 py-1 text-xl hover:bg-slate-100"
      >
        <span aria-hidden="true">🔔</span>
        {count > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-xs font-semibold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg bg-white shadow-lg ring-1 ring-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
            <span className="font-semibold text-[#1a4033]">Notifications</span>
            <button
              onClick={markAll}
              disabled={count === 0}
              className="text-xs font-medium text-[#1a4033] hover:underline disabled:text-slate-400 disabled:no-underline"
            >
              Mark all as read
            </button>
          </div>

          {error && (
            <div className="bg-red-50 px-4 py-2 text-xs text-red-700">{error}</div>
          )}

          <ul className="max-h-96 overflow-y-auto">
            {loading && (
              <li className="px-4 py-6 text-center text-sm text-slate-500">Loading...</li>
            )}
            {!loading && items.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-slate-500">
                You have no notifications.
              </li>
            )}
            {items.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => markRead(n)}
                  className={`block w-full border-t border-slate-100 px-4 py-3 text-left first:border-t-0 hover:bg-slate-50 ${
                    n.isRead ? "" : "bg-[#fdf6e3]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`text-sm ${
                        n.isRead ? "text-slate-700" : "font-semibold text-slate-900"
                      }`}
                    >
                      {n.title}
                    </span>
                    {!n.isRead && (
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#f5b82e]"
                        aria-label="Unread"
                      />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{when(n.createdAt)}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}