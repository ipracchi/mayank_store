export const colors = {
  surface: "#F9FAFB",
  surfaceSecondary: "#FFFFFF",
  surfaceTertiary: "#F3F4F6",
  surfaceInverse: "#1F2937",
  onSurface: "#111827",
  onSurfaceSecondary: "#111827",
  onSurfaceTertiary: "#374151",
  onSurfaceInverse: "#F9FAFB",
  onSurfaceMuted: "#6B7280",
  brand: "#E05A33",
  brandDark: "#9A3B21",
  brandTint: "#FCEADD",
  onBrand: "#FFFFFF",
  success: "#16A34A",
  successTint: "#DCFCE7",
  warning: "#D97706",
  error: "#DC2626",
  errorTint: "#FEE2E2",
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  divider: "#F3F4F6",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
};

export const fontSize = {
  sm: 12,
  base: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 44,
};

export function formatINR(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: abs % 1 === 0 ? 0 : 2,
  });
  return `\u20B9${formatted}`;
}

export function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
