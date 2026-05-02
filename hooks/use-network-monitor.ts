import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { AppState, Platform } from "react-native";

import {
  getTrafficTotals,
  isModuleAvailable,
  isUsageAccessGranted,
  queryAppUsage,
  type AppUsage,
} from "@local/network-monitor";

type IconName = ComponentProps<typeof MaterialIcons>["name"];

export type MonitorAppRow = {
  id: string;
  name: string;
  category: string;
  down: number;
  up: number;
  data: string;
  dataContext: string;
  icon: IconName;
  color: string;
  active: boolean;
};

export type MonitorSpeed = {
  down: number;
  up: number;
  isLive: boolean;
};

const APP_WINDOW_MS = 5 * 60 * 1000;
const SPEED_INTERVAL_MS = 1000;
const APP_REFRESH_MS = 2000;

const iconPool: IconName[] = [
  "public",
  "chat-bubble",
  "play-circle-filled",
  "cloud",
  "map",
  "shopping-cart",
  "photo",
  "music-note",
  "mail",
  "work",
  "school",
  "smartphone",
];

const colorPool = [
  "#F2B261",
  "#6CD4CF",
  "#8CA6F5",
  "#73D29B",
  "#F07D8C",
  "#C7A6F9",
  "#70C6F4",
  "#9CCB64",
];

const formatLabel = (appName: string | undefined, packageName: string) => {
  const normalizedAppName = appName?.trim();
  if (normalizedAppName) {
    return normalizedAppName;
  }
  const last = packageName.split(".").pop() ?? packageName;
  return last
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const pickIcon = (packageName: string): IconName =>
  iconPool[Math.abs(hashCode(packageName)) % iconPool.length];

const pickColor = (packageName: string) =>
  colorPool[Math.abs(hashCode(packageName)) % colorPool.length];

const hashCode = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
};

const bytesToHuman = (bytes: number) => {
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

const bytesToMbps = (bytes: number, durationMs: number) =>
  Math.max(0, (bytes * 8) / (durationMs / 1000) / 1_000_000);

const simulateSpeed = () => ({
  down: Number((12 + Math.random() * 8).toFixed(1)),
  up: Number((1.2 + Math.random() * 1.6).toFixed(1)),
});

export function useNetworkMonitor() {
  const [hasAccess, setHasAccess] = useState(false);
  const [speed, setSpeed] = useState<MonitorSpeed>({
    down: 0,
    up: 0,
    isLive: false,
  });
  const [apps, setApps] = useState<MonitorAppRow[]>([]);
  const lastTotals = useRef<{ rx: number; tx: number; time: number } | null>(
    null,
  );
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
    if (!isAndroid) {
      setSpeed({ ...simulateSpeed(), isLive: false });
      return;
    }

    if (!moduleAvailable) {
      const interval = setInterval(
        () => setSpeed({ ...simulateSpeed(), isLive: false }),
        1800,
      );
      return () => clearInterval(interval);
    }

    const interval = setInterval(() => {
      const totals = getTrafficTotals();
      const now = Date.now();
      if (!lastTotals.current) {
        lastTotals.current = {
          rx: totals.rxBytes,
          tx: totals.txBytes,
          time: now,
        };
        return;
      }

      const deltaTime = now - lastTotals.current.time;
      if (deltaTime <= 0) {
        return;
      }
      const down = bytesToMbps(
        totals.rxBytes - lastTotals.current.rx,
        deltaTime,
      );
      const up = bytesToMbps(totals.txBytes - lastTotals.current.tx, deltaTime);

      lastTotals.current = {
        rx: totals.rxBytes,
        tx: totals.txBytes,
        time: now,
      };
      setSpeed({
        down: Number(down.toFixed(1)),
        up: Number(up.toFixed(1)),
        isLive: true,
      });
    }, SPEED_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isAndroid, moduleAvailable]);

  useEffect(() => {
    if (!isAndroid || !moduleAvailable || !hasAccess) {
      setApps([]);
      return;
    }

    let mounted = true;

    const fetchUsage = async () => {
      try {
        const end = Date.now();
        const start = end - APP_WINDOW_MS;
        const data = await queryAppUsage(start, end, "all");
        if (!mounted) {
          return;
        }
        setApps(mapUsageToRows(data, APP_WINDOW_MS));
      } catch {
        if (mounted) {
          setApps([]);
        }
      }
    };

    fetchUsage();
    const interval = setInterval(fetchUsage, APP_REFRESH_MS);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [hasAccess, isAndroid, moduleAvailable]);

  return useMemo(
    () => ({
      hasAccess,
      speed,
      apps,
      windowMinutes: APP_WINDOW_MS / 60000,
      isLiveModule: moduleAvailable && isAndroid,
    }),
    [apps, hasAccess, isAndroid, moduleAvailable, speed],
  );
}

const mapUsageToRows = (data: AppUsage[], windowMs: number): MonitorAppRow[] =>
  data.map((app) => {
    const totalBytes = app.rxBytes + app.txBytes;
    const downMbps = bytesToMbps(app.rxBytes, windowMs);
    const upMbps = bytesToMbps(app.txBytes, windowMs);
    const active = totalBytes > 0;

    return {
      id: app.packageName,
      name: formatLabel(app.appName, app.packageName),
      category: app.packageName,
      down: Number(downMbps.toFixed(1)),
      up: Number(upMbps.toFixed(1)),
      data: bytesToHuman(totalBytes),
      dataContext: `Last ${Math.round(windowMs / 60000)} min`,
      icon: pickIcon(app.packageName),
      color: pickColor(app.packageName),
      active,
    };
  });
