/**
 * useGeofence — Geolocalización para el kiosko de fichaje
 *
 * Haversine distance + getCurrentPosition wrapper.
 * El check se lanza UNA VEZ al inicio de sesión del empleado (al tocar la tarjeta),
 * no en cada acción, para no interrumpir el flujo de fichaje.
 */

/** Distancia en km entre dos coordenadas (fórmula de Haversine). */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Obtiene la posición actual del dispositivo. */
export function getCurrentPosition(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Este dispositivo no tiene GPS disponible.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            reject(new Error('Permiso de ubicación denegado. Actívalo en el navegador.'));
            break;
          case err.POSITION_UNAVAILABLE:
            reject(new Error('Ubicación no disponible. Comprueba el GPS.'));
            break;
          case err.TIMEOUT:
            reject(new Error('Tiempo de espera agotado al obtener la ubicación.'));
            break;
          default:
            reject(new Error('Error al obtener la ubicación.'));
        }
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true }
    );
  });
}

export interface GeofenceResult {
  allowed: boolean;
  distanceKm: number | null;
  errorMessage: string | null;
}

/**
 * Comprueba si el dispositivo está dentro del radio permitido.
 * Si la geovalla no está activada o no hay coordenadas configuradas, devuelve allowed=true.
 */
export async function checkGeofence(
  kioskLat: number | null,
  kioskLon: number | null,
  radiusKm: number,
  geofenceEnabled: boolean
): Promise<GeofenceResult> {
  if (!geofenceEnabled || kioskLat === null || kioskLon === null) {
    return { allowed: true, distanceKm: null, errorMessage: null };
  }

  try {
    const { lat, lon } = await getCurrentPosition();
    const distanceKm = haversineDistance(lat, lon, kioskLat, kioskLon);
    const allowed = distanceKm <= radiusKm;
    return {
      allowed,
      distanceKm,
      errorMessage: allowed
        ? null
        : `Estás a ${(distanceKm * 1000).toFixed(0)} m del kiosko. El radio máximo es ${(radiusKm * 1000).toFixed(0)} m.`,
    };
  } catch (err: any) {
    return {
      allowed: false,
      distanceKm: null,
      errorMessage: err.message ?? 'Error de geolocalización.',
    };
  }
}
