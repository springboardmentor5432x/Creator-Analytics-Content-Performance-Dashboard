
import { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./GPSNavigator.css";

// Fix default Leaflet marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

const DEFAULT_POSITION = [17.385, 78.4867];

function MapRecenter({ position }) {
  const map = useMap();

  if (position) {
    map.setView(position, 14);
  }

  return null;
}

export default function GPSNavigator() {
  const [current, setCurrent] = useState(null);
  const [destination, setDestination] = useState(null);
  const [query, setQuery] = useState("");
  const [route, setRoute] = useState([]);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [instructions, setInstructions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(
    "Allow location access to start navigation."
  );

  const speak = (text) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(
        new SpeechSynthesisUtterance(text)
      );
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage("Your browser does not support GPS location.");
      return;
    }

    setMessage("Finding your current location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = [
          position.coords.latitude,
          position.coords.longitude
        ];

        setCurrent(coords);
        setRoute([]);
        setDestination(null);
        setMessage("Your current location is ready.");
      },
      (error) => {
        setMessage(
          error.code === 1
            ? "Location permission denied. Allow location access in your browser."
            : "Could not get your location. Check GPS and internet."
        );
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const searchDestination = async (event) => {
    event.preventDefault();

    if (!query.trim()) {
      setMessage("Enter a destination first.");
      return;
    }

    setLoading(true);
    setMessage("Searching for destination...");

    try {
      const url =
        "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" +
        encodeURIComponent(query.trim());

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Destination search is unavailable.");
      }

      const results = await response.json();

      if (!results.length) {
        setMessage("Destination not found. Try a more specific place.");
        return;
      }

      const place = results[0];
      const coords = [
        Number(place.lat),
        Number(place.lon)
      ];

      setDestination({
        position: coords,
        name: place.display_name
      });

      setRoute([]);
      setInstructions([]);
      setDistance(null);
      setDuration(null);
      setMessage("Destination found. Get your route next.");
    } catch (error) {
      setMessage(error.message || "Could not search destination.");
    } finally {
      setLoading(false);
    }
  };

  const getRoute = async () => {
    if (!current) {
      setMessage("Click Use My Location first.");
      return;
    }

    if (!destination) {
      setMessage("Search for a destination first.");
      return;
    }

    setLoading(true);
    setMessage("Calculating driving route...");

    try {
      const [startLat, startLon] = current;
      const [endLat, endLon] = destination.position;

      const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${startLon},${startLat};${endLon},${endLat}` +
        "?overview=full&geometries=geojson&steps=true";

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Routing service is unavailable.");
      }

      const data = await response.json();

      if (data.code !== "Ok" || !data.routes?.length) {
        throw new Error("No driving route found for this destination.");
      }

      const result = data.routes[0];

      // OSRM returns coordinates as [longitude, latitude].
      const points = result.geometry.coordinates.map(
        ([lon, lat]) => [lat, lon]
      );

      const steps = result.legs.flatMap((leg) =>
        leg.steps.map((step) => {
          const type = step.maneuver?.type || "continue";
          const modifier = step.maneuver?.modifier || "";
          const road = step.name || "the road";

          let action = "Continue";

          if (type === "depart") action = "Start";
          else if (type === "arrive") action = "Arrive at your destination";
          else if (type === "turn") action = `Turn ${modifier}`;
          else if (type === "merge") action = `Merge ${modifier}`;
          else if (type === "roundabout" || type === "rotary") {
            action = "Enter the roundabout";
          } else if (type === "new name" || type === "continue") {
            action = "Continue";
          } else {
            action = type.replaceAll("_", " ");
          }

          return {
            text:
              type === "arrive"
                ? action
                : `${action} ${road === "the road" ? "" : "onto " + road}`
          };
        })
      );

      setRoute(points);
      setInstructions(steps);
      setDistance(result.distance / 1000);
      setDuration(result.duration / 60);
      setMessage("Route ready. Follow the route shown on the map.");
    } catch (error) {
      setMessage(error.message || "Unable to calculate route.");
    } finally {
      setLoading(false);
    }
  };

  const speakFirstInstruction = () => {
    if (instructions.length) {
      speak(instructions[0].text);
    } else {
      setMessage("Calculate a route before starting voice guidance.");
    }
  };

  const mapCenter = current || destination?.position || DEFAULT_POSITION;

  return (
    <div className="gps-page">
      <div className="gps-heading">
        <div>
          <p className="gps-eyebrow">CREATORIQ • SMART TOOLS</p>
          <h1>GPS Navigator</h1>
          <p className="gps-subtitle">
            Explore locations and plan your journey.
          </p>
        </div>

        <span className="gps-live">
          <span /> Map Ready
        </span>
      </div>

      <div className="gps-layout">
        <aside className="gps-panel">
          <h2>Your journey</h2>

          <button
            className="gps-primary"
            onClick={getCurrentLocation}
            disabled={loading}
          >
            ◎ Use My Location
          </button>

          <form onSubmit={searchDestination}>
            <label htmlFor="gps-destination">
              Search destination
            </label>

            <input
              id="gps-destination"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. Visakhapatnam Railway Station"
            />

            <button
              className="gps-secondary"
              type="submit"
              disabled={loading}
            >
              Search Place
            </button>
          </form>

          {destination && (
            <div className="gps-destination">
              <strong>Destination</strong>
              <p>{destination.name}</p>
            </div>
          )}

          <button
            className="gps-primary"
            onClick={getRoute}
            disabled={loading || !current || !destination}
          >
            {loading ? "Please wait..." : "Find Driving Route"}
          </button>

          <div className="gps-status" role="status">
            {message}
          </div>

          {distance !== null && (
            <div className="gps-stats">
              <div>
                <span>Distance</span>
                <strong>{distance.toFixed(1)} km</strong>
              </div>
              <div>
                <span>Estimated time</span>
                <strong>{Math.ceil(duration)} min</strong>
              </div>
            </div>
          )}

          {instructions.length > 0 && (
            <div className="gps-guidance">
              <h3>Route guidance</h3>

              <button
                className="gps-secondary"
                onClick={speakFirstInstruction}
              >
                🔊 Speak first instruction
              </button>

              <ol>
                {instructions.slice(0, 8).map((step, index) => (
                  <li key={index}>{step.text}</li>
                ))}
              </ol>
            </div>
          )}

          <p className="gps-note">
            Routing and place search require internet. Voice instructions
            are a basic preview, not continuous turn-by-turn navigation.
          </p>
        </aside>

        <div className="gps-map-wrap">
          <MapContainer
            key={`${mapCenter[0]}-${mapCenter[1]}`}
            center={mapCenter}
            zoom={12}
            className="gps-map"
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapRecenter position={current || destination?.position} />

            {current && (
              <Marker position={current}>
                <Popup>Your current location</Popup>
              </Marker>
            )}

            {destination && (
              <Marker position={destination.position}>
                <Popup>{destination.name}</Popup>
              </Marker>
            )}

            {route.length > 0 && (
              <Polyline positions={route} pathOptions={{ color: "#2563eb", weight: 6 }} />
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
