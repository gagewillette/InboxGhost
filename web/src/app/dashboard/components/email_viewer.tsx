"use client";

import { useEffect } from "react";
import { useEmails } from "../contexts/email_context";
import type { EmailContextType } from "../contexts/email_context";
import type { Email, EmailThread } from "@/app/types";

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
      <div className="flex flex-row gap-4 min-w-full justify-center">
        <button
          type="button"
          onClick={refreshHandler}
          className="text-white bg-purple-700 hover:bg-purple-800 focus:outline-none focus:ring-4 focus:ring-purple-300 font-medium rounded-full text-sm px-5 py-2.5 text-center mb-2 dark:bg-purple-600 dark:hover:bg-purple-700 dark:focus:ring-purple-900"
        >
          Refresh
        </button>

        <button
          type="button"
          className="text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-300 font-medium rounded-full text-sm px-5 py-2.5 text-center me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
        >
          Low Importance
        </button>
        <button
          type="button"
          className="text-white bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-300 font-medium rounded-full text-sm px-5 py-2.5 text-center me-2 mb-2 dark:focus:ring-yellow-900"
        >
          Med Importance
        </button>
        <button
          type="button"
          className="text-white bg-red-700 hover:bg-red-800 focus:outline-none focus:ring-4 focus:ring-red-300 font-medium rounded-full text-sm px-5 py-2.5 text-center me-2 mb-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900"
        >
          High Importance
        </button>
      </div>

      {emailContextData.loading ? (
        <div>Loading...</div>
      ) : (
        emailContextData.threads.map((thread: EmailThread) => (
          <ThreadListElement key={thread.thread_id} {...thread} />
        ))
      )}
    </>
  );
}

function ThreadListElement(thread: EmailThread) {
  return (
    <>
      <div className="w-full bg-gray-900 text-white flex flex-col border-1">
        <span className="font-bold">{thread.subject}</span>
        <div className="flex flex-row gap-4">
          <span className="font-light text-xs">{thread.thread_id}</span>
          <span className="font-light text-xs">{thread.last_message_at}</span>
        </div>
      </div>
    </>
  );
}
