export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat("id-ID").format(amount);
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

export function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

export function formatDateWithDay(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(dateStr));
}
export function calculateEffectiveStatus(
  paymentStatus: string,
  billingTime: string,
  paymentTime: string | null,
  durationMonths: number,
  packageType?: string
): { effectiveStatus: string; nextBillingDate: string } {
  let effectiveStatus = paymentStatus;
  const targetDate = new Date(billingTime);
  const now = new Date();

  // If status is already success or failed, don't change it to overdue or pending
  if (paymentStatus === "success" || paymentStatus === "failed") {
    return {
      effectiveStatus: paymentStatus,
      nextBillingDate: targetDate.toISOString()
    };
  }

  // If status is pending, check if it's actually overdue relative to now
  if (billingTime) {
    const warningDate = new Date(targetDate);
    warningDate.setDate(warningDate.getDate() - 7);

    if (now > targetDate) {
      effectiveStatus = "overdue";
    } else if (now >= warningDate) {
      effectiveStatus = "pending";
    }
  }

  return { 
    effectiveStatus, 
    nextBillingDate: targetDate.toISOString() 
  };
}
