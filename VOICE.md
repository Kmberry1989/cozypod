# Free voice chat

CozyPod voice uses the browser's native WebRTC support in a peer-to-peer mesh.
For a four-person Pod, each browser sends encrypted audio directly to the other
three browsers. Firebase Realtime Database carries only short-lived connection
offers and network candidates; it never carries or stores the audio.

## Cost and credentials

- No LiveKit, Twilio, Daily, or paid voice credential is required.
- Firebase Authentication and Realtime Database can run on the free Spark plan.
- Host the frontend on GitHub Pages for free.
- Do not deploy the optional `functions/` directory if you want to remain fully
  on the Spark plan. Voice does not use Cloud Functions.

To enable a new Firebase project, turn on Anonymous Authentication, create a
Realtime Database, copy its public web-app configuration into `.env.local`, and
deploy `database.rules.json` with `firebase deploy --only database`.

## Network behavior

The app uses Google's public STUN service to establish direct connections. This
works on normal home, cellular, and office networks. A small percentage of
strict corporate, school, hotel, or symmetric-NAT networks require a TURN relay.
A relay consumes bandwidth and cannot be guaranteed free at scale. If that edge
case matters later, add a self-hosted coturn server or a provider's free tier.

Voice requires HTTPS in production. Browsers ask for microphone permission only
after the player presses the voice button. Leaving voice stops every microphone
track, closes peer connections, removes remote audio elements, and clears the
player's signaling inbox.
