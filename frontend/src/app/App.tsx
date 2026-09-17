import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { queryClient } from "./queryClient";
import { AppRoutes } from "./routes";
import { AuthProvider } from "../shared/store";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter
          future={{
            // Opt into React Router v7 behaviors early to silence the v6
            // deprecation warnings and avoid a breaking change on upgrade.
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
