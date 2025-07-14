"use client";

import { useEffect } from "react";
import { useEmails } from "../contexts/email_context";
import type { EmailContextType } from "../contexts/email_context";
import type { Email } from "@/app/types";

export default function EmailViewer() {
  const emailContextData: EmailContextType = useEmails();

  useEffect(() => {
    emailContextData.refresh();
  }, []);

  const refreshHandler = () => {
    emailContextData.refresh();
  };

  return (
    <>
      <button onClick={refreshHandler}>Refresh</button>

      {emailContextData.loading ? (
        <div>Loading...</div>
      ) : (
        emailContextData.emails.map((email: Email) => (
          <EmailListElement key={email.message_id} {...email} />
        ))
      )}
    </>
  );
}

function EmailListElement(email: Email) {
  return (
    <>
      <div className="w-full bg-gray-900 text-white flex flex-col border-1">
        <span className="font-bold">{email.subject}</span>
        <div className="flex flex-row gap-4">
          <span className="font-light text-xs">{email.message_id}</span>
          <span className="font-light text-xs">{email.internal_date}</span>
        </div>
        <span>{email.snippet}</span>
      </div>
    </>
  );
}
