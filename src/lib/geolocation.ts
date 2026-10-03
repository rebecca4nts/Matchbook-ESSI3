import type { Coordinates } from "@/lib/types";

export function getApproximateCoordinates(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Seu navegador não oferece localização."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({
        latitude: Math.round(coords.latitude * 100) / 100,
        longitude: Math.round(coords.longitude * 100) / 100,
      }),
      () => reject(new Error("Não foi possível acessar sua localização.")),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  });
}
