/** iOS only allows web push for apps added to the Home Screen. */
export default function InstallSteps() {
  return (
    <ol className="list-decimal space-y-1 pl-5 text-sm">
      <li>
        Open this page in <b>Safari</b>.
      </li>
      <li>
        Tap the <b>Share</b> button (square with an arrow).
      </li>
      <li>
        Tap <b>Add to Home Screen</b>, then <b>Add</b>.
      </li>
      <li>
        Open <b>Spiders</b> from your Home Screen and tap your photo.
      </li>
    </ol>
  );
}
