// @vitest-environment jsdom
import React, { useEffect } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ owner: "a" as string | undefined, list: vi.fn(), listener: undefined as ((id: string) => void) | undefined }));
vi.mock("expo-router", () => ({ useFocusEffect: (callback: () => void) => useEffect(callback, [callback]) }));
vi.mock("../src/lib/auth/client", () => ({ nativeAuthClient: { useSession: () => ({ data: state.owner ? { user: { id: state.owner } } : null, isPending: false }) } }));
vi.mock("../src/lib/accountWalks", () => ({ listAccountWalks: state.list, subscribeAccountWalks: (listener: (id: string) => void) => { state.listener = listener; return () => { state.listener = undefined; }; } }));
import { useAccountWalks } from "../src/hooks/useAccountWalks";
function Example() { const result = useAccountWalks(); return <output>{JSON.stringify(result)}</output>; }
afterEach(() => { cleanup(); state.owner = "a"; vi.clearAllMocks(); });
it("ignores a previous account response after switching or signing out", async () => {
  let finish!: (walks: unknown[]) => void;
  state.list.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue([]);
  const view = render(<Example />); state.owner = "b"; view.rerender(<Example />);
  await act(async () => { finish([{ id: "private-account-a-walk" }]); });
  expect(screen.getByRole("status").textContent).not.toContain("private-account-a-walk");
  expect(screen.getByRole("status").textContent).toContain('"userId":"b"');
  state.owner = undefined; view.rerender(<Example />);
  expect(screen.getByRole("status").textContent).toContain('"walks":[]');
});
it("does not fetch/upload guest data and refreshes only the current account after an explicit mutation", async () => {
  state.owner = undefined; state.list.mockResolvedValue([]); const view = render(<Example />);
  expect(state.list).not.toHaveBeenCalled(); state.owner = "a"; view.rerender(<Example />);
  await act(async () => {}); expect(state.list).toHaveBeenCalledTimes(1);
  await act(async () => { state.listener?.("b"); }); expect(state.list).toHaveBeenCalledTimes(1);
  await act(async () => { state.listener?.("a"); }); expect(state.list).toHaveBeenCalledTimes(2);
});
it("hides account rows on sign-out and refetches the same account on sign-in", async () => {
  state.list.mockResolvedValueOnce([{ id: "saved-before-signout" }]).mockResolvedValueOnce([{ id: "saved-after-signin" }]);
  const view = render(<Example />);
  await act(async () => {});
  expect(screen.getByRole("status").textContent).toContain("saved-before-signout");
  state.owner = undefined; view.rerender(<Example />);
  expect(screen.getByRole("status").textContent).not.toContain("saved-before-signout");
  expect(state.list).toHaveBeenCalledTimes(1);
  state.owner = "a"; view.rerender(<Example />);
  await act(async () => {});
  expect(state.list).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("status").textContent).toContain("saved-after-signin");
  expect(screen.getByRole("status").textContent).not.toContain("saved-before-signout");
});
