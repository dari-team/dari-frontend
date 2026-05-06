import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AISearchPanel from "./AISearchPanel";

const navigateMock = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
  useLocation: () => ({ pathname: "/search", search: "?q=foo" }),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

vi.mock("../../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../../lib/api")>("../../lib/api");
  return {
    ...actual,
    aiSearchApi: {
      search:  vi.fn(),
      quota:   vi.fn(),
      extract: vi.fn(),
    },
    extractErrorMessage: (_e: unknown, fallback?: string) => fallback ?? "error",
  };
});

const { aiSearchApi } = await import("../../lib/api");

beforeEach(() => {
  navigateMock.mockClear();
  vi.clearAllMocks();
});

describe("AISearchPanel — guest", () => {
  it("renders the login-gate UI for unauthenticated users", () => {
    render(<AISearchPanel onResults={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/Log in to try AI search/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/3-bedroom apartment/i)).not.toBeInTheDocument();
  });

  it("does NOT call aiSearchApi.quota when guest", () => {
    render(<AISearchPanel onResults={vi.fn()} onClose={vi.fn()} />);
    expect(aiSearchApi.quota).not.toHaveBeenCalled();
  });

  it("Login button navigates to /login with return-path state", async () => {
    render(<AISearchPanel onResults={vi.fn()} onClose={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /Login to try/i });
    await userEvent.click(btn);
    expect(navigateMock).toHaveBeenCalledWith("/login", {
      state: { from: "/search?q=foo" },
    });
  });

  it("mentions the 3 free AI searches per week limit", () => {
    render(<AISearchPanel onResults={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/3 free AI searches per week/i)).toBeInTheDocument();
  });
});
