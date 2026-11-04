# id: product
# tags: product,realtime,firebase,supply,drivers
# sum: Ride-hailing for French taxis; Firebase RTDB for live positions, backend authority; own driver fleet

#F durable facts
goal: a ride-hailing app for licensed French taxis (carte pro taxi); dispatch centres take too big a cut, a taxi driver told the user such an app would be valuable
ambiguous business rule: reason from the French taxi driver and passenger use case, ask the user rather than copy another app's rules
realtime decision 2026-09-27: Firebase Realtime Database (Blaze) holds only each online driver's last position and availability (overwritten, presence via onDisconnect); the backend stays the authority (matching, pricing, history in Postgres) and writes ride offers there
rejected for realtime: Google Fleet Engine (contract, no Flutter), HyperTrack (per-driver fee), Firestore (per-write billing), Ably (no geo query, needs Redis), self-hosted WebSocket (maintenance)
supply decision 2026-09-27: own fleet, drivers sign up in the app
rejected for supply: le.taxi (State registry deactivated nationwide 2026-06-12), paid aggregators such as Lyko (they route via dispatch centres); maybe later as fallback behind a taxi-provider port
open outside code: obligations of a centrale de réservation, consumer mediator
