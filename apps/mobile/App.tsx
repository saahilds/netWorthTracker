import { StatusBar } from "expo-status-bar";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

type MetricCardProps = {
  label: string;
  value: string;
};

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Net Worth Tracker</Text>
        <Text style={styles.subtitle}>Mobile dashboard scaffold (dummy data)</Text>

        <View style={styles.grid}>
          <MetricCard label="Net Worth" value="$102,328.80" />
          <MetricCard label="Total Assets" value="$104,169.12" />
          <MetricCard label="Liabilities" value="$1,840.32" />
          <MetricCard label="Unrealized Gain/Loss" value="$11,039.27" />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Next implementation slice</Text>
          <Text style={styles.panelBody}>
            - Wire shared portfolio API data{"\n"}- Add account drill-down{"\n"}- Add
            holdings table and charts
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f7fb"
  },
  content: {
    padding: 20,
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    minWidth: "47%"
  },
  cardLabel: {
    color: "#475569",
    fontSize: 13
  },
  cardValue: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
    color: "#0f172a"
  },
  panel: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a"
  },
  panelBody: {
    marginTop: 8,
    lineHeight: 20,
    color: "#334155"
  }
});
