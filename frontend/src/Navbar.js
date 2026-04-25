import React from "react";

function Navbar({ user, onSignOut, onNavigate }) {
  return (
    <nav className="clarity-nav">

      <span className="clarity-logo"
        onClick={() => onNavigate("home")}
        style={{ cursor: "pointer" }}
      >
        CLARITY FINANCE
      </span>

      <div className="clarity-nav-links">
        <button className="nav-link-btn" onClick={() => onNavigate("home")}>Home</button>
        <button className="nav-link-btn" onClick={() => onNavigate("health")}>Financial Health</button>
        <button className="nav-link-btn" onClick={() => onNavigate("history")}>View History</button>
        <button className="nav-link-btn" onClick={() => onNavigate("account")}>Account Info</button>
        <button className="nav-link-btn signout-link" onClick={onSignOut}>Sign Out</button>
      </div>

    </nav>
  );
}

export default Navbar;