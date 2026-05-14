"use client";

import type { AssetClass, NetWorthSnapshot } from "@networth/shared";
import { useMemo, useState } from "react";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  cash: "Cash",
  equity: "Equity",
  retirement: "Retirement",
  alternative: "Alternative",
  hard_asset: "Hard Asset",
  liability: "Liability"
};

type SortField = "value" | "gainLoss" | "name" | "institution";

interface HoldingRow {
  id: string;
  name: string;
  symbol?: string;
  value: number;
  costBasis?: number;
  gainLoss: number | null;
  assetClass: AssetClass;
  institution: string;
}

interface HoldingsTableProps {
  snapshot: NetWorthSnapshot;
}

export function HoldingsTable({ snapshot }: HoldingsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [assetClassFilter, setAssetClassFilter] = useState<AssetClass | "all">("all");
  const [institutionFilter, setInstitutionFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("value");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [includeLiabilities, setIncludeLiabilities] = useState(true);

  const holdings = useMemo<HoldingRow[]>(
    () =>
      snapshot.accounts.flatMap((account) =>
        account.holdings.map((holding) => ({
          id: holding.id,
          name: holding.name,
          symbol: holding.symbol,
          value: holding.value,
          costBasis: holding.costBasis,
          gainLoss: holding.costBasis ? holding.value - holding.costBasis : null,
          assetClass: holding.assetClass,
          institution: account.institution
        }))
      ),
    [snapshot]
  );

  const institutions = useMemo(
    () => Array.from(new Set(holdings.map((holding) => holding.institution))).sort(),
    [holdings]
  );

  const filteredHoldings = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return holdings.filter((holding) => {
      if (!includeLiabilities && holding.assetClass === "liability") {
        return false;
      }

      if (assetClassFilter !== "all" && holding.assetClass !== assetClassFilter) {
        return false;
      }

      if (institutionFilter !== "all" && holding.institution !== institutionFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        holding.name.toLowerCase().includes(normalizedQuery) ||
        (holding.symbol ?? "").toLowerCase().includes(normalizedQuery)
      );
    });
  }, [assetClassFilter, holdings, includeLiabilities, institutionFilter, searchQuery]);

  const sortedHoldings = useMemo(() => {
    const directionMultiplier = sortDirection === "asc" ? 1 : -1;
    return [...filteredHoldings].sort((left, right) => {
      if (sortField === "name") {
        return left.name.localeCompare(right.name) * directionMultiplier;
      }

      if (sortField === "institution") {
        return left.institution.localeCompare(right.institution) * directionMultiplier;
      }

      if (sortField === "gainLoss") {
        const leftValue = left.gainLoss ?? Number.NEGATIVE_INFINITY;
        const rightValue = right.gainLoss ?? Number.NEGATIVE_INFINITY;
        return (leftValue - rightValue) * directionMultiplier;
      }

      return (left.value - right.value) * directionMultiplier;
    });
  }, [filteredHoldings, sortDirection, sortField]);

  return (
    <>
      <div className="table-controls">
        <label className="control-field">
          <span>Search</span>
          <input
            className="control-input"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Name or ticker"
          />
        </label>
        <label className="control-field">
          <span>Asset Class</span>
          <select
            className="control-select"
            value={assetClassFilter}
            onChange={(event) =>
              setAssetClassFilter(event.target.value as AssetClass | "all")
            }
          >
            <option value="all">All</option>
            {Object.entries(ASSET_CLASS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="control-field">
          <span>Institution</span>
          <select
            className="control-select"
            value={institutionFilter}
            onChange={(event) => setInstitutionFilter(event.target.value)}
          >
            <option value="all">All</option>
            {institutions.map((institution) => (
              <option key={institution} value={institution}>
                {institution}
              </option>
            ))}
          </select>
        </label>
        <label className="control-field">
          <span>Sort By</span>
          <select
            className="control-select"
            value={sortField}
            onChange={(event) => setSortField(event.target.value as SortField)}
          >
            <option value="value">Market Value</option>
            <option value="gainLoss">Gain/Loss</option>
            <option value="name">Holding Name</option>
            <option value="institution">Institution</option>
          </select>
        </label>
        <label className="control-field">
          <span>Direction</span>
          <select
            className="control-select"
            value={sortDirection}
            onChange={(event) => setSortDirection(event.target.value as "asc" | "desc")}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </label>
        <label className="control-checkbox">
          <input
            checked={includeLiabilities}
            onChange={(event) => setIncludeLiabilities(event.target.checked)}
            type="checkbox"
          />
          Include liabilities
        </label>
      </div>
      <p className="table-meta">
        Showing {sortedHoldings.length} of {holdings.length} holdings
      </p>
      <table>
        <thead>
          <tr>
            <th>Holding</th>
            <th>Symbol</th>
            <th>Institution</th>
            <th>Class</th>
            <th>Market Value</th>
            <th>Cost Basis</th>
            <th>Gain/Loss</th>
          </tr>
        </thead>
        <tbody>
          {sortedHoldings.map((holding) => {
            const gainLossClassName =
              holding.gainLoss === null
                ? ""
                : holding.gainLoss < 0
                  ? "negative"
                  : "positive";

            return (
              <tr key={holding.id}>
                <td>{holding.name}</td>
                <td>{holding.symbol ?? "-"}</td>
                <td>{holding.institution}</td>
                <td>
                  <span className={`asset-pill asset-pill-${holding.assetClass}`}>
                    {ASSET_CLASS_LABELS[holding.assetClass]}
                  </span>
                </td>
                <td>{currencyFormatter.format(holding.value)}</td>
                <td>
                  {holding.costBasis ? currencyFormatter.format(holding.costBasis) : "-"}
                </td>
                <td className={gainLossClassName}>
                  {holding.gainLoss === null
                    ? "-"
                    : currencyFormatter.format(holding.gainLoss)}
                </td>
              </tr>
            );
          })}
          {sortedHoldings.length === 0 ? (
            <tr>
              <td colSpan={7}>No holdings match your current filters.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </>
  );
}
