export function Header() {
  return (
    <header className="header">
      <div className="header-brand">
        <span className="header-logo">IME</span>
        <span className="header-product">Oceanova | Weather Routing Dashboard</span>
      </div>

      <nav className="header-nav" aria-label="Primary">
        <span>Inputs</span>
        <span className="active">Results</span>
        <span>Saved Routes</span>
        <span>ERA5 Data</span>
      </nav>

      <div className="header-user">Capt. Demo</div>
    </header>
  )
}
