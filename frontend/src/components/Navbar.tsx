import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="navbar-brand">
          LeerCapitulo
        </Link>
        <Link to="/">Home</Link>
        <Link to="/search">Search</Link>
        {user && <Link to="/library">Library</Link>}
      </div>
      <div className="navbar-right">
        {user ? (
          <>
            <Link to="/settings">Settings</Link>
            <button onClick={handleSignOut} className="btn btn-sm">
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
