import { NostrEvent } from '@nostr-dev-kit/ndk'
import { create } from 'zustand'

const useEventStore = create((set) => ({
    events: [] as NostrEvent[],

    addEvent: (event: NostrEvent) => set((state) => {
        const eventExists = state.events.some((e) => e.id === event.id);

        if (!eventExists) {
            return { events: [...state.events, event] };
        }

        return state;
    }),
}))

export default useEventStore
