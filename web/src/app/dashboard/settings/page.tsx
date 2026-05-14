import SettingsHeader from "./components/SettingsHeader";
import ProfileSection from "./components/ProfileSection";
import LabelsSection from "./components/LabelsSection";

export default function SettingsPage() {
  return (
    <div className="ig-dashboard">
      <SettingsHeader />
      <main className="ig-main">
        <div className="ig-settings">
          <ProfileSection />
          <LabelsSection />
        </div>
      </main>
    </div>
  );
}
