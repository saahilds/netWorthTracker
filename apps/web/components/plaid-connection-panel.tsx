"use client";

import { useEffect, useMemo, useState } from "react";
import { usePlaidLink } from "react-plaid-link";

interface ConnectionSummary {
  id: string;
  institutionName: string;
  status: string;
  accountCount: number;
  supportedCount: number;
  unsupportedCount: number;
  lastSyncedAt: string | null;
}

interface PlaidConnectionPanelProps {
  connections: ConnectionSummary[];
  unsupportedInstitutionPlaceholders: string[];
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short"
});

export function PlaidConnectionPanel({
  connections,
  unsupportedInstitutionPlaceholders
}: PlaidConnectionPanelProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoadingLinkToken, setIsLoadingLinkToken] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const hasConnections = connections.length > 0;

  const createLinkToken = async () => {
    setIsLoadingLinkToken(true);
    setStatusMessage(null);
    try {
      const response = await fetch("/api/plaid/link-token", {
        method: "POST"
      });
      const body = (await response.json()) as { linkToken?: string; error?: string };
      if (!response.ok || !body.linkToken) {
        throw new Error(body.error ?? "Could not create a Plaid link token.");
      }
      setLinkToken(body.linkToken);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to initialize Plaid Link.");
    } finally {
      setIsLoadingLinkToken(false);
    }
  };

  useEffect(() => {
    createLinkToken().catch(() => undefined);
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken) => {
      setStatusMessage("Exchanging public token and syncing your accounts...");
      try {
        const response = await fetch("/api/plaid/exchange-public-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            publicToken
          })
        });
        const body = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(body.error ?? "Plaid token exchange failed.");
        }

        setStatusMessage("Connected successfully. Refreshing dashboard...");
        window.location.reload();
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "Plaid connection failed.");
      }
    },
    onExit: (error) => {
      if (!error) {
        return;
      }

      setStatusMessage(error.display_message || error.error_message || "Plaid flow exited with an error.");
    }
  });

  const manualRefresh = async () => {
    setIsManualSyncing(true);
    setStatusMessage("Running manual refresh across your linked institutions...");
    try {
      const response = await fetch("/api/plaid/sync/manual", {
        method: "POST"
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Manual sync failed.");
      }

      setStatusMessage("Manual refresh completed. Reloading latest snapshot...");
      window.location.reload();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Manual sync failed.");
    } finally {
      setIsManualSyncing(false);
    }
  };

  const connectButtonDisabled = useMemo(
    () => isLoadingLinkToken || !linkToken || !ready,
    [isLoadingLinkToken, linkToken, ready]
  );

  return (
    <section className="panel panel-span-wide">
      <div className="onboarding-header">
        <div>
          <h2>{hasConnections ? "Linked Institutions" : "Get started with Plaid"}</h2>
          <p className="panel-subtitle">
            Connect read-only accounts and run a max-window historical pull on first link.
          </p>
        </div>
        <div className="onboarding-actions">
          <button
            className="action-button"
            disabled={connectButtonDisabled}
            onClick={() => open()}
            type="button"
          >
            {isLoadingLinkToken ? "Preparing Plaid..." : "Connect with Plaid"}
          </button>
          {hasConnections ? (
            <button
              className="action-button subtle-action-button"
              disabled={isManualSyncing}
              onClick={manualRefresh}
              type="button"
            >
              {isManualSyncing ? "Refreshing..." : "Manual Refresh"}
            </button>
          ) : null}
        </div>
      </div>

      {statusMessage ? <p className="status-message">{statusMessage}</p> : null}

      {hasConnections ? (
        <div className="connection-grid">
          {connections.map((connection) => (
            <article className="connection-card" key={connection.id}>
              <h3>{connection.institutionName}</h3>
              <p>Status: {connection.status.toLowerCase()}</p>
              <p>
                Accounts: {connection.accountCount} ({connection.supportedCount} supported,{" "}
                {connection.unsupportedCount} unsupported)
              </p>
              <p>
                Last synced:{" "}
                {connection.lastSyncedAt
                  ? dateFormatter.format(new Date(connection.lastSyncedAt))
                  : "Not synced yet"}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="panel-subtitle">
          No Plaid items connected yet. Connect an institution (e.g. Chase checking) to begin
          syncing holdings, balances, and transactions.
        </p>
      )}

      <div className="unsupported-placeholder-box">
        <h3>Unsupported placeholders (coming soon)</h3>
        <ul>
          {unsupportedInstitutionPlaceholders.map((institution) => (
            <li key={institution}>{institution}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
