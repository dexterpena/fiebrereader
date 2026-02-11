import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="navbar-brand">
          FiebreReader
        </Link>
        <Link to="/" className="nav-link">
          <i className="fa-solid fa-house" />
          <span>Home</span>
        </Link>
        <Link to="/search" className="nav-link">
          <i className="fa-solid fa-magnifying-glass" />
          <span>Search</span>
        </Link>
        {user && (
          <Link to="/library" className="nav-link">
            <i className="fa-solid fa-book" />
            <span>Library</span>
          </Link>
        )}
      </div>
      <div className="navbar-right">
        <button onClick={toggleTheme} className="nav-btn" title="Toggle theme">
          <i className={`fa-solid ${theme === "dark" ? "fa-sun" : "fa-moon"}`} />
        </button>
        {user ? (
          <>
            <Link to="/settings" className="nav-link">
              <i className="fa-solid fa-gear" />
              <span>Settings</span>
            </Link>
            <button onClick={handleSignOut} className="nav-btn nav-btn-accent">
              <i className="fa-solid fa-right-from-bracket" />
              <span>Sign Out</span>
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">
              <i className="fa-solid fa-right-to-bracket" />
              <span>Login</span>
            </Link>
            <Link to="/signup" className="nav-link">
              <i className="fa-solid fa-user-plus" />
              <span>Sign Up</span>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
