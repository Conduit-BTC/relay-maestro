import "./App.css";
import NDK, { NDKEvent, NostrEvent } from "@nostr-dev-kit/ndk";
import config from "../config";
import useEventStore from "./store/eventStore";

const ndk = new NDK({
  explicitRelayUrls: [config.relay],
});

await ndk.connect();

function App() {
  const { events, addEvent } = useEventStore();

  const subscription = ndk.subscribe({
    kinds: Array.from({ length: 256 }, (_, i) => i),
  });

  subscription.on("event", (event: NDKEvent) => {
    addEvent(event.rawEvent());
  });

  return (
    <>
      <h1>Events</h1>
      <table>
        {events.map((event: NostrEvent) => (
          <tr key={event.id} style={{ textAlign: "left" }}>
            <td>Kind: {event.kind}</td>
            <td>Event ID: {event.id}</td>
            <td>{event.content}</td>
          </tr>
        ))}
      </table>
    </>
  );
}

export default App;
