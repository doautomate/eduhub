import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "./ui/button";

export function NavBar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <nav className="flex items-center justify-between gap-4 border-b border-border bg-background px-4 py-3">
      <span className="text-sm font-semibold text-foreground">FastAPI App</span>
      {isAuthenticated && (
        <Button type="button" variant="outline" size="sm" onClick={handleLogout}>
          Log out
        </Button>
      )}
    </nav>
  );
}

export default NavBar;
