export default function Privacy() {
  return (
    <main className="prose prose-invert mx-auto max-w-2xl p-10">
      <h1>Privacy Policy</h1>
      <p>
        Woura is a local-first application. Your Oura data is fetched from the
        official Oura API directly into your browser and stored only on your
        device (browser local storage / IndexedDB).
      </p>
      <ul>
        <li>No health data is ever stored, logged, or processed on any server.</li>
        <li>The built-in API relay passes requests to api.ouraring.com and back without recording anything.</li>
        <li>No analytics, no tracking, no cookies beyond what is technically required.</li>
        <li>No data is ever shared with third parties or any AI system.</li>
        <li>You can delete all locally stored data at any time from the app, and revoke API access at cloud.ouraring.com.</li>
      </ul>
      <p>
        The entire source code is open source, so these claims are verifiable.
      </p>
    </main>
  );
}
