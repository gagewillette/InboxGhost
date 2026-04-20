import Header from "./components/header";
import EmailViewer from "./components/email_viewer";
import { EmailProvider } from "./contexts/email_context";

export default function Dashboard() {
  return (
    <EmailProvider>
      <div className="ig-dashboard">
        <Header />
        <main className="ig-main">
          <EmailViewer />
        </main>
      </div>
    </EmailProvider>
  );
}
