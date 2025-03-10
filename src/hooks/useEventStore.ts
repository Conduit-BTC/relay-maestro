import { useState, useCallback } from 'react';
import { NostrEvent } from '@nostr-dev-kit/ndk';

const useEventStore = () => {
    const [events, setEvents] = useState<NostrEvent[]>([]);

    const addEvent = useCallback((event: NostrEvent) => {
        setEvents((prevEvents) => {
            const eventExists = prevEvents.some((e) => e.id === event.id);
            if (!eventExists) {
                return [...prevEvents, event];
            }
            return prevEvents;
        });
    }, []);

    return { events, addEvent };
};

export default useEventStore;
