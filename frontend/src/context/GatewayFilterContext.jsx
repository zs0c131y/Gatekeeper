import { createContext, useContext, useState } from "react";

const GatewayFilterContext = createContext(null);

export function GatewayFilterProvider({ children }) {
  const [routesOnly, setRoutesOnly] = useState(() => {
    try {
      return localStorage.getItem("gk_routesOnly") === "true";
    } catch {
      return false;
    }
  });

  const toggle = (value) => {
    setRoutesOnly(value);
    try {
      localStorage.setItem("gk_routesOnly", String(value));
    } catch {
      // ignore
    }
  };

  return (
    <GatewayFilterContext.Provider value={{ routesOnly, setRoutesOnly: toggle }}>
      {children}
    </GatewayFilterContext.Provider>
  );
}

export function useGatewayFilter() {
  const ctx = useContext(GatewayFilterContext);
  if (!ctx) throw new Error("useGatewayFilter must be used inside <GatewayFilterProvider>");
  return ctx;
}
