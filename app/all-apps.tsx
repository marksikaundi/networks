import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { type ComponentProps, useMemo } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { MobileStatsBanner } from "@/components/mobile-stats-banner";
import { StaggeredReveal } from "@/components/ui/staggered-reveal";
import { UsageAccessCard } from "@/components/usage-access-card";
import {
  fonts,
  getMonitorColors,
  type MonitorColors,
} from "@/constants/monitor-theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDailyUsage } from "@/hooks/use-daily-usage";
import { usePhoneStatePermission } from "@/hooks/use-phone-state-permission";

type IconName = ComponentProps<typeof MaterialIcons>["name"];

export default function AllAppsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = useMemo(() => getMonitorColors(colorScheme), [colorScheme]);
  const insets = useSafeAreaInsets();
  const {
    totals,
    wifi,
    mobile,
    topApps: liveTopApps,
    hasAccess,
  } = useDailyUsage();
  const phonePermission = usePhoneStatePermission();

  const showPhoneSettings =
    phonePermission.isAndroid &&
    phonePermission.isModuleAvailable &&
    phonePermission.mobileStatsSupported &&
    !phonePermission.phonePermissionGranted &&
    phonePermission.permissionStatus === "denied" &&
    !phonePermission.canAskAgain;
  const showPhoneRequest =
    phonePermission.isAndroid &&
    phonePermission.isModuleAvailable &&
    phonePermission.mobileStatsSupported &&
    !phonePermission.phonePermissionGranted &&
    !showPhoneSettings;
  const showMobileLimit =
    phonePermission.isAndroid &&
    phonePermission.isModuleAvailable &&
    !phonePermission.mobileStatsSupported;
  const mobileStatsStatus =
    phonePermission.isAndroid && phonePermission.isModuleAvailable
      ? phonePermission.mobileStatsSupported
        ? phonePermission.phonePermissionGranted
          ? "reporting"
          : "needs-permission"
        : "limited"
      : null;

  const displayApps = liveTopApps.length > 0 ? toAllApps(liveTopApps) : [];

  const totalBytes = (totals?.rxBytes ?? 0) + (totals?.txBytes ?? 0);
  const wifiBytes = (wifi?.rxBytes ?? 0) + (wifi?.txBytes ?? 0);
  const mobileBytes = (mobile?.rxBytes ?? 0) + (mobile?.txBytes ?? 0);

  const sortedApps = displayApps.sort(
    (a, b) => b.totalData + b.wifiData - (a.totalData + a.wifiData),
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.screen}>
        <BackgroundGlow colors={colors} />
        <View
          style={[styles.header, { paddingTop: Math.max(insets.top + 12, 20) }]}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              All Apps
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
            Total: {formatBytes(totalBytes)}
          </Text>
        </View>

        {!hasAccess ? (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingTop: 12 }]}
            showsVerticalScrollIndicator={false}
          >
            <StaggeredReveal index={1}>
              <UsageAccessCard colors={colors} visible={true} />
            </StaggeredReveal>
          </ScrollView>
        ) : (
          <FlatList
            data={sortedApps}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, { paddingTop: 12 }]}
            ListHeaderComponent={
              <>
                {(showPhoneSettings || showPhoneRequest || showMobileLimit) && (
                  <View style={{ marginBottom: 16 }}>
                    {showPhoneSettings ? (
                      <PhoneStateAccessCard colors={colors} mode="settings" />
                    ) : null}
                    {showPhoneRequest ? (
                      <PhoneStateAccessCard
                        colors={colors}
                        mode="request"
                        onRequest={phonePermission.requestPermission}
                      />
                    ) : null}
                    {showMobileLimit ? (
                      <PhoneStateAccessCard colors={colors} mode="limited" />
                    ) : null}
                  </View>
                )}
                {mobileStatsStatus ? (
                  <View style={{ marginBottom: 16 }}>
                    <MobileStatsBanner
                      colors={colors}
                      status={mobileStatsStatus}
                    />
                  </View>
                ) : null}
                {sortedApps.length === 0 && (
                  <View
                    style={[
                      styles.emptyState,
                      { alignItems: "center", gap: 12 },
                    ]}
                  >
                    <MaterialIcons name="apps" size={48} color={colors.muted} />
                    <Text
                      style={[styles.emptyStateText, { color: colors.text }]}
                    >
                      No apps using data
                    </Text>
                    <Text
                      style={[
                        styles.emptyStateSubtext,
                        { color: colors.muted },
                      ]}
                    >
                      Data usage will appear here when apps use the network
                    </Text>
                  </View>
                )}
              </>
            }
            renderItem={({ item }) => (
              <View
                style={[
                  styles.appCard,
                  { backgroundColor: colors.card, borderColor: colors.stroke },
                ]}
              >
                <View style={styles.appHeader}>
                  <View style={styles.appInfo}>
                    <View
                      style={[
                        styles.appIconWrap,
                        { backgroundColor: colors.highlight },
                      ]}
                    >
                      <MaterialIcons
                        name={item.icon}
                        size={20}
                        color={colors.accent}
                      />
                    </View>
                    <View style={styles.appDetails}>
                      <Text style={[styles.appName, { color: colors.text }]}>
                        {item.name}
                      </Text>
                      <Text
                        style={[styles.appCategory, { color: colors.muted }]}
                      >
                        Total: {formatBytes(item.totalData)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.dataBreakdown}>
                  <View style={styles.dataItem}>
                    <View style={styles.dataLabel}>
                      <MaterialIcons
                        name="download"
                        size={14}
                        color={colors.accent}
                      />
                      <Text
                        style={[styles.dataLabelText, { color: colors.muted }]}
                      >
                        Download
                      </Text>
                    </View>
                    <Text style={[styles.dataValue, { color: colors.text }]}>
                      {formatBytes(item.downloadData)}
                    </Text>
                  </View>

                  <View style={styles.dataItem}>
                    <View style={styles.dataLabel}>
                      <MaterialIcons
                        name="upload"
                        size={14}
                        color={colors.accentWarm}
                      />
                      <Text
                        style={[styles.dataLabelText, { color: colors.muted }]}
                      >
                        Upload
                      </Text>
                    </View>
                    <Text style={[styles.dataValue, { color: colors.text }]}>
                      {formatBytes(item.uploadData)}
                    </Text>
                  </View>
                </View>

                <View style={styles.networkBreakdown}>
                  <View style={styles.networkItem}>
                    <View
                      style={[
                        styles.networkIndicator,
                        { backgroundColor: colors.accentWarm },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.networkLabel, { color: colors.muted }]}
                      >
                        Mobile Data
                      </Text>
                      <Text
                        style={[styles.networkValue, { color: colors.text }]}
                      >
                        {formatBytes(item.mobileData)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.networkItem}>
                    <View
                      style={[
                        styles.networkIndicator,
                        { backgroundColor: colors.accent },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.networkLabel, { color: colors.muted }]}
                      >
                        Wi-Fi
                      </Text>
                      <Text
                        style={[styles.networkValue, { color: colors.text }]}
                      >
                        {formatBytes(item.wifiData)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function BackgroundGlow({ colors }: { colors: MonitorColors }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.orb,
          styles.orbPrimary,
          { backgroundColor: colors.accentSoft },
        ]}
      />
      <View
        style={[
          styles.orb,
          styles.orbSecondary,
          { backgroundColor: colors.accentWarm, opacity: 0.3 },
        ]}
      />
      <View
        style={[
          styles.orb,
          styles.orbTertiary,
          { backgroundColor: colors.highlight },
        ]}
      />
    </View>
  );
}

function PhoneStateAccessCard({
  colors,
  mode,
  onRequest,
}: {
  colors: MonitorColors;
  mode: "settings" | "request" | "limited";
  onRequest?: () => void;
}) {
  return (
    <View
      style={[
        styles.permissionCard,
        { backgroundColor: colors.highlight, borderColor: colors.stroke },
      ]}
    >
      <View style={styles.permissionContent}>
        <MaterialIcons
          name={
            mode === "settings"
              ? "settings"
              : mode === "request"
                ? "lock"
                : "info"
          }
          size={20}
          color={colors.accent}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.permissionTitle, { color: colors.text }]}>
            {mode === "settings"
              ? "Update Settings"
              : mode === "request"
                ? "Permission Required"
                : "Limited Access"}
          </Text>
          <Text style={[styles.permissionSubtitle, { color: colors.muted }]}>
            {mode === "settings"
              ? "Enable in phone settings"
              : mode === "request"
                ? "Grant permission to view all apps"
                : "Some data unavailable on this device"}
          </Text>
        </View>
      </View>
      {mode === "request" && onRequest && (
        <TouchableOpacity onPress={onRequest} style={[styles.permissionButton]}>
          <Text style={[styles.permissionButtonText, { color: colors.accent }]}>
            Grant
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const getCardStyle = (colors: MonitorColors): ViewStyle => ({
  backgroundColor: colors.card,
  borderColor: colors.stroke,
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: fonts.title,
    flex: 1,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: fonts.body,
    textAlign: "center",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: fonts.title,
  },
  emptyStateSubtext: {
    fontSize: 13,
    fontFamily: fonts.body,
    textAlign: "center",
  },
  appCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  appHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  appInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  appIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  appDetails: {
    flex: 1,
    gap: 2,
  },
  appName: {
    fontSize: 15,
    fontFamily: fonts.title,
  },
  appCategory: {
    fontSize: 12,
    fontFamily: fonts.body,
  },
  dataBreakdown: {
    flexDirection: "row",
    gap: 12,
  },
  dataItem: {
    flex: 1,
    gap: 4,
  },
  dataLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dataLabelText: {
    fontSize: 11,
    fontFamily: fonts.body,
  },
  dataValue: {
    fontSize: 13,
    fontFamily: fonts.title,
  },
  networkBreakdown: {
    gap: 8,
  },
  networkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  networkIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
  },
  networkLabel: {
    fontSize: 11,
    fontFamily: fonts.body,
  },
  networkValue: {
    fontSize: 12,
    fontFamily: fonts.title,
  },
  permissionCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  permissionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  permissionTitle: {
    fontSize: 14,
    fontFamily: fonts.body,
  },
  permissionSubtitle: {
    fontSize: 11,
    fontFamily: fonts.body,
  },
  permissionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  permissionButtonText: {
    fontSize: 12,
    fontFamily: fonts.title,
  },
  orb: {
    position: "absolute",
    borderRadius: 999,
  },
  orbPrimary: {
    width: 240,
    height: 240,
    top: -70,
    right: -70,
  },
  orbSecondary: {
    width: 200,
    height: 200,
    bottom: 200,
    left: -70,
  },
  orbTertiary: {
    width: 150,
    height: 150,
    bottom: -30,
    right: -30,
  },
});

const formatBytes = (bytes: number) => {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${Math.max(0, Math.round(bytes))} B`;
};

interface AllApp {
  id: string;
  name: string;
  icon: IconName;
  totalData: number;
  downloadData: number;
  uploadData: number;
  mobileData: number;
  wifiData: number;
}

const toAllApps = (
  apps: {
    packageName: string;
    appName?: string;
    rxBytes: number;
    txBytes: number;
  }[],
): AllApp[] => {
  return apps.map((app) => ({
    id: app.packageName,
    name: formatPackageName(app.appName, app.packageName),
    icon: "apps" as IconName,
    totalData: app.rxBytes + app.txBytes,
    downloadData: app.rxBytes,
    uploadData: app.txBytes,
    mobileData: app.rxBytes + app.txBytes,
    wifiData: 0,
  }));
};

const formatPackageName = (
  appName: string | undefined,
  packageName: string,
) => {
  const normalizedAppName = appName?.trim();
  if (normalizedAppName) {
    return normalizedAppName;
  }
  const last = packageName.split(".").pop() ?? packageName;
  return last
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};
