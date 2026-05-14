import {
  accountLabels,
  dummyNetWorthHistory,
  dummySnapshot,
  filterHistoryByRange,
  summarizeByAssetClass,
  summarizeSnapshot,
  topMovers,
  type AssetClass,
  type TrendRangeKey
} from "@networth/shared";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import Svg, { Circle, Line as SvgLine, Path, Polyline } from "react-native-svg";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

const currencyCompactFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const RANGE_OPTIONS: TrendRangeKey[] = ["1D", "5D", "1M", "YTD", "1Y", "5Y", "MAX"];

const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  cash: "Cash",
  equity: "Equity",
  retirement: "Retirement",
  alternative: "Alternative",
  hard_asset: "Hard Asset",
  liability: "Liability"
};

const ASSET_CLASS_COLORS: Record<AssetClass, string> = {
  cash: "#10b981",
  equity: "#4f46e5",
  retirement: "#0284c7",
  alternative: "#f59e0b",
  hard_asset: "#db2777",
  liability: "#ef4444"
};

const ACCOUNT_COLORS = [
  "#0f172a",
  "#1d4ed8",
  "#047857",
  "#7c3aed",
  "#be185d",
  "#ea580c",
  "#0f766e",
  "#9f1239"
];

type SortField = "value" | "gainLoss" | "dayChangePct";

function polarToCartesian(centerX: number, centerY: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians)
  };
}

function describeSlice(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${centerX} ${centerY} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

function downsampleHistory<T>(values: T[], maxPoints: number): T[] {
  if (values.length <= maxPoints) {
    return values;
  }

  const step = Math.ceil(values.length / maxPoints);
  return values.filter((_, index) => index % step === 0 || index === values.length - 1);
}

function formatTrendTimestamp(timestampIso: string, range: TrendRangeKey): string {
  const timestamp = new Date(timestampIso);

  if (range === "1D") {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(timestamp);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(timestamp);
}

function formatXAxisTick(timestampIso: string, range: TrendRangeKey): string {
  const timestamp = new Date(timestampIso);
  if (range === "1D") {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit"
    }).format(timestamp);
  }

  if (range === "5Y" || range === "MAX") {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "2-digit"
    }).format(timestamp);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(timestamp);
}

type MetricCardProps = {
  label: string;
  value: string;
  color: string;
};

function MetricCard({ label, value, color }: MetricCardProps) {
  return (
    <View style={[styles.metricCard, { borderTopColor: color }]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export default function App() {
  const { width } = useWindowDimensions();
  const summary = summarizeSnapshot(dummySnapshot);
  const assetClassTotals = summarizeByAssetClass(dummySnapshot);
  const movers = topMovers(dummySnapshot, 3);
  const labelsByAccount = accountLabels(dummySnapshot);
  const accountIds = Object.keys(labelsByAccount);

  const [selectedRange, setSelectedRange] = useState<TrendRangeKey>("1M");
  const [showNetWorth, setShowNetWorth] = useState(true);
  const [selectedAssetClasses, setSelectedAssetClasses] = useState<AssetClass[]>([
    "equity",
    "retirement"
  ]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(["acct-schwab"]);
  const [selectedPieAssetClass, setSelectedPieAssetClass] = useState<AssetClass>("equity");
  const [searchQuery, setSearchQuery] = useState("");
  const [assetClassFilter, setAssetClassFilter] = useState<AssetClass | "all">("all");
  const [sortField, setSortField] = useState<SortField>("value");
  const [includeLiabilities, setIncludeLiabilities] = useState(true);
  const [scrubbedIndex, setScrubbedIndex] = useState<number | null>(null);

  const history = useMemo(() => {
    const byRange = filterHistoryByRange(dummyNetWorthHistory, selectedRange);
    return downsampleHistory(byRange, selectedRange === "1D" ? 32 : 96);
  }, [selectedRange]);

  const pieData = useMemo(() => {
    const entries = (Object.keys(assetClassTotals) as AssetClass[])
      .map((assetClass) => ({
        assetClass,
        label: ASSET_CLASS_LABELS[assetClass],
        value: assetClassTotals[assetClass]
      }))
      .filter((entry) => entry.value > 0);

    const total = entries.reduce((sum, entry) => sum + entry.value, 0);
    let currentAngle = -90;

    return entries.map((entry) => {
      const span = total === 0 ? 0 : (entry.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + span;
      currentAngle = endAngle;
      return {
        ...entry,
        total,
        path: describeSlice(110, 110, 88, startAngle, endAngle),
        percent: total === 0 ? 0 : entry.value / total
      };
    });
  }, [assetClassTotals]);

  const selectedPieData = pieData.find((slice) => slice.assetClass === selectedPieAssetClass);

  const lines = useMemo(() => {
    const series: Array<{ id: string; label: string; color: string; values: number[] }> = [];

    if (showNetWorth) {
      series.push({
        id: "netWorth",
        label: "Net Worth",
        color: "#0f172a",
        values: history.map((point) => point.netWorth)
      });
    }

    selectedAssetClasses.forEach((assetClass) => {
      series.push({
        id: `asset-${assetClass}`,
        label: ASSET_CLASS_LABELS[assetClass],
        color: ASSET_CLASS_COLORS[assetClass],
        values: history.map((point) => point.byAssetClass[assetClass])
      });
    });

    selectedAccounts.forEach((accountId) => {
      const index = accountIds.indexOf(accountId);
      series.push({
        id: `account-${accountId}`,
        label: labelsByAccount[accountId],
        color: ACCOUNT_COLORS[index % ACCOUNT_COLORS.length],
        values: history.map((point) => point.byAccount[accountId] ?? 0)
      });
    });

    return series;
  }, [accountIds, history, labelsByAccount, selectedAccounts, selectedAssetClasses, showNetWorth]);

  const chartWidth = Math.max(width - 44, 320);
  const chartHeight = 220;
  const chartPadding = 20;

  const chartGeometry = useMemo(() => {
    const allValues = lines.flatMap((line) => line.values);
    const minValue = Math.min(...allValues, 0);
    const maxValue = Math.max(...allValues, 1);
    const range = maxValue - minValue || 1;

    const toY = (value: number) =>
      chartHeight - chartPadding - ((value - minValue) / range) * (chartHeight - chartPadding * 2);

    const toX = (index: number) =>
      chartPadding + (index / Math.max(history.length - 1, 1)) * (chartWidth - chartPadding * 2);

    const xCoordinates = history.map((_, index) => toX(index));
    const polylines = lines.map((line) => {
      const coordinates = line.values.map((value, index) => ({
        x: toX(index),
        y: toY(value)
      }));

      return {
        ...line,
        coordinates,
        points: coordinates.map((coordinate) => `${coordinate.x},${coordinate.y}`).join(" ")
      };
    });

    return { polylines, minValue, maxValue, xCoordinates };
  }, [chartHeight, chartPadding, chartWidth, history.length, lines]);

  const xAxisTicks = useMemo(() => {
    if (history.length === 0) {
      return [];
    }

    const indexSet = new Set([0, Math.floor((history.length - 1) / 2), history.length - 1]);
    return [...indexSet]
      .sort((left, right) => left - right)
      .map((index) => ({
        index,
        label: formatXAxisTick(history[index].timestampIso, selectedRange)
      }));
  }, [history, selectedRange]);

  const scrubbedPoint = scrubbedIndex === null ? null : history[scrubbedIndex] ?? null;
  const scrubbedLineValues =
    scrubbedIndex === null
      ? []
      : chartGeometry.polylines
          .map((line) => ({
            id: line.id,
            label: line.label,
            color: line.color,
            value: line.values[scrubbedIndex]
          }))
          .filter((line) => typeof line.value === "number");

  const holdings = useMemo(
    () =>
      dummySnapshot.accounts.flatMap((account) =>
        account.holdings.map((holding) => ({
          id: holding.id,
          name: holding.name,
          symbol: holding.symbol,
          institution: account.institution,
          assetClass: holding.assetClass,
          value: holding.value,
          dayChangePct: holding.dayChangePct ?? 0,
          gainLoss: holding.costBasis ? holding.value - holding.costBasis : null
        }))
      ),
    []
  );

  const filteredHoldings = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const sorted = holdings
      .filter((holding) => {
        if (!includeLiabilities && holding.assetClass === "liability") {
          return false;
        }
        if (assetClassFilter !== "all" && holding.assetClass !== assetClassFilter) {
          return false;
        }
        if (!normalizedSearch) {
          return true;
        }
        return (
          holding.name.toLowerCase().includes(normalizedSearch) ||
          (holding.symbol ?? "").toLowerCase().includes(normalizedSearch)
        );
      })
      .sort((left, right) => {
        if (sortField === "gainLoss") {
          return (right.gainLoss ?? Number.NEGATIVE_INFINITY) - (left.gainLoss ?? Number.NEGATIVE_INFINITY);
        }

        if (sortField === "dayChangePct") {
          return right.dayChangePct - left.dayChangePct;
        }

        return right.value - left.value;
      });

    return sorted;
  }, [assetClassFilter, holdings, includeLiabilities, searchQuery, sortField]);

  const toggleAssetClassLine = (assetClass: AssetClass) => {
    setSelectedAssetClasses((current) =>
      current.includes(assetClass)
        ? current.filter((value) => value !== assetClass)
        : [...current, assetClass]
    );
  };

  const toggleAccountLine = (accountId: string) => {
    setSelectedAccounts((current) =>
      current.includes(accountId)
        ? current.filter((value) => value !== accountId)
        : [...current, accountId]
    );
  };

  const handleTrendScrub = (locationX: number) => {
    if (history.length === 0) {
      return;
    }

    const minX = chartPadding;
    const maxX = chartWidth - chartPadding;
    const clampedX = Math.max(minX, Math.min(maxX, locationX));
    const ratio = (clampedX - minX) / Math.max(maxX - minX, 1);
    const index = Math.round(ratio * (history.length - 1));
    setScrubbedIndex(index);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Net Worth Tracker</Text>
        <Text style={styles.subtitle}>Native dashboard with chart-driven drill down</Text>

        <View style={styles.metricGrid}>
          <MetricCard
            label="Net Worth"
            value={currencyFormatter.format(summary.netWorth)}
            color="#4f46e5"
          />
          <MetricCard
            label="Total Assets"
            value={currencyFormatter.format(summary.totalAssets)}
            color="#10b981"
          />
          <MetricCard
            label="Liabilities"
            value={currencyFormatter.format(summary.totalLiabilities)}
            color="#ef4444"
          />
          <MetricCard
            label="Unrealized P/L"
            value={currencyFormatter.format(summary.unrealizedGain)}
            color="#f59e0b"
          />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Daily Movers</Text>
          <View style={styles.moverColumns}>
            <View style={[styles.moverCard, styles.gainersCard]}>
              <Text style={styles.moverTitle}>Top Gainers</Text>
              {movers.gainers.map((mover) => (
                <View key={mover.id} style={styles.moverRow}>
                  <Text style={styles.moverName}>{mover.symbol ?? mover.name}</Text>
                  <Text style={styles.positive}>
                    +{percentFormatter.format(mover.dayChangePct / 100)}
                  </Text>
                </View>
              ))}
            </View>
            <View style={[styles.moverCard, styles.losersCard]}>
              <Text style={styles.moverTitle}>Top Losers</Text>
              {movers.losers.map((mover) => (
                <View key={mover.id} style={styles.moverRow}>
                  <Text style={styles.moverName}>{mover.symbol ?? mover.name}</Text>
                  <Text style={styles.negative}>
                    {percentFormatter.format(mover.dayChangePct / 100)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Asset Class Allocation</Text>
          <Svg width={220} height={220} style={styles.pieChart}>
            {pieData.map((slice) => (
              <Path
                key={slice.assetClass}
                d={slice.path}
                fill={ASSET_CLASS_COLORS[slice.assetClass]}
                opacity={slice.assetClass === selectedPieAssetClass ? 1 : 0.76}
                onPress={() => setSelectedPieAssetClass(slice.assetClass)}
              />
            ))}
          </Svg>
          {selectedPieData ? (
            <Text style={styles.pieMeta}>
              {selectedPieData.label}: {currencyFormatter.format(selectedPieData.value)} (
              {percentFormatter.format(selectedPieData.percent)})
            </Text>
          ) : null}
          <View style={styles.legendWrap}>
            {pieData.map((slice) => (
              <Pressable
                key={slice.assetClass}
                onPress={() => setSelectedPieAssetClass(slice.assetClass)}
                style={[
                  styles.legendChip,
                  selectedPieAssetClass === slice.assetClass && styles.legendChipActive
                ]}
              >
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: ASSET_CLASS_COLORS[slice.assetClass] }
                  ]}
                />
                <Text style={styles.legendChipText}>{slice.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Net Worth Trend</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {RANGE_OPTIONS.map((range) => (
              <Pressable
                key={range}
                onPress={() => setSelectedRange(range)}
                style={[styles.filterChip, selectedRange === range && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedRange === range && styles.filterChipTextActive
                  ]}
                >
                  {range}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.toggleSection}>
            <Pressable
              onPress={() => setShowNetWorth((value) => !value)}
              style={[styles.togglePill, showNetWorth && styles.togglePillActive]}
            >
              <Text style={[styles.togglePillText, showNetWorth && styles.togglePillTextActive]}>
                Net Worth
              </Text>
            </Pressable>
            {(Object.keys(ASSET_CLASS_LABELS) as AssetClass[]).map((assetClass) => (
              <Pressable
                key={assetClass}
                onPress={() => toggleAssetClassLine(assetClass)}
                style={[
                  styles.togglePill,
                  selectedAssetClasses.includes(assetClass) && styles.togglePillActive
                ]}
              >
                <Text
                  style={[
                    styles.togglePillText,
                    selectedAssetClasses.includes(assetClass) && styles.togglePillTextActive
                  ]}
                >
                  {ASSET_CLASS_LABELS[assetClass]}
                </Text>
              </Pressable>
            ))}
            {accountIds.map((accountId) => (
              <Pressable
                key={accountId}
                onPress={() => toggleAccountLine(accountId)}
                style={[
                  styles.togglePill,
                  selectedAccounts.includes(accountId) && styles.togglePillActive
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.togglePillText,
                    selectedAccounts.includes(accountId) && styles.togglePillTextActive
                  ]}
                >
                  {labelsByAccount[accountId]}
                </Text>
              </Pressable>
            ))}
          </View>

          <View
            style={styles.lineChartContainer}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(event) => handleTrendScrub(event.nativeEvent.locationX)}
            onResponderMove={(event) => handleTrendScrub(event.nativeEvent.locationX)}
            onResponderRelease={() => setScrubbedIndex(null)}
            onResponderTerminate={() => setScrubbedIndex(null)}
          >
            <Svg width={chartWidth} height={chartHeight} style={styles.lineChart}>
              {chartGeometry.polylines.map((line) => (
                <Polyline
                  key={line.id}
                  points={line.points}
                  fill="none"
                  stroke={line.color}
                  strokeWidth={line.id === "netWorth" ? 2.8 : 1.8}
                />
              ))}
              {scrubbedIndex !== null ? (
                <SvgLine
                  x1={chartGeometry.xCoordinates[scrubbedIndex]}
                  y1={chartPadding}
                  x2={chartGeometry.xCoordinates[scrubbedIndex]}
                  y2={chartHeight - chartPadding}
                  stroke="#334155"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
              ) : null}
              {scrubbedIndex !== null
                ? chartGeometry.polylines.map((line) => {
                    const coordinate = line.coordinates[scrubbedIndex];
                    if (!coordinate) {
                      return null;
                    }

                    return (
                      <Circle
                        key={`${line.id}-scrub-point`}
                        cx={coordinate.x}
                        cy={coordinate.y}
                        r={3.7}
                        fill={line.color}
                      />
                    );
                  })
                : null}
            </Svg>
          </View>
          <View style={styles.axisRow}>
            <Text style={styles.axisText}>{currencyCompactFormatter.format(chartGeometry.minValue)}</Text>
            <Text style={styles.axisText}>{currencyCompactFormatter.format(chartGeometry.maxValue)}</Text>
          </View>
          <View style={styles.xAxisRow}>
            {xAxisTicks.map((tick) => (
              <Text key={`x-axis-${tick.index}`} style={styles.xAxisText}>
                {tick.label}
              </Text>
            ))}
          </View>
          {scrubbedPoint ? (
            <View style={styles.scrubTooltip}>
              <Text style={styles.scrubTooltipDate}>
                {formatTrendTimestamp(scrubbedPoint.timestampIso, selectedRange)}
              </Text>
              {scrubbedLineValues.slice(0, 6).map((line) => (
                <View key={line.id} style={styles.scrubTooltipRow}>
                  <View style={styles.scrubTooltipLabelWrap}>
                    <View style={[styles.scrubTooltipDot, { backgroundColor: line.color }]} />
                    <Text style={styles.scrubTooltipLabel}>{line.label}</Text>
                  </View>
                  <Text style={styles.scrubTooltipValue}>
                    {currencyCompactFormatter.format(line.value)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.scrubHint}>Drag your finger across the chart to inspect values.</Text>
          )}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Holdings</Text>
          <TextInput
            placeholder="Search holding or ticker"
            placeholderTextColor="#64748b"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <Pressable
              onPress={() => setAssetClassFilter("all")}
              style={[styles.filterChip, assetClassFilter === "all" && styles.filterChipActive]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  assetClassFilter === "all" && styles.filterChipTextActive
                ]}
              >
                All
              </Text>
            </Pressable>
            {(Object.keys(ASSET_CLASS_LABELS) as AssetClass[]).map((assetClass) => (
              <Pressable
                key={assetClass}
                onPress={() => setAssetClassFilter(assetClass)}
                style={[
                  styles.filterChip,
                  assetClassFilter === assetClass && styles.filterChipActive
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    assetClassFilter === assetClass && styles.filterChipTextActive
                  ]}
                >
                  {ASSET_CLASS_LABELS[assetClass]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.holdingActions}>
            <Pressable
              onPress={() =>
                setSortField((current) =>
                  current === "value"
                    ? "gainLoss"
                    : current === "gainLoss"
                      ? "dayChangePct"
                      : "value"
                )
              }
              style={styles.actionButton}
            >
              <Text style={styles.actionButtonText}>Sort: {sortField}</Text>
            </Pressable>
            <Pressable
              onPress={() => setIncludeLiabilities((current) => !current)}
              style={[styles.actionButton, includeLiabilities && styles.actionButtonActive]}
            >
              <Text style={[styles.actionButtonText, includeLiabilities && styles.actionButtonTextActive]}>
                Include liabilities
              </Text>
            </Pressable>
          </View>

          {filteredHoldings.slice(0, 14).map((holding) => (
            <View key={holding.id} style={styles.holdingRow}>
              <View style={styles.holdingLeft}>
                <Text style={styles.holdingName}>{holding.symbol ?? holding.name}</Text>
                <Text style={styles.holdingMeta}>
                  {holding.institution} • {ASSET_CLASS_LABELS[holding.assetClass]}
                </Text>
              </View>
              <View style={styles.holdingRight}>
                <Text style={styles.holdingValue}>{currencyFormatter.format(holding.value)}</Text>
                <Text
                  style={
                    sortField === "gainLoss"
                      ? (holding.gainLoss ?? 0) >= 0
                        ? styles.positive
                        : styles.negative
                      : holding.dayChangePct >= 0
                        ? styles.positive
                        : styles.negative
                  }
                >
                  {sortField === "gainLoss"
                    ? currencyFormatter.format(holding.gainLoss ?? 0)
                    : percentFormatter.format(holding.dayChangePct / 100)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eef2ff"
  },
  content: {
    padding: 18,
    gap: 14
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a"
  },
  subtitle: {
    color: "#475569",
    marginTop: -8
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  metricCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderTopWidth: 4,
    borderColor: "#dbe6fb",
    padding: 12,
    width: "48%"
  },
  metricLabel: {
    fontSize: 12,
    color: "#475569",
    textTransform: "uppercase"
  },
  metricValue: {
    marginTop: 6,
    fontSize: 18,
    color: "#0f172a",
    fontWeight: "700"
  },
  panel: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dbe6fb",
    padding: 14
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a"
  },
  pieChart: {
    alignSelf: "center",
    marginTop: 8
  },
  pieMeta: {
    fontSize: 13,
    color: "#334155",
    textAlign: "center"
  },
  legendWrap: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  legendChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  legendChipActive: {
    backgroundColor: "#eef2ff",
    borderColor: "#4f46e5"
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    marginRight: 7
  },
  legendChipText: {
    fontSize: 12,
    color: "#334155"
  },
  chipScroll: {
    marginTop: 10
  },
  filterChip: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8
  },
  filterChipActive: {
    backgroundColor: "#312e81",
    borderColor: "#312e81"
  },
  filterChipText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "600"
  },
  filterChipTextActive: {
    color: "#ffffff"
  },
  toggleSection: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7
  },
  togglePill: {
    borderWidth: 1,
    borderColor: "#dbe6fb",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 215
  },
  togglePillActive: {
    backgroundColor: "#e0e7ff",
    borderColor: "#a5b4fc"
  },
  togglePillText: {
    fontSize: 11,
    color: "#475569"
  },
  togglePillTextActive: {
    color: "#312e81",
    fontWeight: "600"
  },
  lineChart: {
    borderRadius: 10
  },
  lineChartContainer: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#dbe6fb",
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    overflow: "hidden"
  },
  axisRow: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  axisText: {
    fontSize: 12,
    color: "#64748b"
  },
  xAxisRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  xAxisText: {
    fontSize: 11,
    color: "#64748b"
  },
  scrubTooltip: {
    marginTop: 9,
    borderWidth: 1,
    borderColor: "#dbe6fb",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#f8fafc"
  },
  scrubTooltipDate: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "700",
    marginBottom: 6
  },
  scrubTooltipRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4
  },
  scrubTooltipLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "70%"
  },
  scrubTooltipDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginRight: 6
  },
  scrubTooltipLabel: {
    fontSize: 12,
    color: "#475569"
  },
  scrubTooltipValue: {
    fontSize: 12,
    color: "#0f172a",
    fontWeight: "700"
  },
  scrubHint: {
    marginTop: 8,
    color: "#64748b",
    fontSize: 12
  },
  moverColumns: {
    marginTop: 10,
    gap: 10
  },
  moverCard: {
    borderWidth: 1,
    borderColor: "#dbe6fb",
    borderRadius: 10,
    padding: 10
  },
  gainersCard: {
    backgroundColor: "#ecfdf5"
  },
  losersCard: {
    backgroundColor: "#fef2f2"
  },
  moverTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8
  },
  moverRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6
  },
  moverName: {
    color: "#334155",
    fontWeight: "600"
  },
  searchInput: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: "#0f172a"
  },
  holdingActions: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8
  },
  actionButton: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  actionButtonActive: {
    backgroundColor: "#dcfce7",
    borderColor: "#86efac"
  },
  actionButtonText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "600"
  },
  actionButtonTextActive: {
    color: "#166534"
  },
  holdingRow: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  holdingLeft: {
    maxWidth: "64%"
  },
  holdingRight: {
    alignItems: "flex-end"
  },
  holdingName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a"
  },
  holdingMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748b"
  },
  holdingValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a"
  },
  positive: {
    color: "#059669",
    fontWeight: "700"
  },
  negative: {
    color: "#dc2626",
    fontWeight: "700"
  }
});
