export default function FinalCTAButton({ onSignIn }: { onSignIn: () => void }) {
  return (
    <>
      <button className="ig-primary-btn ig-primary-btn-lg" onClick={onSignIn}>
        Connect Gmail <span className="ig-arrow">→</span>
      </button>
    </>
  );
}
