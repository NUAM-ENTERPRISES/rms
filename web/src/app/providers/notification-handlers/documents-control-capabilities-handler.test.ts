import { describe, expect, it } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import authReducer, { updateUserAuthorization } from "@/features/auth/authSlice";
import {
  DOCUMENTS_CONTROL_CAPABILITIES_SYNC_TYPE,
  handleDocumentsControlCapabilitiesChanged,
  handleDocumentsControlCapabilitiesSync,
} from "./documents-control-capabilities-handler";

function createStore() {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          id: "user-1",
          name: "Ops User",
          email: "ops@example.com",
          roles: ["Operations"],
          permissions: ["read:cre"],
        },
        accessToken: "access-token",
        refreshToken: "refresh-token",
        isAuthenticated: true,
        isLoading: false,
        status: "authenticated" as const,
        sessionAccountStatus: null,
      },
    },
  });
}

describe("documents-control-capabilities-handler", () => {
  it("applies permissions from direct socket payload", () => {
    const store = createStore();

    handleDocumentsControlCapabilitiesChanged(
      {
        userId: "user-1",
        originalDocumentIntakeEnabled: true,
        courierManagementEnabled: true,
        updatedAt: new Date().toISOString(),
        roles: ["Operations"],
        permissions: [
          "read:cre",
          "read:original_document_intake",
          "read:courier_management",
        ],
        userVersion: 12345,
      },
      store.dispatch,
      store.getState,
    );

    expect(store.getState().auth.user?.permissions).toEqual([
      "read:cre",
      "read:original_document_intake",
      "read:courier_management",
    ]);
  });

  it("handles DocumentsControlCapabilitiesUpdated data:sync payloads", () => {
    const store = createStore();

    const handled = handleDocumentsControlCapabilitiesSync(
      {
        type: DOCUMENTS_CONTROL_CAPABILITIES_SYNC_TYPE,
        userId: "user-1",
        originalDocumentIntakeEnabled: true,
        courierManagementEnabled: false,
        updatedAt: new Date().toISOString(),
        roles: ["Operations"],
        permissions: ["read:cre", "read:original_document_intake"],
        userVersion: 99,
      },
      store.dispatch,
      store.getState,
    );

    expect(handled).toBe(true);
    expect(store.getState().auth.user?.permissions).toContain(
      "read:original_document_intake",
    );
  });

  it("updateUserAuthorization reducer updates permissions", () => {
    const store = createStore();

    store.dispatch(
      updateUserAuthorization({
        permissions: ["read:courier_management"],
        userVersion: 1,
      }),
    );

    expect(store.getState().auth.user?.permissions).toEqual([
      "read:courier_management",
    ]);
  });
});
