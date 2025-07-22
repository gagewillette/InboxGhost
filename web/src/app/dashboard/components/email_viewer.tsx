"use client";

import { useEffect } from "react";
import { useEmails } from "../contexts/email_context";
import type { EmailContextType } from "../contexts/email_context";
import type { EmailThread } from "@/app/types";
import { supabase } from "@/app/supabase";
import { triggerEmailSync } from "../lib/emails";

export default function EmailViewer() {
  const emailContextData: EmailContextType = useEmails();

  useEffect(() => {}, []);

  return (
    <>
      <SubHeader data={emailContextData} />
      {/* Local refactor of refresh and 'importance' buttons */}
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

function SubHeader({ data }: { data: EmailContextType }) {
  const refreshHandler = () => {
    data.refresh();
  };

  const pollHandler = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user_id = session?.user?.id;

    if (!user_id) {
      console.error("no id");
      return;
    }

    triggerEmailSync(user_id);
  };

  const deleteHandler = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;

    if (!accessToken) {
      console.error("No access token found.");
      return;
    }

    const res = await fetch(
      "https://zvhhoepsfpotpuaenrpp.supabase.co/functions/v1/delete-emails",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name: "Functions" }),
      }
    );

    if (!res.ok) {
      console.error("Failed to delete emails:", await res.text());
    } else {
      console.info("Emails deleted successfully.");
    }
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
          onClick={pollHandler}
          className="text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-900"
        >
          Poll New Emails
        </button>

        <button
          type="button"
          onClick={deleteHandler}
          className="text-white bg-orange-700 hover:bg-orngae-800 focus:outline-none focus:ring-4 focus:ring-orange-300 font-medium rounded-full text-sm px-5 py-2.5 text-center mb-2 dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-900"
        >
          Fucking Nuke the DB
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
    </>
  );
}

function ThreadListElement(thread: EmailThread) {
  return (
    <>
      <div className="w-full bg-gray-900 hover:bg-gray-400 hover:cursor-pointer text-white flex flex-col border border-white/20 border-[0.5px] p-1">
        <span className="font-bold">{thread.subject}</span>
        <div className="flex flex-row gap-4">
          <span className="font-light text-xs">{thread.thread_id}</span>
          <span className="font-light text-xs">{thread.last_message_at}</span>
        </div>
      </div>
    </>
  );
}
