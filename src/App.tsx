import { useEffect, useState } from "react";
import NDK, { NDKEvent, NostrEvent } from "@nostr-dev-kit/ndk";
import config from "../config";
import useEventStore from "./hooks/useEventStore";
import "./index.css";

// Helper function to format dates
const formatDate = (timestamp) => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
};

// Helper function to determine if content is encrypted
const isEncrypted = (content) => {
  return content.includes("?iv=");
};

// Helper to format pubkeys and IDs for display
const formatKey = (key, truncate = true) => {
  if (!key) return "";
  return truncate
    ? `${key.substring(0, 8)}...${key.substring(key.length - 8)}`
    : key;
};

// Component for displaying tags in a more readable format
const TagsDisplay = ({ tags }) => {
  if (!tags || tags.length === 0) {
    return <span className="encrypted-notice">No tags</span>;
  }

  return (
    <div className="tags-container">
      {tags.map((tag, index) => (
        <div key={index} className="tag">
          <span className="tag-name">{tag[0]}:</span>
          <span className="tag-value">{tag.slice(1).join(", ")}</span>
        </div>
      ))}
    </div>
  );
};

// Component for each event type
const EventCard = ({ event }) => {
  const [expanded, setExpanded] = useState(false);

  // Determine event type based on kind
  const getEventType = (kind) => {
    switch (kind) {
      case 1059:
        return "Encrypted Direct Message";
      case 30402:
        return "Product";
      default:
        return `Kind ${kind}`;
    }
  };

  // Get appropriate styling based on event kind
  const getEventTypeClass = (kind) => {
    switch (kind) {
      case 1059:
        return "event-type-dm";
      case 30402:
        return "event-type-product";
      default:
        return "";
    }
  };

  // Extract product details from a 30402 event
  const getProductDetails = (event) => {
    if (event.kind !== 30402) return null;

    const title = event.tags.find((tag) => tag[0] === "title")?.[1] ||
      "Untitled Product";
    const price = event.tags.find((tag) => tag[0] === "price");
    const priceDisplay = price ? `${price[1]} ${price[2] || ""}` : "No price";
    const type = event.tags.find((tag) => tag[0] === "type");
    const typeDisplay = type ? `${type[1]} ${type[2] || ""}` : "Unknown type";
    const stock = event.tags.find((tag) => tag[0] === "stock")?.[1] ||
      "Unknown";

    return {
      title,
      priceDisplay,
      typeDisplay,
      stock,
    };
  };

  const productDetails = getProductDetails(event);

  return (
    <div className={`event-card ${getEventTypeClass(event.kind)}`}>
      <div className="event-header">
        <span className="event-type">{getEventType(event.kind)}</span>
        <span className="event-timestamp">
          {formatDate(event.created_at)}
        </span>
      </div>

      <div className="event-metadata">
        <div>
          <span className="metadata-label">ID:</span>
          <p className="metadata-value">{event.id}</p>
        </div>
        <div>
          <span className="metadata-label">Pubkey:</span>
          <p className="metadata-value">{event.pubkey}</p>
        </div>
      </div>

      {/* Specific layout for product events */}
      {event.kind === 30402 && productDetails && (
        <div className="product-card">
          <h3 className="product-title">{productDetails.title}</h3>
          <div className="product-details">
            <div>
              <span className="product-detail-label">Price:</span>{" "}
              {productDetails.priceDisplay}
            </div>
            <div>
              <span className="product-detail-label">Stock:</span>{" "}
              {productDetails.stock}
            </div>
            <div>
              <span className="product-detail-label">Type:</span>{" "}
              {productDetails.typeDisplay}
            </div>
          </div>
          <p className="product-description">{event.content}</p>
        </div>
      )}

      {/* For encrypted messages */}
      {event.kind === 1059 && (
        <div className="message-box">
          <div className="message-icon">
            <span>📨</span>
            <span>
              {isEncrypted(event.content) ? "Encrypted Message" : "Message"}
            </span>
          </div>
          {isEncrypted(event.content) && (
            <p className="encrypted-notice">Content is encrypted</p>
          )}
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="detail-button"
      >
        {expanded ? "Show less" : "Show more details"}
      </button>

      {expanded && (
        <div className="expanded-content">
          <div className="expanded-section">
            <h4 className="section-heading">Tags</h4>
            <TagsDisplay tags={event.tags} />
          </div>

          <div className="expanded-section">
            <h4 className="section-heading">Content</h4>
            <div className="code-block">
              <pre>{event.content.length > 100 && !expanded
                ? `${event.content.substring(0, 100)}...`
                : event.content}</pre>
            </div>
          </div>

          <div className="expanded-section">
            <h4 className="section-heading">Raw Event</h4>
            <div className="code-block">
              <pre>{JSON.stringify(event, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main App component
function App() {
  const { events, addEvent } = useEventStore();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const connectToRelay = async () => {
      try {
        setIsLoading(true);
        const ndk = new NDK({
          explicitRelayUrls: [config.relay],
        });

        await ndk.connect();
        setIsConnected(true);

        // Subscribe to new events
        const subscription = ndk.subscribe({
          kinds: [1059, 30402],
        });

        subscription.on("event", (event) => {
          console.log("Received event", event);
          addEvent(event.rawEvent());
        });

        setIsLoading(false);
      } catch (err) {
        console.error("Failed to connect:", err);
        setError("Failed to connect to relay");
        setIsLoading(false);
      }
    };

    connectToRelay();
  }, [addEvent]);

  return (
    <div className="container">
      <header>
        <h1>Relay Maestro</h1>
        <div className="connection-status">
          <div
            className={`status-indicator ${
              isConnected ? "status-connected" : "status-disconnected"
            }`}
          >
          </div>
          <span>{isConnected ? "Connected to relay" : "Disconnected"}</span>
        </div>
      </header>

      {isLoading
        ? (
          <div className="loading">
            <p>Loading events...</p>
          </div>
        )
        : error
        ? (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )
        : (
          <div className="event-container">
            <div className="event-header-section">
              <h2>Events ({events.length})</h2>
              <div className="last-updated">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>

            {events.length === 0
              ? (
                <div className="no-events">
                  <p>No events received yet</p>
                </div>
              )
              : (
                <div className="event-list">
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
          </div>
        )}

      <footer>
        <p>Monitoring Nostr events - {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default App;
