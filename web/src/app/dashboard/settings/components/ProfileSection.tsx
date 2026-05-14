"use client";

import { useEffect, useState } from "react";
import { Mail, Calendar, Shield, Zap } from "lucide-react";
import { supabase } from "@/app/supabase";
import type { User } from "@supabase/supabase-js";

export default function ProfileSection() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??";
  const displayName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email?.split("@")[0] ??
    "—";
  const provider = user?.app_metadata?.provider ?? "email";
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";
  const lastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <section className="ig-settings-section">
      <div className="ig-settings-head">
        <h2 className="ig-settings-title">Profile</h2>
        <p className="ig-settings-desc">
          Your account information from Google OAuth.
        </p>
      </div>

      <div className="ig-profile-card">
        <div className="ig-avatar">{initials}</div>
        <div className="ig-profile-info">
          <span className="ig-profile-name">{displayName}</span>
          <span className="ig-profile-email">{user?.email ?? "—"}</span>
          <div className="ig-profile-badges">
            <span className="ig-profile-badge ig-profile-badge--accent">
              <Zap size={9} />
              Free plan
            </span>
            <span className="ig-profile-badge">
              <Shield size={9} />
              {provider}
            </span>
          </div>
        </div>
      </div>

      <div className="ig-fields-grid">
        <div className="ig-field">
          <span className="ig-field-label">
            <Mail
              size={9}
              style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }}
            />
            Email
          </span>
          <div className="ig-field-value ig-field-value--mono">
            {user?.email ?? "—"}
          </div>
        </div>

        <div className="ig-field">
          <span className="ig-field-label">Auth provider</span>
          <div className="ig-field-value" style={{ textTransform: "capitalize" }}>
            {provider}
          </div>
        </div>

        <div className="ig-field">
          <span className="ig-field-label">
            <Calendar
              size={9}
              style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }}
            />
            Member since
          </span>
          <div className="ig-field-value">{createdAt}</div>
        </div>

        <div className="ig-field">
          <span className="ig-field-label">Last sign in</span>
          <div className="ig-field-value">{lastSignIn}</div>
        </div>

        <div className="ig-field ig-field--full">
          <span className="ig-field-label">User ID</span>
          <div className="ig-field-value ig-field-value--mono">
            {user?.id ?? "—"}
          </div>
        </div>
      </div>
    </section>
  );
}
