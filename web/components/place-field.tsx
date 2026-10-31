"use client";

import { Autocomplete } from "@base-ui/react/autocomplete";
import { LoaderCircleIcon, MapPinIcon, MapPinOffIcon } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Coords = { lat: number; lng: number };
// label: what's saved, like the name from your location ("Oxxo, Zona Rosa").
type Place = Coords & { name: string; detail: string; label: string };

// Both geocoders run on OpenStreetMap data. Nominatim names the spot you're at; its policy forbids
// search-as-you-type, which is what Photon is for.
// ponytail: both public instances are fair-use (Nominatim ~1 request/s); move to self-hosted or
// paid ones if usage grows.

// The place at a point: its name (a shop, a park) or its street, plus the neighborhood or city.
async function placeName({ lat, lng }: Coords): Promise<string | null> {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&accept-language=es&lat=${lat}&lon=${lng}`,
  );
  if (!r.ok) return null;
  const { name, address: a = {} } = await r.json();
  const street = [a.road, a.house_number].filter(Boolean).join(" ");
  const area = a.suburb ?? a.neighbourhood ?? a.city ?? a.town ?? a.village;
  return [name || street, area].filter(Boolean).join(", ").slice(0, 200) || null;
}

// Places matching what's typed, nearest to `near` first when we know where you are.
async function searchPlaces(q: string, near: Coords | null, signal: AbortSignal) {
  const bias = near ? `&lat=${near.lat}&lon=${near.lng}` : "";
  const r = await fetch(`https://photon.komoot.io/api/?limit=5&q=${encodeURIComponent(q)}${bias}`, {
    signal,
  });
  if (!r.ok) throw new Error(`Photon ${r.status}`);
  const { features }: { features: PhotonFeature[] } = await r.json();
  return features.map(
    ({
      properties: p,
      geometry: {
        coordinates: [lng, lat],
      },
    }): Place => {
      const street = [p.street, p.housenumber].filter(Boolean).join(" ");
      const name = p.name ?? street;
      const area = [...new Set([p.locality ?? p.district, p.city ?? p.state])].filter(Boolean);
      return {
        name,
        detail: [p.name && street, ...area].filter(Boolean).join(", "),
        label: [name, area[0]].filter(Boolean).join(", ").slice(0, 200),
        lat,
        lng,
      };
    },
  );
}
type PhotonFeature = {
  properties: Record<string, string | undefined>;
  geometry: { coordinates: [number, number] };
};

const osmLink = ({ lat, lng }: Coords) =>
  `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;

// A still map of the streets around the point, OpenFreeMap's Positron style (free, no key).
// MapLibre is loaded only once a map shows up.
function MapPreview({ lat, lng }: Coords) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: import("maplibre-gl").Map | undefined;
    let gone = false;
    import("maplibre-gl").then(({ Map }) => {
      if (gone || !container.current) return;
      map = new Map({
        container: container.current,
        style: "https://tiles.openfreemap.org/styles/positron",
        center: [lng, lat],
        zoom: 16,
        interactive: false,
        attributionControl: false, // credited below, a control would take clicks
      });
    });
    return () => {
      gone = true;
      map?.remove();
    };
  }, [lat, lng]);

  return (
    <div className="relative h-36 bg-muted">
      {/* Sized, not positioned: MapLibre's CSS makes its container position: relative. */}
      <div ref={container} className="size-full" />
      {/* The map is centered on the point, so the pin's tip sits at the center. */}
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-full fill-primary stroke-white stroke-[1.5] drop-shadow"
      >
        <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" />
        <circle cx="12" cy="10" r="2.5" className="fill-white stroke-none" />
      </svg>
      <span className="absolute right-0 bottom-0 rounded-tl-md bg-white/75 px-1.5 text-[10px] text-muted-foreground">
        © OpenFreeMap © OpenMapTiles © OpenStreetMap
      </span>
    </div>
  );
}

// Where a movement happened: a name you can type or search, plus coordinates from your location
// or the place picked. Posts location_name, latitude and longitude with the form.
export function PlaceField({
  name: initialName,
  coords: initialCoords,
  locateOnOpen,
}: {
  name?: string | null;
  coords?: Coords | null;
  locateOnOpen: boolean; // new movements: ask for where you are right away
}) {
  const [place, setPlace] = useState(initialName ?? "");
  const [coords, setCoords] = useState(initialCoords ?? null);
  // "denied" is the last attempt's error; `permission` is the browser's setting, which can still
  // be "prompt" after a dismissed prompt. null: the browser doesn't say (no Permissions API).
  const [geo, setGeo] = useState<"idle" | "locating" | "denied" | "failed">(
    locateOnOpen ? "locating" : "idle",
  );
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const search = useRef<{ timer?: number; controller?: AbortController }>({});
  // Where you were last seen, to rank nearby places first even after removing the location.
  const lastFix = useRef(initialCoords ?? null);

  // The browser asks for permission here the first time; once blocked it fails right away.
  const requestPosition = () =>
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        setCoords({ lat, lng });
        lastFix.current = { lat, lng };
        setGeo("idle");
        const name = await placeName({ lat, lng }).catch(() => null);
        // A name typed meanwhile wins over the looked-up one.
        if (name) setPlace((p) => p || name);
      },
      (e) => setGeo(e.code === e.PERMISSION_DENIED ? "denied" : "failed"),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  const locate = () => {
    setGeo("locating");
    requestPosition();
  };

  // Unblocking it in the browser's settings while the dialog is open picks up the location.
  const onPermission = useEffectEvent((state: PermissionState) => {
    setPermission(state);
    if (state === "granted" && !coords && geo === "denied") locate();
  });
  const onOpen = useEffectEvent(() => locateOnOpen && requestPosition());
  useEffect(() => {
    onOpen();
    const pending = search.current;
    let status: PermissionStatus | undefined;
    navigator.permissions?.query({ name: "geolocation" }).then(
      (s) => {
        status = s;
        onPermission(s.state);
        s.onchange = () => onPermission(s.state);
      },
      () => {}, // Permissions API without geolocation: errors from locate() still tell us
    );
    return () => {
      if (status) status.onchange = null;
      clearTimeout(pending.timer);
      pending.controller?.abort();
    };
  }, []);

  const onType = (q: string) => {
    clearTimeout(search.current.timer);
    search.current.controller?.abort();
    if (q.trim().length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    search.current.controller = controller;
    setSearching(true);
    // Waits for a pause in typing, so each word doesn't cost a request.
    search.current.timer = window.setTimeout(async () => {
      const near = coords ?? lastFix.current;
      const found = await searchPlaces(q, near, controller.signal).catch(() => null);
      if (controller.signal.aborted) return;
      setResults(found ?? []);
      setSearching(false);
    }, 350);
  };

  const status = searching
    ? "Buscando…"
    : place.trim().length >= 3 && !results.length
      ? "Sin resultados. Se guardará el nombre como lo escribiste."
      : null;

  // Without permission there's no location to show, only how to give it.
  const noPermission = geo === "denied" && !coords;

  return (
    <>
      {noPermission ? (
        // Keeps a name typed before tapping the pin.
        <input type="hidden" name="location_name" value={place} />
      ) : (
        <Autocomplete.Root
          items={results}
          filter={null}
          autoHighlight
          value={place}
          onValueChange={(value, { reason }) => {
            setPlace(value);
            if (reason === "input-change") onType(value);
          }}
          itemToStringValue={(p: Place) => p.label}
        >
          <div className="flex gap-2">
            <Autocomplete.Input
              id="location_name"
              name="location_name"
              maxLength={200}
              placeholder={
                geo === "locating" ? "Buscando dónde estás…" : "Busca un lugar o escribe"
              }
              render={<Input />}
              // Enter picks the highlighted place; with none it shouldn't send the whole form.
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            />
            <Button
              type="button"
              variant={coords ? "secondary" : "outline"}
              size="icon"
              disabled={geo === "locating"}
              title={coords ? "Quitar ubicación" : "Usar mi ubicación"}
              aria-label={coords ? "Quitar ubicación" : "Usar mi ubicación"}
              onClick={() => {
                if (!coords) return locate();
                setCoords(null);
                setPlace("");
              }}
            >
              {geo === "locating" ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <MapPinIcon className={coords ? "text-primary" : ""} />
              )}
            </Button>
          </div>
          <Autocomplete.Portal hidden={!status && !results.length}>
            <Autocomplete.Positioner sideOffset={4} align="start" className="isolate z-50">
              <Autocomplete.Popup
                aria-busy={searching || undefined}
                className="max-h-[min(var(--available-height),18rem)] w-(--anchor-width) max-w-(--available-width) overflow-y-auto overscroll-contain rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10"
              >
                <Autocomplete.Status>
                  {status && (
                    <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                      {searching && <LoaderCircleIcon className="size-3.5 animate-spin" />}
                      {status}
                    </div>
                  )}
                </Autocomplete.Status>
                <Autocomplete.List>
                  {(p: Place) => (
                    <Autocomplete.Item
                      key={`${p.lat},${p.lng},${p.name}`}
                      value={p}
                      onClick={() => setCoords({ lat: p.lat, lng: p.lng })}
                      className="flex cursor-default items-start gap-2 rounded-md px-2 py-1.5 outline-none select-none data-highlighted:bg-accent"
                    >
                      <MapPinIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{p.name}</span>
                        {p.detail && (
                          <span className="truncate text-xs text-muted-foreground">{p.detail}</span>
                        )}
                      </span>
                    </Autocomplete.Item>
                  )}
                </Autocomplete.List>
              </Autocomplete.Popup>
            </Autocomplete.Positioner>
          </Autocomplete.Portal>
        </Autocomplete.Root>
      )}
      <input type="hidden" name="latitude" value={coords?.lat ?? ""} />
      <input type="hidden" name="longitude" value={coords?.lng ?? ""} />

      {!coords && (geo === "denied" || geo === "failed") && (
        <p className="flex items-start gap-2.5 rounded-lg bg-background px-3 py-2.5 text-[0.78rem] leading-snug text-sidebar-foreground">
          <MapPinOffIcon className="mt-px size-4 shrink-0 text-muted-foreground" />
          <span>
            {geo === "failed"
              ? "No pudimos saber dónde estás. Intenta otra vez o busca el lugar. "
              : permission === "denied"
                ? // A blocked permission can't be asked again from the page; trying still lights
                  // up the browser's location icon next to the address.
                  "Tu navegador tiene bloqueada la ubicación. Actívala desde el ícono a la izquierda de la dirección del sitio y aquí se toma sola. "
                : "Permite la ubicación para registrar dónde haces cada movimiento. "}
            <button
              type="button"
              onClick={locate}
              className="font-medium text-primary underline underline-offset-2 hover:no-underline"
            >
              {geo === "failed" ? "Reintentar" : "Permitir ubicación"}
            </button>
          </span>
        </p>
      )}

      {coords && (
        // The whole preview opens OpenStreetMap, where the map can be moved around.
        <a
          href={osmLink(coords)}
          target="_blank"
          rel="noreferrer"
          aria-label="Ver la ubicación en OpenStreetMap"
          className="block overflow-hidden rounded-lg border"
        >
          <MapPreview {...coords} />
          <span className="flex justify-between gap-2 px-3 py-1.5 text-xs text-muted-foreground">
            <span className="tabular-nums">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </span>
            <span>Abrir en OpenStreetMap ↗</span>
          </span>
        </a>
      )}
    </>
  );
}
