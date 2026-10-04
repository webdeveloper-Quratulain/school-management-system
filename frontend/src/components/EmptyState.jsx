import "./EmptyState.css";

export default function EmptyState({ icon: Icon, message }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">
        <Icon size={56} strokeWidth={1.5} />
      </div>
      <p>{message}</p>
    </div>
  );
}