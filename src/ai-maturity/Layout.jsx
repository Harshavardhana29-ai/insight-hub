import { Link, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="ai-maturity-wrapper">
      <div className="appShell">
        <header className="pageHeader">
          <div className="topbar">
            <Link to="/ai-maturity" className="brand">
              <div className="logo">BOSCH</div>
              <div className="brandTitle">
                <div className="h1">AI Maturity Assessment</div>
                <div className="sub">Enterprise AI maturity assessment & benchmarking</div>
              </div>
            </Link>
          </div>
        </header>
        <main className="pageMain">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
