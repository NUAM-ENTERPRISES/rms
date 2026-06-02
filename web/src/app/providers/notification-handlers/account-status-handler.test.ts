import { describe, it, expect } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import authReducer, { setSessionAccountStatus } from "@/features/auth/authSlice";

describe("account status live navbar state", () => {
  it("setSessionAccountStatus updates auth slice for immediate navbar render", () => {
    const store = configureStore({
      reducer: { auth: authReducer },
    });

    store.dispatch(setSessionAccountStatus("INACTIVE"));

    expect(store.getState().auth.sessionAccountStatus).toBe("INACTIVE");
  });
});
