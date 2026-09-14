import { auth } from "@/lib/firebaseClient";

export async function authenticatedFetch(input, init = {}) {
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    throw new Error("Sesi login tidak tersedia. Silakan masuk kembali.");
  }

  const headers = new Headers(
    init.headers || (input instanceof Request ? input.headers : undefined),
  );
  if (!headers.has("Authorization")) {
    const token = await currentUser.getIdToken();
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, { ...init, headers });
}
