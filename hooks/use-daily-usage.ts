import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, Platform } from "react-native";

import {
  isModuleAvailable,
  isUsageAccessGranted,
  queryAppUsage,
  queryDeviceUsage,
  type AppUsage,
  type NetworkTotals,
} from "@local/network-monitor";

const HOUR_MS = 60 * 60 * 1000;

export type DailyUsage = {
  totals: NetworkTotals | null;
  wifi: NetworkTotals | null;
  mobile: NetworkTotals | null;
  topApps: AppUsage[];
  hourlyTotals: number[];
  hasAccess: boolean;
  isLiveModule: boolean;
};

const getStartOfDay = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
};

export function useDailyUsage() {
  const [totals, setTotals] = useState<NetworkTotals | null>(null);
  const [wifi, setWifi] = useState<NetworkTotals | null>(null);
  const [mobile, setMobile] = useState<NetworkTotals | null>(null);
  const [topApps, setTopApps] = useState<AppUsage[]>([]);
  const [hourlyTotals, setHourlyTotals] = useState<number[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const isAndroid = Platform.OS === "android";
  const moduleAvailable = isModuleAvailable();

  const refreshAccess = useCallback(() => {
    if (!isAndroid || !moduleAvailable) {
      setHasAccess(false);
      return;
    }
    setHasAccess(isUsageAccessGranted());
  }, [isAndroid, moduleAvailable]);

  useEffect(() => {
    refreshAccess();
    if (!isAndroid || !moduleAvailable) {
      return;
    }

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshAccess();
      }
    });

    const interval = setInterval(refreshAccess, 4000);
    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [isAndroid, moduleAvailable, refreshAccess]);

  useEffect(() => {
    if (!isAndroid || !moduleAvailable || !hasAccess) {
      return;
    }

    let mounted = true;
    const refresh = async () => {
      const end = Date.now();
      const start = getStartOfDay();

      try {
        const [totalData, wifiData, mobileData, appData] = await Promise.all([
          queryDeviceUsage(start, end, "all"),
          queryDeviceUsage(start, end, "wifi"),
          queryDeviceUsage(start, end, "mobile"),
          queryAppUsage(start, end, "all"),
        ]);

        if (!mounted) {
          return;
        }

        setTotals(totalData);
        setWifi(wifiData);
        setMobile(mobileData);
        setTopApps(appData);
      } catch {
        if (mounted) {
          setTotals(null);
          setTopApps([]);
        }
      }

      const hoursToShow = 12;
      const buckets: number[] = [];
      for (let i = hoursToShow - 1; i >= 0; i -= 1) {
        const bucketEnd = end - i * HOUR_MS;
        const bucketStart = bucketEnd - HOUR_MS;
        try {
          const hourly = await queryDeviceUsage(bucketStart, bucketEnd, "all");
          buckets.push(hourly.rxBytes + hourly.txBytes);
        } catch {
          buckets.push(0);
        }
      }

      if (mounted) {
        setHourlyTotals(buckets);
      }
    };

    refresh();
    const interval = setInterval(refresh, 30 * 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [hasAccess, isAndroid, moduleAvailable]);

  return useMemo<DailyUsage>(
    () => ({
      totals,
      wifi,
      mobile,
      topApps,
      hourlyTotals,
      hasAccess,
      isLiveModule: moduleAvailable && isAndroid,
    }),
    [
      hasAccess,
      hourlyTotals,
      isAndroid,
      mobile,
      moduleAvailable,
      topApps,
      totals,
      wifi,
    ],
  );
}
