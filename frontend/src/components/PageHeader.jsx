import "./PageHeader.css";

export default function PageHeader({ title, subtitle, children }) {
  return (
    <header className="page-header">
      <div className="page-header__text">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="page-header__extra">{children}</div>}
    </header>
  );
}