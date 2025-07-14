import DashbaordHeader from "./components/header";
import { EmailProvider } from "./contexts/email_context";
import EmailViewer from "./components/email_viewer";

export default function Dashboard() {
  return (
    <>
      <EmailProvider> 
        
        <DashbaordHeader />

        <EmailViewer /> 

      </EmailProvider>
    </>
  );
}
