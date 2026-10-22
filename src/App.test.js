import { render, screen } from "@testing-library/react";
import App from "./App";

beforeEach(() => localStorage.clear());

test("logged-out visitors see the login form", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: /login to nextask/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /create an account/i })).toBeInTheDocument();
});

test("the dashboard redirects to login when logged out", () => {
  window.history.pushState({}, "", "/dashboard");
  render(<App />);
  expect(screen.getByRole("heading", { name: /login to nextask/i })).toBeInTheDocument();
});

test("the sign-up page is reachable", () => {
  window.history.pushState({}, "", "/register");
  render(<App />);
  expect(screen.getByRole("heading", { name: /create your account/i })).toBeInTheDocument();
});
