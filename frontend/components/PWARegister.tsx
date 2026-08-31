"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        console.log("PWA Service Worker registrado");
      } catch (error) {
        console.error("Erro ao registrar Service Worker:", error);
      }
    };

    registerServiceWorker();
  }, []);

  return null;
}