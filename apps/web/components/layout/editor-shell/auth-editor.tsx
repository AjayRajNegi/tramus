"use client";

import * as React from "react";
import type { Authorization, AuthType } from "@/lib/store/editor.store";
import { cn } from "@/lib/utils";

export const createAuthorization = (
  patch: Partial<Authorization> = {},
): Authorization => ({
  password: "",
  token: "",
  type: "none",
  username: "",
  ...patch,
});

type AuthorizationEditorProps = {
  value: Authorization;
  onChange: (value: Authorization) => void;
  readOnly?: boolean;
  className?: string;
};

const AUTH_TYPES: { value: AuthType; label: string }[] = [
  { label: "None", value: "none" },
  { label: "Bearer Token", value: "bearer" },
  { label: "Basic Auth", value: "basic" },
];

const GRID = "grid grid-cols-[8rem_1fr] divide-x divide-accent/30";

const toBase64 = (input: string) => {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
};

export function buildAuthorizationHeader(auth: Authorization): string | null {
  if (auth.type === "bearer" && auth.token) {
    return `Bearer ${auth.token}`;
  }
  if (auth.type === "basic" && (auth.username || auth.password)) {
    return `Basic ${toBase64(`${auth.username}:${auth.password}`)}`;
  }
  return null;
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  secret?: boolean;
  readOnly?: boolean;
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  secret = false,
  readOnly = false,
}: FieldProps) {
  const [revealed, setRevealed] = React.useState(false);
  const id = React.useId();

  return (
    <div className={GRID}>
      <label
        className="flex items-center px-3 py-1.5 text-muted-foreground text-xs"
        htmlFor={id}
      >
        {label}
      </label>
      <div className="flex items-center">
        <input
          autoComplete="off"
          className="w-full bg-transparent px-3 py-1.5 font-mono text-[13px] outline-none placeholder:text-muted-foreground/60 focus-visible:bg-muted/30"
          id={id}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          spellCheck={false}
          type={secret && !revealed ? "password" : "text"}
          value={value}
        />
        {secret && (
          <button
            className="mr-1.5 shrink-0 rounded px-2 py-1 text-muted-foreground text-xs hover:bg-muted hover:text-foreground"
            onClick={() => setRevealed((r) => !r)}
            type="button"
          >
            {revealed ? "Hide" : "Show"}
          </button>
        )}
      </div>
    </div>
  );
}

export function AuthorizationEditor({
  value,
  onChange,
  readOnly = false,
  className,
}: AuthorizationEditorProps) {
  const set = (patch: Partial<Authorization>) =>
    onChange({ ...value, ...patch });

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-accent/30 text-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-accent/30 border-b bg-muted/50 px-2 py-1.5">
        <div
          aria-label="Authorization type"
          className="flex gap-1"
          role="radiogroup"
        >
          {AUTH_TYPES.map((type) => {
            const active = value.type === type.value;
            return (
              <button
                aria-checked={active}
                className={cn(
                  "rounded px-2.5 py-1 font-medium text-xs transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                disabled={readOnly && !active}
                key={type.value}
                onClick={() => set({ type: type.value })}
                role="radio"
                type="button"
              >
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      {value.type === "none" && (
        <div className="px-3 py-10 text-center text-muted-foreground text-xs">
          This request does not use any authorization.
        </div>
      )}

      {value.type === "bearer" && (
        <div className="divide-y">
          <Field
            label="Token"
            onChange={(token) => set({ token })}
            placeholder="Paste your token"
            readOnly={readOnly}
            secret
            value={value.token}
          />
        </div>
      )}

      {value.type === "basic" && (
        <div className="divide-y">
          <Field
            label="Username"
            onChange={(username) => set({ username })}
            placeholder="Username"
            readOnly={readOnly}
            value={value.username}
          />
          <Field
            label="Password"
            onChange={(password) => set({ password })}
            placeholder="Password"
            readOnly={readOnly}
            secret
            value={value.password}
          />
        </div>
      )}

      {/* Header preview */}
      {value.type !== "none" && (
        <div className="border-accent/30 border-t bg-muted/30 px-3 py-1.5 text-muted-foreground text-xs">
          Sent as the{" "}
          <code className="font-mono text-foreground">Authorization</code>
          header
        </div>
      )}
    </div>
  );
}
